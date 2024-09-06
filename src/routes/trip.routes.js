import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addSingleItineraryItem,
  createTripPlan,
  deleteTrip,
  getInvitedAndAddedMembers,
  getTripById,
  getTripDashboardSummary,
  getTripExpenseSummaryForUser,
  getTripSummary,
  inviteUserToTrip,
  removeTripMember,
  searchTripMembers,
  updateTripPlan,
} from "../controllers/trip.controller.js";

const tripRouter = Router();

tripRouter.route("/createTripPlan").post(verifyJWT, createTripPlan);
tripRouter
  .route("/getTripDashboardSummary")
  .get(verifyJWT, getTripDashboardSummary);
tripRouter
  .route("/:tripId/itineraries")
  .post(verifyJWT, addSingleItineraryItem);
tripRouter.route("/getTripPlan/:tripId").get(verifyJWT, getTripById);
tripRouter.route("/:tripId/getSummary").get(verifyJWT, getTripSummary);
tripRouter
  .route("/getTripExpenseSummaryForUser")
  .get(verifyJWT, getTripExpenseSummaryForUser);
tripRouter.route("/:tripId").patch(verifyJWT, updateTripPlan);
tripRouter.route("/:tripId").delete(verifyJWT, deleteTrip);

//* User Related
tripRouter
  .route("/:tripId/searchTripMembers")
  .get(verifyJWT, searchTripMembers);
tripRouter.route("/inviteToTrip").post(verifyJWT, inviteUserToTrip);
tripRouter
  .route("/:tripId/:memberId/removeMember")
  .post(verifyJWT, removeTripMember);
tripRouter
  .route("/:tripId/getInvitedAndAddedMembers")
  .get(verifyJWT, getInvitedAndAddedMembers);

export default tripRouter;
