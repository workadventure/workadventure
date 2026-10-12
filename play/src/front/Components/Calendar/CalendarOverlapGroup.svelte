<script lang="ts">
    import type { CalendarEventInterface } from "@workadventure/shared-utils";
    import LL from "../../../i18n/i18n-svelte";
    import { formatTime } from "./agenda";
    import CalendarJoinButton from "./CalendarJoinButton.svelte";
    import { IconAlertTriangle } from "@wa-icons";

    interface Props {
        start: Date;
        end: Date;
        events: CalendarEventInterface[];
        now: Date;
    }

    let { start, end, events, now }: Props = $props();

    // Ties each meeting's line to its bar on the timeline. Static class names, for Tailwind's scanner.
    const COLORS = ["bg-secondary-300", "bg-success-400", "bg-warning-400", "bg-danger-400", "bg-contrast-200"];
    const BAR_STEP_PX = 10;

    let span = $derived(end.getTime() - start.getTime());
    const percent = (date: Date) => ((date.getTime() - start.getTime()) / span) * 100;
    let inProgressCount = $derived(events.filter((event) => event.start <= now && now < event.end).length);
</script>

<div class="flex flex-col gap-2 rounded-md border border-solid border-warning/50 bg-warning/5 p-2.5">
    <div class="flex items-center gap-2 text-sm">
        <IconAlertTriangle class="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <span class="font-bold text-warning">
            {$LL.externalModule.calendar.overlapping({ count: events.length })}
        </span>
        {#if inProgressCount > 0}
            <span class="font-bold text-danger-600">
                · {$LL.externalModule.calendar.inProgressCount({ count: inProgressCount })}
            </span>
        {/if}
        <span class="ms-auto tabular-nums text-contrast-200">{formatTime(start)} – {formatTime(end)}</span>
    </div>

    <!-- When each meeting runs, against the others: what the list below cannot show. -->
    <div class="relative" style="height: {events.length * BAR_STEP_PX - 4}px" aria-hidden="true">
        {#each events as event, index (event.id)}
            <div
                class="absolute h-1.5 rounded-sm {COLORS[index % COLORS.length]}"
                style="top: {index * BAR_STEP_PX}px; left: {percent(event.start)}%; width: {percent(event.end) -
                    percent(event.start)}%"
            ></div>
        {/each}
        {#if inProgressCount > 0}
            <!-- Now, against the bars: shows which of the meetings are running. -->
            <div class="absolute -bottom-1 -top-1 w-0.5 bg-danger-600" style="left: {percent(now)}%"></div>
        {/if}
    </div>

    <ul class="m-0 flex list-none flex-col p-0">
        {#each events as event, index (event.id)}
            <li
                class="grid min-h-9 grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2 border-0 border-t border-solid border-white/10"
            >
                <span class="text-xs tabular-nums text-contrast-200">
                    {formatTime(event.start)}–{formatTime(event.end)}
                </span>
                <span class="flex min-w-0 items-center gap-1.5">
                    <span class="h-2 w-2 shrink-0 rounded-full {COLORS[index % COLORS.length]}"></span>
                    <span class="truncate text-sm">{event.title}</span>
                </span>
                <CalendarJoinButton {event} />
            </li>
        {/each}
    </ul>
</div>
