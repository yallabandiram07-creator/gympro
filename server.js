require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const QRCode = require("qrcode");
const axios = require("axios");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const User = require("./models/User");
const Member = require("./models/Member");
const Attendance = require("./models/Attendance");
const Trainer = require("./models/Trainer");
const Payment = require("./models/Payment");
const DietLog = require("./models/DietLog");
const WhatsAppSetting = require("./models/WhatsAppSetting");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/", subscriptionRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const dynamicTokens = {};

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    req.user = jwt.verify(token, "secret");
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function memberAuth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No member token" });

  try {
    req.member = jwt.verify(token, "membersecret");
    next();
  } catch {
    res.status(401).json({ message: "Invalid member token" });
  }
}

function trainerAuth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No trainer token" });

  try {
    req.trainer = jwt.verify(token, "trainersecret");
    next();
  } catch {
    res.status(401).json({ message: "Invalid trainer token" });
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const exist = await User.findOne({ username });
    if (exist) return res.json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await new User({
      username,
      password: hashedPassword
    }).save();

    res.json({ message: "Registered successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ message: "Wrong password" });

    const token = jwt.sign({ id: user._id }, "secret");

    res.json({ message: "Login successful", token });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/members", auth, async (req, res) => {
  try {
    const { name, phone, password, plan, fees } = req.body;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(plan));

    const hashedPassword = await bcrypt.hash(password, 10);

    await new Member({
      userId: req.user.id,
      name,
      phone,
      password: hashedPassword,
      plan: Number(plan),
      fees: Number(fees),
      expiry: expiryDate.toDateString(),
      expiryDate,
      points: 0,
      workoutPlan: "",
      dietPlan: ""
    }).save();

    res.json({ message: "Member added successfully" });
  } catch (err) {
    console.log("Add member error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/members", auth, async (req, res) => {
  try {
    const members = await Member.find({ userId: req.user.id });
    res.json(members);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/member-login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    const member = await Member.findOne({ phone });
    if (!member) return res.json({ message: "Member not found" });

    const match = await bcrypt.compare(password, member.password);
    if (!match) return res.json({ message: "Wrong password" });

    const token = jwt.sign(
      { id: member._id, userId: member.userId },
      "membersecret"
    );

    res.json({ message: "Member login successful", token });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/member-profile", memberAuth, async (req, res) => {
  try {
    const member = await Member.findById(req.member.id);

    const attendance = await Attendance.find({
      memberId: member._id.toString()
    }).sort({ _id: -1 });

    const payments = await Payment.find({
      memberId: member._id.toString(),
      status: "paid"
    }).sort({ _id: -1 });

    const dietLogs = await DietLog.find({
      memberId: member._id.toString()
    }).sort({ _id: -1 });

    res.json({ member, attendance, payments, dietLogs });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/member-diet-log", memberAuth, async (req, res) => {
  try {
    const member = await Member.findById(req.member.id);
    const { weight, calories, protein, water, notes } = req.body;

    await new DietLog({
      userId: member.userId,
      memberId: member._id.toString(),
      date: new Date().toDateString(),
      weight: Number(weight),
      calories: Number(calories),
      protein: Number(protein),
      water: Number(water),
      notes
    }).save();

    res.json({ message: "Diet log added successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/member-diet-logs", memberAuth, async (req, res) => {
  try {
    const logs = await DietLog.find({ memberId: req.member.id }).sort({ _id: -1 });
    res.json(logs);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/trainers", auth, async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    const exist = await Trainer.findOne({ userId: req.user.id, phone });
    if (exist) return res.json({ message: "Trainer already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await new Trainer({
      userId: req.user.id,
      name,
      phone,
      email,
      password: hashedPassword
    }).save();

    res.json({ message: "Trainer added successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/trainers", auth, async (req, res) => {
  try {
    const trainers = await Trainer.find({ userId: req.user.id });
    res.json(trainers);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/trainer-login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    const trainer = await Trainer.findOne({ phone });
    if (!trainer) return res.json({ message: "Trainer not found" });

    const match = await bcrypt.compare(password, trainer.password);
    if (!match) return res.json({ message: "Wrong password" });

    const token = jwt.sign(
      { id: trainer._id, userId: trainer.userId },
      "trainersecret"
    );

    res.json({ message: "Trainer login successful", token });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/trainer-profile", trainerAuth, async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainer.id);
    const members = await Member.find({ userId: req.trainer.userId });

    res.json({ trainer, members });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/trainer/update-member-plan/:memberId", trainerAuth, async (req, res) => {
  try {
    const { workoutPlan, dietPlan } = req.body;

    const member = await Member.findOne({
      _id: req.params.memberId,
      userId: req.trainer.userId
    });

    if (!member) return res.json({ message: "Member not found" });

    member.workoutPlan = workoutPlan;
    member.dietPlan = dietPlan;

    await member.save();

    res.json({ message: "Workout and diet plan updated successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/attendance/:memberId", auth, async (req, res) => {
  try {
    const member = await Member.findOne({
      _id: req.params.memberId,
      userId: req.user.id
    });

    if (!member) return res.json({ message: "Member not found" });

    const today = new Date().toDateString();

    const alreadyMarked = await Attendance.findOne({
      userId: req.user.id,
      memberId: member._id.toString(),
      date: today
    });

    if (alreadyMarked) return res.json({ message: "Attendance already marked today" });

    await new Attendance({
      userId: req.user.id,
      memberId: member._id.toString(),
      memberName: member.name,
      date: today,
      time: new Date().toLocaleTimeString()
    }).save();

    member.points = Number(member.points || 0) + 5;
    await member.save();

    res.json({ message: "Attendance marked successfully. +5 points added" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/trainer/attendance/:memberId", trainerAuth, async (req, res) => {
  try {
    const member = await Member.findOne({
      _id: req.params.memberId,
      userId: req.trainer.userId
    });

    if (!member) return res.json({ message: "Member not found" });

    const today = new Date().toDateString();

    const alreadyMarked = await Attendance.findOne({
      userId: req.trainer.userId,
      memberId: member._id.toString(),
      date: today
    });

    if (alreadyMarked) return res.json({ message: "Attendance already marked today" });

    await new Attendance({
      userId: req.trainer.userId,
      memberId: member._id.toString(),
      memberName: member.name,
      date: today,
      time: new Date().toLocaleTimeString()
    }).save();

    member.points = Number(member.points || 0) + 5;
    await member.save();

    res.json({ message: "Attendance marked by trainer. +5 points added" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/attendance/today", auth, async (req, res) => {
  try {
    const today = new Date().toDateString();

    const attendance = await Attendance.find({
      userId: req.user.id,
      date: today
    });

    res.json(attendance);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/trainer/today-attendance", trainerAuth, async (req, res) => {
  try {
    const today = new Date().toDateString();

    const attendance = await Attendance.find({
      userId: req.trainer.userId,
      date: today
    });

    res.json(attendance);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/dynamic-qr", auth, async (req, res) => {
  try {
    const gymOwnerId = req.user.id;
    const token = Math.random().toString(36).substring(2, 10) + Date.now();

    dynamicTokens[gymOwnerId] = {
      token,
      expiresAt: Date.now() + 10000
    };

    const qrData = JSON.stringify({ gymOwnerId, token });
    const qrImage = await QRCode.toDataURL(qrData);

    res.json({ qr: qrImage, expiresIn: 10 });
  } catch {
    res.status(500).json({ message: "Dynamic QR error" });
  }
});

app.post("/member-qr-attendance", memberAuth, async (req, res) => {
  try {
    const { qrData } = req.body;
    let parsedQR;

    try {
      parsedQR = JSON.parse(qrData);
    } catch {
      return res.json({ message: "Invalid QR code" });
    }

    const { gymOwnerId, token } = parsedQR;
    const savedToken = dynamicTokens[gymOwnerId];

    if (!savedToken) return res.json({ message: "QR expired. Please scan latest QR." });
    if (savedToken.token !== token) return res.json({ message: "Invalid or old QR. Please scan latest QR." });
    if (Date.now() > savedToken.expiresAt) return res.json({ message: "QR expired. Please scan again." });

    const member = await Member.findOne({
      _id: req.member.id,
      userId: gymOwnerId
    });

    if (!member) return res.json({ message: "Member not found" });

    const today = new Date().toDateString();

    const alreadyMarked = await Attendance.findOne({
      userId: gymOwnerId,
      memberId: member._id.toString(),
      date: today
    });

    if (alreadyMarked) return res.json({ message: "Attendance already marked today" });

    await new Attendance({
      userId: gymOwnerId,
      memberId: member._id.toString(),
      memberName: member.name,
      date: today,
      time: new Date().toLocaleTimeString()
    }).save();

    member.points = Number(member.points || 0) + 5;
    await member.save();

    res.json({ message: `${member.name} attendance marked successfully. +5 reward points added` });
  } catch {
    res.status(500).json({ message: "QR attendance error" });
  }
});

app.get("/owner-payment-settings", auth, async (req, res) => {
  try {
    const owner = await User.findById(req.user.id);

    res.json({
      razorpayKeyId: owner.razorpayKeyId || "",
      hasSecret: Boolean(owner.razorpayKeySecret)
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/owner-payment-settings", auth, async (req, res) => {
  try {
    const { razorpayKeyId, razorpayKeySecret } = req.body;
    const owner = await User.findById(req.user.id);

    owner.razorpayKeyId = razorpayKeyId || "";

    if (razorpayKeySecret) {
      owner.razorpayKeySecret = razorpayKeySecret;
    }

    await owner.save();

    res.json({ message: "Razorpay settings saved successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/razorpay-key", memberAuth, async (req, res) => {
  try {
    const member = await Member.findById(req.member.id);
    const owner = await User.findById(member.userId);

    if (!owner.razorpayKeyId || !owner.razorpayKeySecret) {
      return res.json({ message: "Gym owner has not added Razorpay keys" });
    }

    res.json({ key: owner.razorpayKeyId });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/create-renewal-order", memberAuth, async (req, res) => {
  try {
    const { amount, days } = req.body;
    const member = await Member.findById(req.member.id);
    const owner = await User.findById(member.userId);

    if (!owner.razorpayKeyId || !owner.razorpayKeySecret) {
      return res.json({ message: "Gym owner has not added Razorpay keys" });
    }

    const ownerRazorpay = new Razorpay({
      key_id: owner.razorpayKeyId,
      key_secret: owner.razorpayKeySecret
    });

    const order = await ownerRazorpay.orders.create({
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: "gympro_" + Date.now()
    });

    await new Payment({
      userId: member.userId,
      memberId: member._id.toString(),
      memberName: member.name,
      phone: member.phone,
      amount: Number(amount),
      days: Number(days),
      razorpayOrderId: order.id,
      status: "created"
    }).save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: member.name,
      phone: member.phone
    });
  } catch (err) {
    console.log("Create payment order error:", err);
    res.status(500).json({ message: "Payment order error" });
  }
});

app.post("/verify-payment", memberAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const member = await Member.findById(req.member.id);
    const owner = await User.findById(member.userId);

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", owner.razorpayKeySecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.json({ message: "Payment verification failed" });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      memberId: req.member.id
    });

    if (!payment) return res.json({ message: "Payment record not found" });

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = "paid";
    await payment.save();

    const currentExpiry = new Date(member.expiryDate || member.expiry);
    const today = new Date();

    let newExpiry = currentExpiry > today ? currentExpiry : today;
    newExpiry.setDate(newExpiry.getDate() + Number(payment.days));

    member.expiryDate = newExpiry;
    member.expiry = newExpiry.toDateString();
    member.plan = Number(payment.days);
    member.fees = Number(payment.amount);

    await member.save();

    res.json({ message: "Payment successful. Membership renewed." });
  } catch {
    res.status(500).json({ message: "Payment verification error" });
  }
});

app.get("/admin-analytics", auth, async (req, res) => {
  try {
    const members = await Member.find({ userId: req.user.id });
    const trainers = await Trainer.find({ userId: req.user.id });
    const payments = await Payment.find({ userId: req.user.id, status: "paid" });

    const today = new Date();
    const todayString = today.toDateString();

    const todayAttendance = await Attendance.find({
      userId: req.user.id,
      date: todayString
    });

    let activeMembers = 0;
    let expiredMembers = 0;
    let expiringSoon = 0;
    let totalRevenue = 0;
    const expiringMembers = [];

    members.forEach(member => {
      totalRevenue += Number(member.fees || 0);

      const expiryDate = new Date(member.expiryDate || member.expiry);
      const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      if (daysLeft > 0) activeMembers++;
      if (daysLeft <= 0) expiredMembers++;

      if (daysLeft > 0 && daysLeft <= 3) {
        expiringSoon++;
        expiringMembers.push({
          name: member.name,
          phone: member.phone,
          expiry: member.expiry,
          daysLeft
        });
      }
    });

    let renewalRevenue = 0;
    payments.forEach(payment => {
      renewalRevenue += Number(payment.amount || 0);
    });

    const attendancePercentage = members.length
      ? Math.round((todayAttendance.length / members.length) * 100)
      : 0;

    res.json({
      totalMembers: members.length,
      activeMembers,
      expiredMembers,
      expiringSoon,
      totalTrainers: trainers.length,
      totalRevenue,
      renewalRevenue,
      totalPaidRenewals: payments.length,
      todayAttendance: todayAttendance.length,
      attendancePercentage,
      expiringMembers
    });
  } catch {
    res.status(500).json({ message: "Analytics error" });
  }
});

app.post("/admin/update-member-workout/:memberId", auth, async (req, res) => {
  try {
    const { workoutPlan } = req.body;

    const member = await Member.findOne({
      _id: req.params.memberId,
      userId: req.user.id
    });

    if (!member) return res.json({ message: "Member not found" });

    member.workoutPlan = workoutPlan;
    await member.save();

    res.json({ message: "AI workout plan saved to member dashboard" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/whatsapp-settings", auth, async (req, res) => {
  try {
    const setting = await WhatsAppSetting.findOne({ userId: req.user.id });

    if (!setting) {
      return res.json({
        phoneNumberId: "",
        templateName: "hello_world",
        languageCode: "en_US",
        hasToken: false
      });
    }

    res.json({
      phoneNumberId: setting.phoneNumberId || "",
      templateName: setting.templateName || "hello_world",
      languageCode: setting.languageCode || "en_US",
      hasToken: Boolean(setting.accessToken)
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/whatsapp-settings", auth, async (req, res) => {
  try {
    const { phoneNumberId, accessToken, templateName, languageCode } = req.body;

    let setting = await WhatsAppSetting.findOne({ userId: req.user.id });

    if (!setting) {
      setting = new WhatsAppSetting({ userId: req.user.id });
    }

    setting.phoneNumberId = phoneNumberId || "";
    setting.templateName = templateName || "hello_world";
    setting.languageCode = languageCode || "en_US";

    if (accessToken) {
      setting.accessToken = accessToken;
    }

    await setting.save();

    res.json({ message: "WhatsApp settings saved successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

async function sendWhatsAppTemplate(setting, phone) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${setting.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: "91" + phone,
        type: "template",
        template: {
          name: setting.templateName || "hello_world",
          language: {
            code: setting.languageCode || "en_US"
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${setting.accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    return true;
  } catch (err) {
    console.log("WhatsApp error:", err.response?.data || err.message);
    return false;
  }
}

app.post("/send-expiry-reminders", auth, async (req, res) => {
  try {
    const setting = await WhatsAppSetting.findOne({ userId: req.user.id });

    if (!setting || !setting.phoneNumberId || !setting.accessToken) {
      return res.json({ message: "Add WhatsApp settings first" });
    }

    const members = await Member.find({ userId: req.user.id });

    const today = new Date();
    let eligibleCount = 0;
    let sentCount = 0;
    let failedCount = 0;

    for (const member of members) {
      const expiryDate = new Date(member.expiryDate || member.expiry);

      if (isNaN(expiryDate.getTime())) continue;

      const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      if (daysLeft >= 0 && daysLeft <= 3) {
        eligibleCount++;

        const sent = await sendWhatsAppTemplate(setting, member.phone);

        if (sent) sentCount++;
        else failedCount++;
      }
    }

    res.json({
      message: `${eligibleCount} expiring members found. ${sentCount} sent, ${failedCount} failed.`
    });
  } catch (err) {
    console.log("Reminder error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/test-route", (req, res) => {
  res.json({ message: "Server route working" });
});

app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000 🚀");
});