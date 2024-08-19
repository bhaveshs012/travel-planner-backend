import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Booking } from "../models/booking.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

const dummyCheck = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, "Working !!"));
});

export { addBooking, dummyCheck };
