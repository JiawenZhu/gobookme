import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { getAllDelegationCredentialsForUser } from "@calcom/app-store/delegationCredential";
import { GOBOOKME_ALLOWED_APP_SLUGS } from "@calcom/app-store/gobookme-allowed-apps";
import { getAppFromSlug } from "@calcom/app-store/utils";
import type { UserAdminTeams } from "@calcom/features/users/repositories/UserRepository";
import getInstallCountPerApp from "@calcom/lib/apps/getInstallCountPerApp";
import prisma, { safeAppSelect, safeCredentialSelect } from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";

export type TDependencyData = {
  name?: string;
  installed?: boolean;
}[];

const allowedAppSlugs = Array.from(GOBOOKME_ALLOWED_APP_SLUGS);

/**
 * Get App metadata either using dirName or slug
 */
export async function getAppWithMetadata(app: { dirName: string } | { slug: string }) {
  let appMetadata: App | null;

  if ("dirName" in app) {
    appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata] as App;
  } else {
    const foundEntry = Object.entries(appStoreMetadata).find(([, meta]) => {
      return meta.slug === app.slug;
    });
    if (!foundEntry) return null;
    appMetadata = foundEntry[1] as App;
  }

  if (!appMetadata) return null;
  // Let's not leak api keys to the front end
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key, ...metadata } = appMetadata;
  return metadata;
}

async function getAllowedStaticApps(installCountPerApp: Record<string, number>) {
  const apps = [] as App[];

  for await (const [dirName] of Object.entries(appStoreMetadata)) {
    const app = await getAppWithMetadata({ dirName });
    if (!app || !GOBOOKME_ALLOWED_APP_SLUGS.has(app.slug)) continue;

    apps.push({
      ...app,
      category: app.category || "other",
      installed: true,
      installCount: installCountPerApp[app.slug] || 0,
    });
  }

  return apps;
}

function getDependencyData(app: App, credentialAppSlugs: Set<string>) {
  if (!app.dependencies) return [];

  return app.dependencies.map((dependency) => {
    const dependencyName = getAppFromSlug(dependency)?.name;
    return { name: dependencyName, installed: credentialAppSlugs.has(dependency) };
  });
}

function getSafeDelegationCredentialsForApp(
  delegationCredentials: Awaited<ReturnType<typeof getAllDelegationCredentialsForUser>>,
  appSlug: string
) {
  return delegationCredentials.flatMap((credential) => {
    if (credential.appId !== appSlug) return [];

    return [
      {
        id: credential.id,
        type: credential.type,
        userId: credential.userId,
        user: credential.user,
        teamId: credential.teamId,
        appId: credential.appId,
        invalid: credential.invalid,
        delegationCredentialId: credential.delegationCredentialId,
        delegatedToId: credential.delegatedToId,
        appName: credential.appName,
      },
    ] satisfies Credential[];
  });
}

/** Mainly to use in listings for the frontend, use in getStaticProps or getServerSideProps */
export async function getAppRegistry() {
  const dbApps = await prisma.app.findMany({
    where: { enabled: true, slug: { in: allowedAppSlugs } },
    select: { dirName: true, slug: true, categories: true, enabled: true, createdAt: true },
  });

  const installCountPerApp = await getInstallCountPerApp();
  const appsBySlug = new Map<string, App>();

  for (const app of await getAllowedStaticApps(installCountPerApp)) {
    appsBySlug.set(app.slug, app);
  }

  for await (const dbapp of dbApps) {
    const app = await getAppWithMetadata(dbapp);
    if (!app) continue;
    appsBySlug.set(dbapp.slug, {
      ...app,
      category: app.category || "other",
      categories: dbapp.categories,
      createdAt: dbapp.createdAt.toISOString(),
      installed: true,
      installCount: installCountPerApp[dbapp.slug] || 0,
    });
  }

  return Array.from(appsBySlug.values());
}

export async function getAppRegistryWithCredentials(userId: number, userAdminTeams: UserAdminTeams = []) {
  const dbApps = await prisma.app.findMany({
    where: { enabled: true, slug: { in: allowedAppSlugs } },
    select: {
      ...safeAppSelect,
    },
  });

  const credentials = await prisma.credential.findMany({
    where: { appId: { in: allowedAppSlugs }, OR: [{ userId }, { teamId: { in: userAdminTeams } }] },
    select: safeCredentialSelect,
  });

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      email: true,
      id: true,
      metadata: true,
    },
  });

  const delegationCredentials = user
    ? await getAllDelegationCredentialsForUser({ user: { id: userId, email: user.email } })
    : [];

  const usersDefaultApp = userMetadata.parse(user?.metadata)?.defaultConferencingApp?.appSlug;
  const apps = [] as (App & {
    credentials: Credential[];
    isDefault?: boolean;
  })[];
  const installCountPerApp = await getInstallCountPerApp();
  const credentialsByAppSlug = new Map<string, Credential[]>();
  for (const credential of credentials) {
    if (!credential.appId) continue;
    const appCredentials = credentialsByAppSlug.get(credential.appId) ?? [];
    appCredentials.push(credential);
    credentialsByAppSlug.set(credential.appId, appCredentials);
  }

  const credentialAppSlugs = new Set(
    credentials.flatMap((credential) => (credential.appId ? [credential.appId] : []))
  );
  const dbAppsBySlug = new Map(dbApps.map((dbApp) => [dbApp.slug, dbApp]));

  for (const app of await getAllowedStaticApps(installCountPerApp)) {
    const dbapp = dbAppsBySlug.get(app.slug);
    const delegationCredentialsForApp = getSafeDelegationCredentialsForApp(delegationCredentials, app.slug);
    const allCredentials = [...delegationCredentialsForApp, ...(credentialsByAppSlug.get(app.slug) ?? [])];
    const dependencyData = getDependencyData(app, credentialAppSlugs);

    apps.push({
      ...app,
      categories: dbapp?.categories ?? app.categories,
      createdAt: dbapp?.createdAt.toISOString() ?? app.createdAt,
      credentials: allCredentials,
      installed: true,
      installCount: installCountPerApp[app.slug] || 0,
      isDefault: usersDefaultApp === app.slug,
      ...(app.dependencies && { dependencyData }),
    });
  }

  return apps;
}
