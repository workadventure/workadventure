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
export const MAX_TRUSTED_SERVERS: number;
export function trustableOrigin(url: unknown, allowHttp?: boolean): string | undefined;
export function addTrustedServer(stored: unknown, origin: string): string[];
export function removeTrustedServer(stored: unknown, origin: string): string[];
