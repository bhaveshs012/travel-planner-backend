import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addExpense,
  getCategoryWiseExpensesForEachYear,
  getMonthwiseExpensesForEachYear,
  getTripExpenses,
} from "../controllers/expense.controller.js";

const expenseRouter = Router();

expenseRouter.route("/addExpense").post(verifyJWT, addExpense);
expenseRouter
  .route("/:tripId/getTripExpenses")
  .post(verifyJWT, getTripExpenses);
expenseRouter
  .route("/getCategoryWiseExpenses")
  .get(verifyJWT, getCategoryWiseExpensesForEachYear);
expenseRouter
  .route("/getMonthwiseExpenses")
  .get(verifyJWT, getMonthwiseExpensesForEachYear);

export default expenseRouter;
