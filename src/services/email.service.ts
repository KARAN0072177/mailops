
import Email from "@/models/Email";
import { connectToDatabase } from "@/lib/db";
import { enqueueEmail } from "@/queues/email.queue";

import type { EmailRequest } from "@/schemas/email.schema";
import type { AuthenticatedApplication } from "@/services/auth.service";

// Error representing a failure to add an email job.
export class EmailQueueError extends Error {
  constructor(public readonly emailId: string) {
    super("Email was saved but could not be queued.");
    this.name = "EmailQueueError";
  }
}

// Information returned after successful email submission.
export interface CreateEmailResult {
  emailId: string;
  to: string;
  subject: string;
  status: string;
  createdAt: Date;
}

// Create an email record and enqueue its background job.
export async function createEmailRecord(
  emailData: EmailRequest,
  application: AuthenticatedApplication
): Promise<CreateEmailResult> {
  await connectToDatabase();

  // Step 1: Save the email in MongoDB.
  const email = await Email.create({
    applicationId: application.id,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  });

  // Step 2: Add a job to BullMQ.
  try {
    await enqueueEmail(email._id.toString());
  } catch (error) {
    console.error("[Mailops] Email queue insertion failed:", error);

    const errorMessage =
      error instanceof Error
        ? error.message.slice(0, 1000)
        : "Unknown queue insertion error";

    // Record the queue failure in MongoDB.
    try {
      await Email.updateOne(
        { _id: email._id },
        {
          $set: {
            status: "failed",
            lastError: `Queue submission failed: ${errorMessage}`,
          },
        }
      );
    } catch (updateError) {
      console.error(
        "[Mailops] Could not record queue failure:",
        updateError
      );
    }

    // Tell the API route that queue insertion failed.
    throw new EmailQueueError(email._id.toString());
  }

  // Step 3: Return safe information after successful enqueueing.
  return {
    emailId: email._id.toString(),
    to: email.to,
    subject: email.subject,
    status: email.status,
    createdAt: email.createdAt,
  };
}