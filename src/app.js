import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// Loading all the middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" })); // jo bhi data aaye usko json mein treat krna
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); // set the static folder
app.use(cookieParser());

// Adding all the routes
import userRouter from "./routes/user.routes.js";
app.use("/api/v1/users", userRouter); // on encountering this route : send the control to userRouter

export { app };
