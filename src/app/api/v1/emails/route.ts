
import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/request-auth";
import { emailRequestSchema } from "@/schemas/email.schema";
import { createEmailRecord } from "@/services/email.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Authenticate the requesting application.
    const application = await authenticateRequest(request);

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing or invalid API key.",
        },
        { status: 401 }
      );
    }

    // 2. Parse the incoming JSON.
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    // 3. Validate the request using Zod.
    const validation = emailRequestSchema.safeParse(requestBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email request.",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    // 4. Create the email record in MongoDB.
    const email = await createEmailRecord(
      validation.data,
      application
    );

    // 5. Return the created email information.
    return NextResponse.json(
      {
        success: true,
        message: "Email record created successfully.",
        email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Email submission failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process email request.",
      },
      { status: 500 }
    );
  }
}