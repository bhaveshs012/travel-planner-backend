import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Booking } from "../models/booking.model.js";
import { TripPlan } from "../models/trip.model.js";
import mongoose from "mongoose";

const addBooking = asyncHandler(async (req, res) => {
  try {
    const { tripId, bookingType, bookingDetails } = req.body;

    // Check for file uploads
    const bookingReceipt = req.files?.bookingReceipt?.[0]; // Multer Added !!

    if (!bookingReceipt) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Booking Receipt is Required !!"));
    }

    // Create a booking entry
    const booking = await Booking.create({
      tripId,
      bookingType,
      bookingReceipt: bookingReceipt.path, // Directly get the Cloudinary URL
      bookingDetails: JSON.parse(bookingDetails),
    });

    // Verify creation
    const createdBooking = await Booking.findById(booking._id);

    if (!createdBooking) {
      return res
        .status(500)
        .json(new ApiResponse(500, {}, "Booking Could Not be Created !!"));
    }

    // Respond with the created booking
    return res
      .status(201)
      .json(new ApiResponse(201, createdBooking, "Booking Saved Successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Booking Could Not be Created !!"));
  }
});

const getBookings = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  if (!tripId) {
    throw new ApiError(400, "Trip Id cannot be NULL !!");
  }

  const bookings = await TripPlan.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(tripId),
      },
    },
    {
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "tripId",
        as: "bookings",
      },
    },
    {
      $project: {
        _id: 0,
        tripId: "$_id",
        tripName: 1,
        tripDesc: 1,
        bookings: {
          $map: {
            input: "$bookings",
            as: "booking",
            in: {
              bookingDetails: "$$booking.bookingDetails",
              bookingType: "$$booking.bookingType",
              bookingReceipt: "$$booking.bookingReceipt",
            },
          },
        },
      },
    },
  ]);

  if (!bookings || bookings.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No Trip Found !!"));
  }

  return res
    .status(201)
    .json(new ApiResponse(201, bookings[0], "Booking Fetched Successfully"));
});

const dummyCheck = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, "Working !!"));
});

export { addBooking, getBookings, dummyCheck };
