import { describe, expect, it } from "vitest";
import { mount, unmount } from "svelte";
import RangeSlider from "../../../src/front/Components/Input/RangeSlider.svelte";
import BoundRangeSlider from "./BoundRangeSlider.svelte";

describe("RangeSlider", () => {
    // Regression: an unset optional property (e.g. the Jitsi area width) used to throw on the first
    // render, which broke the whole panel embedding the slider.
    it("renders with an undefined value", async () => {
        const target = document.createElement("div");
        const component = mount(RangeSlider, { target, props: { label: "Width", min: 15, max: 85 } });
        expect(target.textContent).toContain("15");
        await unmount(component);
    });

    // Regression: giving `value` a $props fallback makes Svelte reject `bind:value={undefined}`
    // with props_invalid_value, which crashes the parent panel.
    it("renders when a parent binds an unset value", async () => {
        const target = document.createElement("div");
        const component = mount(BoundRangeSlider, { target });
        expect(target.textContent).toContain("15");
        await unmount(component);
    });
});
