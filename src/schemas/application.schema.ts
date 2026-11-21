
import { z } from "zod";

export const applicationRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Application name is required.")
      .max(100, "Application name cannot exceed 100 characters."),
  })
  .strict();

export type ApplicationRequest = z.infer<
  typeof applicationRequestSchema
>;
