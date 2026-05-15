"use client";

import type { BusinessListingDTO } from "@calcom/features/business-listings/repositories/BusinessListingRepository";
import {
  BusinessListingApprovalStatus,
  BusinessListingClaimStatus,
  BusinessListingVisibility,
} from "@calcom/prisma/enums";
import { useState } from "react";
import { AddressAutocomplete } from "./AddressAutocomplete";

type BusinessListingFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  listing?: BusinessListingDTO | null;
  categories: { slug: string; name: string }[];
  eventTypes: { id: number; title: string; slug: string }[];
  googleMapsApiKey?: string;
  mode: "admin" | "owner" | "submit";
};

function hasCategory(listing: BusinessListingDTO | null | undefined, slug: string) {
  return listing?.categories.some((item) => item.category.slug === slug) ?? false;
}

function hasService(listing: BusinessListingDTO | null | undefined, eventTypeId: number) {
  return listing?.services.some((service) => service.eventType.id === eventTypeId) ?? false;
}

export function BusinessListingForm({
  action,
  listing,
  categories,
  eventTypes,
  googleMapsApiKey,
  mode,
}: BusinessListingFormProps) {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    void Promise.resolve(action(formData)).finally(() => setIsPending(false));
  };

  return (
    <form onSubmit={handleSubmit} className="border-subtle bg-default space-y-5 border p-5">
      {listing ? <input name="id" type="hidden" value={listing.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-default text-sm font-medium">Business name</span>
          <input
            className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
            name="displayName"
            required
            defaultValue={listing?.displayName ?? ""}
          />
        </label>
        {mode === "admin" ? (
          <label className="space-y-1">
            <span className="text-default text-sm font-medium">Slug</span>
            <input
              className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
              name="slug"
              placeholder="auto-generated"
              defaultValue={listing?.slug ?? ""}
            />
          </label>
        ) : null}
      </div>

      <label className="space-y-1">
        <span className="text-default text-sm font-medium">Description</span>
        <textarea
          className="border-subtle bg-default text-default min-h-28 w-full rounded-md border px-3 py-2 text-sm"
          name="description"
          defaultValue={listing?.description ?? ""}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-default text-sm font-medium">City</span>
          <input
            className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
            name="city"
            required
            defaultValue={listing?.city ?? "champaign"}
          />
        </label>
        <label className="space-y-1">
          <span className="text-default text-sm font-medium">Neighborhood</span>
          <input
            className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
            name="neighborhood"
            placeholder="Downtown Champaign"
            defaultValue={listing?.neighborhood ?? ""}
          />
        </label>
      </div>

      <label className="space-y-1">
        <span className="text-default text-sm font-medium">Address</span>
        <AddressAutocomplete
          apiKey={googleMapsApiKey}
          defaultAddress={listing?.address}
          defaultPlaceId={listing?.googlePlaceId}
          defaultLatitude={listing?.latitude}
          defaultLongitude={listing?.longitude}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-default text-sm font-medium">Phone</span>
          <input
            className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
            name="phone"
            defaultValue={listing?.phone ?? ""}
          />
        </label>
        <label className="space-y-1">
          <span className="text-default text-sm font-medium">Website</span>
          <input
            className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
            name="website"
            type="url"
            defaultValue={listing?.website ?? ""}
          />
        </label>
        <label className="space-y-1">
          <span className="text-default text-sm font-medium">Instagram</span>
          <input
            className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
            name="instagram"
            placeholder="@business"
            defaultValue={listing?.instagram ?? ""}
          />
        </label>
      </div>

      <label className="space-y-1">
        <span className="text-default text-sm font-medium">Photo URLs</span>
        <textarea
          className="border-subtle bg-default text-default min-h-20 w-full rounded-md border px-3 py-2 text-sm"
          name="photos"
          placeholder="One image URL per line"
          defaultValue={listing?.photos.join("\n") ?? ""}
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-default text-sm font-medium">Categories</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((category) => (
            <label key={category.slug} className="text-default flex items-center gap-2 text-sm">
              <input
                name="categorySlugs"
                type="checkbox"
                value={category.slug}
                defaultChecked={hasCategory(listing, category.slug)}
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-default text-sm font-medium">Bookable services</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {eventTypes.map((eventType) => (
            <label key={eventType.id} className="text-default flex items-center gap-2 text-sm">
              <input
                name="eventTypeIds"
                type="checkbox"
                value={eventType.id}
                defaultChecked={hasService(listing, eventType.id)}
              />
              {eventType.title}
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "admin" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-default text-sm font-medium">Approval</span>
            <select
              className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
              name="approvalStatus"
              defaultValue={listing?.approvalStatus ?? BusinessListingApprovalStatus.PENDING}>
              {Object.values(BusinessListingApprovalStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-default text-sm font-medium">Claim</span>
            <select
              className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
              name="claimStatus"
              defaultValue={listing?.claimStatus ?? BusinessListingClaimStatus.UNCLAIMED}>
              {Object.values(BusinessListingClaimStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-default text-sm font-medium">Visibility</span>
            <select
              className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
              name="visibility"
              defaultValue={listing?.visibility ?? BusinessListingVisibility.DRAFT}>
              {Object.values(BusinessListingVisibility).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-default flex items-center gap-2 text-sm">
            <input name="featured" type="checkbox" value="true" defaultChecked={listing?.featured ?? false} />
            Featured listing
          </label>
          <label className="text-default flex items-center gap-2 text-sm">
            <input
              name="foundingCustomer"
              type="checkbox"
              value="true"
              defaultChecked={listing?.foundingCustomer ?? false}
            />
            Founding customer
          </label>
          <label className="space-y-1">
            <span className="text-default text-sm font-medium">Owner user ID</span>
            <input
              className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
              name="ownerUserId"
              type="number"
              defaultValue={listing?.ownerUserId ?? ""}
            />
          </label>
          <label className="space-y-1">
            <span className="text-default text-sm font-medium">Owner team ID</span>
            <input
              className="border-subtle bg-default text-default w-full rounded-md border px-3 py-2 text-sm"
              name="ownerTeamId"
              type="number"
              defaultValue={listing?.ownerTeamId ?? ""}
            />
          </label>
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <button
          className="bg-brand text-brand rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          disabled={isPending}
          type="submit">
          {isPending
            ? "Saving…"
            : mode === "submit"
              ? "Submit for review"
              : "Save business listing"}
        </button>
        {mode === "submit" && (
          <p className="text-xs text-subtle">We&apos;ll review and approve within 1–2 business days.</p>
        )}
      </div>
    </form>
  );
}
