import type { DesktopConfig } from "./desktop-url-policy";

export const LEGACY_LOGIN_ITEM_NAME: string;
export const LEGACY_USER_DATA_DIR: string;
export function migrateLegacySettings(
    legacy: unknown,
    config: DesktopConfig
): {
    pinned_worlds?: string[];
    trusted_origins?: string[];
    shortcuts?: Record<string, string>;
    auto_launch_enabled?: boolean;
};
