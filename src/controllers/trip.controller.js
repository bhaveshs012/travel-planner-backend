import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { TripPlan } from "../models/trip.model.js";
import { Invitation } from "../models/invitation.model.js";
import mongoose from "mongoose";

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

  const userId = req.user?._id;

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
    if (!coverImage) {
      throw new ApiError(
        500,
        "Cover Image Could not be uploaded !! Try Again.."
      );
    }
  }

  // create the entry in database
  const tripPlan = await TripPlan.create({
    tripName,
    tripDesc,
    notes: notes || "",
    coverImage: coverImage?.url || "",
    startDate,
    endDate,
    itinerary: JSON.parse(itinerary),
    tripMembers: [userId],
    plannedBudget,
    createdBy: userId,
  });

  // check is user is created
  const createdTripPlan = await TripPlan.findById(tripPlan._id);

  if (!createdTripPlan) {
    throw new ApiError(
      500,
      "Something went wrong while creating the Trip Plan !!"
    );
  }

  // change the trip members to exclude the creater of the trip :
  // then send invite to others
  const invitations = await Promise.all(
    tripMembers.map(async (invitee) => {
      return await Invitation.create({
        tripId: tripPlan._id,
        inviter: userId,
        invitee: invitee,
      });
    })
  );

  if (tripMembers.length !== 0 && invitations.length !== tripMembers.length) {
    throw new ApiError(500, "Some invitations could not be sent");
  }

  res
    .status(201)
    .json(
      new ApiResponse(200, createdTripPlan, "Trip Plan Created Successfully !!")
    );
});

const updateTripPlan = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
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

  const existingTrip = await TripPlan.findById(tripId);
  if (!existingTrip) {
    throw new ApiError(404, "Trip not found !!");
  }

  //* Preserve the createdBy field
  const { createdBy } = existingTrip;

  const updatedTrip = await TripPlan.findByIdAndUpdate(
    tripId,
    {
      tripName,
      tripDesc,
      notes: notes || "",
      coverImage: coverImage?.url || "",
      startDate,
      endDate,
      itinerary: JSON.parse(itinerary),
      tripMembers,
      plannedBudget,
      createdBy,
    },
    { new: true } // Return the updated document
  );

  if (!updatedTrip) {
    throw new ApiError(500, "Error updating trip plan");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedTrip, "Trip plan updated successfully !!")
    );
});

const getTripById = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  const tripPlan = await TripPlan.findById(tripId);

  if (!tripPlan) {
    throw new ApiError(400, "Trip Plan does not exists !!");
  }

  res
    .status(200)
    .json(new ApiResponse(200, tripPlan, "Trip Plan Fetched Successfully !!"));
});

//* Add a single itinerary item to the trip
const addSingleItineraryItem = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const { itineraryItem } = req.body;

  // Validate itineraryItem structure
  if (
    !itineraryItem ||
    !itineraryItem.date ||
    !itineraryItem.placeToVisit ||
    !Array.isArray(itineraryItem.checklist)
  ) {
    throw new ApiError(400, "Invalid itinerary item data");
  }

  try {
    // Ensure unique item by placeToVisit
    const updatedTrip = await TripPlan.findByIdAndUpdate(
      tripId,
      {
        $push: { itinerary: itineraryItem },
      },
      { new: true } // Return the updated document
    ).exec();

    if (!updatedTrip) {
      throw new ApiError(404, "Trip not found");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedTrip, "Itinerary item added successfully")
      );
  } catch (error) {
    throw new ApiError(500, "Error adding itinerary item");
  }
});

//* Trip Members
const inviteUserToTrip = asyncHandler(async (req, res) => {
  const { tripId, inviteeId } = req.body;
  const inviterId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(inviteeId)) {
    throw new ApiError(400, "Invalid invitee ID");
  }

  const alreadyPresentUser = await Invitation.findOne({
    invitee: inviteeId,
  });

  if (alreadyPresentUser) {
    throw new ApiError(400, "User already Invited !!");
  }

  const invitation = await Invitation.create({
    tripId,
    inviter: inviterId,
    invitee: inviteeId,
  });
  const createdInvitation = await Invitation.findById(invitation._id);
  if (!createdInvitation) {
    throw new ApiError(500, "Something went wrong !!");
  }
  res
    .status(201)
    .json(
      new ApiResponse(201, createdInvitation, "Invitation Sent successfully !!")
    );
});

const removeTripMember = asyncHandler(async (req, res) => {
  const { tripId, memberId } = req.params;
  const userId = req.user?._id;

  //* Check if the trip was created by this user
  const tripPlan = await TripPlan.find({
    $and: [
      {
        _id: tripId,
      },
      {
        createdBy: userId,
      },
    ],
  });

  if (!tripPlan) {
    throw new ApiError(400, "Only trip organiser can remove trip members !!");
  }

  //* Find the trip and remove that user ID from the array
  TripPlan.findByIdAndUpdate(
    tripId,
    {
      $pull: {
        tripMembers: {
          _id: memberId,
        },
      },
    },
    { new: true }
  ).exec((error, result) => {
    if (error) {
      throw new ApiError(
        500,
        "Something went wrong while removing the trip member !!"
      );
    }
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          "Member removed from the trip successfully !!"
        )
      );
  });
});

