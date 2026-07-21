<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Avatar from "./Avatar.svelte";

    const { Story } = defineMeta({
        title: "Design System/Avatar",
        component: Avatar,
        tags: ["autodocs"],
        argTypes: {
            size: { control: { type: "select" }, options: ["lg", "sm", "xs"] },
            circle: { control: "boolean" },
            stack: { control: "boolean" },
            borderLight: { control: "boolean" },
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".avatar")).toBeInTheDocument();
        await expect(canvasElement.querySelector(".avatar")).toHaveTextContent("AB");
    }}
>
    AB
</Story>

<Story
    name="Circle"
    args={{ circle: true }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".avatar")).toHaveClass("avatar-circle");
    }}
>
    AB
</Story>

<Story
    name="Small"
    args={{ size: "sm" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".avatar")).toHaveClass("avatar-sm");
    }}
>
    AB
</Story>

<Story
    name="LargeCircle"
    args={{ size: "lg", circle: true }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".avatar")).toHaveClass("avatar-lg-circle");
    }}
>
    AB
</Story>
