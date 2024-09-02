// Imports
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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

  // performing the validations
  if (
    [username, fullName, email, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required !!");
  }

  // check if user exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    return res
      .status(400)
      .json(new ApiResponse(400, "", "User already exists !!"));
  }

  // check if avatar image is present : multer will give this field
  const avatarImageLocalPath = req.files?.avatar[0]?.path;

  // check for cover image : optional haii toh ispe aur checks laga rahe
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // avatar not found: throw error
  if (!avatarImageLocalPath)
    return res
      .status(401)
      .json(new ApiResponse(401, "", "Profile Image is Required !!"));

  //upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarImageLocalPath);
  let coverImage;
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

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

  // create user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // check is user is created
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    return res
      .status(500)
      .json(new ApiResponse(500, "", "User could not be registered !!"));
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createdUser },
        "User registered Successfully"
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
    .clearCookie("refreshToken", cookieOptions);
  json(new ApiResponse(200, {}, "User logged out !!"));
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

const acceptTripInvitation = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user?.id;

  //* Validate the Invitation
  const invite = await Invitation.findOne({
    tripId,
    invitee: userId,
  });

  if (!invite) {
    throw new ApiError(400, "Invitation is not valid !!");
  }

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

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedTrip, "Invitation accepted successfully !!")
    );
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
};
