import type { Page } from "@playwright/test";

const setFrontEnvVars = (vars: Record<string, unknown>) => {
    return {
        pageCreatedHook: async (page: Page) => {
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
        },
    };
};

export default setFrontEnvVars;
