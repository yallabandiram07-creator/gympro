const mongoose = require("mongoose");

const RedemptionSchema = new mongoose.Schema({
  userId: String,
  memberId: String,
  memberName: String,
  rewardName: String,
  points: Number,
  image: String,
  status: {
    type: String,
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Redemption", RedemptionSchema);