<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import type { BannerEvent } from "../../Api/Events/Ui/BannerEvent";
    import { bannerStore } from "../../Stores/GameStore";
    import { warningBannerStore } from "../../Stores/MenuStore";
    import { withStore, withStores } from "../../../../.storybook/storyHelpers";
    import WarningBanner from "./WarningBanner.svelte";

    // WarningBanner renders whatever `bannerStore` holds and is only shown while `warningBannerStore`
    // is true. The harness sets both for the story via withStores() and restores them afterwards —
    // a component driven entirely by stores, shown in isolation.
    const banner = {
        id: "welcome-banner",
        text: "Welcome to your virtual space! Grab a coffee and say hi.",
        textColor: "#ffffff",
        bgColor: "#1b2a41",
    } as unknown as BannerEvent;

    const { Story } = defineMeta({
        title: "Feedback/Warning Banner",
        component: WarningBanner,
        parameters: { layout: "fullscreen" },
        beforeEach: withStores([
            withStore(bannerStore.set, banner, null),
            withStore(warningBannerStore.set, true, false),
        ]),
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".warningMain")).toBeInTheDocument();
        await expect(canvasElement).toHaveTextContent("Welcome to your virtual space!");
    }}
/>
