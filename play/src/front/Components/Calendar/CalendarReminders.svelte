<script lang="ts">
    import type { CalendarEventInterface } from "@workadventure/shared-utils";
    import { fly } from "svelte/transition";
    import { isCalendarVisibleStore } from "../../Stores/CalendarStore";
    import { isTodoListVisibleStore } from "../../Stores/TodoListStore";
    import Button from "../UI/Button.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { formatTimeAgo, formatTimeUntil, meetingPlace } from "./agenda";
    import { calendarRemindersStore, dismissReminder } from "./CalendarReminder";
    import CalendarJoinButton from "./CalendarJoinButton.svelte";
    import { IconCalendar, IconMapPin, IconVideo, IconX } from "@wa-icons";

    // "in 4 minutes" goes stale: refresh it twice a minute.
    let now = $state(new Date());
    $effect(() => {
        const interval = setInterval(() => (now = new Date()), 30_000);
        return () => clearInterval(interval);
    });

    function when(event: CalendarEventInterface): string {
        const fromStart = now.getTime() - event.start.getTime();
        if (Math.abs(fromStart) < 60_000) return $LL.externalModule.calendar.startsNow();
        if (fromStart > 0) return $LL.externalModule.calendar.startedAgo({ ago: formatTimeAgo(event.start, now) });
        return formatTimeUntil(event.start, now);
    }

    // Opening the agenda settles the reminders (see startCalendarReminders): it shows the same meetings.
    function openAgenda() {
        isCalendarVisibleStore.set(true);
        // The to-do list shares the agenda's corner of the screen.
        isTodoListVisibleStore.set(false);
    }
</script>

<div class="pointer-events-none absolute right-0 top-0 z-[425] flex flex-col gap-2 p-1 @md/actions:p-2">
    {#each $calendarRemindersStore as event (event.id)}
        {@const started = event.start <= now}
        {@const link = event.resource?.onlineMeeting?.joinUrl}
        <section
            aria-label={$LL.externalModule.calendar.reminder()}
            class="pointer-events-auto flex w-96 max-w-[calc(100vw-1rem)] flex-col gap-3.5 rounded-lg border border-solid border-white/10 bg-contrast/90 p-4 text-white shadow-dark backdrop-blur"
            in:fly={{ x: 100, duration: 250 }}
            out:fly={{ x: 100, duration: 200 }}
        >
            <div class="flex items-start gap-3">
                <div
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md {started
                        ? 'bg-danger-600/20 text-danger-600'
                        : 'bg-secondary/25 text-secondary-300'}"
                >
                    <IconCalendar class="h-6 w-6" aria-hidden="true" />
                </div>
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <span class="truncate text-lg font-bold leading-tight">{event.title}</span>
                    <span class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-contrast-200">
                        <span class="whitespace-nowrap font-bold {started ? 'text-danger-600' : 'text-white'}">
                            {when(event)}
                        </span>
                        <span aria-hidden="true">·</span>
                        {#if event.resource?.onlineMeeting?.isWorkAdventure}
                            <IconMapPin class="h-4 w-4 shrink-0" aria-hidden="true" />
                        {:else if link}
                            <IconVideo class="h-4 w-4 shrink-0" aria-hidden="true" />
                        {/if}
                        <span class="truncate">{meetingPlace(event) ?? $LL.externalModule.calendar.noLink()}</span>
                    </span>
                </div>
                <Button
                    variant="light"
                    appearance="ghost"
                    size="sm"
                    square
                    class="-me-1.5 -mt-1.5 shrink-0"
                    aria-label={$LL.externalModule.calendar.dismissReminder()}
                    onclick={() => dismissReminder(event)}
                >
                    {#snippet icon()}<IconX class="h-4 w-4" />{/snippet}
                </Button>
            </div>
            <div class="grid gap-2 {link ? 'grid-cols-2' : 'grid-cols-1'}">
                <Button variant="light" appearance="border" class="m-0 w-full" onclick={openAgenda}>
                    {$LL.externalModule.calendar.details()}
                </Button>
                <CalendarJoinButton {event} prominent class="m-0 w-full" onjoin={() => dismissReminder(event)} />
            </div>
        </section>
    {/each}
</div>
