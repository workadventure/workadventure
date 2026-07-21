<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import InputCheckbox from "./InputCheckbox.svelte";

    const { Story } = defineMeta({
        title: "Forms/Checkbox",
        component: InputCheckbox,
        tags: ["autodocs"],
        argTypes: {
            value: { control: "boolean" },
            disabled: { control: "boolean" },
        },
        args: {
            label: "I agree to the terms",
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".input-checkbox")).toBeInTheDocument();
        await expect(canvasElement.querySelector("input[type=checkbox]")).not.toBeChecked();
    }}
/>

<Story
    name="Checked"
    args={{ label: "Subscribed", value: true }}
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
