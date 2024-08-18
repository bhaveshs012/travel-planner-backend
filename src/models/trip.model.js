import mongoose, { Schema } from "mongoose";
import itinerarySchema from "./itinerary.model.js";

const tripPlanSchema = new Schema(
  {
    tripName: {
      type: String,
      required: [true, "Trip Name is required"],
      trim: true,
      index: true,
    },
    tripDesc: {
      type: String,
      required: [true, "Trip Description is Required !!"],
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String, // stores the cloudinary url for cover Image
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          // Ensure endDate is after startDate
          return this.startDate <= value;
        },
        message: "End date must be after start date",
      },
    },
    itinerary: {
      type: [itinerarySchema],
      default: [],
    },
    tripMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    plannedBudget: {
      type: Number,
      validate: {
        validator: function (value) {
          return value > 0;
        },
        message: "Planned Budget should not be negative",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const TripPlan = mongoose.model("TripPlan", tripPlanSchema);
