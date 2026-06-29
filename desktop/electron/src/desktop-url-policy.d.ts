export type DesktopConfig = {
    portalUrl: string;
    portalOrigin: string;
    allowedOrigins: string[];
    allowedHostSuffixes: string[];
    updateFeedUrl: string;
};

export type DesktopAuthCallback = {
    origin: string;
    code: string;
};

export function createDesktopConfig(env?: Record<string, unknown>): DesktopConfig;
export function createDesktopLoginUrl(value: string, desktopCallbackUrl?: string): string;
export function createDesktopLogoutUrl(value: string, desktopCallbackUrl?: string): string;
export function createRoomUrlWithAuthToken(targetUrl: string, token: string): string;
export function extractDesktopAuthCallback(value: string): DesktopAuthCallback | undefined;
export function extractDesktopTargetFromDeepLink(value: string): string | undefined;
export function isAllowedNavigationUrl(value: string, config: DesktopConfig): boolean;
export function isDesktopLoginUrl(value: string): boolean;
export function isDesktopLogoutUrl(value: string): boolean;
export function isRoomUrl(value: string): boolean;
export function normalizePersistedLastRoomUrl(value?: string): string | undefined;
export function normalizePersistedPortalUrl(value?: string, fallback?: string): string;
export function resolveInitialTarget(
    config: DesktopConfig,
    state?: {
        pendingDeepLinkUrl?: string;
        lastRoomUrl?: string;
    }
): string;
export function stripSensitiveQueryParams(value: string | undefined): string | undefined;
export function redactSensitiveString(value: string | undefined): string | undefined;
export const SENSITIVE_QUERY_PARAMS: readonly string[];
