import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addExpense } from "../controllers/expense.controller.js";

const expenseRouter = Router();

expenseRouter.route("/addExpense").post(verifyJWT, addExpense);

export default expenseRouter;
