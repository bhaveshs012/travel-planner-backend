import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addSingleItineraryItem,
  createTripPlan,
  deleteTrip,
  getTripById,
  getTripSummary,
  inviteUserToTrip,
  removeTripMember,
  updateTripPlan,
} from "../controllers/trip.controller.js";

const tripRouter = Router();

tripRouter.route("/createTripPlan").post(
  upload.fields([
    {
      name: "coverImage",
      maxCount: 1, // no. of files
    },
  ]),
  verifyJWT,
  createTripPlan
);
tripRouter
  .route("/:tripId/itineraries")
  .post(verifyJWT, addSingleItineraryItem);
tripRouter.route("/getTripPlan/:tripId").get(verifyJWT, getTripById);
tripRouter.route("/:tripId/getSummary").get(verifyJWT, getTripSummary);

tripRouter.route("/:tripId").put(verifyJWT, updateTripPlan);
tripRouter.route("/:tripId").delete(verifyJWT, deleteTrip);
tripRouter.route("/inviteToTrip").post(verifyJWT, inviteUserToTrip);
tripRouter.route("/:tripId/:memberId").post(verifyJWT, removeTripMember);

export default tripRouter;
