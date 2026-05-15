import process from "node:process";
import { BusinessListingService } from "@calcom/features/business-listings/services/BusinessListingService";
import { prisma } from "@calcom/prisma";
import { BusinessListingAnalyticsEvent } from "@calcom/prisma/enums";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createBusinessClaimRequestAction } from "~/business/actions";
import { GoogleMap } from "~/business/components/GoogleMap";
import { getListingCategories, getServiceBookingPath, isClaimable } from "~/business/lib/listing-view-model";

type BusinessProfilePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string; claim?: string }>;
};

export async function generateMetadata({ params }: BusinessProfilePageProps) {
  const { slug } = await params;
  const service = new BusinessListingService(prisma);
  const listing = await service.getApprovedListing(slug);

  if (!listing) return {};
  return {
    title: `${listing.displayName} | GoBookMe`,
    description: listing.description ?? `Book ${listing.displayName} online with GoBookMe.`,
  };
}

export default async function BusinessProfilePage({ params, searchParams }: BusinessProfilePageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const service = new BusinessListingService(prisma);
  const listing = await service.getApprovedListing(slug);

  if (!listing) notFound();

  if (resolvedSearchParams.source === "qr") {
    await service.trackAnalytics({
      listingId: listing.id,
      event: BusinessListingAnalyticsEvent.QR_VISIT,
      source: "qr",
    });
  }

  const categories = getListingCategories(listing);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const claimRequestAction = createBusinessClaimRequestAction as unknown as string;

  return (
    <main className="bg-default min-h-screen">
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div className="space-y-4">
            <Link className="text-subtle text-sm" href="/champaign">
              Champaign services
            </Link>
            {listing.photos[0] ? (
              <img alt="" className="aspect-[16/7] w-full object-cover" src={listing.photos[0]} />
            ) : null}
            <div>
              <h1 className="text-4xl font-semibold tracking-normal text-emphasis">{listing.displayName}</h1>
              <p className="mt-2 text-sm text-subtle">
                {[listing.neighborhood, listing.city].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  className="bg-muted rounded px-2 py-1 text-xs text-default"
                  href={`/champaign/${category.slug}`}>
                  {category.name}
                </Link>
              ))}
            </div>
            {listing.description ? (
              <p className="max-w-3xl text-base text-default">{listing.description}</p>
            ) : null}
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-emphasis">Book a service</h2>
            <div className="grid gap-3">
              {listing.services.length > 0 ? (
                listing.services.map((serviceItem) => {
                  const bookingPath = getServiceBookingPath(serviceItem);
                  return (
                    <article
                      key={serviceItem.id}
                      className="border-subtle flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-medium text-emphasis">{serviceItem.eventType.title}</h3>
                        <p className="text-sm text-subtle">{serviceItem.eventType.length} minutes</p>
                      </div>
                      {bookingPath ? (
                        <Link
                          className="bg-brand text-brand rounded-md px-4 py-2 text-center text-sm font-medium"
                          href={`/business/${listing.slug}/book/${serviceItem.eventType.id}`}>
                          Book now
                        </Link>
                      ) : (
                        <span className="text-sm text-subtle">Booking unavailable</span>
                      )}
                    </article>
                  );
                })
              ) : (
                <div className="border-subtle bg-muted border p-6 text-sm text-subtle">
                  This business has not published bookable services yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border-subtle bg-default space-y-3 border p-4">
            <h2 className="text-lg font-semibold text-emphasis">Location</h2>
            {listing.address ? <p className="text-sm text-default">{listing.address}</p> : null}
            <GoogleMap
              apiKey={googleMapsApiKey}
              latitude={listing.latitude}
              longitude={listing.longitude}
              label={listing.displayName}
            />
          </section>

          <section className="border-subtle bg-default space-y-3 border p-4">
            <h2 className="text-lg font-semibold text-emphasis">Contact</h2>
            {listing.phone ? <p className="text-sm text-default">{listing.phone}</p> : null}
            {listing.website ? (
              <a
                className="block text-sm text-emphasis"
                href={listing.website}
                rel="noreferrer"
                target="_blank">
                Website
              </a>
            ) : null}
            {listing.instagram ? <p className="text-sm text-default">{listing.instagram}</p> : null}
          </section>

          {isClaimable(listing) ? (
            <section className="border-subtle bg-default space-y-3 border p-4">
              <h2 className="text-lg font-semibold text-emphasis">Own this business?</h2>
              {resolvedSearchParams.claim === "requested" ? (
                <p className="text-sm text-default">Your claim request has been sent for review.</p>
              ) : (
                <form action={claimRequestAction} className="space-y-3">
                  <input name="listingId" type="hidden" value={listing.id} />
                  <input name="slug" type="hidden" value={listing.slug} />
                  <input
                    className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
                    name="requesterName"
                    placeholder="Your name"
                    required
                  />
                  <input
                    className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
                    name="requesterEmail"
                    placeholder="Email"
                    required
                    type="email"
                  />
                  <textarea
                    className="border-subtle bg-default text-default min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                    name="message"
                    placeholder="How are you connected to this business?"
                  />
                  <button
                    className="bg-brand text-brand w-full rounded-md px-4 py-2 text-sm font-medium"
                    type="submit">
                    Request ownership
                  </button>
                </form>
              )}
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
