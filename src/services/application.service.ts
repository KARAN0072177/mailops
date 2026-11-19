import { connectToDatabase } from "@/lib/db";
import Application from "@/models/Application";

import {
    generateApiKey,
    getKeyPrefix,
    hashApiKey,
} from "@/lib/api-key";

// Input required to register a new application.
interface CreateApplicationInput {
    name: string;
}

// Data returned after successful application registration.
interface CreateApplicationResult {
    application: {
        id: string;
        name: string;
        keyPrefix: string;
        status: string;
        createdAt: Date;
    };
    apiKey: string;
}

// Create and register a new application.
export async function createApplication(
    input: CreateApplicationInput
): Promise<CreateApplicationResult> {
    const name = input.name?.trim();

    if (!name) {
        throw new Error("Application name is required.");
    }

    if (name.length > 100) {
        throw new Error("Application name cannot exceed 100 characters.");
    }

    // Ensure MongoDB is connected before creating a document.
    await connectToDatabase();

    // Generate the original API key.
    const apiKey = generateApiKey();

    // Extract the identifiable prefix.
    const keyPrefix = getKeyPrefix(apiKey);

    // Hash the API key before storing it.
    const apiKeyHash = hashApiKey(apiKey);

    // Create the application document in MongoDB.
    const application = await Application.create({
        name,
        apiKeyHash,
        keyPrefix,
    });

    // Return safe application details and the original API key.
    return {
        application: {
            id: application._id.toString(),
            name: application.name,
            keyPrefix: application.keyPrefix,
            status: application.status,
            createdAt: application.createdAt,
        },
        apiKey,
    };
}