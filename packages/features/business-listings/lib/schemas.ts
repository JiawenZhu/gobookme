import {
  BusinessClaimRequestStatus,
  BusinessListingAnalyticsEvent,
  BusinessListingApprovalStatus,
  BusinessListingClaimStatus,
  BusinessListingVisibility,
} from "@calcom/prisma/enums";
import { z } from "zod";

export const businessListingPhotoSchema = z
  .string()
  .url()
  .or(z.literal(""))
  .transform((value) => value.trim())
  .pipe(z.string().max(500));

export const businessListingUpsertSchema = z.object({
  id: z.string().optional(),
  displayName: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  city: z.string().trim().min(1).max(80).default("champaign"),
  neighborhood: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  googlePlaceId: z.string().trim().max(200).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  website: z.string().trim().url().max(500).optional().or(z.literal("")).nullable(),
  instagram: z.string().trim().max(120).optional().nullable(),
  photos: z.array(businessListingPhotoSchema).max(8).default([]),
  categorySlugs: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
  eventTypeIds: z.array(z.coerce.number().int().positive()).max(20).default([]),
  ownerUserId: z.coerce.number().int().positive().optional().nullable(),
  ownerTeamId: z.coerce.number().int().positive().optional().nullable(),
  approvalStatus: z.nativeEnum(BusinessListingApprovalStatus).optional(),
  claimStatus: z.nativeEnum(BusinessListingClaimStatus).optional(),
  visibility: z.nativeEnum(BusinessListingVisibility).optional(),
  featured: z.coerce.boolean().optional(),
  plan: z.string().trim().max(80).optional().nullable(),
  foundingCustomer: z.coerce.boolean().optional(),
  setupPackageStatus: z.string().trim().max(120).optional().nullable(),
  paymentWillingness: z.string().trim().max(120).optional().nullable(),
});

export const businessOwnerListingUpdateSchema = businessListingUpsertSchema.pick({
  id: true,
  displayName: true,
  description: true,
  city: true,
  neighborhood: true,
  address: true,
  googlePlaceId: true,
  latitude: true,
  longitude: true,
  phone: true,
  website: true,
  instagram: true,
  photos: true,
  categorySlugs: true,
  eventTypeIds: true,
});

// Same fields as update but without id — used for owner self-submission of new listings
export const businessOwnerListingSubmitSchema = businessOwnerListingUpdateSchema.omit({ id: true });

export const businessCategoryUpsertSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
});

export const businessClaimRequestSchema = z.object({
  listingId: z.string().min(1),
  requesterName: z.string().trim().min(1).max(120),
  requesterEmail: z.string().trim().email().max(255),
  message: z.string().trim().max(1000).optional().nullable(),
});

export const businessClaimReviewSchema = z.object({
  requestId: z.string().min(1),
  status: z.nativeEnum(BusinessClaimRequestStatus),
  ownerUserId: z.coerce.number().int().positive().optional().nullable(),
  ownerTeamId: z.coerce.number().int().positive().optional().nullable(),
});

export const businessListingAnalyticsSchema = z.object({
  listingId: z.string().min(1),
  event: z.nativeEnum(BusinessListingAnalyticsEvent),
  source: z.string().trim().max(80).optional().nullable(),
  categorySlug: z.string().trim().max(80).optional().nullable(),
  eventTypeId: z.coerce.number().int().positive().optional().nullable(),
  bookingId: z.coerce.number().int().positive().optional().nullable(),
  userId: z.coerce.number().int().positive().optional().nullable(),
  grossBookingValue: z.coerce.number().int().nonnegative().optional().nullable(),
});

export type BusinessListingUpsertInput = z.infer<typeof businessListingUpsertSchema>;
export type BusinessOwnerListingUpdateInput = z.infer<typeof businessOwnerListingUpdateSchema>;
export type BusinessOwnerListingSubmitInput = z.infer<typeof businessOwnerListingSubmitSchema>;
export type BusinessCategoryUpsertInput = z.infer<typeof businessCategoryUpsertSchema>;
export type BusinessClaimRequestInput = z.infer<typeof businessClaimRequestSchema>;
export type BusinessClaimReviewInput = z.infer<typeof businessClaimReviewSchema>;
export type BusinessListingAnalyticsInput = z.infer<typeof businessListingAnalyticsSchema>;
