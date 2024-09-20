import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  getTripsCreatedByUser,
  acceptTripInvitation,
  searchUsers,
  getAllInvitationsForUser,
  declineTripInvitation,
  updateProfile,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

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
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-token").post(refreshAccessToken);
userRouter.route("/current-user").get(verifyJWT, getCurrentUser);
userRouter.route("/updateProfile").patch(
  verifyJWT,
  upload.fields([
    {
      name: "avatar",
      maxCount: 1, // no. of files
    },
  ]),
  updateProfile
);

//* Search All Users
userRouter.route("/searchUsers").get(verifyJWT, searchUsers);

//* Trips Related
userRouter
  .route("/getTripsCreatedByUser")
  .get(verifyJWT, getTripsCreatedByUser);
userRouter.route("/getTripsJoinedByUser").get(verifyJWT, getTripsCreatedByUser);
userRouter
  .route("/:inviteId/acceptInvite")
  .post(verifyJWT, acceptTripInvitation);
userRouter
  .route("/:inviteId/declineInvite")
  .delete(verifyJWT, declineTripInvitation);
userRouter
  .route("/getAllInvitationsForUser")
  .get(verifyJWT, getAllInvitationsForUser);

export default userRouter;
