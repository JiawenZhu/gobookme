import { getDataConnect } from "firebase-admin/data-connect";

// Ensure firebase-admin is initialized before using Data Connect
import "./firebase-admin";

const DC_CONFIG = {
  serviceId: "gobookme-db",
  location: "us-central1",
} as const;

function getDC() {
  return getDataConnect(DC_CONFIG);
}

type UserSyncData = {
  id: number;
  uuid: string;
  username: string | null;
  name: string | null;
  email: string;
  identityProvider: string;
  identityProviderId?: string | null;
  locked: boolean;
  createdAt?: Date;
};

type BookingSyncData = {
  id: number;
  uid: string;
  title: string;
  startTime: Date;
  endTime: Date;
  status: string;
  paid: boolean;
  userId?: number | null;
  eventTypeId?: number | null;
  description?: string | null;
  location?: string | null;
  userPrimaryEmail?: string | null;
  iCalUID?: string | null;
  iCalSequence?: number;
  creationSource?: string | null;
};

type EventTypeSyncData = {
  id: number;
  title: string;
  slug: string;
  length: number;
  userId?: number | null;
  teamId?: number | null;
  description?: string | null;
  hidden?: boolean;
  position?: number;
  price?: number;
  currency?: string;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
};

export async function syncUserToFirebase(user: UserSyncData): Promise<void> {
  try {
    const dc = getDC();
    await dc.upsert("User", {
      id: user.id,
      uuid: user.uuid,
      username: user.username,
      name: user.name,
      email: user.email,
      identityProvider: user.identityProvider,
      identityProviderId: user.identityProviderId ?? null,
      timeZone: "UTC",
      weekStart: "Monday",
      bufferTime: 0,
      hideBranding: false,
      created: (user.createdAt ?? new Date()).toISOString(),
      completedOnboarding: false,
      twoFactorEnabled: false,
      role: "USER",
      locked: user.locked,
      isPlatformManaged: false,
      autoOptInFeatures: true,
      smsLockReviewedByAdmin: false,
      smsLockState: "UNLOCKED",
    });
  } catch (error) {
    console.error("[firebase-dc-sync] Failed to sync user:", error);
  }
}

export async function syncBookingToFirebase(booking: BookingSyncData): Promise<void> {
  try {
    const dc = getDC();
    await dc.upsert("Booking", {
      id: booking.id,
      uid: booking.uid,
      title: booking.title,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      status: booking.status,
      paid: booking.paid,
      isRecorded: false,
      iCalSequence: booking.iCalSequence ?? 0,
      iCalUID: booking.iCalUID ?? "",
      createdAt: new Date().toISOString(),
      ...(booking.userId != null && { userId: booking.userId }),
      ...(booking.eventTypeId != null && { eventTypeId: booking.eventTypeId }),
      ...(booking.description != null && { description: booking.description }),
      ...(booking.location != null && { location: booking.location }),
      ...(booking.userPrimaryEmail != null && { userPrimaryEmail: booking.userPrimaryEmail }),
      ...(booking.creationSource != null && { creationSource: booking.creationSource }),
    });
  } catch (error) {
    console.error("[firebase-dc-sync] Failed to sync booking:", error);
  }
}

export async function syncEventTypeToFirebase(eventType: EventTypeSyncData): Promise<void> {
  try {
    const dc = getDC();
    await dc.upsert("EventType", {
      id: eventType.id,
      title: eventType.title,
      slug: eventType.slug,
      length: eventType.length,
      position: eventType.position ?? 0,
      offsetStart: 0,
      hidden: eventType.hidden ?? false,
      useEventLevelSelectedCalendars: false,
      periodType: "unlimited",
      lockTimeZoneToggleOnBookingPage: false,
      requiresConfirmation: false,
      requiresConfirmationWillBlockSlot: false,
      requiresConfirmationForFreeEmail: false,
      requiresBookerEmailVerification: false,
      canSendCalVideoTranscriptionEmails: false,
      autoTranslateDescriptionEnabled: false,
      autoTranslateInstantMeetingTitleEnabled: false,
      disableGuests: false,
      hideCalendarNotes: false,
      hideCalendarEventDetails: false,
      minimumBookingNotice: eventType.minimumBookingNotice ?? 120,
      beforeEventBuffer: eventType.beforeEventBuffer ?? 0,
      afterEventBuffer: eventType.afterEventBuffer ?? 0,
      price: eventType.price ?? 0,
      currency: eventType.currency ?? "usd",
      isInstantEvent: false,
      instantMeetingExpiryTimeOffsetInSeconds: 0,
      assignAllTeamMembers: false,
      assignRRMembersUsingSegment: false,
      useEventTypeDestinationCalendarEmail: false,
      isRRWeightsEnabled: false,
      includeNoShowInRRCalculation: false,
      allowReschedulingPastBookings: false,
      hideOrganizerEmail: false,
      maxActiveBookingPerBookerOfferReschedule: false,
      rescheduleWithSameRoundRobinHost: false,
      useBookerTimezone: false,
      bookingRequiresAuthentication: false,
      rrHostSubsetEnabled: false,
      enablePerHostLocations: false,
      ...(eventType.userId != null && { userId: eventType.userId }),
      ...(eventType.teamId != null && { teamId: eventType.teamId }),
      ...(eventType.description != null && { description: eventType.description }),
    });
  } catch (error) {
    console.error("[firebase-dc-sync] Failed to sync event type:", error);
  }
}
