
import { Queue } from "bullmq";
import type IORedis from "ioredis";

import { createRedisConnection } from "@/lib/redis";

export const EMAIL_QUEUE_NAME = "emails";
export const EMAIL_JOB_NAME = "send-email" as const;

export interface EmailJobData {
  emailId: string;
}

type EmailQueue = Queue<
  EmailJobData,
  void,
  typeof EMAIL_JOB_NAME
>;

declare global {
  var __mailopsEmailQueue: EmailQueue | undefined;
  var __mailopsEmailQueuePromise: Promise<EmailQueue> | undefined;
}

// Wait until Redis is ready, but don't wait indefinitely.
function waitForRedisReady(
  connection: IORedis,
  timeoutMs = 2000
): Promise<void> {
  if (connection.status === "ready") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      connection.off("ready", onReady);
      connection.off("end", onEnd);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onEnd = () => {
      cleanup();
      reject(new Error("Redis connection ended before becoming ready."));
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(`Redis did not become ready within ${timeoutMs}ms.`)
      );
    }, timeoutMs);

    connection.once("ready", onReady);
    connection.once("end", onEnd);
  });
}

// Create the queue only after Redis is ready.
async function createEmailQueue(): Promise<EmailQueue> {
  const connection = createRedisConnection("producer");

  try {
    await waitForRedisReady(connection);

    const queue = new Queue<
      EmailJobData,
      void,
      typeof EMAIL_JOB_NAME
    >(EMAIL_QUEUE_NAME, {
      connection,
      skipWaitingForReady: true,

      defaultJobOptions: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 1000,
        },

        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },

        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 5000,
        },
      },
    });

    queue.on("error", (error: Error) => {
      console.error("[Mailops Email Queue] Error:", error.message);
    });

    await queue.waitUntilReady();

    return queue;
  } catch (error) {
    connection.disconnect();
    throw error;
  }
}

// Reuse the queue after successful initialization.
export async function getEmailQueue(): Promise<EmailQueue> {
  if (globalThis.__mailopsEmailQueue) {
    return globalThis.__mailopsEmailQueue;
  }

  if (!globalThis.__mailopsEmailQueuePromise) {
    globalThis.__mailopsEmailQueuePromise = createEmailQueue();
  }

  try {
    const queue = await globalThis.__mailopsEmailQueuePromise;

    globalThis.__mailopsEmailQueue = queue;

    return queue;
  } catch (error) {
    globalThis.__mailopsEmailQueuePromise = undefined;
    throw error;
  }
}

// Add an email job to Redis.
export async function enqueueEmail(
  emailId: string
): Promise<{ jobId: string }> {
  if (!emailId.trim()) {
    throw new Error("Email ID is required.");
  }

  const emailQueue = await getEmailQueue();

  const job = await emailQueue.add(
    EMAIL_JOB_NAME,
    { emailId },
    {
      jobId: `email-${emailId}`,
    }
  );

  return {
    jobId: job.id ?? `email-${emailId}`,
  };
}