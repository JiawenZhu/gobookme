"use server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { BusinessListingService } from "@calcom/features/business-listings/services/BusinessListingService";
import { prisma } from "@calcom/prisma";
import { BusinessClaimRequestStatus } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

function nullableString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const stringValue = nullableString(value);
  if (!stringValue) return null;
  const parsed = Number(stringValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function formValues(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function listingInputFromFormData(formData: FormData) {
  return {
    id: nullableString(formData.get("id")) ?? undefined,
    displayName: nullableString(formData.get("displayName")) ?? "",
    slug: nullableString(formData.get("slug")) ?? undefined,
    description: nullableString(formData.get("description")),
    city: nullableString(formData.get("city")) ?? "champaign",
    neighborhood: nullableString(formData.get("neighborhood")),
    address: nullableString(formData.get("address")),
    googlePlaceId: nullableString(formData.get("googlePlaceId")),
    latitude: nullableNumber(formData.get("latitude")),
    longitude: nullableNumber(formData.get("longitude")),
    phone: nullableString(formData.get("phone")),
    website: nullableString(formData.get("website")),
    instagram: nullableString(formData.get("instagram")),
    photos: formValues(formData, "photos").flatMap((value) =>
      value
        .split("\n")
        .map((photo) => photo.trim())
        .filter((photo) => photo.length > 0)
    ),
    categorySlugs: formValues(formData, "categorySlugs"),
    eventTypeIds: formValues(formData, "eventTypeIds").map((value) => Number(value)),
    ownerUserId: nullableNumber(formData.get("ownerUserId")),
    ownerTeamId: nullableNumber(formData.get("ownerTeamId")),
    approvalStatus: nullableString(formData.get("approvalStatus")) ?? undefined,
    claimStatus: nullableString(formData.get("claimStatus")) ?? undefined,
    visibility: nullableString(formData.get("visibility")) ?? undefined,
    featured: formData.get("featured") === "true",
    foundingCustomer: formData.get("foundingCustomer") === "true",
  };
}

async function getRequiredSession() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) redirect("/auth/login");
  return session;
}

export async function seedBusinessCategoriesAction() {
  const session = await getRequiredSession();
  if (session.user.role !== "ADMIN") redirect("/settings/my-account/profile");

  const service = new BusinessListingService(prisma);
  await service.seedFoundingCategories();
  revalidatePath("/settings/admin/business-listings");
}

export async function saveAdminBusinessListingAction(formData: FormData) {
  const session = await getRequiredSession();
  if (session.user.role !== "ADMIN") redirect("/settings/my-account/profile");

  const service = new BusinessListingService(prisma);
  await service.upsertAdminListing(listingInputFromFormData(formData));

  revalidatePath("/settings/admin/business-listings");
  revalidatePath("/champaign");
  redirect("/settings/admin/business-listings");
}

export async function saveOwnerBusinessListingAction(formData: FormData) {
  const session = await getRequiredSession();
  const service = new BusinessListingService(prisma);
  await service.updateOwnerListing({
    userId: session.user.id,
    input: listingInputFromFormData(formData),
  });

  revalidatePath("/business/manage");
  revalidatePath("/champaign");
  redirect("/business/manage");
}

export async function submitOwnerBusinessListingAction(formData: FormData) {
  const session = await getRequiredSession();
  const service = new BusinessListingService(prisma);
  await service.submitOwnerListing({
    userId: session.user.id,
    input: listingInputFromFormData(formData),
  });

  revalidatePath("/business/manage");
  revalidatePath("/settings/admin/business-listings");
  redirect("/business/manage?submitted=1");
}

export async function createBusinessClaimRequestAction(formData: FormData) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const service = new BusinessListingService(prisma);
  const slug = nullableString(formData.get("slug"));

  await service.createClaimRequest(
    {
      listingId: nullableString(formData.get("listingId")),
      requesterName: nullableString(formData.get("requesterName")),
      requesterEmail: nullableString(formData.get("requesterEmail")),
      message: nullableString(formData.get("message")),
    },
    session?.user?.id ?? null
  );

  revalidatePath("/settings/admin/business-listings");
  if (slug) redirect(`/business/${slug}?claim=requested`);
  redirect("/champaign");
}

export async function deleteAdminBusinessListingAction(formData: FormData) {
  const session = await getRequiredSession();
  if (session.user.role !== "ADMIN") redirect("/settings/my-account/profile");

  const id = nullableString(formData.get("id"));
  if (!id) throw new Error("Listing id is required");

  await prisma.businessListing.delete({ where: { id } });

  revalidatePath("/settings/admin/business-listings");
  revalidatePath("/champaign");
}

export async function reviewBusinessClaimRequestAction(formData: FormData) {
  const session = await getRequiredSession();
  if (session.user.role !== "ADMIN") redirect("/settings/my-account/profile");

  const service = new BusinessListingService(prisma);
  await service.reviewClaimRequest(
    {
      requestId: nullableString(formData.get("requestId")),
      status: nullableString(formData.get("status")) ?? BusinessClaimRequestStatus.REJECTED,
      ownerUserId: nullableNumber(formData.get("ownerUserId")),
      ownerTeamId: nullableNumber(formData.get("ownerTeamId")),
    },
    session.user.id
  );

  revalidatePath("/settings/admin/business-listings");
}
