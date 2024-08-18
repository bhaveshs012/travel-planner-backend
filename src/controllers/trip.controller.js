import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { TripPlan } from "../models/trip.model.js";

const createTripPlan = asyncHandler(async (req, res) => {
  const {
    tripName,
    tripDesc,
    startDate,
    endDate,
    itinerary,
    tripMembers,
    plannedBudget,
    notes,
  } = req.body;

  // Validations

  if ([tripName, tripDesc].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "Trip name and description are required!");
  }

  // Validate dates
  if (!startDate || !endDate) {
    throw new ApiError(400, "Start date and end date are required!");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(400, "Invalid date format!");
  }

  if (start > end) {
    throw new ApiError(400, "Start date cannot be after end date!");
  }

  // Validate itinerary
  if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
    throw new ApiError(400, "Itinerary must be a non-empty array!");
  }

  // Validate trip members
  if (!tripMembers || !Array.isArray(tripMembers) || tripMembers.length === 0) {
    throw new ApiError(400, "Trip members must be a non-empty array!");
  }

  // Validate planned budget
  if (
    plannedBudget === undefined ||
    plannedBudget === null ||
    typeof plannedBudget !== "number" ||
    plannedBudget < 0
  ) {
    throw new ApiError(400, "Planned budget must be a non-negative number!");
  }

  // get the cover Image Path if uploaded
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // upload cover image
  let coverImage;
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  // create the entry in database
  const tripPlan = await TripPlan.create({
    tripName,
    tripDesc,
    notes: notes || "",
    coverImage: coverImage?.url || "",
    startDate,
    endDate,
    itinerary,
    tripMembers,
    plannedBudget,
    createdBy: user,
  });

  // check is user is created
  const createdTripPlan = await TripPlan.findById(tripPlan._id);

  if (!createdTripPlan) {
    throw new ApiError(
      500,
      "Something went wrong while creating the Trip Plan !!"
    );
  }

  return res
    .status(201)
    .json(
      new ApiResponse(200, createdTripPlan, "Trip Plan Created Successfully !!")
    );
});

const getTripById = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  console.log(tripId);

  const tripPlan = await TripPlan.findById(tripId);

  if (!tripPlan) {
    throw new ApiError(400, "Trip Plan does not exists !!");
  }

  res
    .status(200)
    .json(new ApiResponse(200, tripPlan, "Trip Plan Fetched Successfully !!"));
});

export { createTripPlan, getTripById };
