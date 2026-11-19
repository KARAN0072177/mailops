
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Establish or reuse the MongoDB connection.
    const mongoose = await connectToDatabase();

    // Get the actual database instance.
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("MongoDB database instance is unavailable.");
    }

    // Execute a real database ping.
    await db.command({ ping: 1 });

    return NextResponse.json(
      {
        success: true,
        status: "connected",
        database: db.databaseName,
        message: "MongoDB connection is healthy.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("MongoDB health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        status: "disconnected",
        message: "MongoDB connection failed.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}