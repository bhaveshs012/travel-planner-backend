import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true,
    },
    avatar: {
      type: String,
      required: [true, "Profile Image is required"],
    },
    coverImage: {
      type: String,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
      default: null, // Initialize refresh token field in the schema
    },
  },
  { timestamps: true }
);

//* Adding hooks for hashing the password before saving
userSchema.pre("save", async function (next) {
  // Check if password is modified or not
  if (!this.isModified("password")) return next();

  // Hash the password with a salt round of 10
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//* Creating user methods:

// For checking if the provided password is correct
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// For generating the accessToken
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY, // Ensure this is set in your environment
    }
  );
};

// For generating the refreshToken
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY, // Ensure this is set in your environment
    }
  );
};


export const User = mongoose.model("User", userSchema);
