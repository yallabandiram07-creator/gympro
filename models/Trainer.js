const mongoose = require("mongoose");

const TrainerSchema = new mongoose.Schema({
  userId: String,
  name: String,
  phone: String,
  email: String,
  password: String
});

module.exports = mongoose.model("Trainer", TrainerSchema);