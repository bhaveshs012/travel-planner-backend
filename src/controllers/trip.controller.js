import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { TripPlan } from "../models/trip.model.js";
import { Invitation } from "../models/invitation.model.js";
import { Expense } from "../models/expense.model.js";
import mongoose from "mongoose";

const createTripPlan = asyncHandler(async (req, res) => {
  const { tripName, tripDesc, startDate, endDate, tripMembers } = req.body;

  const userId = req.user?._id;

  // create the entry in database
  const tripPlan = await TripPlan.create({
    tripName,
    tripDesc,
    startDate,
    endDate,
    tripMembers: [userId],
    createdBy: userId,
  });

  // check is user is created
  const createdTripPlan = await TripPlan.findById(tripPlan._id);

  if (!createdTripPlan) {
    return res
      .status(400)
      .json(new ApiResponse(500, [], "Trip Plan Could not be created !!"));
  }

  // change the trip members to exclude the creater of the trip :
  // then send invite to others
  const invitations = await Promise.all(
    tripMembers.map(async (invitee) => {
      if (invitee !== userId) {
        return await Invitation.create({
          tripId: tripPlan._id,
          inviter: userId,
          invitee: invitee,
        });
      }
    })
  );

  if (tripMembers.length !== 0 && invitations.length !== tripMembers.length) {
    return res
      .status(400)
      .json(new ApiResponse(500, [], "Some invitations could not be sent"));
  }

  return res
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

  const tripPlan = await TripPlan.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(tripId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "tripMembers",
        foreignField: "_id",
        as: "tripMembers",
      },
    },
    {
      $project: {
        tripName: 1,
        tripDesc: 1,
        coverImage: 1,
        startDate: 1,
        endDate: 1,
        notes: 1,
        itinerary: 1,
        plannedBudget: 1,
        tripMembers: {
          fullName: 1,
          _id: 1,
          avatar: 1,
        },
      },
    },
  ]);

  if (!tripPlan || tripPlan.length === 0) {
    throw new ApiError(400, "Trip Plan does not exist !!");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, tripPlan[0], "Trip Plan Fetched Successfully !!")
    );
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
  try {
    const summary = await TripPlan.aggregate([
      {
        $match: {
          _id: {
            $eq: new mongoose.Types.ObjectId(tripId),
          },
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
          _id: 0,
          tripId: "$_id",
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

const getTripDashboardSummary = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const currentDate = new Date();

  try {
    const summary = await TripPlan.aggregate([
      // Stage 1: Filter trips where the user is either a creator or a member
      {
        $match: {
          $or: [
            { createdBy: new mongoose.Types.ObjectId(userId) },
            { tripMembers: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      // Stage 2: Unwind the itinerary to handle placesToVisit
      {
        $unwind: {
          path: "$itinerary",
          preserveNullAndEmptyArrays: true, // Handle cases with empty itinerary
        },
      },
      // Stage 3: Add a flag to identify trip type (upcoming, created, joined)
      {
        $addFields: {
          isUpcoming: { $gte: ["$startDate", currentDate] },
          isCreatedByUser: {
            $eq: ["$createdBy", new mongoose.Types.ObjectId(userId)],
          },
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
      // Stage 4: Group trips by trip type and aggregate placesToVisit
      {
        $group: {
          _id: "$_id", // Use _id for grouping (tripId)
          tripName: { $first: "$tripName" },
          tripDesc: { $first: "$tripDesc" },
          startDate: { $first: "$startDate" },
          endDate: { $first: "$endDate" },
          totalDays: { $first: "$totalDays" },
          totalNights: { $first: "$totalNights" },
          totalMembers: { $first: { $size: "$tripMembers" } },
          plannedBudget: { $first: "$plannedBudget" },
          placesToVisit: { $push: "$itinerary.placeToVisit" },
          isUpcoming: { $first: "$isUpcoming" },
          isCreatedByUser: { $first: "$isCreatedByUser" },
          tripMembers: { $first: "$tripMembers" },
          createdBy: { $first: "$createdBy" },
        },
      },
      // Stage 5: Separate trips into upcoming, created, and joined
      {
        $group: {
          _id: null,
          upcomingTrip: {
            $push: {
              $cond: {
                if: {
                  $and: [
                    "$isUpcoming",
                    {
                      $in: [
                        new mongoose.Types.ObjectId(userId),
                        "$tripMembers",
                      ],
                    },
                  ],
                },
                then: {
                  tripId: "$_id", // Include tripId here
                  tripName: "$tripName",
                  tripDesc: "$tripDesc",
                  startDate: "$startDate",
                  endDate: "$endDate",
                  totalDays: "$totalDays",
                  totalNights: "$totalNights",
                  totalMembers: "$totalMembers",
                  plannedBudget: "$plannedBudget",
                  placesToVisit: "$placesToVisit",
                },
                else: null,
              },
            },
          },
          createdTrips: {
            $push: {
              $cond: {
                if: "$isCreatedByUser",
                then: {
                  tripId: "$_id", // Include tripId here
                  tripName: "$tripName",
                  tripDesc: "$tripDesc",
                  startDate: "$startDate",
                  endDate: "$endDate",
                  totalDays: "$totalDays",
                  totalNights: "$totalNights",
                  totalMembers: "$totalMembers",
                  plannedBudget: "$plannedBudget",
                  placesToVisit: "$placesToVisit",
                },
                else: null,
              },
            },
          },
          joinedTrips: {
            $push: {
              $cond: {
                if: {
                  $and: [
                    {
                      $ne: ["$createdBy", new mongoose.Types.ObjectId(userId)],
                    },
                    {
                      $in: [
                        new mongoose.Types.ObjectId(userId),
                        "$tripMembers",
                      ],
                    },
                  ],
                },
                then: {
                  tripId: "$_id", // Include tripId here
                  tripName: "$tripName",
                  tripDesc: "$tripDesc",
                  startDate: "$startDate",
                  endDate: "$endDate",
                  totalDays: "$totalDays",
                  totalNights: "$totalNights",
                  totalMembers: "$totalMembers",
                  plannedBudget: "$plannedBudget",
                  placesToVisit: "$placesToVisit",
                },
                else: null,
              },
            },
          },
        },
      },
      // Stage 6: Clean up the output arrays
      {
        $project: {
          _id: 0,
          upcomingTrip: {
            $filter: {
              input: "$upcomingTrip",
              as: "trip",
              cond: { $ne: ["$$trip", null] },
            },
          },
          createdTrips: {
            $filter: {
              input: "$createdTrips",
              as: "trip",
              cond: { $ne: ["$$trip", null] },
            },
          },
          joinedTrips: {
            $filter: {
              input: "$joinedTrips",
              as: "trip",
              cond: { $ne: ["$$trip", null] },
            },
          },
        },
      },
      // Stage 7: Handle empty arrays for upcoming, created, and joined trips
      {
        $addFields: {
          upcomingTrip: {
            $cond: {
              if: { $gt: [{ $size: "$upcomingTrip" }, 0] },
              then: { $arrayElemAt: ["$upcomingTrip", 0] },
              else: [], // Return empty array if no upcoming trip
            },
          },
          createdTrips: {
            $cond: {
              if: { $gt: [{ $size: "$createdTrips" }, 0] },
              then: "$createdTrips",
              else: [], // Return empty array if no created trips
            },
          },
          joinedTrips: {
            $cond: {
              if: { $gt: [{ $size: "$joinedTrips" }, 0] },
              then: "$joinedTrips",
              else: [], // Return empty array if no joined trips
            },
          },
        },
      },
    ]);

    if (!summary.length) {
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "No trips found for the user !!"));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        summary[0], // Access the first element as the summary is grouped by _id: null
        "Trip Dashboard Summary fetched successfully !!"
      )
    );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.toString(), "Server Error !!"));
  }
});

//* Get Users -> Based on Trips and Invitations
const getInvitedAndAddedMembers = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  try {
    const usersList = await TripPlan.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(tripId) }, // Match the trip by its ID
      },
      {
        $lookup: {
          from: "invitations",
          localField: "_id",
          foreignField: "tripId",
          as: "invitedUsers",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "tripMembers",
          foreignField: "_id",
          as: "tripMembers",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "invitedUsers.invitee",
          foreignField: "_id",
          as: "invitedMembers",
        },
      },
      {
        $addFields: {
          tripMembers: {
            $map: {
              input: "$tripMembers",
              as: "member",
              in: {
                _id: "$$member._id",
                fullName: "$$member.fullName",
                avatar: "$$member.avatar",
                userType: "member",
              },
            },
          },
          invitedMembers: {
            $map: {
              input: "$invitedMembers",
              as: "invitee",
              in: {
                _id: "$$invitee._id",
                fullName: "$$invitee.fullName",
                avatar: "$$invitee.avatar",
                userType: "invited",
              },
            },
          },
        },
      },
      {
        $project: {
          users: {
            $concatArrays: ["$tripMembers", "$invitedMembers"], // Merge members and invited users
          },
        },
      },
      {
        $unwind: "$users", // Flatten the users array
      },
      {
        $replaceRoot: {
          newRoot: "$users", // Return only user data
        },
      },
    ]);

    if (!usersList.length) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No Users found !!"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, usersList, "Trip Members Fetched successfully !!")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.toString(), "Server Error !!"));
  }
});

