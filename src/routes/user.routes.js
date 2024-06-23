import { Router } from "express";

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

export default userRouter;
