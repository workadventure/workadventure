import { afterEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import type { WorkAdventureComponent } from "../../types/component";
import { floatingUiComponents, showFloatingUi } from "./svelte-floatingui-show";

const TestComponent = (() => undefined) as unknown as WorkAdventureComponent;
const referenceNode = {} as Element;

afterEach(() => {
    floatingUiComponents.set(new Map());
});

describe("showFloatingUi", () => {
    it("uses the global floating layer by default", () => {
        const close = showFloatingUi(referenceNode, TestComponent, {});

        expect([...get(floatingUiComponents).values()][0]?.zIndex).toBe(3000);

        close();
    });

    it("allows a popup to override its layer", () => {
        const close = showFloatingUi(referenceNode, TestComponent, {}, undefined, 0, true, false, undefined, 1100);

        expect([...get(floatingUiComponents).values()][0]?.zIndex).toBe(1100);

        close();
    });
});
