<script lang="ts">
    import type { CalendarEventInterface } from "@workadventure/shared-utils";
    import Button from "../UI/Button.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { scriptUtils } from "../../Api/ScriptUtils";
    import { IconDoorIn, IconVideo } from "@wa-icons";

    interface Props {
        event: CalendarEventInterface;
        /** The next meeting's full-width button rather than a row's compact one. */
        prominent?: boolean;
        /** A compact button that still spells out "Join", not just a camera icon. */
        labelled?: boolean;
        class?: string;
        /** Called when the user joins. */
        onjoin?: () => void;
    }

    let { event, prominent = false, labelled = false, class: className = "", onjoin }: Props = $props();

    let meeting = $derived(event.resource?.onlineMeeting);

    // The way a website set to open in a new tab opens (map areas, chat links, WA.nav.openTab).
    function join() {
        if (meeting?.joinUrl) scriptUtils.openTab(meeting.joinUrl);
        onjoin?.();
    }
</script>

{#if meeting?.joinUrl}
    {#if meeting.isWorkAdventure}
        <!-- The meeting takes place in a room of this world: follow the link in place, not in a new tab. -->
        <Button
            href={meeting.joinUrl}
            variant={prominent ? "secondary" : "light"}
            appearance={prominent ? "filled" : "border"}
            size={prominent ? undefined : "sm"}
            class={className}
            onclick={onjoin}
        >
            {#snippet icon()}<IconDoorIn class="h-4 w-4" />{/snippet}
            {$LL.externalModule.calendar.goThere()}
        </Button>
    {:else if prominent}
        <Button variant="secondary" class={className} onclick={join}>
            {#snippet icon()}<IconVideo class="h-5 w-5" />{/snippet}
            {$LL.externalModule.calendar.join()}
        </Button>
    {:else if labelled}
        <Button variant="light" appearance="border" size="sm" class={className} onclick={join}>
            {#snippet icon()}<IconVideo class="h-4 w-4" />{/snippet}
            {$LL.externalModule.calendar.join()}
        </Button>
    {:else}
        <Button
            variant="light"
            appearance="ghost"
            size="sm"
            square
            aria-label={`${$LL.externalModule.calendar.join()} · ${event.title}`}
            class={className}
            onclick={join}
        >
            {#snippet icon()}<IconVideo class="h-4 w-4" />{/snippet}
        </Button>
    {/if}
{/if}
