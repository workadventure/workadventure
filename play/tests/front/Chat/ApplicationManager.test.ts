import type { ApplicationDefinitionInterface } from "@workadventure/messages";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workadventure/shared-utils", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();

    return {
        ...actual,
        KlaxoonService: {
            initWindowKlaxoonActivityPicker: vi.fn(),
        },
    };
});

import { ApplicationManager } from "../../../src/front/Chat/Applications/ApplicationManager";

describe("ApplicationManager", () => {
    it("keeps non-native applications available in the UI", () => {
        const applications: ApplicationDefinitionInterface[] = [
            {
                name: "custom-app",
                enabled: true,
                default: false,
                forceNewTab: false,
                allowAPI: false,
            },
        ];

        const manager = new ApplicationManager(applications);

        expect(manager.applications).toEqual(applications);
    });
});
