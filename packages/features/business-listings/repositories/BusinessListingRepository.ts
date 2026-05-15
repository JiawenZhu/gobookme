import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import {
  BusinessClaimRequestStatus,
  BusinessListingAnalyticsEvent,
  BusinessListingApprovalStatus,
  BusinessListingClaimStatus,
  BusinessListingVisibility,
  MembershipRole,
} from "@calcom/prisma/enums";
import { GOBOOKME_ESTIMATED_PLATFORM_FEE_BASIS_POINTS } from "../lib/constants";
import type {
  BusinessCategoryUpsertInput,
  BusinessClaimRequestInput,
  BusinessClaimReviewInput,
  BusinessListingAnalyticsInput,
  BusinessListingUpsertInput,
  BusinessOwnerListingUpdateInput,
} from "../lib/schemas";

const serviceEventTypeSelect = {
  id: true,
  title: true,
  slug: true,
  length: true,
  price: true,
  currency: true,
  hidden: true,
  metadata: true,
  owner: {
    select: {
      username: true,
      name: true,
    },
  },
  profile: {
    select: {
      username: true,
    },
  },
  team: {
    select: {
      slug: true,
      name: true,
    },
  },
} satisfies Prisma.EventTypeSelect;

export const businessListingSelect = {
  id: true,
  slug: true,
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
  approvalStatus: true,
  claimStatus: true,
  visibility: true,
  featured: true,
  plan: true,
  foundingCustomer: true,
  setupPackageStatus: true,
  paymentWillingness: true,
  ownerUserId: true,
  ownerTeamId: true,
  createdAt: true,
  updatedAt: true,
  ownerUser: {
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
    },
  },
  ownerTeam: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  categories: {
    select: {
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
        },
      },
    },
  },
  services: {
    orderBy: {
      position: "asc",
    },
    select: {
      id: true,
      position: true,
      eventType: {
        select: serviceEventTypeSelect,
      },
    },
  },
} satisfies Prisma.BusinessListingSelect;

export type BusinessListingDTO = Prisma.BusinessListingGetPayload<{
  select: typeof businessListingSelect;
}>;

