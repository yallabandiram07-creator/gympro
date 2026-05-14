const mongoose = require("mongoose");

const gymProfileSchema = new mongoose.Schema({
  userId: String,

  gymName: String,
  ownerName: String,
  phone: String,
  address: String,
  timings: String,

  plans: [
    {
      name: String,
      price: Number,
      days: Number
    }
  ]
});

module.exports = mongoose.model("GymProfile", gymProfileSchema);