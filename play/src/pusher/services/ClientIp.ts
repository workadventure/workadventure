export function getClientIpFromXForwardedFor(xForwardedFor: string | undefined): string {
    return xForwardedFor?.split(",")[0]?.trim() ?? "";
}
