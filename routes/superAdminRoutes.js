const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Member = require("../models/Member");
const Trainer = require("../models/Trainer");
const Payment = require("../models/Payment");

const router = express.Router();

const ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "admin123";
const ADMIN_SECRET = process.env.SUPER_ADMIN_SECRET || "supersecret";

function superAdminAuth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "No admin token" });

  try {
    req.admin = jwt.verify(token, ADMIN_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid admin token" });
  }
}

router.post("/super-admin-login", (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.json({ message: "Invalid admin login" });
  }

  const token = jwt.sign({ role: "super-admin" }, ADMIN_SECRET, {
    expiresIn: "7d"
  });

  res.json({ message: "Super admin login successful", token });
});

router.get("/super-admin/stats", superAdminAuth, async (req, res) => {
  try {
    const owners = await User.find().sort({ _id: -1 });
    const members = await Member.find();
    const trainers = await Trainer.find();
    const payments = await Payment.find({ status: "paid" });

    let totalRevenue = 0;

    payments.forEach(payment => {
      totalRevenue += Number(payment.amount || 0);
    });

    const ownerData = owners.map(owner => {
      const ownerMembers = members.filter(m => String(m.userId) === String(owner._id));
      const ownerTrainers = trainers.filter(t => String(t.userId) === String(owner._id));
      const ownerPayments = payments.filter(p => String(p.userId) === String(owner._id));

      let ownerRevenue = 0;
      ownerPayments.forEach(p => {
        ownerRevenue += Number(p.amount || 0);
      });

      return {
        id: owner._id,
        username: owner.username,
        blocked: owner.blocked || false,
        totalMembers: ownerMembers.length,
        totalTrainers: ownerTrainers.length,
        revenue: ownerRevenue,
        joined: owner.createdAt || owner._id.getTimestamp()
      };
    });

    res.json({
      totalOwners: owners.length,
      totalMembers: members.length,
      totalTrainers: trainers.length,
      totalRevenue,
      owners: ownerData
    });
  } catch (err) {
    console.log("Super admin stats error:", err);
    res.status(500).json({ message: "Super admin stats error" });
  }
});

router.put("/super-admin/block-owner/:ownerId", superAdminAuth, async (req, res) => {
  try {
    const owner = await User.findById(req.params.ownerId);

    if (!owner) return res.json({ message: "Owner not found" });

    owner.blocked = true;
    await owner.save();

    res.json({ message: "Gym owner blocked successfully" });
  } catch {
    res.status(500).json({ message: "Block owner error" });
  }
});

router.put("/super-admin/unblock-owner/:ownerId", superAdminAuth, async (req, res) => {
  try {
    const owner = await User.findById(req.params.ownerId);

    if (!owner) return res.json({ message: "Owner not found" });

    owner.blocked = false;
    await owner.save();

    res.json({ message: "Gym owner unblocked successfully" });
  } catch {
    res.status(500).json({ message: "Unblock owner error" });
  }
});

module.exports = router;