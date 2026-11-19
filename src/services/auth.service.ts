
import Application from "@/models/Application";
import { connectToDatabase } from "@/lib/db";

import {
  getKeyPrefix,
  verifyApiKey,
} from "@/lib/api-key";

// Information about an authenticated application.
export interface AuthenticatedApplication {
  id: string;
  name: string;
}

// Authenticate an application using its API key.
export async function authenticateApiKey(
  apiKey: string
): Promise<AuthenticatedApplication | null> {
  // Reject malformed API keys before querying MongoDB.
  const isValidFormat = /^mlf_live_[a-f0-9]{64}$/.test(apiKey);

  if (!isValidFormat) {
    return null;
  }

  // Ensure MongoDB is connected.
  await connectToDatabase();

  // Extract the identifiable portion of the API key.
  const keyPrefix = getKeyPrefix(apiKey);

  // Find applications with the matching prefix.
  // Explicitly include apiKeyHash because its schema setting is select: false.
  const applications = await Application.find({
    keyPrefix,
  }).select("+apiKeyHash");

  // Verify the complete API key against each matching candidate.
  for (const application of applications) {
    const isKeyValid = verifyApiKey(
      apiKey,
      application.apiKeyHash
    );

    if (!isKeyValid) {
      continue;
    }

    // Reject applications that have been disabled.
    if (application.status !== "active") {
      return null;
    }

    // Return only safe application information.
    return {
      id: application._id.toString(),
      name: application.name,
    };
  }

  // No matching application or invalid API key.
  return null;
}