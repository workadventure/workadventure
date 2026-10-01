export const VERIFIED_ORIGIN_TTL_MS: number;
export function activeVerifiedOrigins(stored: unknown, now?: number): string[];
export function rememberVerifiedOrigin(
    stored: unknown,
    origin: string,
    now?: number,
    ttlMs?: number
): Record<string, number>;
export function verifyOriginRequestUrl(
    portalUrl: string,
    url: string,
    allowInsecurePortal?: boolean
): string | undefined;
