<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Input from "./Input.svelte";

    const { Story } = defineMeta({
        title: "Forms/Text Input",
        component: Input,
        tags: ["autodocs"],
        argTypes: {
            type: { control: { type: "select" }, options: ["text", "url", "number", "color"] },
            size: { control: { type: "select" }, options: ["xs", "sm", "lg"] },
            status: { control: { type: "select" }, options: [undefined, "error", "success"] },
            disabled: { control: "boolean" },
            optional: { control: "boolean" },
        },
        args: {
            label: "Your name",
            placeholder: "Jane Doe",
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        const input = canvasElement.querySelector("input.input-text");
        await expect(input).toBeInTheDocument();
        await expect(input).toHaveAttribute("placeholder", "Jane Doe");
        await expect(canvasElement.querySelector("label")).toHaveTextContent("Your name");
    }}
/>

<Story
    name="Error"
    args={{ label: "Email", status: "error", errorHelperText: "Please enter a valid email." }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("input.input-text")).toHaveClass("error");
        await expect(canvasElement.querySelector(".text-red-500")).toHaveTextContent("Please enter a valid email.");
    }}
/>

<Story
    name="Small"
    args={{ label: "Code", size: "sm" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("input.input-text")).toHaveClass("input-text-sm");
    }}
/>

<Story
    name="Disabled"
    args={{ label: "Locked", disabled: true }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("input.input-text")).toBeDisabled();
    }}
/>

<Story
    name="Optional"
    args={{ label: "Nickname", optional: true }}
    play={async ({ canvasElement }) => {
        // Proves the i18n decorator initialised typesafe-i18n: `$LL.form.optional()` resolved.
        await expect(canvasElement.querySelector(".text-xs.opacity-50")).toBeInTheDocument();
    }}
/>
