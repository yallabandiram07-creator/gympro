const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  razorpayKeyId: {
    type: String,
    default: ""
  },
  razorpayKeySecret: {
    type: String,
    default: ""
  },
  blocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);