import { describe, expect, it } from "vitest";
import { mount, unmount } from "svelte";
import RangeSlider from "../../../src/front/Components/Input/RangeSlider.svelte";

describe("RangeSlider", () => {
    // Regression: an unset optional property (e.g. the Jitsi area width) used to throw on the first
    // render, which broke the whole panel embedding the slider.
    it("renders with an undefined value", async () => {
        const target = document.createElement("div");
        const component = mount(RangeSlider, { target, props: { label: "Width", min: 15, max: 85 } });
        expect(target.textContent).toContain("15");
        await unmount(component);
    });
});
