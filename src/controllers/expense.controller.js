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

const getCategoryWiseExpensesForEachYear = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    return res.status(400).json(new ApiError(400, "Unauthorized Access !!"));
  }
  try {
    const categoryWiseExpensesForYear = await Expense.aggregate([
      {
        $match: {
          paidBy: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $project: {
          year: { $year: "$paymentDate" },
          category: 1,
          amount: 1,
        },
      },
      {
        $group: {
          _id: { year: "$year", category: "$category" },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          category: "$_id.category",
          totalAmount: 1,
        },
      },
      {
        $sort: { year: 1, category: 1 },
      },
    ]);

    if (categoryWiseExpensesForYear.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No expense details found !!"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          categoryWiseExpensesForYear,
          "Category Wise Expenses Fetched Successfully !!"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          [],
          "Server Error :: Couldn't fetch the expense details !!"
        )
      );
  }
});

const getMonthwiseExpensesForEachYear = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    return res.status(400).json(new ApiError(400, "Unauthorized Access !!"));
  }
  try {
    const monthwiseExpensesForYear = await Expense.aggregate([
      {
        $match: {
          paidBy: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $project: {
          year: { $year: "$paymentDate" },
          month: {
            $dateToString: {
              format: "%B",
              date: "$paymentDate",
              timezone: "+05:30",
            },
          },
          category: 1,
          amount: 1,
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalAmount: 1,
        },
      },
      {
        $sort: { year: 1, month: 1 },
      },
    ]);

    if (monthwiseExpensesForYear.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No expense details found !!"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          monthwiseExpensesForYear,
          "Month Wise Expenses Fetched Successfully !!"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          [],
          "Server Error :: Couldn't fetch the expense details !!"
        )
      );
  }
});

const getAmountContributedByEachUser = asyncHandler(async (req, res) => {
  const { tripId } = req.params;

  try {
    const amountContributedByEachUser = await Expense.aggregate([
      {
        $match: {
          tripId: new mongoose.Types.ObjectId(tripId),
        },
      },
      {
        $group: {
          _id: { paidBy: "$paidBy" },
          totalAmount: {
            $sum: "$amount",
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.paidBy",
          foreignField: "_id",
          as: "payerDetails",
        },
      },
      {
        $unwind: "$payerDetails",
      },
      {
        $project: {
          fullName: "$payerDetails.fullName",
          avatar: "$payerDetails.avatar",
          totalAmount: 1,
          _id: 0,
        },
      },
    ]);
    if (amountContributedByEachUser.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No expense details found !!"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          amountContributedByEachUser,
          "Contibution Details Fetched Successfully !!"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          [],
          "Server Error :: Couldn't fetch the expense details !!"
        )
      );
  }
});

const getAmountOwedToTheUser = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user?._id;
  try {
    const amountOwedToUser = await Expense.aggregate([
      // get the expenses for this trip
      {
        $match: {
          tripId: new mongoose.Types.ObjectId(tripId),
        },
      },
      // get all the expenses made by user
      {
        $match: {
          paidBy: new mongoose.Types.ObjectId(userId),
        },
      },
      // calculate the total number of people involved in each expense
      {
        $addFields: {
          splitCount: { $size: { $ifNull: ["$splitBetween", []] } }, // Ensure splitBetween is treated as an array
        },
      },
      // spread up the split details
      {
        $unwind: "$splitBetween",
      },
      // group it based on the split Between
      {
        $group: {
          _id: "$splitBetween", // Group by users in splitBetween
          totalOwed: { $sum: { $divide: ["$amount", "$splitCount"] } }, // Divide the amount by the number of people splitting the cost
        },
      },
      {
        $project: {
          _id: 0,
          user: "$_id", // Include user ID
          totalOwed: 1, // Include total amount owed
        },
      },
      // remove the split for his own expense
      {
        $match: {
          user: {
            $ne: new mongoose.Types.ObjectId(userId),
          },
        },
      },
      // fetch the details of each user
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      // get just the required fields
      {
        $project: {
          fullName: "$userDetails.fullName",
          avatar: "$userDetails.avatar",
          totalOwed: 1,
        },
      },
    ]);

    if (amountOwedToUser.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No expense details found !!"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          amountOwedToUser,
          "Details Fetched Successfully !!"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          [],
          "Server Error :: Couldn't fetch the expense details !!"
        )
      );
  }
});

const getAmountOwedByUser = asyncHandler(async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user?._id;

  try {
    const amountOwedByUser = await Expense.aggregate([
      {
        $match: {
          tripId: new mongoose.Types.ObjectId(tripId),
        },
      },
      {
        $addFields: {
          numberOfSplits: {
            $size: { $ifNull: ["$splitBetween", []] },
          },
        },
      },
      {
        $match: {
          splitBetween: {
            $in: [new mongoose.Types.ObjectId(userId)], // user ID
          },
          paidBy: {
            $ne: new mongoose.Types.ObjectId(userId), // user ID
          },
        },
      },
      {
        $group: {
          _id: "$splitBetween", // Group by users in splitBetween
          totalOwed: { $sum: { $divide: ["$amount", "$numberOfSplits"] } },
        }, // Divide the amount by the number of people splitting the cost
      },
      {
        $unwind: {
          path: "$_id",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
        },
      },
      {
        $project: {
          fullName: "$userDetails.fullName",
          avatar: "$userDetails.avatar",
          totalOwed: "$totalOwed",
          _id: 0,
        },
      },
    ]);
    if (amountOwedByUser.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No expense details found !!"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          amountOwedByUser,
          "Details Fetched Successfully !!"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          [],
          "Server Error :: Couldn't fetch the expense details !!"
        )
      );
  }
});

export {
  addExpense,
  getTripExpenses,
  getCategoryWiseExpensesForEachYear,
  getMonthwiseExpensesForEachYear,
  getAmountContributedByEachUser,
  getAmountOwedToTheUser,
  getAmountOwedByUser,
};
