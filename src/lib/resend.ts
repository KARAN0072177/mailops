
import { Resend } from "resend";

// Read the Resend API key from environment variables.
const apiKey = process.env.RESEND_API_KEY;

// Ensure the API key exists.
if (!apiKey) {
  throw new Error("RESEND_API_KEY is missing from environment variables.");
}

// Create a reusable Resend client.
export const resend = new Resend(apiKey);