export class BusinessListingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async seedFoundingCategories(categories: BusinessCategoryUpsertInput[]) {
    return await this.prisma.$transaction(
      categories.map((category) =>
        this.prisma.businessCategory.upsert({
          where: { slug: category.slug },
          update: {
            name: category.name,
            description: category.description ?? null,
          },
          create: {
            slug: category.slug,
            name: category.name,
            description: category.description ?? null,
          },
        })
      )
    );
  }

  async listCategories() {
    return await this.prisma.businessCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    });
  }

  async upsertCategory(input: BusinessCategoryUpsertInput) {
    return await this.prisma.businessCategory.upsert({
      where: { slug: input.slug },
      update: {
        name: input.name,
        description: input.description ?? null,
      },
      create: {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    });
  }

  async listApproved({ city, categorySlug }: { city?: string; categorySlug?: string } = {}) {
    return await this.prisma.businessListing.findMany({
      where: {
        approvalStatus: BusinessListingApprovalStatus.APPROVED,
        visibility: BusinessListingVisibility.PUBLIC,
        ...(city ? { city } : null),
        ...(categorySlug
          ? {
              categories: {
                some: {
                  category: {
                    slug: categorySlug,
                  },
                },
              },
            }
          : null),
      },
      orderBy: [{ featured: "desc" }, { displayName: "asc" }],
      select: businessListingSelect,
    });
  }

  async findApprovedBySlug(slug: string) {
    return await this.prisma.businessListing.findFirst({
      where: {
        slug,
        approvalStatus: BusinessListingApprovalStatus.APPROVED,
        visibility: BusinessListingVisibility.PUBLIC,
      },
      select: businessListingSelect,
    });
  }

  async findEditableById(id: string) {
    return await this.prisma.businessListing.findUnique({
      where: { id },
      select: businessListingSelect,
    });
  }

  async findAnyBySlug(slug: string) {
    return await this.prisma.businessListing.findUnique({
      where: { slug },
      select: {
        id: true,
      },
    });
  }

  async listForAdmin() {
    return await this.prisma.businessListing.findMany({
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      select: businessListingSelect,
    });
  }

  async listForOwner(userId: number) {
    return await this.prisma.businessListing.findMany({
      where: {
        OR: [
          { ownerUserId: userId },
          {
            ownerTeam: {
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
      orderBy: { updatedAt: "desc" },
      select: businessListingSelect,
    });
  }

  async userCanEditListing({ listingId, userId }: { listingId: string; userId: number }) {
    const listing = await this.prisma.businessListing.findFirst({
      where: {
        id: listingId,
        OR: [
          { ownerUserId: userId },
          {
            ownerTeam: {
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
      select: {
        id: true,
      },
    });

    return !!listing;
  }

  async upsertListing(input: BusinessListingUpsertInput & { slug: string }) {
    const listing = await this.prisma.businessListing.upsert({
      where: input.id ? { id: input.id } : { slug: input.slug },
      update: this.toListingUpdateData(input),
      create: this.toListingCreateData(input),
      select: {
        id: true,
      },
    });

    await this.syncListingCategories(listing.id, input.categorySlugs);
    await this.syncListingServices(listing.id, input.eventTypeIds);

    return await this.findEditableById(listing.id);
  }

  async updateOwnerEditableListing(input: BusinessOwnerListingUpdateInput & { id: string }) {
    const listing = await this.prisma.businessListing.update({
      where: { id: input.id },
      data: {
        displayName: input.displayName,
        description: input.description ?? null,
        city: input.city,
        neighborhood: input.neighborhood ?? null,
        address: input.address ?? null,
        googlePlaceId: input.googlePlaceId ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        phone: input.phone ?? null,
        website: input.website || null,
        instagram: input.instagram ?? null,
        photos: input.photos,
        approvalStatus: BusinessListingApprovalStatus.PENDING,
        visibility: BusinessListingVisibility.DRAFT,
      },
      select: {
        id: true,
      },
    });

    await this.syncListingCategories(listing.id, input.categorySlugs);
    await this.syncListingServices(listing.id, input.eventTypeIds);

    return await this.findEditableById(listing.id);
  }

  async createClaimRequest(input: BusinessClaimRequestInput & { requesterId?: number | null }) {
    const claimRequest = await this.prisma.businessClaimRequest.create({
      data: {
        listingId: input.listingId,
        requesterId: input.requesterId ?? null,
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        message: input.message ?? null,
      },
      select: {
        id: true,
      },
    });

    await this.prisma.businessListing.update({
      where: { id: input.listingId },
      data: { claimStatus: BusinessListingClaimStatus.CLAIM_PENDING },
      select: { id: true },
    });

    return claimRequest;
  }

  async reviewClaimRequest(input: BusinessClaimReviewInput & { reviewedById: number }) {
    const claimRequest = await this.prisma.businessClaimRequest.update({
      where: { id: input.requestId },
      data: {
        status: input.status,
        reviewedById: input.reviewedById,
        reviewedAt: new Date(),
      },
      select: {
        id: true,
        listingId: true,
      },
    });

    if (input.status === BusinessClaimRequestStatus.APPROVED) {
      await this.prisma.businessListing.update({
        where: { id: claimRequest.listingId },
        data: {
          ownerUserId: input.ownerUserId ?? null,
          ownerTeamId: input.ownerTeamId ?? null,
          claimStatus: BusinessListingClaimStatus.CLAIMED,
        },
        select: { id: true },
      });
    }

    return claimRequest;
  }

  async listClaimRequests() {
    return await this.prisma.businessClaimRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        requesterName: true,
        requesterEmail: true,
        message: true,
        status: true,
        reviewedAt: true,
        createdAt: true,
        listing: {
          select: {
            id: true,
            displayName: true,
            slug: true,
          },
        },
      },
    });
  }

  async trackAnalytics(input: BusinessListingAnalyticsInput) {
    const grossBookingValue = input.grossBookingValue ?? null;
    const estimatedPlatformFee =
      grossBookingValue === null
        ? null
        : Math.round((grossBookingValue * GOBOOKME_ESTIMATED_PLATFORM_FEE_BASIS_POINTS) / 10000);

    return await this.prisma.businessListingAnalytics.create({
      data: {
        listingId: input.listingId,
        event: input.event,
        source: input.source ?? null,
        categorySlug: input.categorySlug ?? null,
        eventTypeId: input.eventTypeId ?? null,
        bookingId: input.bookingId ?? null,
        userId: input.userId ?? null,
        grossBookingValue,
        estimatedPlatformFee,
      },
      select: {
        id: true,
      },
    });
  }

  async getAdminMetrics() {
    const [
      totalListings,
      approvedListings,
      claimedListings,
      bookingClicks,
      completedBookings,
      paidCompletedBookings,
      grossBookingValue,
      estimatedPlatformFee,
    ] = await Promise.all([
      this.prisma.businessListing.count(),
      this.prisma.businessListing.count({
        where: { approvalStatus: BusinessListingApprovalStatus.APPROVED },
      }),
      this.prisma.businessListing.count({
        where: { claimStatus: BusinessListingClaimStatus.CLAIMED },
      }),
      this.prisma.businessListingAnalytics.count({
        where: { event: BusinessListingAnalyticsEvent.BOOKING_CLICK },
      }),
      this.prisma.businessListingAnalytics.count({
        where: { event: BusinessListingAnalyticsEvent.BOOKING_COMPLETED },
      }),
      this.prisma.businessListingAnalytics.count({
        where: { event: BusinessListingAnalyticsEvent.PAID_BOOKING_COMPLETED },
      }),
      this.prisma.businessListingAnalytics.aggregate({
        _sum: { grossBookingValue: true },
      }),
      this.prisma.businessListingAnalytics.aggregate({
        _sum: { estimatedPlatformFee: true },
      }),
    ]);

    return {
      totalListings,
      approvedListings,
      claimedListings,
      bookingClicks,
      completedBookings,
      paidCompletedBookings,
      grossBookingValue: grossBookingValue._sum.grossBookingValue ?? 0,
      estimatedPlatformFee: estimatedPlatformFee._sum.estimatedPlatformFee ?? 0,
    };
  }

  private toListingCreateData(
    input: BusinessListingUpsertInput & { slug: string }
  ): Prisma.BusinessListingCreateInput {
    return {
      slug: input.slug,
      displayName: input.displayName,
      description: input.description ?? null,
      city: input.city,
      neighborhood: input.neighborhood ?? null,
      address: input.address ?? null,
      googlePlaceId: input.googlePlaceId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      phone: input.phone ?? null,
      website: input.website || null,
      instagram: input.instagram ?? null,
      photos: input.photos,
      approvalStatus: input.approvalStatus ?? BusinessListingApprovalStatus.PENDING,
      claimStatus: input.claimStatus ?? BusinessListingClaimStatus.UNCLAIMED,
      visibility: input.visibility ?? BusinessListingVisibility.DRAFT,
      featured: input.featured ?? false,
      plan: input.plan ?? null,
      foundingCustomer: input.foundingCustomer ?? false,
      setupPackageStatus: input.setupPackageStatus ?? null,
      paymentWillingness: input.paymentWillingness ?? null,
      ...(input.ownerUserId ? { ownerUser: { connect: { id: input.ownerUserId } } } : null),
      ...(input.ownerTeamId ? { ownerTeam: { connect: { id: input.ownerTeamId } } } : null),
    };
  }

  private toListingUpdateData(input: BusinessListingUpsertInput): Prisma.BusinessListingUpdateInput {
    return {
      displayName: input.displayName,
      description: input.description ?? null,
      city: input.city,
      neighborhood: input.neighborhood ?? null,
      address: input.address ?? null,
      googlePlaceId: input.googlePlaceId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      phone: input.phone ?? null,
      website: input.website || null,
      instagram: input.instagram ?? null,
      photos: input.photos,
      approvalStatus: input.approvalStatus,
      claimStatus: input.claimStatus,
      visibility: input.visibility,
      featured: input.featured,
      plan: input.plan ?? null,
      foundingCustomer: input.foundingCustomer,
      setupPackageStatus: input.setupPackageStatus ?? null,
      paymentWillingness: input.paymentWillingness ?? null,
      ownerUser: input.ownerUserId ? { connect: { id: input.ownerUserId } } : { disconnect: true },
      ownerTeam: input.ownerTeamId ? { connect: { id: input.ownerTeamId } } : { disconnect: true },
    };
  }

  private async syncListingCategories(listingId: string, categorySlugs: string[]) {
    const categories = await this.prisma.businessCategory.findMany({
      where: {
        slug: {
          in: categorySlugs,
        },
      },
      select: {
        id: true,
      },
    });

    await this.prisma.businessListingCategory.deleteMany({ where: { listingId } });
    if (categories.length === 0) return;

    await this.prisma.businessListingCategory.createMany({
      data: categories.map((category) => ({
        listingId,
        categoryId: category.id,
      })),
      skipDuplicates: true,
    });
  }

  private async syncListingServices(listingId: string, eventTypeIds: number[]) {
    await this.prisma.businessListingService.deleteMany({ where: { listingId } });
    if (eventTypeIds.length === 0) return;

    await this.prisma.businessListingService.createMany({
      data: eventTypeIds.map((eventTypeId, position) => ({
        listingId,
        eventTypeId,
        position,
      })),
      skipDuplicates: true,
    });
  }
}
