
import {
  authenticateApiKey,
  type AuthenticatedApplication,
} from "@/services/auth.service";

export async function authenticateRequest(
  request: Request
): Promise<AuthenticatedApplication | null> {
  const authorization = request.headers.get("authorization");

  // Reject missing or incorrectly formatted headers.
  if (!authorization) {
    return null;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());

  if (!match) {
    return null;
  }

  const apiKey = match[1];

  // Delegate actual authentication to auth.service.ts.
  return authenticateApiKey(apiKey);
}