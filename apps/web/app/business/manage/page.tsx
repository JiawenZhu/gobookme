import process from "node:process";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { BusinessListingService } from "@calcom/features/business-listings/services/BusinessListingService";
import { prisma } from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { saveOwnerBusinessListingAction } from "~/business/actions";
import { BusinessListingForm } from "~/business/components/BusinessListingForm";
import { getOwnerEventTypeOptions } from "~/business/lib/server-data";

type BusinessManagePageProps = {
  searchParams: Promise<{ edit?: string; submitted?: string }>;
};

export const metadata = {
  title: "Manage business listings | GoBookMe",
};

export default async function BusinessManagePage({ searchParams }: BusinessManagePageProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) redirect("/auth/login");

  const { edit, submitted } = await searchParams;
  const service = new BusinessListingService(prisma);
  const [listings, categories, eventTypes] = await Promise.all([
    service.listOwnerListings(session.user.id),
    service.listCategories(),
    getOwnerEventTypeOptions(session.user.id),
  ]);
  const editingListing = edit
    ? await service.getEditableListingForOwner({ listingId: edit, userId: session.user.id })
    : listings[0];

  return (
    <main className="bg-default min-h-screen">
      <section className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <header className="space-y-2">
          <Link className="text-subtle text-sm" href="/champaign">
            Champaign directory
          </Link>
          <h1 className="text-3xl font-semibold text-emphasis">Manage your business page</h1>
          <p className="text-sm text-subtle">
            Update your public listing, linked services, address, calendar setup, and booking links.
          </p>
        </header>

        {submitted === "1" ? (
          <div className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 rounded-lg border p-4">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Your listing has been submitted for review.
            </p>
            <p className="mt-1 text-xs text-green-700 dark:text-green-400">
              We&apos;ll approve it within 1–2 business days. You can update your details below while you
              wait.
            </p>
          </div>
        ) : null}

        {listings.length > 1 ? (
          <nav className="flex flex-wrap gap-2" aria-label="Your business listings">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                className="border-subtle rounded-md border px-3 py-2 text-sm text-default"
                href={`/business/manage?edit=${listing.id}`}>
                {listing.displayName}
              </Link>
            ))}
          </nav>
        ) : null}

        {editingListing ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <OwnerLink href="/event-types" label="Services" />
              <OwnerLink href="/availability" label="Availability" />
              <OwnerLink href="/apps/installed/calendar" label="Connected calendars" />
            </div>
            <BusinessListingForm
              action={saveOwnerBusinessListingAction}
              categories={categories}
              eventTypes={eventTypes}
              googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
              listing={editingListing}
              mode="owner"
            />
          </>
        ) : (
          <div className="border-subtle bg-muted flex flex-col items-center gap-4 border p-10 text-center">
            <p className="text-sm text-subtle">You don&apos;t have any business listings yet.</p>
            <Link
              className="bg-brand text-brand rounded-md px-5 py-2.5 text-sm font-medium"
              href="/business/submit">
              List your business
            </Link>
            <p className="text-xs text-subtle">
              Already on the directory?{" "}
              <Link className="underline" href="/champaign">
                Find and claim your listing
              </Link>{" "}
              instead.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function OwnerLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="border-subtle bg-default rounded-md border p-4 text-sm font-medium text-emphasis"
      href={href}>
      {label}
    </Link>
  );
}
