import { setUser as SentrySetUser } from "@sentry/nextjs";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import type React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import PageWrapper from "@components/PageWrapperAppDir";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import Shell from "~/shell/Shell";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const _headers = await headers();
  const _cookies = await cookies();
  const nonce = _headers.get("x-csp-nonce") ?? undefined;

  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (session?.user?.id) SentrySetUser({ id: session.user.id });

  const headScript = process.env.NEXT_PUBLIC_HEAD_SCRIPTS;
  const bodyScript = process.env.NEXT_PUBLIC_BODY_SCRIPTS;
  const scripts = [
    { id: "injected-head-script", script: headScript ?? "" },
    { id: "injected-body-script", script: bodyScript ?? "" },
  ].filter((s): s is { id: string; script: string } => !!s.script);

  return (
    <PageWrapper requiresLicense={false} nonce={nonce}>
      <Shell withoutMain={true}>{children}</Shell>
      {scripts.map((s) => (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Injected scripts from env vars
        <Script key={s.id} nonce={nonce} id={s.id} dangerouslySetInnerHTML={{ __html: s.script }} />
      ))}
    </PageWrapper>
  );
}
