
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {
    // Import after loading environment variables.
    const {
        getEmailQueue,
        enqueueEmail,
    } = await import("@/queues/email.queue");

    const emailQueue = await getEmailQueue();
    // Temporary ID, not an actual MongoDB email record.
    const testEmailId = `queue-test-${Date.now()}`;

    let jobId: string | undefined;

    try {
        console.log("Adding test job to email queue...");

        // Add a job using our existing queue utility.
        const result = await enqueueEmail(testEmailId);
        jobId = result.jobId;

        console.log("Job added successfully!");
        console.log("Job ID:", jobId);

        // Retrieve the job from Redis through BullMQ.
        const job = await emailQueue.getJob(jobId);

        if (!job) {
            throw new Error("Job could not be retrieved from the queue.");
        }

        // Inspect the stored job.
        const state = await job.getState();

        console.log("Job name:", job.name);
        console.log("Job data:", job.data);
        console.log("Job state:", state);

        if (state !== "waiting") {
            throw new Error(`Expected waiting state, received: ${state}`);
        }

        console.log("\nBullMQ queue test successful!");

        // Remove the temporary test job.
        await job.remove();
        console.log("Temporary test job removed.");
    } finally {
        // Close the Queue and its Redis connection.
        await emailQueue.close();
    }
}

main().catch((error: unknown) => {
    console.error("BullMQ test failed:", error);
    process.exitCode = 1;
});