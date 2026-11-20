
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

// Only these three explicitly identified test jobs can be removed.
const TEST_JOBS = [
  {
    jobId: "email-6b000b7b1558387eeb969452",
    emailId: "6b000b7b1558387eeb969452",
  },
  {
    jobId: "email-6b000b5c1558387eeb969450",
    emailId: "6b000b5c1558387eeb969450",
  },
  {
    jobId: "email-6b0006f20901af016e57ac58",
    emailId: "6b0006f20901af016e57ac58",
  },
];

async function main(): Promise<void> {
  const [
    { getEmailQueue },
    { connectToDatabase },
    { default: Email },
    { default: mongoose },
  ] = await Promise.all([
    import("@/queues/email.queue"),
    import("@/lib/db"),
    import("@/models/Email"),
    import("mongoose"),
  ]);

  await connectToDatabase();

  const queue = await getEmailQueue();

  try {
    // First verify every job and database record.
    const recordsToRemove = [];

    for (const target of TEST_JOBS) {
      const job = await queue.getJob(target.jobId);

      if (!job) {
        throw new Error(`Job not found: ${target.jobId}`);
      }

      const state = await job.getState();

      if (
        state !== "waiting" ||
        job.name !== "send-email" ||
        job.data.emailId !== target.emailId
      ) {
        throw new Error(
          `Unexpected queue state or job data: ${target.jobId}`
        );
      }

      const email = await Email.findById(target.emailId).lean();

      if (!email) {
        throw new Error(`Email record not found: ${target.emailId}`);
      }

      // Safety checks: only remove our known test emails.
      if (
        email.to !== "recipient@example.com" ||
        email.subject !== "Mailops BullMQ Test" ||
        email.status !== "queued" ||
        email.attemptCount !== 0 ||
        email.providerMessageId !== null ||
        email.sentAt !== null
      ) {
        throw new Error(
          `Email record does not match expected test data: ${target.emailId}`
        );
      }

      recordsToRemove.push(target);
    }

    console.log("All three test records verified.");
    console.log("Starting cleanup...\n");

    // Remove each Redis job and its associated MongoDB record.
    for (const target of recordsToRemove) {
      const job = await queue.getJob(target.jobId);

      if (!job || await job.getState() !== "waiting") {
        throw new Error(`Job changed before removal: ${target.jobId}`);
      }

      await job.remove();

      const result = await Email.deleteOne({
        _id: target.emailId,
        to: "recipient@example.com",
        subject: "Mailops BullMQ Test",
        status: "queued",
        attemptCount: 0,
        providerMessageId: null,
        sentAt: null,
      });

      if (result.deletedCount !== 1) {
        throw new Error(
          `Job removed, but email record was not deleted: ${target.emailId}`
        );
      }

      console.log(`Removed job: ${target.jobId}`);
      console.log(`Removed email: ${target.emailId}\n`);
    }

    console.log("Cleanup completed successfully!");
  } finally {
    await queue.close();
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Cleanup failed:", error);
  process.exitCode = 1;
});
