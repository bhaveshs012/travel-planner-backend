import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addExpense,
  getTripExpenses,
} from "../controllers/expense.controller.js";

const expenseRouter = Router();

expenseRouter.route("/addExpense").post(verifyJWT, addExpense);
expenseRouter
  .route("/:tripId/getTripExpenses")
  .post(verifyJWT, getTripExpenses);

export default expenseRouter;
