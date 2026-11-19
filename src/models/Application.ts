
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const applicationSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Application name is required"],
      trim: true,
      maxlength: 100,
    },

    apiKeyHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    keyPrefix: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "applications",
  }
);

export type ApplicationDocument = InferSchemaType<
  typeof applicationSchema
>;

const Application =
  mongoose.models.Application ||
  mongoose.model("Application", applicationSchema);

export default Application;
