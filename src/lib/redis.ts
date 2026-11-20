
import IORedis from "ioredis";

type RedisConnectionType = "producer" | "worker";

export function createRedisConnection(
  type: RedisConnectionType
): IORedis {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is missing from environment variables.");
  }

  const isWorker = type === "worker";

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: isWorker ? null : 1,

    // Producers fail when Redis is unavailable.
    // Workers can wait for Redis to recover.
    enableOfflineQueue: isWorker,
  });

  let hasLoggedError = false;

  connection.on("ready", () => {
    console.info(`[Mailops Redis] ${type} connection ready.`);
    hasLoggedError = false;
  });

  connection.on("error", (error: Error) => {
    // Avoid printing the same connection error repeatedly.
    if (!hasLoggedError) {
      console.error(
        `[Mailops Redis] ${type} connection error:`,
        error.message
      );

      hasLoggedError = true;
    }
  });

  return connection;
}