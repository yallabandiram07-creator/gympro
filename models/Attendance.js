const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  userId: String,
  memberId: String,
  memberName: String,
  date: String,
  time: String
});

module.exports = mongoose.model("Attendance", attendanceSchema);