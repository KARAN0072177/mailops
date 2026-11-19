
import { z } from "zod";

export const emailRequestSchema = z
  .object({
    to: z
      .string()
      .trim()
      .min(1, "Recipient email is required")
      .max(254, "Recipient email is too long")
      .email("Please provide a valid email address"),

    subject: z
      .string()
      .trim()
      .min(1, "Email subject is required")
      .max(998, "Email subject is too long"),

    html: z
      .string()
      .min(1, "HTML content is required")
      .max(1_000_000, "HTML content cannot exceed 1 MB")
      .refine(
        (value) => value.trim().length > 0,
        "HTML content cannot be empty"
      ),

    text: z
      .string()
      .trim()
      .min(1, "Text content cannot be empty")
      .max(1_000_000, "Text content cannot exceed 1 MB")
      .optional(),
  })
  .strict();

export type EmailRequest = z.infer<typeof emailRequestSchema>;