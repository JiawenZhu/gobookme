-- CreateEnum
CREATE TYPE "BusinessListingApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessListingClaimStatus" AS ENUM ('UNCLAIMED', 'CLAIMED', 'CLAIM_PENDING');

-- CreateEnum
CREATE TYPE "BusinessListingVisibility" AS ENUM ('DRAFT', 'PUBLIC', 'HIDDEN');

-- CreateEnum
CREATE TYPE "BusinessClaimRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessListingAnalyticsEvent" AS ENUM ('DIRECTORY_VIEW', 'PROFILE_VIEW', 'QR_VISIT', 'BOOKING_CLICK', 'BOOKING_STARTED', 'BOOKING_COMPLETED', 'PAID_BOOKING_COMPLETED');

-- CreateTable
CREATE TABLE "BusinessListing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT,
    "address" TEXT,
    "googlePlaceId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "photos" TEXT[],
    "approvalStatus" "BusinessListingApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "claimStatus" "BusinessListingClaimStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "visibility" "BusinessListingVisibility" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "plan" TEXT,
    "foundingCustomer" BOOLEAN NOT NULL DEFAULT false,
    "setupPackageStatus" TEXT,
    "paymentWillingness" TEXT,
    "ownerUserId" INTEGER,
    "ownerTeamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessListingCategory" (
    "listingId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessListingCategory_pkey" PRIMARY KEY ("listingId","categoryId")
);

-- CreateTable
CREATE TABLE "BusinessListingService" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessListingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessClaimRequest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "requesterId" INTEGER,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "message" TEXT,
    "status" "BusinessClaimRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessClaimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessListingAnalytics" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "event" "BusinessListingAnalyticsEvent" NOT NULL,
    "source" TEXT,
    "categorySlug" TEXT,
    "eventTypeId" INTEGER,
    "bookingId" INTEGER,
    "userId" INTEGER,
    "grossBookingValue" INTEGER,
    "estimatedPlatformFee" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessListingAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessListing_slug_key" ON "BusinessListing"("slug");

-- CreateIndex
CREATE INDEX "BusinessListing_city_idx" ON "BusinessListing"("city");

-- CreateIndex
CREATE INDEX "BusinessListing_neighborhood_idx" ON "BusinessListing"("neighborhood");

-- CreateIndex
CREATE INDEX "BusinessListing_approvalStatus_visibility_idx" ON "BusinessListing"("approvalStatus", "visibility");

-- CreateIndex
CREATE INDEX "BusinessListing_featured_idx" ON "BusinessListing"("featured");

-- CreateIndex
CREATE INDEX "BusinessListing_ownerUserId_idx" ON "BusinessListing"("ownerUserId");

-- CreateIndex
CREATE INDEX "BusinessListing_ownerTeamId_idx" ON "BusinessListing"("ownerTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCategory_slug_key" ON "BusinessCategory"("slug");

-- CreateIndex
CREATE INDEX "BusinessListingCategory_categoryId_idx" ON "BusinessListingCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessListingService_listingId_eventTypeId_key" ON "BusinessListingService"("listingId", "eventTypeId");

-- CreateIndex
CREATE INDEX "BusinessListingService_eventTypeId_idx" ON "BusinessListingService"("eventTypeId");

-- CreateIndex
CREATE INDEX "BusinessListingService_listingId_position_idx" ON "BusinessListingService"("listingId", "position");

-- CreateIndex
CREATE INDEX "BusinessClaimRequest_listingId_idx" ON "BusinessClaimRequest"("listingId");

-- CreateIndex
CREATE INDEX "BusinessClaimRequest_requesterId_idx" ON "BusinessClaimRequest"("requesterId");

-- CreateIndex
CREATE INDEX "BusinessClaimRequest_status_idx" ON "BusinessClaimRequest"("status");

-- CreateIndex
CREATE INDEX "BusinessListingAnalytics_listingId_event_idx" ON "BusinessListingAnalytics"("listingId", "event");

-- CreateIndex
CREATE INDEX "BusinessListingAnalytics_listingId_createdAt_idx" ON "BusinessListingAnalytics"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessListingAnalytics_bookingId_idx" ON "BusinessListingAnalytics"("bookingId");

-- CreateIndex
CREATE INDEX "BusinessListingAnalytics_userId_idx" ON "BusinessListingAnalytics"("userId");

-- AddForeignKey
ALTER TABLE "BusinessListing" ADD CONSTRAINT "BusinessListing_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessListing" ADD CONSTRAINT "BusinessListing_ownerTeamId_fkey" FOREIGN KEY ("ownerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessListingCategory" ADD CONSTRAINT "BusinessListingCategory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "BusinessListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessListingCategory" ADD CONSTRAINT "BusinessListingCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BusinessCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessListingService" ADD CONSTRAINT "BusinessListingService_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "BusinessListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessListingService" ADD CONSTRAINT "BusinessListingService_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessClaimRequest" ADD CONSTRAINT "BusinessClaimRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "BusinessListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessClaimRequest" ADD CONSTRAINT "BusinessClaimRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessClaimRequest" ADD CONSTRAINT "BusinessClaimRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessListingAnalytics" ADD CONSTRAINT "BusinessListingAnalytics_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "BusinessListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessListingAnalytics" ADD CONSTRAINT "BusinessListingAnalytics_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessListingAnalytics" ADD CONSTRAINT "BusinessListingAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
