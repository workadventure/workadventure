<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Badge from "./Badge.svelte";

    const VARIANTS = ["primary", "secondary", "contrast", "neutral", "danger", "warning", "success", "light"];

    const { Story } = defineMeta({
        title: "Design System/Badge",
        component: Badge,
        tags: ["autodocs"],
        argTypes: {
            variant: { control: { type: "select" }, options: VARIANTS },
            size: { control: { type: "select" }, options: ["lg", "sm", "xs", "xxs", "xxxs"] },
            border: { control: "boolean" },
            white: { control: "boolean" },
        },
    });
</script>

<Story
    name="Primary"
    args={{ variant: "primary" }}
    play={async ({ canvasElement }) => {
        const badge = canvasElement.querySelector(".notification");
        await expect(badge).toHaveClass("notification-primary");
        await expect(canvasElement.querySelector(".notification-value")).toHaveTextContent("3");
    }}
>
    3
</Story>

<Story
    name="Danger"
    args={{ variant: "danger" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".notification")).toHaveClass("notification-danger");
    }}
>
    9+
</Story>

<Story name="Success" args={{ variant: "success" }}>OK</Story>

<Story name="Neutral" args={{ variant: "neutral" }}>12</Story>

<Story
    name="WithBorder"
    args={{ variant: "primary", border: true }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".notification")).toHaveClass("notification-border");
    }}
>
    5
</Story>

<Story
    name="Small"
    args={{ variant: "primary", size: "sm" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".notification")).toHaveClass("notification-sm");
    }}
>
    1
</Story>
