import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Expense } from "../models/expense.model.js";
import mongoose from "mongoose";

const addExpense = asyncHandler(async (req, res) => {
  const {
    tripId,
    category,
    description,
    paidTo,
    paidBy,
    amount,
    paymentDate,
    splitBetween,
  } = req.body;

  // Validations
  if (!paymentDate) {
    throw new ApiError(400, "Payment Date is required !!");
  } else if (isNaN(Date.parse(paymentDate))) {
    throw new ApiError(400, "Payment Date is Invalid !!");
  }

  if (
    !splitBetween ||
    !Array.isArray(splitBetween) ||
    splitBetween.length === 0
  ) {
    throw new ApiError(
      400,
      "Split between must be a non-empty array of user IDs."
    );
  }

  // Create the document
  const expense = await Expense.create({
    tripId,
    category,
    description,
    paidTo,
    paidBy,
    amount,
    paymentDate,
    splitBetween,
  });

  // check is user is created
  const createdExpense = await Expense.findById(expense._id);

  if (!createdExpense) {
    throw new ApiError(
      500,
      "Something went wrong while creating the Trip Plan !!"
    );
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        createdExpense,
        `Expense Added Successfully to Trip ${tripId} !!`
      )
    );
});

const getTripExpenses = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  try {
    const tripExpenses = await Expense.aggregate([
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
        $unwind: "$tripDetails", // Deconstruct tripDetails array
      },
      {
        $addFields: {
          plannedBudget: "$tripDetails.plannedBudget", // Add plannedBudget field
        },
      },
      // Lookup to get details of the user who paid
      {
        $lookup: {
          from: "users",
          localField: "paidBy",
          foreignField: "_id",
          as: "paidByDetails",
        },
      },
      {
        $unwind: "$paidByDetails", // Deconstruct paidByDetails array
      },
      // Lookup to get details of users in splitBetween
      {
        $lookup: {
          from: "users",
          localField: "splitBetween",
          foreignField: "_id",
          as: "splitBetweenDetails",
        },
      },
      {
        $addFields: {
          splitBetweenDetails: {
            $map: {
              input: "$splitBetweenDetails",
              as: "user",
              in: {
                name: "$$user.fullName", // Include only the name
                image: "$$user.avatar", // Include only the image
              },
            },
          },
        },
      },
      // Project the final output
      {
        $project: {
          _id: 1,
          tripId: 1,
          category: 1,
          description: 1,
          paidTo: 1,
          paidBy: {
            name: "$paidByDetails.fullName", // Include the name of the user who paid
            avatar: "$paidByDetails.avatar", // Include the avatar of the user who paid
          }, // Include the name of the user who paid
          amount: 1,
          paymentDate: 1,
          plannedBudget: 1, // Include plannedBudget
          splitBetween: "$splitBetweenDetails", // Include details of users in splitBetween
        },
      },
    ]);
    if (tripExpenses.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No Expenses Found !!"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          tripExpenses,
          "Trip Expenses Fetched Successfully !!"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.toString(), "Server Error !!"));
  }
});

export { addExpense, getTripExpenses };
