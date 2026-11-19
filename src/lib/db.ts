
import * as dns from "node:dns";
import type { Mongoose } from "mongoose";

// Configure DNS before loading Mongoose / MongoDB driver.
declare global {
  var __mailopsDnsConfigured: boolean | undefined;

  var __mailopsMongooseCache:
    | {
        conn: Mongoose | null;
        promise: Promise<Mongoose> | null;
      }
    | undefined;
}

// Configure DNS only once, including during Next.js hot reloads.
if (!globalThis.__mailopsDnsConfigured) {
  const dnsProvider = process.env.DNS_PROVIDER?.toLowerCase() ?? "system";

  switch (dnsProvider) {
    case "cloudflare":
      dns.setServers(["1.1.1.1", "1.0.0.1"]);
      break;

    case "google":
      dns.setServers(["8.8.8.8", "8.8.4.4"]);
      break;

    default:
      throw new Error(
        `Invalid DNS_PROVIDER: ${dnsProvider}. Use cloudflare, google, or system.`
      );
  }

  globalThis.__mailopsDnsConfigured = true;
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