//* Get Trip Summary
const getTripSummary = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const objectId = new mongoose.Types.ObjectId(tripId);
  try {
    const summary = await TripPlan.aggregate([
      {
        $match: {
          _id: objectId,
        },
      },
      {
        $addFields: {
          totalDays: {
            $dateDiff: {
              startDate: "$startDate",
              endDate: "$endDate",
              unit: "day",
            },
          },
          totalNights: {
            $subtract: [
              {
                $dateDiff: {
                  startDate: "$startDate",
                  endDate: "$endDate",
                  unit: "day",
                },
              },
              1,
            ],
          },
        },
      },
      {
        $unwind: {
          path: "$itinerary",
          preserveNullAndEmptyArrays: true, // Handle cases with empty itinerary
        },
      },
      {
        $group: {
          _id: "$_id",
          tripName: { $first: "$tripName" },
          tripDesc: { $first: "$tripDesc" },
          placesToVisit: { $push: "$itinerary.placeToVisit" },
          totalMembers: { $first: { $size: "$tripMembers" } },
          plannedBudget: { $first: "$plannedBudget" },
          totalDays: { $first: "$totalDays" },
          totalNights: { $first: "$totalNights" },
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id from the final output
          tripName: 1,
          tripDesc: 1,
          placesToVisit: 1,
          totalMembers: 1,
          plannedBudget: 1,
          totalDays: 1,
          totalNights: 1,
        },
      },
    ]);

    if (summary.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Trip Details could not be found !!"));
    }
    return res.status(200).json(
      new ApiResponse(200, summary[0], "Trip Summary fetched successfully !!") // Fix: Access the first element of the summary array
    );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.toString(), "Server Error !!"));
  }
});

const getTripExpenseSummary = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  try {
    const summary = await TripPlan.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(tripId),
        },
      },
      {
        $addFields: {
          totalDays: {
            $dateDiff: {
              startDate: "$startDate",
              endDate: "$endDate",
              unit: "day",
            },
          },
          totalNights: {
            $subtract: [
              {
                $dateDiff: {
                  startDate: "$startDate",
                  endDate: "$endDate",
                  unit: "day",
                },
              },
              1,
            ],
          },
        },
      },
      {
        $unwind: {
          path: "$itinerary",
          preserveNullAndEmptyArrays: true, // Handle cases with empty itinerary
        },
      },
      {
        $lookup: {
          from: "expenses", // Collection name in MongoDB
          let: { tripId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$tripId", "$$tripId"],
                },
              },
            },
            {
              $group: {
                _id: "$tripId",
                totalExpenses: { $sum: "$amount" },
              },
            },
          ],
          as: "expenses",
        },
      },
      {
        $unwind: {
          path: "$expenses",
          preserveNullAndEmptyArrays: true, // Handle cases with no expenses
        },
      },
      {
        $group: {
          _id: "$_id",
          tripName: { $first: "$tripName" },
          tripDesc: { $first: "$tripDesc" },
          placesToVisit: { $push: "$itinerary.placeToVisit" },
          totalMembers: { $first: { $size: "$tripMembers" } },
          plannedBudget: { $first: "$plannedBudget" },
          totalDays: { $first: "$totalDays" },
          totalNights: { $first: "$totalNights" },
          totalExpenses: {
            $first: { $ifNull: ["$expenses.totalExpenses", 0] },
          }, // Include total expenses
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id from the final output
          tripName: 1,
          tripDesc: 1,
          placesToVisit: 1,
          totalMembers: 1,
          plannedBudget: 1,
          totalDays: 1,
          totalNights: 1,
          totalExpenses: 1,
        },
      },
    ]);

    if (summary.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "Trip Details could not be found !!"));
    }
    return res.status(200).json(
      new ApiResponse(
        200,
        summary[0],
        "Trip Expense Summary fetched successfully !!"
      ) // Fix: Access the first element of the summary array
    );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.toString(), "Server Error !!"));
  }
});

const deleteTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  // Delete the invites for this trip plan
  Invitation.deleteMany({
    tripId,
  }).exec((err, result) => {
    if (err) {
      throw new ApiError(500, "Error occured while deleting the invitees !!");
    }
  });

  // Delete the trip Plan
  const deletedTrip = await TripPlan.findByIdAndDelete(tripId);
  if (!deletedTrip) {
    throw new ApiError(500, "Something went wrong !!");
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, deletedTrip, "Trip Plan Deleted Successfully !!")
    );
});

export {
  createTripPlan,
  getTripById,
  inviteUserToTrip,
  deleteTrip,
  removeTripMember,
  addSingleItineraryItem,
  updateTripPlan,
  getTripSummary,
  getTripExpenseSummary,
};