//* Search Trip Members
const searchTripMembers = asyncHandler(async (req, res) => {
  const { searchParameter } = req.query;
  const { tripId } = req.params;

  try {
    const aggregationPipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(tripId),
        },
      },
      {
        $unwind: "$tripMembers",
      },
      {
        $lookup: {
          from: "users",
          localField: "tripMembers",
          foreignField: "_id",
          as: "tripMembers",
        },
      },
      {
        $unwind: "$tripMembers",
      },
      {
        $project: {
          tripId: "$_id",
          userId: "$tripMembers._id",
          _id: 0,
          fullName: "$tripMembers.fullName",
          image: "$tripMembers.avatar",
        },
      },
    ];

    // Add name filtering only if searchParameter is provided
    if (searchParameter) {
      aggregationPipeline.push({
        $match: {
          fullName: {
            $regex: `^${searchParameter}`,
            $options: "i",
          },
        },
      });
    } else {
      aggregationPipeline.push({
        $limit: 5,
      });
    }

    const filteredMembers = await TripPlan.aggregate(aggregationPipeline);

    if (!filteredMembers.length) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            [],
            "No trip members found matching the criteria."
          )
        );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          filteredMembers,
          "Trip members retrieved successfully."
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.toString(), "Server Error."));
  }
});

const getTripExpenseSummaryForUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  try {
    const summary = await TripPlan.aggregate([
      {
        $match: {
          tripMembers: {
            $in: [new mongoose.Types.ObjectId(userId)],
          },
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
          tripMembers: { $first: "$tripMembers" },
          placesToVisit: {
            $push: "$itinerary.placeToVisit",
          },
          totalMembers: {
            $first: { $size: "$tripMembers" },
          },
          plannedBudget: { $first: "$plannedBudget" },
          totalDays: { $first: "$totalDays" },
          totalNights: { $first: "$totalNights" },
          totalExpenses: {
            $first: {
              $ifNull: ["$expenses.totalExpenses", 0],
            },
          }, // Include total expenses
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "tripMembers",
          foreignField: "_id",
          as: "tripMembers",
        },
      },
      {
        $addFields: {
          tripMembers: {
            $map: {
              input: "$tripMembers",
              as: "user",
              in: {
                name: "$$user.fullName", // Include only the name
                image: "$$user.avatar", // Include only the image
              },
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
          tripMembers: 1,
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
        summary,
        "Trip Expense Summary fetched successfully !!"
      ) // Fix: Access the first element of the summary array
    );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.toString(), "Server Error !!"));
  }
});

