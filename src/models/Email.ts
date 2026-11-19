
import mongoose, {
  Schema,
  type InferSchemaType,
} from "mongoose";

const emailSchema = new Schema(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },

    to: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid recipient email address",
      ],
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 998,
    },

    html: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["queued", "processing", "sent", "failed"],
      default: "queued",
      required: true,
    },

    providerMessageId: {
      type: String,
      default: null,
    },

    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    lastError: {
      type: String,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "emails",
  }
);

// Optimize application email history queries.
emailSchema.index({ applicationId: 1, createdAt: -1 });

// Optimize administrative email monitoring.
emailSchema.index({ status: 1, createdAt: -1 });

export type EmailDocument = InferSchemaType<typeof emailSchema>;

const Email =
  mongoose.models.Email ||
  mongoose.model("Email", emailSchema);

export default Email;