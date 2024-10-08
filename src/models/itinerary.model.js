import { Schema } from "mongoose";
const itinerarySchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    placeToVisit: {
      type: String,
      default: "",
      trim: true,
    },
    checklist: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

export default itinerarySchema;
