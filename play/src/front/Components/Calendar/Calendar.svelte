<script lang="ts">
    import { fly } from "svelte/transition";
    import { get } from "svelte/store";
    import {
        calendarSourcesStore,
        isCalendarVisibleStore,
        shownCalendarsStore,
        staleCalendarsStore,
        visibleCalendarEventsStore,
    } from "../../Stores/CalendarStore";
    import LL from "../../../i18n/i18n-svelte";

    import outlookSvg from "../images/applications/outlook.svg";
    import calendarPng from "../images/applications/calendar.png";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import Button from "../UI/Button.svelte";
    import Badge from "../UI/Badge.svelte";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { blocker } from "../../Utils/screenBlocker";
    import { externalSvelteComponentService } from "../../Stores/Utils/externalSvelteComponentService";
    import ExternalComponents from "../ExternalModules/ExternalComponents.svelte";
    import { buildAgenda, formatDayName, meetingsInProgress, nextMeeting, overlapsWith } from "./agenda";
    import CalendarNextMeeting from "./CalendarNextMeeting.svelte";
    import CalendarMeetingsInProgress from "./CalendarMeetingsInProgress.svelte";
    import CalendarEventRow from "./CalendarEventRow.svelte";
    import CalendarOverlapGroup from "./CalendarOverlapGroup.svelte";
    import CalendarSourcePicker from "./CalendarSourcePicker.svelte";
    import { IconAlertTriangle, IconChevronDown } from "@wa-icons";

    // "in 5 minutes", the now line and the next meeting all go stale: refresh them twice a minute.
    let now = $state(new Date());
    $effect(() => {
        const interval = setInterval(() => (now = new Date()), 30_000);
        return () => clearInterval(interval);
    });

    let days = $derived(buildAgenda($visibleCalendarEventsStore.values(), now));
    let next = $derived(nextMeeting($visibleCalendarEventsStore.values(), now));
    let inProgress = $derived(meetingsInProgress($visibleCalendarEventsStore.values(), now));
    // Once the agenda mixes several calendars, each meeting says which one it comes from.
    let showCalendar = $derived($shownCalendarsStore.length > 1);

    let pickerOpen = $state(false);

    function closePicker(event: KeyboardEvent) {
        if (event.key === "Escape" && pickerOpen) {
            pickerOpen = false;
        }
    }

    let sections: HTMLElement[] = $state([]);

    function closeCalendar() {
        isCalendarVisibleStore.set(false);
    }

    function goToLoginPage() {
        analyticsClient.trackAdminEvent("auth.login_clicked");
        window.location.href = "/login";
    }
</script>

<svelte:window onkeydown={closePicker} />

<div class="calendar select-text flex">
    <div
        class="sidebar p-3 h-full bg-contrast/80 backdrop-blur w-96 max-md:w-screen"
        in:fly={{ x: 100, duration: 250, delay: 200 }}
        out:fly={{ x: 100, duration: 200 }}
        {@attach blocker}
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
                {#if $calendarSourcesStore.size > 0}
                    <!-- What the agenda shows, always in sight: the user must not believe it mirrors their whole calendar app. -->
                    <div class="flex flex-wrap items-center gap-1.5 text-sm text-contrast-200">
                        <button
                            type="button"
                            class="m-0 flex items-center gap-1 rounded-sm border-0 bg-secondary/25 px-1.5 py-0.5 text-sm font-bold text-white"
                            aria-expanded={pickerOpen}
                            aria-label={$LL.externalModule.calendar.chooseCalendars()}
                            onclick={() => (pickerOpen = !pickerOpen)}
                        >
                            {$shownCalendarsStore.length > 0
                                ? $LL.externalModule.calendar.calendarsCount({ count: $shownCalendarsStore.length })
                                : $LL.externalModule.calendar.noCalendars()}
                            <IconChevronDown
                                class="h-3.5 w-3.5 transition-transform {pickerOpen ? 'rotate-180' : ''}"
                                aria-hidden="true"
                            />
                        </button>
                        {#if $staleCalendarsStore.length > 0}
                            <button
                                type="button"
                                class="m-0 flex items-center gap-1 rounded-sm border-0 bg-warning/20 px-1.5 py-0.5 text-sm font-bold text-warning"
                                aria-expanded={pickerOpen}
                                onclick={() => (pickerOpen = !pickerOpen)}
                            >
                                <IconAlertTriangle class="h-3.5 w-3.5" aria-hidden="true" />
                                {$LL.externalModule.calendar.staleCount({ count: $staleCalendarsStore.length })}
                            </button>
                        {/if}
                        <span>{$LL.externalModule.calendar.scope()}</span>
                    </div>
                {/if}
            </div>
            <ButtonClose onclick={closeCalendar} />
        </header>

        {#if pickerOpen && $calendarSourcesStore.size > 0}
            <CalendarSourcePicker />
        {/if}

        {#if !$userIsConnected && get(externalSvelteComponentService.getComponentsByZone("calendarButton")).size == 0}
            <Button variant="secondary" onclick={goToLoginPage}>{$LL.menu.profile.login()}</Button>
        {/if}
        {#if get(externalSvelteComponentService.getComponentsByZone("calendarButton")).size > 0}
            <div class="flex flex-col items-center justify-center">
                <ExternalComponents zone="calendarButton" />
            </div>
        {/if}

        {#if inProgress.length > 1}
            <!-- We cannot tell which one the user is in: offer them all rather than pick one. -->
            <CalendarMeetingsInProgress events={inProgress} {showCalendar} />
        {:else if next}
            <CalendarNextMeeting
                event={next}
                overlaps={overlapsWith(next, $visibleCalendarEventsStore.values())}
                {now}
                {showCalendar}
            />
        {/if}

        {#if days.length > 0}
            <nav aria-label={$LL.externalModule.calendar.days()} class="days flex shrink-0 gap-1.5 overflow-x-auto">
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
                        <div class="flex flex-col gap-1.5 border-0 border-b border-solid border-white/10 py-2">
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

                        <!-- Finished meetings are not listed: the ones in progress show how far along they are. -->
                        {#each day.items as item (item.kind === "overlap" ? `overlap-${item.events[0].id}` : item.event.id)}
                            {#if item.kind === "overlap"}
                                <CalendarOverlapGroup
                                    start={item.start}
                                    end={item.end}
                                    events={item.events}
                                    {now}
                                    {showCalendar}
                                />
                            {:else}
                                <CalendarEventRow event={item.event} long={item.kind === "long"} {now} {showCalendar} />
                            {/if}
                        {/each}
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
        bottom: 0;
        right: var(--side-panel-end, 0);
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

        /* A week of day chips scrolls sideways, without a scrollbar: the chip cut at the edge shows there is more. */
        .days {
            scrollbar-width: none;

            &::-webkit-scrollbar {
                display: none;
            }
        }
    }
</style>
