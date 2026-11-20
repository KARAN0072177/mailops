
import { loadEnvConfig } from "@next/env";
import { Worker, UnrecoverableError } from "bullmq";

import type { EmailJobData } from "@/queues/email.queue";

// Load .env.local because this is a standalone Node.js process.
loadEnvConfig(process.cwd());

type EmailJobResult = {
  providerMessageId: string;
};

async function startEmailWorker(): Promise<void> {
  // Dynamically import after loading environment variables.
  const [
    { EMAIL_QUEUE_NAME, EMAIL_JOB_NAME },
    { connectToDatabase },
    { default: Email },
    { resend },
    { createRedisConnection },
  ] = await Promise.all([
    import("@/queues/email.queue"),
    import("@/lib/db"),
    import("@/models/Email"),
    import("@/lib/resend"),
    import("@/lib/redis"),
  ]);

  const emailFrom = process.env.EMAIL_FROM?.trim();

  if (!emailFrom) {
    throw new Error("EMAIL_FROM is missing from environment variables.");
  }

  // Establish a dedicated worker Redis connection.
  const redisConnection = createRedisConnection("worker");

  const worker = new Worker<
    EmailJobData,
    EmailJobResult,
    typeof EMAIL_JOB_NAME
  >(
    EMAIL_QUEUE_NAME,

    // This function processes each individual email job.
    async (job) => {
      const { emailId } = job.data;

      console.log(`[Mailops Worker] Processing email: ${emailId}`);

      try {
        // Step 1: Connect to MongoDB.
        await connectToDatabase();

        // Step 2: Retrieve the complete email record.
        const existingEmail = await Email.findById(emailId);

        if (!existingEmail) {
          throw new UnrecoverableError(
            `Email record not found: ${emailId}`
          );
        }

        // Avoid sending an email that has already been marked as sent.
        if (
          existingEmail.status === "sent" &&
          existingEmail.providerMessageId
        ) {
          return {
            providerMessageId: existingEmail.providerMessageId,
          };
        }

        if (job.name !== EMAIL_JOB_NAME) {
          throw new UnrecoverableError(
            `Unsupported job type: ${job.name}`
          );
        }

        // Step 3: Mark the email as processing and count this attempt.
        const email = await Email.findByIdAndUpdate(
          emailId,
          {
            $set: {
              status: "processing",
              lastError: null,
            },
            $inc: {
              attemptCount: 1,
            },
          },
          { new: true }
        );

        if (!email) {
          throw new UnrecoverableError(
            `Email record disappeared: ${emailId}`
          );
        }

        // Step 4: Send the email through Resend.
        const { data, error } = await resend.emails.send(
          {
            from: emailFrom,
            to: email.to,
            subject: email.subject,
            html: email.html,
            ...(email.text ? { text: email.text } : {}),
          },
          {
            // Repeated attempts use the same provider idempotency key.
            idempotencyKey: `mailops-email-${emailId}`,
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        if (!data?.id) {
          throw new Error("Resend did not return a message ID.");
        }

        // Step 5: Update MongoDB after successful sending.
        await Email.updateOne(
          { _id: emailId },
          {
            $set: {
              status: "sent",
              providerMessageId: data.id,
              sentAt: new Date(),
              lastError: null,
            },
          }
        );

        console.log(
          `[Mailops Worker] Email sent successfully: ${emailId}`
        );

        return {
          providerMessageId: data.id,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "Unknown email processing error";

        // BullMQ attemptsMade counts previous failed attempts.
        // Add 1 to identify the current attempt.
        const maxAttempts = job.opts.attempts ?? 1;

        const isFinalAttempt =
          error instanceof UnrecoverableError ||
          job.attemptsMade + 1 >= maxAttempts;

        // Record the failure before allowing BullMQ to retry.
        try {
          await connectToDatabase();

          await Email.updateOne(
            {
              _id: emailId,
              status: { $ne: "sent" },
            },
            {
              $set: {
                status: isFinalAttempt ? "failed" : "queued",
                lastError: errorMessage,
              },
            }
          );
        } catch (updateError) {
          console.error(
            "[Mailops Worker] Could not update email failure status:",
            updateError
          );
        }

        // Throwing an Error tells BullMQ the job failed.
        throw error instanceof Error
          ? error
          : new Error(errorMessage);
      }
    },

    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  // Log successfully processed jobs.
  worker.on("completed", (job, result) => {
    console.log(
      `[Mailops Worker] Completed job ${job.id}. Resend ID: ${result.providerMessageId}`
    );
  });

  // Log failed attempts.
  worker.on("failed", (job, error) => {
    console.error(
      `[Mailops Worker] Job ${job?.id ?? "unknown"} failed:`,
      error.message
    );
  });

  // Log Redis or worker-level errors.
  worker.on("error", (error) => {
    console.error("[Mailops Worker] Worker error:", error.message);
  });

  // Stalled jobs may be processed again by BullMQ.
  worker.on("stalled", (jobId) => {
    console.warn(`[Mailops Worker] Job stalled: ${jobId}`);
  });

  await worker.waitUntilReady();

  console.log(
    `[Mailops Worker] Listening to queue: ${EMAIL_QUEUE_NAME}`
  );

  // Gracefully close the worker when the process is stopped.
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;

    shuttingDown = true;

    console.log(`[Mailops Worker] Received ${signal}. Shutting down...`);

    try {
      // Wait for active jobs to finish.
      await worker.close();

      // Close our explicitly created Redis connection.
      redisConnection.disconnect();

      console.log("[Mailops Worker] Shutdown completed.");
    } catch (error) {
      console.error("[Mailops Worker] Shutdown failed:", error);
      process.exitCode = 1;
      redisConnection.disconnect();
    }
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

// Start the worker process.
startEmailWorker().catch((error: unknown) => {
  console.error("[Mailops Worker] Startup failed:", error);
  process.exitCode = 1;
});