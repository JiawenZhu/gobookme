import process from "node:process";
import { BusinessListingService } from "@calcom/features/business-listings/services/BusinessListingService";
import { prisma } from "@calcom/prisma";
import { BusinessClaimRequestStatus } from "@calcom/prisma/enums";
import Link from "next/link";
import {
  deleteAdminBusinessListingAction,
  reviewBusinessClaimRequestAction,
  saveAdminBusinessListingAction,
  seedBusinessCategoriesAction,
} from "~/business/actions";
import { BusinessListingForm } from "~/business/components/BusinessListingForm";
import { getAdminEventTypeOptions } from "~/business/lib/server-data";

type AdminBusinessListingsPageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function AdminBusinessListingsPage({ searchParams }: AdminBusinessListingsPageProps) {
  const { edit } = await searchParams;
  const service = new BusinessListingService(prisma);
  const [{ listings, metrics, claimRequests }, categories, eventTypes] = await Promise.all([
    service.listAdminListings(),
    service.listCategories(),
    getAdminEventTypeOptions(),
  ]);
  const editingListing = edit ? listings.find((listing) => listing.id === edit) : null;
  const seedCategoriesAction = seedBusinessCategoriesAction as unknown as string;
  const reviewClaimAction = reviewBusinessClaimRequestAction as unknown as string;
  const deleteListingAction = deleteAdminBusinessListingAction as unknown as string;

  return (
    <main className="w-full space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-emphasis">Business listings</h1>
        <p className="text-sm text-subtle">
          Manage GoBookMe directory listings, ownership claims, approval, and local marketplace metrics.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Listings" value={metrics.totalListings} />
        <Metric label="Approved" value={metrics.approvedListings} />
        <Metric label="Claimed" value={metrics.claimedListings} />
        <Metric label="Booking clicks" value={metrics.bookingClicks} />
      </section>

      {categories.length === 0 ? (
        <form action={seedCategoriesAction} className="border-subtle bg-muted border p-4">
          <p className="mb-3 text-sm text-default">No marketplace categories exist yet.</p>
          <button
            className="bg-brand text-brand rounded-md px-4 py-2 text-sm font-medium"
            type="submit">
            Seed founding categories
          </button>
        </form>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-emphasis">
          {editingListing ? `Edit ${editingListing.displayName}` : "Create listing"}
        </h2>
        <BusinessListingForm
          action={saveAdminBusinessListingAction}
          categories={categories}
          eventTypes={eventTypes}
          googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
          listing={editingListing}
          mode="admin"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-emphasis">Listings</h2>
        <div className="divide-subtle border-subtle divide-y border">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-emphasis">{listing.displayName}</h3>
                <p className="text-sm text-subtle">
                  {listing.slug} · {listing.approvalStatus} · {listing.visibility} · {listing.claimStatus}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="text-sm font-medium text-emphasis" href={`/business/${listing.slug}`}>
                  Public page
                </Link>
                <Link className="text-sm font-medium text-emphasis" href={`?edit=${listing.id}`}>
                  Edit
                </Link>
                <form action={deleteListingAction}>
                  <input name="id" type="hidden" value={listing.id} />
                  <button className="text-sm font-medium text-red-600" type="submit">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
          {listings.length === 0 ? <div className="p-4 text-sm text-subtle">No listings yet.</div> : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-emphasis">Claim requests</h2>
        <div className="divide-subtle border-subtle divide-y border">
          {claimRequests.map((claimRequest) => (
            <div key={claimRequest.id} className="space-y-3 p-4">
              <div>
                <h3 className="font-medium text-emphasis">{claimRequest.listing.displayName}</h3>
                <p className="text-sm text-subtle">
                  {claimRequest.requesterName} · {claimRequest.requesterEmail} · {claimRequest.status}
                </p>
                {claimRequest.message ? (
                  <p className="mt-2 text-sm text-default">{claimRequest.message}</p>
                ) : null}
              </div>
              {claimRequest.status === BusinessClaimRequestStatus.PENDING ? (
                <form action={reviewClaimAction} className="flex flex-wrap items-end gap-2">
                  <input name="requestId" type="hidden" value={claimRequest.id} />
                  <label className="space-y-1">
                    <span className="text-default text-xs font-medium">Owner user ID</span>
                    <input
                      className="border-subtle bg-default text-default w-32 rounded-md border px-3 py-2 text-sm"
                      name="ownerUserId"
                      type="number"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-default text-xs font-medium">Owner team ID</span>
                    <input
                      className="border-subtle bg-default text-default w-32 rounded-md border px-3 py-2 text-sm"
                      name="ownerTeamId"
                      type="number"
                    />
                  </label>
                  <button
                    className="bg-brand text-brand rounded-md px-3 py-2 text-sm font-medium"
                    name="status"
                    type="submit"
                    value={BusinessClaimRequestStatus.APPROVED}>
                    Approve
                  </button>
                  <button
                    className="border-subtle rounded-md border px-3 py-2 text-sm font-medium text-default"
                    name="status"
                    type="submit"
                    value={BusinessClaimRequestStatus.REJECTED}>
                    Reject
                  </button>
                </form>
              ) : null}
            </div>
          ))}
          {claimRequests.length === 0 ? (
            <div className="p-4 text-sm text-subtle">No claim requests.</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-subtle bg-default border p-4">
      <p className="text-subtle text-xs font-medium uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-emphasis">{value}</p>
    </div>
  );
}
