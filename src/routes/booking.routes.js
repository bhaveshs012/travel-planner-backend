import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addBooking, dummyCheck } from "../controllers/booking.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const bookingRouter = Router();

bookingRouter.route("/addBooking").post(
  verifyJWT,
  upload.fields([
    {
      name: "bookingReceipt",
      maxCount: 1, // no. of files
    },
  ]),
  addBooking
);
bookingRouter.route("/dummyCheck").get(verifyJWT, dummyCheck);

export default bookingRouter;
