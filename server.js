import express from "express";
import dotenv from "dotenv";
import Stripe from "stripe";
import cors from "cors";
import { products } from "./Projects.js";// must be .js if ES modules

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

const stripe = new Stripe(process.env.SECRET_STRIPE_KEY);

// Secure price calculation
const calculatePrice = (item) => {
  const product = products.find(p => p.id === item.id);
  if (!product) throw new Error("Product not found");

  let price = product.price;

  if (item.selectedSize === "128GB") price += 250;
  if (item.selectedSize === "256GB") price += 500;
  if (item.selectedSize === "32GB") price -= 200;

  if (item.selectedRam === "16GB") price += 200;
  if (item.selectedRam === "4GB") price -= 200;

  return price;
};

app.post("/create-checkout-session", async (req, res) => {
  try {
    const lineItems = req.body.items.map(item => {
      const price = calculatePrice(item);
      const product = products.find(p => p.id === item.id);

      return {
        price_data: {
          currency: "usd",
          product_data: {
      name: product.name,
      images: [product.image[0]]
    },
    unit_amount: Math.round(price * 100)
  },
  quantity: item.quantity,
};
});
console.log(products.image[0])

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(4000, () => console.log("Server running on port 4000"));
