import mongoose, { Schema } from "mongoose";

const expenseSchema = new Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripPlan",
      required: true,
    },
    category: {
      type: String,
      enum: [
        "food",
        "accomodation",
        "entertainment",
        "travel",
        "miscellaneous",
        "others",
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      required: true,
      trim: true,
    },
    paidTo: {
      type: String,
      required: true,
      trim: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      validate: {
        validator: function (value) {
          return value > 0;
        },
        message: "Amount should not be negative",
      },
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    splitBetween: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export const Expense = mongoose.model("Expense", expenseSchema);
