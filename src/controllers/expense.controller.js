import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Expense } from "../models/expense.model.js";

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

export { addExpense };
