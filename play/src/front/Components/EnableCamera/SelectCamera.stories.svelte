<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import SelectCamera from "./SelectCamera.svelte";

    const deviceList = [
        { deviceId: "cam1", kind: "videoinput", label: "FaceTime HD Camera", groupId: "g1", toJSON: () => ({}) },
        { deviceId: "cam2", kind: "videoinput", label: "External Webcam", groupId: "g2", toJSON: () => ({}) },
    ] as unknown as MediaDeviceInfo[];

    const { Story } = defineMeta({
        title: "Feature/Enable Camera/Select Camera",
        component: SelectCamera,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: { deviceList, selectedDevice: "cam1" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".btn")).toBeInTheDocument();
    }}
/>
