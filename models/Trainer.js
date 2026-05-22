const mongoose = require("mongoose");

const TrainerSchema = new mongoose.Schema({
  userId: String,
  name: String,
  phone: String,
  email: String,
  password: String,
  specialization: String,
experience: Number,
status: {
  type: String,
  default: "active"
}
});

module.exports = mongoose.model("Trainer", TrainerSchema);