import { ErrorWithCode } from "@calcom/lib/errors";
import { slugify } from "@calcom/lib/slugify";
import type { PrismaClient } from "@calcom/prisma";
import {
  BusinessClaimRequestStatus,
  BusinessListingAnalyticsEvent,
  BusinessListingApprovalStatus,
  BusinessListingClaimStatus,
  BusinessListingVisibility,
  MembershipRole,
} from "@calcom/prisma/enums";
import { GOBOOKME_FOUNDING_CATEGORIES, GOBOOKME_PRIMARY_CITY } from "../lib/constants";
import { geocodeBusinessAddress } from "../lib/googleMaps";
import {
  type BusinessListingAnalyticsInput,
  type BusinessListingUpsertInput,
  type BusinessOwnerListingUpdateInput,
  businessCategoryUpsertSchema,
  businessClaimRequestSchema,
  businessClaimReviewSchema,
  businessListingAnalyticsSchema,
  businessListingUpsertSchema,
  businessOwnerListingSubmitSchema,
  businessOwnerListingUpdateSchema,
} from "../lib/schemas";
import { BusinessListingRepository } from "../repositories/BusinessListingRepository";

export class BusinessListingService {
  private readonly repository: BusinessListingRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repository = new BusinessListingRepository(prisma);
  }

  async seedFoundingCategories() {
    return await this.repository.seedFoundingCategories([...GOBOOKME_FOUNDING_CATEGORIES]);
  }

  async listCategories() {
    return await this.repository.listCategories();
  }

  async upsertCategory(input: unknown) {
    const parsed = businessCategoryUpsertSchema.parse(input);
    return await this.repository.upsertCategory({
      ...parsed,
      slug: slugify(parsed.slug),
    });
  }

  async listApprovedListings(input: { city?: string; categorySlug?: string } = {}) {
    return await this.repository.listApproved({
      city: input.city ?? GOBOOKME_PRIMARY_CITY,
      categorySlug: input.categorySlug,
    });
  }

  async getApprovedListing(slug: string) {
    const listing = await this.repository.findApprovedBySlug(slug);
    if (!listing) return null;

    await this.trackAnalytics({
      listingId: listing.id,
      event: BusinessListingAnalyticsEvent.PROFILE_VIEW,
      source: "business_profile",
    });

    return listing;
  }

  async listAdminListings() {
    const [listings, metrics, claimRequests] = await Promise.all([
      this.repository.listForAdmin(),
      this.repository.getAdminMetrics(),
      this.repository.listClaimRequests(),
    ]);

    return { listings, metrics, claimRequests };
  }

  async listOwnerListings(userId: number) {
    return await this.repository.listForOwner(userId);
  }

  async getEditableListingForOwner({ listingId, userId }: { listingId: string; userId: number }) {
    const canEdit = await this.repository.userCanEditListing({ listingId, userId });
    if (!canEdit) {
      throw ErrorWithCode.Factory.Forbidden("You do not have permission to edit this business listing");
    }

    return await this.repository.findEditableById(listingId);
  }

  async upsertAdminListing(input: unknown) {
    const parsed = businessListingUpsertSchema.parse(input);
    const listingInput = await this.prepareListingInput(parsed);

    const approvalStatus = parsed.approvalStatus ?? BusinessListingApprovalStatus.PENDING;
    // Auto-publish when admin approves — skip if they explicitly set a different visibility
    const visibility =
      parsed.visibility && parsed.visibility !== BusinessListingVisibility.DRAFT
        ? parsed.visibility
        : approvalStatus === BusinessListingApprovalStatus.APPROVED
          ? BusinessListingVisibility.PUBLIC
          : (parsed.visibility ?? BusinessListingVisibility.DRAFT);

    return await this.repository.upsertListing({
      ...listingInput,
      approvalStatus,
      claimStatus: parsed.claimStatus ?? BusinessListingClaimStatus.UNCLAIMED,
      visibility,
    });
  }

  async updateOwnerListing({ input, userId }: { input: unknown; userId: number }) {
    const parsed = businessOwnerListingUpdateSchema.parse(input);
    if (!parsed.id) {
      throw ErrorWithCode.Factory.BadRequest("Business listing id is required");
    }

    const canEdit = await this.repository.userCanEditListing({ listingId: parsed.id, userId });
    if (!canEdit) {
      throw ErrorWithCode.Factory.Forbidden("You do not have permission to edit this business listing");
    }

    await this.validateOwnerEventTypes({ eventTypeIds: parsed.eventTypeIds, userId });
    const listingInput = await this.prepareListingInput(parsed);

    return await this.repository.updateOwnerEditableListing({
      ...listingInput,
      id: parsed.id,
    });
  }

  async submitOwnerListing({ input, userId }: { input: unknown; userId: number }) {
    const parsed = businessOwnerListingSubmitSchema.parse(input);
    await this.validateOwnerEventTypes({ eventTypeIds: parsed.eventTypeIds, userId });
    const listingInput = await this.prepareListingInput(parsed);

    return await this.repository.upsertListing({
      ...listingInput,
      // Server enforces these — owners cannot self-approve or self-publish
      approvalStatus: BusinessListingApprovalStatus.PENDING,
      claimStatus: BusinessListingClaimStatus.CLAIMED,
      visibility: BusinessListingVisibility.DRAFT,
      ownerUserId: userId,
    });
  }

  async createClaimRequest(input: unknown, requesterId?: number | null) {
    const parsed = businessClaimRequestSchema.parse(input);
    const listing = await this.repository.findEditableById(parsed.listingId);
    if (!listing) throw ErrorWithCode.Factory.NotFound("Business listing not found");
    if (listing.claimStatus === BusinessListingClaimStatus.CLAIMED) {
      throw ErrorWithCode.Factory.BadRequest("Business listing has already been claimed");
    }

    return await this.repository.createClaimRequest({ ...parsed, requesterId });
  }

  async reviewClaimRequest(input: unknown, reviewedById: number) {
    const parsed = businessClaimReviewSchema.parse(input);
    if (parsed.status === BusinessClaimRequestStatus.APPROVED && !parsed.ownerUserId && !parsed.ownerTeamId) {
      throw ErrorWithCode.Factory.BadRequest("Approving a claim requires an owner user or team");
    }

    return await this.repository.reviewClaimRequest({ ...parsed, reviewedById });
  }

  async trackAnalytics(input: BusinessListingAnalyticsInput) {
    const parsed = businessListingAnalyticsSchema.parse(input);
    return await this.repository.trackAnalytics(parsed);
  }

  private async prepareListingInput<T extends BusinessListingUpsertInput | BusinessOwnerListingUpdateInput>(
    input: T
  ) {
    const requestedSlug = "slug" in input && input.slug ? input.slug : input.displayName;
    const slug = await this.generateAvailableSlug(
      slugify(requestedSlug),
      "id" in input ? input.id : undefined
    );
    const geocoded = input.address ? await geocodeBusinessAddress(input.address) : null;

    return {
      ...input,
      slug,
      city: slugify(input.city || GOBOOKME_PRIMARY_CITY),
      website: input.website || null,
      address: geocoded?.address ?? input.address ?? null,
      googlePlaceId: input.googlePlaceId ?? geocoded?.googlePlaceId ?? null,
      latitude: input.latitude ?? geocoded?.latitude ?? null,
      longitude: input.longitude ?? geocoded?.longitude ?? null,
      photos: input.photos.filter((photo) => photo.length > 0),
      categorySlugs: input.categorySlugs.map((categorySlug) => slugify(categorySlug)),
    };
  }

  private async generateAvailableSlug(baseSlug: string, currentListingId?: string) {
    const fallbackSlug = baseSlug || "business";
    let candidate = fallbackSlug;

    for (let suffix = 2; suffix < 50; suffix += 1) {
      const existing = await this.repository.findAnyBySlug(candidate);
      if (!existing || existing.id === currentListingId) return candidate;
      candidate = `${fallbackSlug}-${suffix}`;
    }

    throw ErrorWithCode.Factory.BadRequest("Unable to generate a unique business listing slug");
  }

  private async validateOwnerEventTypes({
    eventTypeIds,
    userId,
  }: {
    eventTypeIds: number[];
    userId: number;
  }) {
    if (eventTypeIds.length === 0) return;

    const eventTypeCount = await this.prisma.eventType.count({
      where: {
        id: { in: eventTypeIds },
        OR: [
          { userId },
          {
            team: {
              members: {
                some: {
                  userId,
                  role: {
                    in: [MembershipRole.OWNER, MembershipRole.ADMIN],
                  },
                },
              },
            },
          },
        ],
      },
    });

    if (eventTypeCount !== new Set(eventTypeIds).size) {
      throw ErrorWithCode.Factory.Forbidden("One or more services cannot be linked to this business");
    }
  }
}
