import type { BusinessListingDTO } from "@calcom/features/business-listings/repositories/BusinessListingRepository";
import { BusinessListingAnalyticsEvent, BusinessListingClaimStatus } from "@calcom/prisma/enums";

export function getListingCategories(listing: BusinessListingDTO) {
  return listing.categories.map((item) => item.category);
}

export function getServiceBookingPath(service: BusinessListingDTO["services"][number]) {
  const eventType = service.eventType;
  const profileSlug = eventType.profile?.username ?? eventType.owner?.username ?? eventType.team?.slug;

  if (!profileSlug || eventType.hidden) return null;
  return `/${profileSlug}/${eventType.slug}`;
}

export function isClaimable(listing: Pick<BusinessListingDTO, "claimStatus">) {
  return listing.claimStatus !== BusinessListingClaimStatus.CLAIMED;
}

export function analyticsEventFromSource(source?: string | null) {
  if (source === "qr") return BusinessListingAnalyticsEvent.QR_VISIT;
  return BusinessListingAnalyticsEvent.PROFILE_VIEW;
}
