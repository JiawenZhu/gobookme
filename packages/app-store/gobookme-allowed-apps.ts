/**
 * GoBookMe App Store Allowlist
 *
 * Only these apps are shown in the app store. To re-enable an app, add its slug here.
 * Slugs match the `slug` field in each app's config.json or _metadata.ts.
 */
export const GOBOOKME_ALLOWED_APP_SLUGS = new Set([
  // Calendar
  "google-calendar",
  "apple-calendar",
  "cron", // Notion Calendar

  // Payments
  "stripe",

  // Analytics
  "ga4", // Google Analytics 4
  "gtm", // Google Tag Manager
  "metapixel", // Meta Pixel

  // Conferencing
  "google-meet",
  "facetime",

  // Other
  "qr_code",
  "sendgrid",
  "wordpress",
]);
