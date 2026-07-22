<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import SelectMicrophone from "./SelectMicrophone.svelte";

    const deviceList = [
        { deviceId: "mic1", kind: "audioinput", label: "Built-in Microphone", groupId: "g1", toJSON: () => ({}) },
        { deviceId: "mic2", kind: "audioinput", label: "USB Headset", groupId: "g2", toJSON: () => ({}) },
    ] as unknown as MediaDeviceInfo[];

    const { Story } = defineMeta({
        title: "Feature/Enable Camera/Select Microphone",
        component: SelectMicrophone,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: { deviceList, selectedDevice: "mic1" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".btn")).toBeInTheDocument();
    }}
/>
