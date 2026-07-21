<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Alert from "./Alert.svelte";

    const { Story } = defineMeta({
        title: "Design System/Alert",
        component: Alert,
        tags: ["autodocs"],
        argTypes: {
            variant: {
                control: { type: "select" },
                options: ["danger", "success", "warning", "neutral", "primary"],
            },
        },
    });
</script>

<Story
    name="Danger"
    args={{ variant: "danger" }}
    play={async ({ canvasElement }) => {
        const alert = canvasElement.querySelector("div.rounded");
        await expect(alert).toHaveClass("text-danger-400");
        await expect(alert).toHaveTextContent("Something went wrong.");
    }}
>
    Something went wrong.
</Story>

<Story
    name="Success"
    args={{ variant: "success" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("div.rounded")).toHaveClass("text-success-400");
    }}
>
    Changes saved.
</Story>

<Story
    name="Warning"
    args={{ variant: "warning" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("div.rounded")).toHaveClass("text-warning-400");
    }}
>
    Your session is about to expire.
</Story>

<Story name="Neutral" args={{ variant: "neutral" }}>Nothing to report.</Story>

<Story name="Primary" args={{ variant: "primary" }}>A new version is available.</Story>
