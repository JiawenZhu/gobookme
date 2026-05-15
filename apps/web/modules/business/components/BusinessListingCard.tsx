import type { BusinessListingDTO } from "@calcom/features/business-listings/repositories/BusinessListingRepository";
import Link from "next/link";
import { getListingCategories } from "../lib/listing-view-model";

export function BusinessListingCard({ listing }: { listing: BusinessListingDTO }) {
  const categories = getListingCategories(listing);
  const photo = listing.photos[0];

  return (
    <article className="border-subtle bg-default grid gap-4 border p-4 sm:grid-cols-[140px_1fr]">
      <div className="bg-muted aspect-[4/3] overflow-hidden">
        {photo ? (
          <img alt="" className="h-full w-full object-cover" src={photo} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-subtle">No photo</div>
        )}
      </div>
      <div className="min-w-0 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="truncate text-lg font-semibold text-emphasis">{listing.displayName}</h2>
            {listing.featured ? (
              <span className="bg-emphasis text-inverted shrink-0 rounded px-2 py-1 text-xs font-medium">
                Featured
              </span>
            ) : null}
          </div>
          <p className="text-sm text-subtle">
            {[listing.neighborhood, listing.city].filter(Boolean).join(", ")}
          </p>
        </div>
        {listing.description ? (
          <p className="line-clamp-2 text-sm text-default">{listing.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category.slug} className="bg-muted rounded px-2 py-1 text-xs text-default">
              {category.name}
            </span>
          ))}
        </div>
        <Link className="text-emphasis text-sm font-medium" href={`/business/${listing.slug}`}>
          View services and book
        </Link>
      </div>
    </article>
  );
}
