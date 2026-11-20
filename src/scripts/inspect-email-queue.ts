
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

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

  const queue = await getEmailQueue();

  try {
    await connectToDatabase();

    // Inspect job counts without processing anything.
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "failed",
      "completed"
    );

    console.log("\n===== EMAIL QUEUE COUNTS =====\n");
    console.table(counts);

    // Retrieve existing jobs without consuming them.
    const jobs = await queue.getJobs(
      ["waiting", "active", "delayed", "failed"],
      0,
      99
    );

    console.log("\n===== EXISTING EMAIL JOBS =====\n");

    for (const job of jobs) {
      const email = await Email.findById(job.data.emailId)
        .select("to subject status createdAt attemptCount")
        .lean();

      console.log({
        jobId: job.id,
        jobName: job.name,
        queueState: await job.getState(),
        emailId: job.data.emailId,
        recipient: email?.to ?? "Email record not found",
        subject: email?.subject ?? "Unknown",
        mongoStatus: email?.status ?? "Unknown",
        attemptCount: email?.attemptCount ?? null,
      });
    }

    if (jobs.length === 0) {
      console.log("No pending or failed jobs found.");
    }
  } finally {
    await queue.close();
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Queue inspection failed:", error);
  process.exitCode = 1;
});