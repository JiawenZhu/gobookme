import { BusinessListingService } from "@calcom/features/business-listings/services/BusinessListingService";
import { prisma } from "@calcom/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessListingCard } from "~/business/components/BusinessListingCard";

type CategoryDirectoryPageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: CategoryDirectoryPageProps) {
  const { category } = await params;
  return {
    title: `Book ${category.replaceAll("-", " ")} in Champaign | GoBookMe`,
    description: `Find and book ${category.replaceAll("-", " ")} services in Champaign.`,
  };
}

export default async function CategoryDirectoryPage({ params }: CategoryDirectoryPageProps) {
  const { category } = await params;
  const service = new BusinessListingService(prisma);
  const [listings, categories] = await Promise.all([
    service.listApprovedListings({ city: "champaign", categorySlug: category }),
    service.listCategories(),
  ]);
  const activeCategory = categories.find((item) => item.slug === category);

  if (!activeCategory) notFound();

  return (
    <main className="bg-default min-h-screen">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 space-y-3">
          <Link className="text-subtle text-sm" href="/champaign">
            Champaign services
          </Link>
          <h1 className="text-4xl font-semibold tracking-normal text-emphasis">
            Book {activeCategory.name.toLowerCase()} in Champaign
          </h1>
          {activeCategory.description ? (
            <p className="max-w-2xl text-base text-default">{activeCategory.description}</p>
          ) : null}
        </div>

        <div className="grid gap-4">
          {listings.length > 0 ? (
            listings.map((listing) => <BusinessListingCard key={listing.id} listing={listing} />)
          ) : (
            <div className="border-subtle bg-muted border p-8 text-center text-sm text-subtle">
              No approved businesses are listed in this category yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
