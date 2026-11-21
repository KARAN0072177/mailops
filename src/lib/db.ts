import "./mongo-dns";
import type { Mongoose } from "mongoose";

// Configure DNS before loading Mongoose / MongoDB driver.
declare global {
  var __mailopsMongooseCache:
    | {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
      }
    | undefined;
}

// Reuse the MongoDB connection during development and hot reloads.
const cached =
  globalThis.__mailopsMongooseCache ??
  (globalThis.__mailopsMongooseCache = {
    conn: null,
    promise: null,
  });

export async function connectToDatabase(): Promise<Mongoose> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing from environment variables.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Dynamically load Mongoose after DNS configuration.
    cached.promise = import("mongoose").then(({ default: mongoose }) =>
      mongoose.connect(uri, {
        dbName: "mailops",
      })
    );
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
