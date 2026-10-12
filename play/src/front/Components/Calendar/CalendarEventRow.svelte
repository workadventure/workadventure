<script lang="ts">
    import type { CalendarEventInterface } from "@workadventure/shared-utils";
    import LL from "../../../i18n/i18n-svelte";
    import { formatDuration, formatTime } from "./agenda";
    import CalendarJoinButton from "./CalendarJoinButton.svelte";
    import { IconStack2 } from "@wa-icons";

    interface Props {
        event: CalendarEventInterface;
        /** A long event, running alongside the meetings rather than competing with them. */
        long?: boolean;
        inProgress?: boolean;
    }

    let { event, long = false, inProgress = false }: Props = $props();
</script>

<div
    class="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md border p-2.5 {long
        ? 'border-dashed'
        : 'border-solid bg-white/5'} {inProgress ? 'border-danger-600/60' : 'border-white/10'}"
>
    <div class="flex flex-col tabular-nums leading-tight">
        <span class="text-sm font-bold">{formatTime(event.start)}</span>
        <span class="text-xs text-contrast-200">{formatTime(event.end)}</span>
    </div>
    <div class="flex min-w-0 flex-col">
        <span class="flex min-w-0 items-center gap-1.5">
            {#if long}
                <IconStack2 class="h-4 w-4 shrink-0 text-contrast-200" aria-hidden="true" />
            {/if}
            <span class="truncate">{event.title}</span>
        </span>
        <span class="text-xs text-contrast-200">
            {#if inProgress}
                <span class="font-bold text-danger-600">{$LL.externalModule.calendar.inProgress()}</span>&nbsp;·
            {/if}
            {formatDuration(event)}{#if event.resource?.onlineMeeting?.isWorkAdventure}&nbsp;· WorkAdventure{/if}
        </span>
    </div>
    <CalendarJoinButton {event} />
</div>
