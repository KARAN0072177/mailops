
import crypto from "node:crypto";

const API_KEY_PREFIX = "mlf_live_";
const RANDOM_BYTES = 32;

// Generate a cryptographically secure API key.
export function generateApiKey(): string {
  const randomSecret = crypto.randomBytes(RANDOM_BYTES).toString("hex");

  return `${API_KEY_PREFIX}${randomSecret}`;
}

// Extract the identifiable prefix from an API key.
export function getKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 16);
}

// Hash an API key using HMAC-SHA256.
export function hashApiKey(apiKey: string): string {
  const pepper = process.env.API_KEY_PEPPER;

  if (!pepper) {
    throw new Error("API_KEY_PEPPER is missing.");
  }

  return crypto
    .createHmac("sha256", pepper)
    .update(apiKey)
    .digest("hex");
}

// Verify an API key against its stored hash.
export function verifyApiKey(
  apiKey: string,
  storedHash: string
): boolean {
  const calculatedHash = hashApiKey(apiKey);

  const calculatedBuffer = Buffer.from(calculatedHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (calculatedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(calculatedBuffer, storedBuffer);
}