
import Email from "@/models/Email";
import { connectToDatabase } from "@/lib/db";

import type { EmailRequest } from "@/schemas/email.schema";
import type { AuthenticatedApplication } from "@/services/auth.service";

// Information returned after creating an email record.
export interface CreateEmailResult {
  emailId: string;
  to: string;
  subject: string;
  status: string;
  createdAt: Date;
}

// Create an email record associated with an authenticated application.
export async function createEmailRecord(
  emailData: EmailRequest,
  application: AuthenticatedApplication
): Promise<CreateEmailResult> {
  // Ensure MongoDB is connected.
  await connectToDatabase();

  // Create the email document in MongoDB.
  const email = await Email.create({
    applicationId: application.id,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  });

  // Return only the information needed by the API caller.
  return {
    emailId: email._id.toString(),
    to: email.to,
    subject: email.subject,
    status: email.status,
    createdAt: email.createdAt,
  };
}