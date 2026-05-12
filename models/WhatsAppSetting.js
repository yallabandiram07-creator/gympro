const mongoose = require("mongoose");

const WhatsAppSettingSchema = new mongoose.Schema({
  userId: String,
  phoneNumberId: {
    type: String,
    default: ""
  },
  accessToken: {
    type: String,
    default: ""
  },
  templateName: {
    type: String,
    default: "hello_world"
  },
  languageCode: {
    type: String,
    default: "en_US"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("WhatsAppSetting", WhatsAppSettingSchema);