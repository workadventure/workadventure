<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import OnboardingStep from "./OnboardingStep.svelte";

    const { Story } = defineMeta({
        title: "Feature/Onboarding/Step",
        component: OnboardingStep,
        tags: ["autodocs"],
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("[data-testid='onboarding-step']")).toBeInTheDocument();
        await expect(canvasElement).toHaveTextContent("Welcome to WorkAdventure");
    }}
>
    Welcome to WorkAdventure!
</Story>
