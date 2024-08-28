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
expenseRouter.route("/addExpense").post(verifyJWT, addExpense);
expenseRouter
  .route("/:tripId/getTripExpenses")
  .post(verifyJWT, getTripExpenses);
expenseRouter
  .route("/:tripId/getAmountContributedByEachUser")
  .post(verifyJWT, getAmountContributedByEachUser);
expenseRouter
  .route("/:tripId/getAmountOwedToTheUser")
  .post(verifyJWT, getAmountOwedToTheUser);
expenseRouter
  .route("/:tripId/getAmountOwedByUser")
  .post(verifyJWT, getAmountOwedByUser);

//* These are based on users
expenseRouter
  .route("/getCategoryWiseExpenses")
  .get(verifyJWT, getCategoryWiseExpensesForEachYear);
expenseRouter
  .route("/getMonthwiseExpenses")
  .get(verifyJWT, getMonthwiseExpensesForEachYear);

export default expenseRouter;
