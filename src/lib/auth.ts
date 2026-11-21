import "server-only";
import "./mongo-dns";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing from environment variables.`);
  }

  return value;
}

// MongoDB configuration
const mongoUri = getRequiredEnv("MONGODB_URI");

declare global {
  var __mailopsAuthMongoClient: MongoClient | undefined;
}

// Reuse the MongoClient during development hot reloads.
const client =
  globalThis.__mailopsAuthMongoClient ??
  new MongoClient(mongoUri, {
    maxPoolSize: 10,
  });

if (!globalThis.__mailopsAuthMongoClient) {
  globalThis.__mailopsAuthMongoClient = client;
}

// Use the same Mailops database.
const database = client.db("mailops");

// Better Auth configuration
export const auth = betterAuth({
  database: mongodbAdapter(database),

  secret: getRequiredEnv("BETTER_AUTH_SECRET"),
  baseURL: getRequiredEnv("BETTER_AUTH_URL"),

  socialProviders: {
    google: {
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      requireEmailVerification: true,
    },
  },
});