import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  getTripsCreatedByUser,
  acceptTripInvitation,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
  // inserting multer middleware
  upload.fields([
    {
      name: "avatar",
      maxCount: 1, // no. of files
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
userRouter.route("/login").post(loginUser);

// Secured Routes
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-token").post(refreshAccessToken);
userRouter.route("/current-user").get(verifyJWT, getCurrentUser);

//* Trips Related
userRouter
  .route("/getTripsCreatedByUser")
  .get(verifyJWT, getTripsCreatedByUser);
userRouter.route("/getTripsJoinedByUser").get(verifyJWT, getTripsCreatedByUser);
userRouter.route("/acceptInvite/:tripId").post(verifyJWT, acceptTripInvitation);

export default userRouter;
