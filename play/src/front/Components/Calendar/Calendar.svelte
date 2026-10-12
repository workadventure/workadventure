<script lang="ts">
    import { fly } from "svelte/transition";
    import { get } from "svelte/store";
    import { calendarEventsStore, isCalendarVisibleStore } from "../../Stores/CalendarStore";
    import LL from "../../../i18n/i18n-svelte";

    import outlookSvg from "../images/applications/outlook.svg";
    import calendarPng from "../images/applications/calendar.png";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import Button from "../UI/Button.svelte";
    import Badge from "../UI/Badge.svelte";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { externalSvelteComponentService } from "../../Stores/Utils/externalSvelteComponentService";
    import ExternalComponents from "../ExternalModules/ExternalComponents.svelte";
    import { buildAgenda, formatDayName, nextMeeting, overlapsWith, startOfDay } from "./agenda";
    import CalendarNextMeeting from "./CalendarNextMeeting.svelte";
    import CalendarEventRow from "./CalendarEventRow.svelte";
    import CalendarOverlapGroup from "./CalendarOverlapGroup.svelte";

    // "in 5 minutes", the now line and the next meeting all go stale: refresh them twice a minute.
    let now = $state(new Date());
    $effect(() => {
        const interval = setInterval(() => (now = new Date()), 30_000);
        return () => clearInterval(interval);
    });

    let days = $derived(buildAgenda($calendarEventsStore.values(), now));
    let next = $derived(nextMeeting($calendarEventsStore.values(), now));
    let today = $derived(startOfDay(now).getTime());
    // Where the now line goes in today's list: before the first item still to start.
    let nowIndex = $derived.by(() => {
        const items = days[0]?.date.getTime() === today ? days[0].items : undefined;
        if (!items) return undefined;
        const index = items.findIndex((item) => item.start > now);
        return index === -1 ? items.length : index;
    });

    let sections: HTMLElement[] = $state([]);

    function closeCalendar() {
        isCalendarVisibleStore.set(false);
    }

    function goToLoginPage() {
        analyticsClient.trackAdminEvent("auth.login_clicked");
        window.location.href = "/login";
    }
</script>

{#snippet nowLine()}
    <div class="flex items-center gap-2 py-0.5 text-sm font-bold text-danger-600">
        <span class="h-2 w-2 rounded-full bg-danger-600"></span>
        <span
            >{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · {$LL.externalModule.calendar.now()}</span
        >
        <span class="h-0.5 flex-1 bg-danger-600/60"></span>
    </div>
{/snippet}

<div class="calendar p-1 @md/actions:p-2 max-h-screen select-text flex">
    <div
        class="sidebar p-3 max-h-full bg-contrast/80 rounded-lg backdrop-blur mobile:w-64 w-96"
        in:fly={{ x: 100, duration: 250, delay: 200 }}
        out:fly={{ x: 100, duration: 200 }}
    >
        <header class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 flex-col gap-1">
                <div class="flex flex-row flex-wrap items-center gap-2">
                    {#if get(externalSvelteComponentService.getComponentsByZone("calendarImage")).size > 0}
                        <ExternalComponents zone="calendarImage" />
                    {:else}
                        <img draggable="false" src={outlookSvg} class="w-8" alt={$LL.menu.icon.open.calendar()} />
                        <span>/</span>
                        <img draggable="false" src={calendarPng} class="w-8" alt={$LL.menu.icon.open.calendar()} />
                    {/if}
                    <h3 class="m-0 text-lg normal-case leading-none">{$LL.externalModule.calendar.title()}</h3>
                    <span class="rounded-sm bg-white px-1 py-0.5 text-xxs font-bold text-secondary">Beta</span>
                </div>
                <span class="text-sm text-contrast-200">
                    {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                </span>
            </div>
            <ButtonClose onclick={closeCalendar} />
        </header>

        {#if !$userIsConnected && get(externalSvelteComponentService.getComponentsByZone("calendarButton")).size == 0}
            <Button variant="secondary" onclick={goToLoginPage}>{$LL.menu.profile.login()}</Button>
        {/if}
        {#if get(externalSvelteComponentService.getComponentsByZone("calendarButton")).size > 0}
            <div class="flex flex-col items-center justify-center">
                <ExternalComponents zone="calendarButton" />
            </div>
        {/if}

        {#if next}
            <CalendarNextMeeting event={next} overlaps={overlapsWith(next, $calendarEventsStore.values())} {now} />
        {/if}

        {#if days.length > 0}
            <nav aria-label={$LL.externalModule.calendar.days()} class="flex shrink-0 gap-1.5 overflow-x-auto pb-1">
                {#each days as day, index (day.date.getTime())}
                    <Button
                        variant="light"
                        appearance="border"
                        size="xs"
                        class="m-0 shrink-0"
                        onclick={() => sections[index]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    >
                        {day.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                        {#snippet notification()}
                            <Badge variant="secondary" size="xs">{day.count}</Badge>
                        {/snippet}
                    </Button>
                {/each}
            </nav>

            <div class="-mx-1 min-h-0 overflow-y-auto px-1">
                {#each days as day, dayIndex (day.date.getTime())}
                    <section bind:this={sections[dayIndex]} class="flex flex-col gap-2 pb-3">
                        <div
                            class="sticky top-0 z-10 flex flex-col gap-1.5 border-0 border-b border-solid border-white/10 bg-contrast py-2"
                        >
                            <div class="flex items-baseline justify-between gap-2">
                                <h4 class="m-0 font-title text-lg font-medium normal-case">
                                    {formatDayName(day.date, now)}
                                    <span class="font-main text-sm font-normal text-contrast-200">
                                        {day.date.toLocaleDateString(undefined, { day: "numeric", month: "long" })}
                                    </span>
                                </h4>
                                <span class="whitespace-nowrap text-sm text-contrast-200">
                                    {$LL.externalModule.calendar.meetingCount({ count: day.count })}
                                </span>
                            </div>
                            {#each day.allDay as event (event.id)}
                                <div class="flex items-center gap-2 rounded-sm bg-secondary-300/15 px-2 py-1 text-sm">
                                    <span class="text-contrast-200">{$LL.externalModule.calendar.allDay()}</span>
                                    <span class="truncate font-bold">{event.title}</span>
                                </div>
                            {/each}
                        </div>

                        {#each day.items as item, index (item.kind === "overlap" ? `overlap-${item.events[0].id}` : item.event.id)}
                            {#if dayIndex === 0 && index === nowIndex}
                                {@render nowLine()}
                            {/if}
                            {#if item.kind === "overlap"}
                                <CalendarOverlapGroup start={item.start} end={item.end} events={item.events} />
                            {:else}
                                <CalendarEventRow event={item.event} long={item.kind === "long"} />
                            {/if}
                        {/each}
                        {#if dayIndex === 0 && nowIndex === day.items.length}
                            {@render nowLine()}
                        {/if}
                    </section>
                {/each}
            </div>
        {:else if $userIsConnected}
            <p class="m-0 text-sm text-contrast-200">{$LL.externalModule.calendar.noMeetings()}</p>
        {/if}
    </div>
</div>

<style>
    .calendar {
        position: absolute !important;
        top: 0;
        right: 0;
        width: fit-content !important;
        z-index: 425;

        pointer-events: auto;
        color: whitesmoke;

        .sidebar {
            position: relative !important;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
    }
</style>
