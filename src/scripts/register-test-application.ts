
import { loadEnvConfig } from "@next/env";

// Load .env.local before importing database-related modules.
loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  // Allow an optional application name from the terminal.
  const name =
    process.argv.slice(2).join(" ").trim() ||
    "Mailops Local Test Application";

  // Dynamically import after environment variables are loaded.
  const { createApplication } = await import(
    "@/services/application.service"
  );

  const mongoose = (await import("mongoose")).default;

  try {
    // Register the application using our existing service.
    const result = await createApplication({ name });

    console.log("\nApplication registered successfully!\n");

    console.log("Application ID:", result.application.id);
    console.log("Name:", result.application.name);
    console.log("Status:", result.application.status);
    console.log("Key Prefix:", result.application.keyPrefix);

    console.log("\nYour API key (shown only once):\n");
    console.log(result.apiKey);

    console.log(
      "\nSave this API key securely. MongoDB stores only its hash."
    );
  } finally {
    // Close the database connection after the script finishes.
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("\nApplication registration failed:");

  console.error(
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});
