import mongoose, { Schema } from "mongoose";

const invitationSchema = new Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripPlan",
      required: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Invitation = mongoose.model("Invitation", invitationSchema);
