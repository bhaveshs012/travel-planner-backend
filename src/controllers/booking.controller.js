import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Booking } from "../models/booking.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const addBooking = asyncHandler(async (req, res) => {
  const { tripId, bookingType, bookingDetails } = req.body;

  // Getting the Booking Receipt through Multer
  const bookingReceiptLocalPath = req.files?.bookingReceipt[0]?.path;

  if (!bookingReceiptLocalPath) {
    throw new ApiError(400, "Booking Receipt is Required !!");
  }

  // Upload to Cloudinary
  const bookingReceipt = await uploadOnCloudinary(bookingReceiptLocalPath);

  if (!bookingReceipt) {
    throw new ApiError(500, "Receipt Could not be Uploaded !!");
  }

  const booking = await Booking.create({
    tripId,
    bookingType,
    bookingReceipt: bookingReceipt.url,
    bookingDetails: JSON.parse(bookingDetails),
  });

  const createdBooking = await Booking.findById(booking._id);

  if (!createdBooking) {
    throw new ApiError(
      500,
      "Something went wrong while adding the Booking Details"
    );
  }
  return res
    .status(201)
    .json(new ApiResponse(201, createdBooking, "Booking Saved Successfully"));
});

const getBookings = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  if (!tripId) {
    throw new ApiError(400, "Trip Id cannot be NULL !!");
  }

  const bookings = await Booking.aggregate([
    {
      $match: {
        tripId: new mongoose.Types.ObjectId(tripId),
      },
    },
    {
      $lookup: {
        from: "tripplans",
        localField: "tripId",
        foreignField: "_id",
        as: "tripDetails",
      },
    },
    {
      $unwind: "$tripDetails",
    },
    {
      $group: {
        _id: "$tripDetails._id",
        tripName: { $first: "$tripDetails.tripName" },
        tripDesc: { $first: "$tripDetails.tripDesc" },
        bookings: {
          $push: {
            bookingDetails: "$bookingDetails",
            bookingType: "$bookingType",
            bookingReceipt: "$bookingReceipt",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        tripId: "$_id",
        tripName: 1,
        tripDesc: 1,
        bookings: 1,
      },
    },
  ]);
  if (!bookings) {
    return res
      .status(400)
      .json(new ApiResponse(400, [], "No Bookings Found !!"));
  }
  if (Array.isArray(bookings) && bookings.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No Bookings Found !!"));
  }
  return res
    .status(201)
    .json(new ApiResponse(201, bookings[0], "Booking Fetched Successfully"));
});

const dummyCheck = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, "Working !!"));
});

export { addBooking, getBookings, dummyCheck };
