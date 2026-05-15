import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import HomeView from "~/home/views/home-view";

const Page = async () => {
  const _headers = await headers();
  const _cookies = await cookies();

  const session = await getServerSession({
    req: buildLegacyRequest(_headers, _cookies),
  });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const organizationId = session.user.profile?.organizationId ?? null;
  const onboardingPath = await checkOnboardingRedirect(session.user.id, {
    checkEmailVerification: true,
    organizationId,
  });
  if (onboardingPath) {
    return redirect(onboardingPath);
  }

  const meCaller = await createRouterCaller(meRouter, await getTRPCContext(_headers, _cookies));
  const stats = await meCaller.myStats();

  const userName = session.user.name ?? session.user.username ?? "there";
  const bookingPageSlug = session.user.username ?? "";

  return (
    <HomeView
      userName={userName}
      bookingPageSlug={bookingPageSlug}
      sumOfBookings={stats.sumOfBookings ?? 0}
      sumOfEventTypes={stats.sumOfEventTypes ?? 0}
      sumOfTeamEventTypes={stats.sumOfTeamEventTypes ?? 0}
    />
  );
};

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Home",
    () => "Your gobookme dashboard",
    undefined,
    undefined,
    "/home"
  );

export default Page;
