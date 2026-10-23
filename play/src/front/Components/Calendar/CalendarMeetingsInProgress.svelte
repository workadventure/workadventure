<script lang="ts">
    import type { CalendarEventInterface } from "@workadventure/shared-utils";
    import LL from "../../../i18n/i18n-svelte";
    import { formatTime } from "./agenda";
    import CalendarJoinButton from "./CalendarJoinButton.svelte";

    interface Props {
        /** At least two meetings running at the same time. */
        events: CalendarEventInterface[];
    }

    let { events }: Props = $props();
</script>

<section
    aria-label={$LL.externalModule.calendar.meetingsInProgress({ count: events.length })}
    class="flex flex-col gap-2 rounded-lg bg-contrast-600 p-3"
>
    <span class="text-sm text-contrast-200">
        {$LL.externalModule.calendar.meetingsInProgress({ count: events.length })}
    </span>
    <ul class="m-0 flex list-none flex-col p-0">
        {#each events as event (event.id)}
            <li
                class="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-0 border-t border-solid border-white/10 first:border-t-0"
            >
                <span class="flex min-w-0 flex-col">
                    <span class="truncate font-title text-lg leading-tight">{event.title}</span>
                    <span class="text-sm text-contrast-200">{formatTime(event.start)} – {formatTime(event.end)}</span>
                </span>
                <CalendarJoinButton {event} labelled />
            </li>
        {/each}
    </ul>
</section>
