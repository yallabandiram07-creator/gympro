const mongoose = require("mongoose");

const DietLogSchema = new mongoose.Schema({
  userId: String,
  memberId: String,
  date: {
    type: String,
    default: new Date().toDateString()
  },
  weight: Number,
  calories: Number,
  protein: Number,
  water: Number,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("DietLog", DietLogSchema);