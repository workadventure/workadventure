<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Button from "./Button.svelte";

    const VARIANTS = ["primary", "secondary", "contrast", "neutral", "danger", "warning", "success", "light"];

    const { Story } = defineMeta({
        title: "Design System/Button",
        component: Button,
        tags: ["autodocs"],
        argTypes: {
            variant: { control: { type: "select" }, options: VARIANTS },
            appearance: { control: { type: "select" }, options: ["filled", "border", "ghost"] },
            size: { control: { type: "select" }, options: ["xs", "sm", "lg"] },
            disabled: { control: "boolean" },
            square: { control: "boolean" },
        },
        args: {
            variant: "primary",
            appearance: "filled",
        },
    });
</script>

<Story
    name="Primary"
    args={{ variant: "primary" }}
    play={async ({ canvasElement }) => {
        const button = canvasElement.querySelector("button.btn");
        await expect(button).toBeInTheDocument();
        await expect(button).toHaveClass("btn-primary");
        await expect(canvasElement.querySelector(".btn-label")).toHaveTextContent("Click me");
    }}
>
    Click me
</Story>

<Story name="Secondary" args={{ variant: "secondary" }}>Click me</Story>

<Story
    name="Danger"
    args={{ variant: "danger" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".btn")).toHaveClass("btn-danger");
    }}
>
    Delete
</Story>

<Story
    name="Ghost"
    args={{ variant: "primary", appearance: "ghost" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".btn")).toHaveClass("btn-ghost");
    }}
>
    Ghost
</Story>

<Story
    name="Border"
    args={{ variant: "primary", appearance: "border" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".btn")).toHaveClass("btn-border");
    }}
>
    Bordered
</Story>

<Story
    name="Small"
    args={{ variant: "primary", size: "sm" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".btn")).toHaveClass("btn-sm");
    }}
>
    Small
</Story>

<Story
    name="Disabled"
    args={{ variant: "primary", disabled: true }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("button.btn")).toBeDisabled();
    }}
>
    Disabled
</Story>

<Story
    name="AsLink"
    args={{ variant: "primary", href: "https://workadventu.re" }}
    play={async ({ canvasElement }) => {
        const link = canvasElement.querySelector("a.btn");
        await expect(link).toBeInTheDocument();
        await expect(link).toHaveAttribute("href", "https://workadventu.re");
    }}
>
    Open link
</Story>
