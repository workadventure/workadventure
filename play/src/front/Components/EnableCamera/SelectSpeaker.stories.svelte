<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import SelectSpeaker from "./SelectSpeaker.svelte";

    const deviceList = [
        { deviceId: "spk1", kind: "audiooutput", label: "Built-in Speakers", groupId: "g1", toJSON: () => ({}) },
        { deviceId: "spk2", kind: "audiooutput", label: "External Speakers", groupId: "g2", toJSON: () => ({}) },
    ] as unknown as MediaDeviceInfo[];

    const { Story } = defineMeta({
        title: "Feature/Enable Camera/Select Speaker",
        component: SelectSpeaker,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: { deviceList, selectedDevice: "spk1" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".btn")).toBeInTheDocument();
    }}
/>
