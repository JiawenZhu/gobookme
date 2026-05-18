import process from "node:process";
import type { PoolConfig } from "pg";

const shouldSkipTlsVerification = (sslMode: string | null): boolean => {
  return sslMode === "no-verify" || process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED === "false";
};

export const buildPgPoolConfig = (connectionString: string): PoolConfig => {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");

    if (!shouldSkipTlsVerification(sslMode)) {
      return { connectionString };
    }

    url.searchParams.delete("sslmode");

    return {
      connectionString: url.toString(),
      ssl: {
        rejectUnauthorized: false,
      },
    };
  } catch {
    return { connectionString };
  }
};
