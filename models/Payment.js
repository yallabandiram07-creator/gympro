const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  userId: String,
  memberId: String,
  memberName: String,
  phone: String,
  amount: Number,
  days: Number,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  status: {
    type: String,
    default: "created"
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Payment", PaymentSchema);