//* Expense Summary for Dashboard
const getTripExpenseSummaryForDashboard = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  try {
    const tripObjectId = new mongoose.Types.ObjectId(tripId);

    const [totalExpenses, plannedBudget, recentExpenses] = await Promise.all([
      Expense.aggregate([
        { $match: { tripId: tripObjectId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
        { $project: { _id: 0, total: 1 } },
      ]),

      TripPlan.aggregate([
        { $match: { _id: tripObjectId } },
        { $project: { _id: 0, plannedBudget: 1 } },
      ]),

      Expense.aggregate([
        { $match: { tripId: tripObjectId } },
        { $sort: { paymentDate: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "paidBy",
            foreignField: "_id",
            as: "paidByDetails",
          },
        },
        {
          $unwind: {
            path: "$paidByDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "splitBetween",
            foreignField: "_id",
            as: "splitBetweenDetails",
          },
        },
        {
          $unwind: {
            path: "$splitBetweenDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            category: { $first: "$category" },
            description: { $first: "$description" },
            paidTo: { $first: "$paidTo" },
            amount: { $first: "$amount" },
            paymentDate: { $first: "$paymentDate" },
            splitBetween: { $push: "$splitBetweenDetails" },
            paidBy: { $first: "$paidByDetails" },
          },
        },
        {
          $project: {
            _id: 0,
            category: 1,
            description: 1,
            paidTo: 1,
            amount: 1,
            paymentDate: 1,
            splitBetween: {
              fullName: 1,
              avatar: 1, // Rename avatar to image
            },
            paidBy: {
              fullName: "$paidBy.fullName",
              avatar: "$paidBy.avatar", // Rename avatar to image
            },
          },
        },
      ]),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalExpenses: totalExpenses[0] ? totalExpenses[0].total : 0,
          plannedBudget: plannedBudget[0] ? plannedBudget[0].plannedBudget : 0,
          recentExpenses,
        },
        "Expense Summary For Dashboard Fetched !!"
      )
    );
  } catch (error) {
    res.status(500).json(new ApiResponse(500, {}, "Server Error !!"));
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
  getTripExpenseSummaryForUser,
  getTripDashboardSummary,
  searchTripMembers,
  getInvitedAndAddedMembers,
  getTripExpenseSummaryForDashboard,
};
