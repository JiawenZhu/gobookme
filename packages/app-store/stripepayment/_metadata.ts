import process from "node:process";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Stripe",
  description:
    "A Saas company a payment processing software, and application programming interfaces for e-commerce websites and mobile applications.",
  installed: !!(process.env.STRIPE_CLIENT_ID && process.env.STRIPE_PRIVATE_KEY),
  slug: "stripe",
  category: "payment",
  categories: ["payment"],
  logo: "icon.svg",
  publisher: "GoBookMe.com",
  title: "Stripe",
  type: "stripe_payment",
  url: "https://gobookme.com/",
  docsUrl: "https://stripe.com/docs",
  variant: "payment",
  extendsFeature: "EventType",
  email: "help@gobookme.com",
  dirName: "stripepayment",
  isOAuth: true,
} as AppMeta;

export default metadata;
