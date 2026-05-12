const mongoose = require("mongoose");

const MemberSchema = new mongoose.Schema({
  userId: String,
  name: String,
  phone: String,
  password: String,
  plan: Number,
  fees: Number,
  expiry: String,
  expiryDate: Date,
  points: {
    type: Number,
    default: 0
  },
  workoutPlan: {
    type: String,
    default: ""
  },
  dietPlan: {
    type: String,
    default: ""
  }
});

module.exports = mongoose.model("Member", MemberSchema);