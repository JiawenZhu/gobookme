import { BusinessListingService } from "@calcom/features/business-listings/services/BusinessListingService";
import { prisma } from "@calcom/prisma";
import Link from "next/link";
import { BusinessListingCard } from "~/business/components/BusinessListingCard";

export const metadata = {
  title: "Book local services in Champaign | GoBookMe",
  description: "Find and book Champaign service businesses online.",
};

export default async function ChampaignDirectoryPage() {
  const service = new BusinessListingService(prisma);
  const [listings, categories] = await Promise.all([
    service.listApprovedListings({ city: "champaign" }),
    service.listCategories(),
  ]);

  return (
    <main className="bg-default min-h-screen">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 space-y-3">
          <p className="text-subtle text-sm font-medium">Champaign local services</p>
          <h1 className="text-4xl font-semibold tracking-normal text-emphasis">
            Find and book local services
          </h1>
          <p className="max-w-2xl text-base text-default">
            Browse Champaign-area service businesses, compare services, and book online.
          </p>
        </div>

        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Business categories">
          {categories.map((category) => (
            <Link
              key={category.slug}
              className="border-subtle hover:border-emphasis rounded-md border px-3 py-2 text-sm text-default"
              href={`/champaign/${category.slug}`}>
              {category.name}
            </Link>
          ))}
        </nav>

        <div className="grid gap-4">
          {listings.length > 0 ? (
            listings.map((listing) => <BusinessListingCard key={listing.id} listing={listing} />)
          ) : (
            <div className="border-subtle bg-muted border p-8 text-center text-sm text-subtle">
              GoBookMe is onboarding Champaign businesses now. Approved listings will appear here.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
