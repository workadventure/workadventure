<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import InputSwitch from "./InputSwitch.svelte";

    const { Story } = defineMeta({
        title: "Forms/Switch",
        component: InputSwitch,
        tags: ["autodocs"],
        argTypes: {
            labelPosition: { control: { type: "select" }, options: ["top", "right"] },
            variant: { control: { type: "select" }, options: ["white", "black"] },
            value: { control: "boolean" },
            disabled: { control: "boolean" },
        },
        args: {
            label: "Enable sound",
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".input-switch")).toBeInTheDocument();
        await expect(canvasElement.querySelector("input[type=checkbox]")).not.toBeChecked();
    }}
/>

<Story
    name="On"
    args={{ label: "Enabled", value: true }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("input[type=checkbox]")).toBeChecked();
    }}
/>

<Story
    name="Disabled"
    args={{ label: "Locked", disabled: true }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("input[type=checkbox]")).toBeDisabled();
    }}
/>

<Story name="LabelOnTop" args={{ label: "Notifications", labelPosition: "top" }} />
