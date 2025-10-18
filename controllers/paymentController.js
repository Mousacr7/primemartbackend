const Stripe = require("stripe");
const { db } = require("../admin.js");
const calculatePrice = require("../utils/calculatePrice.js");

const stripe = new Stripe(process.env.SECRET_STRIPE_KEY);

// Cache products for 30 seconds
let cachedProducts = [];
let lastFetchTime = 0;
const PRODUCT_CACHE_TTL = 30 * 1000; // 30s

const fetchProducts = async () => {
  const now = Date.now();
  if (now - lastFetchTime < PRODUCT_CACHE_TTL && cachedProducts.length > 0) {
    return cachedProducts;
  }

  const snapshot = await db.collection("products").get();
  cachedProducts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  lastFetchTime = now;
  return cachedProducts;
};

const createCheckoutSession = async (req, res) => {
  try {
    const items = req.body.items;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid items array" });
    }

    const products = await fetchProducts();

    const lineItems = items.map((item) => {
      const product = products.find((p) => p.id === item.id);
      if (!product) throw new Error(`Product not found: ${item.id}`);

      const price = calculatePrice(item, product);

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            images: product.image ? [product.image[0]] : [],
          },
          unit_amount: Math.round(price * 100), // price in cents
        },
        quantity: item.quantity,
      };
    });

    const taxLineItem = {
      price_data: {
        currency: "usd",
        product_data: { name: "Sales Tax" },
        unit_amount: Math.round(37.32 * 100),
      },
      quantity: 1,
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [...lineItems, taxLineItem],
      mode: "payment",
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount", // ✅ Correct type
            fixed_amount: { amount: 1500, currency: "usd" }, // ✅ Use 'amount' not 'unit_amount'
            display_name: "Standard Shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 5 },
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU"],
      },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        orderId: `order-${Date.now()}`,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ error: error.message });
  }
};

const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const orderId = pi.metadata.orderId;
      console.log(`✅ Order ${orderId} paid successfully. Payment ID: ${pi.id}`);
      // update Firestore order status if needed
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

const verifyCheckoutSession = async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "Missing session ID" });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({ paid: session.payment_status === "paid" });
  } catch (err) {
    console.error("Stripe verification error:", err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
};

module.exports = {
  createCheckoutSession,
  stripeWebhook,
  verifyCheckoutSession,
};
