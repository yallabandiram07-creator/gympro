const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Member = require("../models/Member");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post("/create-order", async (req, res) => {
  try {
    const { memberId, memberName, planName, amount, durationDays } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "gym_receipt_" + Date.now()
    });

    const payment = await Payment.create({
      memberId,
      memberName,
      planName,
      amount,
      durationDays,
      razorpayOrderId: order.id,
      status: "created"
    });

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order,
      payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Payment order failed",
      error: error.message
    });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const {
      memberId,
      paymentDbId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      await Payment.findByIdAndUpdate(paymentDbId, { status: "failed" });

      return res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      paymentDbId,
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "success"
      },
      { new: true }
    );

    const member = await Member.findById(memberId);

    let startDate = new Date();

    if (member.expiryDate && new Date(member.expiryDate) > startDate) {
      startDate = new Date(member.expiryDate);
    }

    const newExpiryDate = new Date(startDate);
    newExpiryDate.setDate(newExpiryDate.getDate() + payment.durationDays);

    await Member.findByIdAndUpdate(memberId, {
      planName: payment.planName,
      expiryDate: newExpiryDate,
      status: "Active"
    });

    res.json({
      success: true,
      message: "Payment successful",
      expiryDate: newExpiryDate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Payment verification error",
      error: error.message
    });
  }
});

router.get("/history/:memberId", async (req, res) => {
  try {
    const payments = await Payment.find({ memberId: req.params.memberId }).sort({
      createdAt: -1
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Payment history error" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "All payments error" });
  }
});

module.exports = router;