// Imports
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import cookieOptions from "../utils/cookieOptions.js";
import { TripPlan } from "../models/trip.model.js";
import { Invitation } from "../models/invitation.model.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    // Find the user by ID
    const user = await User.findById(userId);

    // Ensure the user exists
    if (!user) {
      throw new Error("User not found");
    }

    // Generate access and refresh tokens using user methods
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save the new refresh token in the database once
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Return the generated tokens
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new Error("Something went wrong while generating tokens");
  }
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized Access !!");
    }

    // Decode the data present in the refresh token
    const decodedData = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the user by the ID present in the decoded token
    const user = await User.findById(decodedData?._id);

    if (!user) {
      throw new ApiError(401, "Unauthorized Access !! Invalid Refresh Token");
    }

    // Check if the incoming token matches the one stored in the user's record
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid Refresh Token !!");
    }

    // Generate new access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    // Send the new tokens as cookies and in the response body
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const registerUser = asyncHandler(async (req, res) => {
  // Getting the data from the frontend
  const { username, fullName, email, password } = req.body;

  // Performing the validations
  if (
    [username, fullName, email, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required !!");
  }

  // Check if the user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    return res
      .status(400)
      .json(new ApiResponse(400, "", "User already exists !!"));
  }

  // Handle avatar image from multer : Directly we get the file :: no need for localFilePath
  const avatarFile = req.files?.avatar?.[0];

  if (!avatarFile) {
    return res
      .status(401)
      .json(new ApiResponse(401, "", "Profile Image is Required !!"));
  }

  //* Directly get the uploaded cloudinary URL
  const avatar = avatarFile.path;
  if (!avatar) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          "",
          "Server Error :: Profile Image could not be uploaded !!"
        )
      );
  }

  // Handle cover image if provided
  let coverImage;
  if (req.files?.coverImage?.[0]) {
    coverImage = req.files.coverImage[0].path;
  }

  // Create the user
  const user = await User.create({
    fullName,
    avatar,
    coverImage, // Optional field
    email,
    password,
    username: username.toLowerCase(),
  });

  // Retrieve the created user (excluding sensitive fields)
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    return res
      .status(500)
      .json(new ApiResponse(500, "", "User could not be registered !!"));
  }

  // Respond with the newly created user
  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: createdUser,
      },
      "User registered successfully"
    )
  );
});

const loginUser = asyncHandler(async (req, res) => {
  // get the data from the front end
  const { username, email, password } = req.body;

  // validations
  if (!username && !email)
    throw new ApiError(401, "Username or email is required !!");

  // check if the user exists
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    return res
      .status(400)
      .json(new ApiResponse(400, "", "User does not exists !!"));
  }

  // validate the password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res
      .status(400)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(new ApiResponse(400, "", "Invalid Credentials !!"));
  }

  // generate the tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // log the user in : basically set the tokens in the cookies
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send the response
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
        "User logged in Successfully !!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // we have auth middle ware added : we get access to the current user
  await User.findByIdAndUpdate(
    // db mein update karo RF ko khaali karo
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  // send response after clearing cookies
  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out !!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, req.user, "Current User fetched successfully !!") // middleware run ho chuka hai so apne pass user hai
  );
});

//* Related to Trip Plans
const getTripsCreatedByUser = asyncHandler(async (req, res) => {
  // already passed through middleware
  const userId = req.user._id;

  try {
    const trips = await TripPlan.find({ createdBy: userId });
    res
      .status(200)
      .json(new ApiResponse(200, trips, "Trips Fetched Successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went Wrong !!");
  }
});

const getTripsJoinedByUser = asyncHandler(async (req, res) => {
  // already passed through middleware
  const userId = req.user._id;

  try {
    const trips = await TripPlan.find({ tripMembers: userId });
    res
      .status(200)
      .json(new ApiResponse(200, trips, "Trips Fetched Successfully"));
  } catch (error) {
    throw new ApiError(500, "Something went Wrong !!");
  }
});

//* Related to Invitations
const acceptTripInvitation = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  const userId = req.user?.id;

  //* Validate the Invitation
  const invite = await Invitation.findById(inviteId);

  if (!invite) {
    throw new ApiError(400, "Invitation is not valid !!");
  }

  const tripId = invite.tripId;

  //* Update the trip Members in the Trip Document
  const updatedTrip = await TripPlan.findByIdAndUpdate(
    tripId,
    {
      $addToSet: { tripMembers: userId },
    },
    { new: true }
  );

  if (!updatedTrip) {
    throw new ApiError(
      500,
      "Something went wrong while accepting the invite !!"
    );
  }
  // If the addition was successful -> delete the invitation
  await Invitation.findOneAndDelete({
    tripId,
    invitee: userId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedTrip, "Invitation accepted successfully !!")
    );
});

const declineTripInvitation = asyncHandler(async (req, res) => {
  try {
    const { inviteId } = req.params;

    //* Validate the Invitation
    const invite = await Invitation.findByIdAndDelete(inviteId);

    if (!invite) {
      res
        .status(401)
        .json(new ApiResponse(401, "", "Invitaion is not Valid !!"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, invite, "Invitation declined successfully !!")
      );
  } catch (error) {
    res
      .status(500)
      .json(
        new ApiResponse(
          500,
          "",
          "Server Error. Could not decline Invitation !!"
        )
      );
  }
});

const getAllInvitationsForUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  try {
    const invitations = await Invitation.aggregate([
      {
        $match: {
          invitee: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "inviter",
          foreignField: "_id",
          as: "inviterDetails",
        },
      },
      {
        $unwind: "$inviterDetails",
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
        $project: {
          inviter: {
            fullName: "$inviterDetails.fullName",
            avatar: "$inviterDetails.avatar",
            username: "$inviterDetails.username",
          },
          tripDetails: {
            tripId: "$tripDetails._id",
            tripName: "$tripDetails.tripName",
            tripDesc: "$tripDetails.tripDesc",
          },
          invitationId: "$_id",
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          invitations,
          "Invitations for the user Fetched Successfully !!"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          error.message,
          "Server Error :: Getting all Invitaions For User !!"
        )
      );
  }
});

//* Search Users Based on Search Parameter
const searchUsers = asyncHandler(async (req, res) => {
  const { searchParameter } = req.query;
  const userId = req.user?._id;

  try {
    const filteredMembers = await User.aggregate([
      {
        $match: {
          username: {
            $regex: `^${searchParameter}`,
            $options: "i", // To make the search case insensitive
          },
        },
      },
      {
        $project: {
          userId: "$_id",
          fullName: "$fullName",
          image: "$avatar",
          _id: 0,
        },
      },
    ]);
    if (!filteredMembers.length) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, [], "Search Criteria could not be fulfilled !!")
        );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { filteredMembers, currentUserId: userId },
          "Users Filtered successfully !!"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.toString(), "Server Error !!"));
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  generateAccessAndRefreshTokens,
  refreshAccessToken,
  getCurrentUser,
  getTripsCreatedByUser,
  getTripsJoinedByUser,
  acceptTripInvitation,
  declineTripInvitation,
  getAllInvitationsForUser,
  searchUsers,
};
