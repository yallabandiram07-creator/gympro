const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Subscription = require("../models/Subscription");
const Member = require("../models/Member");

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

router.post("/buy-subscription", auth, async (req, res) => {
  try {
    const { planName, price, duration } = req.body;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(duration));

    await new Subscription({
      userId: req.user.id,
      planName,
      price,
      durationDays: Number(duration),
      startDate: new Date(),
      expiryDate,
      status: "active"
    }).save();

    res.json({
      message: `${planName} subscription activated successfully`
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/subscription-plans", (req, res) => {
  res.json([
    {
      name: "Free",
      price: 0,
      duration: 30,
      memberLimit: 20
    },
    {
      name: "Basic",
      price: 999,
      duration: 30,
      memberLimit: 1000
    },
    {
      name: "Premium",
      price: 2499,
      duration: 30,
      memberLimit: 99999
    }
  ]);
});

module.exports = router;