import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addExpense,
  getAmountContributedByEachUser,
  getAmountOwedByUser,
  getAmountOwedToTheUser,
  getCategoryWiseExpensesForEachYear,
  getMonthwiseExpensesForEachYear,
  getTripExpenses,
} from "../controllers/expense.controller.js";

const expenseRouter = Router();
//* Based on Trips
expenseRouter.route("/:tripId/addExpense").post(verifyJWT, addExpense);
expenseRouter.route("/:tripId/getTripExpenses").get(verifyJWT, getTripExpenses);
expenseRouter
  .route("/:tripId/getAmountContributedByEachUser")
  .get(verifyJWT, getAmountContributedByEachUser);
expenseRouter
  .route("/:tripId/getAmountOwedToTheUser")
  .get(verifyJWT, getAmountOwedToTheUser);
expenseRouter
  .route("/:tripId/getAmountOwedByUser")
  .get(verifyJWT, getAmountOwedByUser);

//* These are based on users
expenseRouter
  .route("/getCategoryWiseExpenses")
  .get(verifyJWT, getCategoryWiseExpensesForEachYear);
expenseRouter
  .route("/getMonthwiseExpenses")
  .get(verifyJWT, getMonthwiseExpensesForEachYear);

export default expenseRouter;
