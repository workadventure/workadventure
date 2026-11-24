import type { Page } from "@playwright/test";

/**
 * Overrides front environment variables (window.env) for this page and its reloads. Call it from a `pageCreatedHook`,
 * before the page loads.
 */
export default async function setFrontEnvVars(page: Page, vars: Record<string, unknown>): Promise<void> {
    await page.addInitScript((vars) => {
        // window.env is set by an inline script of the page: patch it as soon as it is assigned.
        Object.defineProperty(window, "env", {
            configurable: true,
            set(value: Record<string, unknown>) {
                Object.assign(value, vars);
                Object.defineProperty(window, "env", { value, writable: true, configurable: true });
            },
        });
    }, vars);
}
