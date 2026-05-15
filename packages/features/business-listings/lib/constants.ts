export const GOBOOKME_PRIMARY_CITY = "champaign";

export const GOBOOKME_NEIGHBORHOODS = [
  "Champaign",
  "Urbana",
  "Campustown",
  "Downtown Champaign",
  "Midtown",
  "UIUC Area",
] as const;

export const GOBOOKME_FOUNDING_CATEGORIES = [
  { slug: "beauty", name: "Beauty", description: "Salons, lashes, nails, and personal care." },
  { slug: "wellness", name: "Wellness", description: "Massage, esthetics, and wellness appointments." },
  { slug: "barbers", name: "Barbers", description: "Barbershops and independent barbers." },
  { slug: "tutors", name: "Tutors", description: "Tutoring and academic support near Champaign-Urbana." },
  { slug: "fitness", name: "Fitness", description: "Coaches, trainers, and private fitness sessions." },
  { slug: "photography", name: "Photography", description: "Portrait, event, and local photographers." },
  { slug: "cleaning", name: "Cleaning", description: "Home, apartment, and move-out cleaning services." },
  { slug: "auto-detailing", name: "Auto Detailing", description: "Interior and exterior vehicle detailing." },
] as const;

export const GOBOOKME_ESTIMATED_PLATFORM_FEE_BASIS_POINTS = 300;
