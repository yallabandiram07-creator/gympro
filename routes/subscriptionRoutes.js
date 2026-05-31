const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Subscription = require("../models/Subscription");
const Member = require("../models/Member");

// Middleware verification authentication
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    req.user = jwt.verify(token, "secret");
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// GET: Fetch Active Plan Status Details
router.get("/owner-subscription", auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    const memberCount = await Member.countDocuments({
      userId: req.user.id
    });

    if (!subscription) {
      return res.json({
        planName: "Free",
        status: "active",
        memberLimit: 20,
        memberCount,
        locked: false
      });
    }

    const today = new Date();
    const expiryDate = new Date(subscription.expiryDate);

    if (expiryDate < today) {
      subscription.status = "expired";
      await subscription.save();
    }

    let memberLimit = 20;
    if (subscription.planName === "Basic") memberLimit = 1000;
    if (subscription.planName === "Premium") memberLimit = 99999;

    res.json({
      planName: subscription.planName,
      status: subscription.status,
      expiryDate: subscription.expiryDate,
      memberLimit,
      memberCount,
      locked: subscription.status === "expired"
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST: Save and Process Razorpay Subscription Payment
router.post("/buy-subscription", auth, async (req, res) => {
  try {
    const { planName, price, duration, paymentId } = req.body;
    const userId = req.user.id;

    const durationDays = Number(duration) || 30;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    let subscription = await Subscription.findOne({ userId });

    if (subscription) {
      // Update existing database entry
      subscription.planName = planName;
      subscription.price = Number(price);
      subscription.durationDays = durationDays;
      subscription.startDate = new Date();
      subscription.expiryDate = expiryDate;
      subscription.status = "active";
      subscription.razorpayPaymentId = paymentId; 

      await subscription.save();
    } else {
      // Create a clean new database entry (Fixed colon syntax)
      subscription = new Subscription({
        userId,
        planName,
        price: Number(price),
        durationDays,
        startDate: new Date(),
        expiryDate,
        status: "active",
        razorpayPaymentId: paymentId 
      });

      await subscription.save();
    }

    res.json({
      success: true,
      message: `${planName} subscription activated successfully`,
      subscription
    });
  } catch (err) {
    console.log("Backend route crash: ", err);
    res.status(500).json({ message: "Server error saving transaction details." });
  }
});

module.exports = router;