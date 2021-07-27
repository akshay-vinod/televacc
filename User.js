const mongoose = require("mongoose");

var userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      trim: true,
    },
    serverDown: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Boolean,
      default: false,
    },
    notify: {
      type: Boolean,
      default: false,
    },
    blockData: {
      type: [],
      required: true,
    },
    dose: {
      type: Number,
      default: 0,
    },
    pay: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
