const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  gymName: { type: String, default: "" },
  ownerName: { type: String, default: "" },
  username: { type: String, required: true },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  password: { type: String, required: true },

  razorpayKeyId: { type: String, default: "" },
  razorpayKeySecret: { type: String, default: "" },

  preferences: {
    whatsappReminders: { type: Boolean, default: true },
    paymentAlerts: { type: Boolean, default: true },
    expiryAlerts: { type: Boolean, default: true },
    theme: { type: String, default: "Dark Theme" },
    currency: { type: String, default: "₹ INR Currency" }
  },

  blocked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);