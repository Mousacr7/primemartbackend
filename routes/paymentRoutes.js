const express = require("express");
const { createCheckoutSession, stripeWebhook, verifyCheckoutSession } = require("../controllers/paymentController");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken.js");
const { createOrderLimiter } = require("../middleware/rateLimiter.js");
const bodyParser = require("body-parser");

const router = express.Router();

// Protected checkout session route
router.post("/create-checkout-session", createOrderLimiter, verifyFirebaseToken, createCheckoutSession);

// Verify checkout session (frontend calls after redirect)
router.get("/verify-checkout-session", verifyFirebaseToken, verifyCheckoutSession);

// Stripe webhook (raw body)
router.post("/stripe-webhook", bodyParser.raw({ type: "application/json" }), stripeWebhook);

module.exports = router;
