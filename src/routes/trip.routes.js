import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTripPlan, getTripById } from "../controllers/trip.controller.js";

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

tripRouter.route("/getTripPlan/:tripId").get(verifyJWT, getTripById);

export default tripRouter;
