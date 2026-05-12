const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  userId: String,

  planName: {
    type: String,
    default: "Free"
  },

  price: {
    type: Number,
    default: 0
  },

  durationDays: {
    type: Number,
    default: 30
  },

  startDate: {
    type: Date,
    default: Date.now
  },

  expiryDate: Date,

  status: {
    type: String,
    default: "active"
  },

  razorpayPaymentId: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);