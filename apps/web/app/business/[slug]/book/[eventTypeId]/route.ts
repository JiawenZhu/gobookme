import { BusinessListingService } from "@calcom/features/business-listings/services/BusinessListingService";
import { prisma } from "@calcom/prisma";
import { BusinessListingAnalyticsEvent } from "@calcom/prisma/enums";
import { NextResponse } from "next/server";
import { getServiceBookingPath } from "~/business/lib/listing-view-model";

type BusinessBookingRedirectRouteProps = {
  params: Promise<{ slug: string; eventTypeId: string }>;
};

export async function GET(request: Request, { params }: BusinessBookingRedirectRouteProps) {
  const { slug, eventTypeId } = await params;
  const service = new BusinessListingService(prisma);
  const listing = await service.getApprovedListing(slug);

  if (!listing) return NextResponse.redirect(new URL("/champaign", request.url));

  const numericEventTypeId = Number(eventTypeId);
  const serviceItem = listing.services.find((item) => item.eventType.id === numericEventTypeId);
  const bookingPath = serviceItem ? getServiceBookingPath(serviceItem) : null;

  if (!serviceItem || !bookingPath) return NextResponse.redirect(new URL(`/business/${slug}`, request.url));

  await service.trackAnalytics({
    listingId: listing.id,
    event: BusinessListingAnalyticsEvent.BOOKING_CLICK,
    source: "business_profile",
    eventTypeId: numericEventTypeId,
  });

  return NextResponse.redirect(new URL(bookingPath, request.url));
}
