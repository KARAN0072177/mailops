
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { createRedisConnection } = await import("@/lib/redis");

  const redis = createRedisConnection("producer");

  try {
    const response = await redis.ping();

    console.log("Redis response:", response);

    if (response !== "PONG") {
      throw new Error("Unexpected Redis response.");
    }

    console.log("Mailops Redis connection verified!");
  } finally {
    await redis.quit();
  }
}

main().catch((error: unknown) => {
  console.error("Redis test failed:", error);
  process.exitCode = 1;
});