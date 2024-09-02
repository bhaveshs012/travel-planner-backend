import mongoose, { Schema } from "mongoose";

// Sub Schemas for Booking Schema -> Two Types of Bookings -> Hotel and Travel
const hotelBookingSchema = new Schema(
  {
    hotelName: { type: String, required: true },
    checkInDate: { type: Date, required: true },
    checkoutDate: { type: Date, required: true },
    location: { type: String, required: true },
  },
  { timestamps: true }
);

const travelBookingSchema = new mongoose.Schema(
  {
    travelType: {
      type: String,
      required: true,
      lowercase: true,
      enum: ["flight", "train", "cab", "others"],
    },
    source: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    departureDate: { type: Date, required: true },
    departureTime: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          return /^(0?[1-9]|1[0-2]):[0-5][0-9] ?([APap]\.?[Mm]\.?)$/.test(
            value
          );
        },
        message: "Invalid Time Format", // 12:00 PM
      },
    },
    arrivalDate: { type: Date, required: true },
    arrivalTime: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          return /^(0?[1-9]|1[0-2]):[0-5][0-9] ?([APap]\.?[Mm]\.?)$/.test(
            value
          );
        },
        message: "Invalid Time Format", // 12:00 PM
      },
    },
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    bookingType: { type: String, required: true, enum: ["hotel", "travel"] },
    bookingReceipt: {
      type: String, // stores the cloudinary url for the receipt
      required: true,
      default: "",
    },
    bookingDetails: {
      type: mongoose.Schema.Types.Mixed, // Allows flexible content based on bookingType
      required: true,
      validate: {
        validator: function (value) {
          if (this.bookingType === "hotel") {
            return hotelBookingSchema
              .requiredPaths()
              .every((path) => value.hasOwnProperty(path));
          } else if (this.bookingType === "travel") {
            return travelBookingSchema
              .requiredPaths()
              .every((path) => value.hasOwnProperty(path));
          }
          return false;
        },
        message: "Invalid booking details",
      },
    },
  },
  { timestamps: true }
);

export const Booking = mongoose.model("Booking", bookingSchema);
