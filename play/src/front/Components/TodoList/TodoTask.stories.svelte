<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import type { TodoTaskInterface } from "@workadventure/shared-utils";
    import TodoTask from "./TodoTask.svelte";

    const task: TodoTaskInterface = {
        id: "1",
        title: "Write the design-system stories",
        description: "Cover Button, Badge, Chip, Avatar and Alert first.",
        status: "notStarted",
        start: new Date("2026-08-01"),
        end: new Date("2026-08-15"),
    };

    const { Story } = defineMeta({
        title: "Feature/Todo Task",
        component: TodoTask,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: { task },
    });
</script>

<Story
    name="NotStarted"
    play={async ({ canvasElement }) => {
        await expect(canvasElement).toHaveTextContent("Write the design-system stories");
    }}
/>

<Story
    name="Completed"
    args={{ task: { ...task, status: "completed" } }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".line-through")).toBeInTheDocument();
    }}
/>
