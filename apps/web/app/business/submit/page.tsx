import process from "node:process";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { BusinessListingService } from "@calcom/features/business-listings/services/BusinessListingService";
import { prisma } from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { submitOwnerBusinessListingAction } from "~/business/actions";
import { BusinessListingForm } from "~/business/components/BusinessListingForm";
import { getOwnerEventTypeOptions } from "~/business/lib/server-data";

export const metadata = {
  title: "Submit your business | GoBookMe",
};

export default async function BusinessSubmitPage() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) redirect("/auth/login");

  const service = new BusinessListingService(prisma);
  const [listings, categories, eventTypes] = await Promise.all([
    service.listOwnerListings(session.user.id),
    service.listCategories(),
    getOwnerEventTypeOptions(session.user.id),
  ]);

  // Owner already has a listing — send them to manage instead
  if (listings.length > 0) redirect("/business/manage");

  return (
    <main className="bg-default min-h-screen">
      <section className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        <header className="space-y-2">
          <Link className="text-subtle text-sm" href="/champaign">
            ← Champaign directory
          </Link>
          <h1 className="text-3xl font-semibold text-emphasis">List your business</h1>
          <p className="text-sm text-subtle">
            Fill in your details and submit for review. Once approved by our team your business will appear
            in the public directory and customers can start booking.
          </p>
        </header>

        {/* Process steps */}
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            { step: "1", label: "Submit details", desc: "Fill in your business info below" },
            { step: "2", label: "Admin review", desc: "We verify and approve within 1–2 business days" },
            { step: "3", label: "Go live", desc: "Your listing appears in the directory" },
          ].map(({ step, label, desc }) => (
            <li key={step} className="border-subtle bg-muted flex gap-3 rounded-lg border p-4">
              <span className="bg-brand text-brand flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {step}
              </span>
              <div>
                <p className="text-sm font-medium text-emphasis">{label}</p>
                <p className="text-xs text-subtle">{desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <BusinessListingForm
          action={submitOwnerBusinessListingAction}
          categories={categories}
          eventTypes={eventTypes}
          googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
          mode="submit"
        />
      </section>
    </main>
  );
}
