<script lang="ts">
    import { fly } from "svelte/transition";
    import { CalendarEventInterface } from "@workadventure/shared-utils";
    import { calendarEventsStore, isCalendarVisibleStore } from "../../Stores/CalendarStore";
    import { gameManager } from "../../Phaser/Game/GameManager";

    function closeCalendar() {
        isCalendarVisibleStore.set(false);
    }

    function formatHour(date: Date) {
        return date.toLocaleString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function openMeeting(event: CalendarEventInterface) {
        const gameScene = gameManager.getCurrentGameScene();
        if (!gameScene) return;

        if (gameScene.extensionModule?.openPopupMeeting && event.resource?.onlineMeeting?.joinUrl)
            gameScene.extensionModule.openPopupMeeting(
                event.title,
                event.resource?.onlineMeeting?.joinUrl,
                event.id,
                event.start,
                event.end,
                event.resource?.onlineMeeting?.passcode
            );
    }
</script>

<div class="calendar tw-bg-dark-blue/95">
    <div class="sidebar" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
        <button class="close-window" data-testid="mapEditor-close-button" on:click={closeCalendar}>&#215;</button>

        <div class="mapexplorer tw-flex tw-flex-col tw-overflow-auto">
            <div class="header-container">
                <h3 class="tw-text-l tw-text-left">
                    {new Date().toLocaleString("en-EN", {
                        month: "long",
                        day: "2-digit",
                        year: "numeric",
                    })}
                </h3>
                <h4 class="tw-text-l tw-text-left">Your meeting today 🗓️ ({$calendarEventsStore.size})</h4>
            </div>
            <div class="tw-flex tw-flex-col tw-justify-center tw-gap-4">
                {#if $calendarEventsStore.size > 0}
                    {#each [...$calendarEventsStore.entries()] as [eventId, event] (eventId)}
                        <div class="tw-flex tw-flex-col tw-justify-center">
                            <div class="tw-flex tw-flex-row tw-justify-start tw-w-full">
                                <span class="tw-text-xs">{formatHour(event.start)}</span>
                                <hr class="tw-border-gray-300 tw-mx-2 tw-w-full tw-opacity-30 tw-border-dashed" />
                            </div>
                            <div
                                id={`event-id-${eventId}`}
                                class="tw-flex tw-flex-col tw-justify-center tw-p-2 tw-bg-dark-blue/90 tw-rounded-md"
                            >
                                <div class="tw-flex tw-flex-col tw-justify-between tw-items-center">
                                    <h4 class="tw-text-l tw-text-left tw-font-bold">{event.title}</h4>
                                    <p class="tw-text-xs tw-w-full tw-whitespace-pre-line tw-overflow-x-hidden">
                                        {event.description}
                                    </p>
                                    {#if event.resource && event.resource.onlineMeeting?.joinUrl != undefined}
                                        <a
                                            href={event.resource.onlineMeeting.joinUrl}
                                            on:click|preventDefault|stopPropagation={() => openMeeting(event)}
                                            class="tw-text-xs tw-text-right"
                                            target="_blank">Click here to join the meeting</a
                                        >
                                    {/if}
                                </div>
                            </div>
                            <div class="tw-flex tw-flex-row tw-justify-start tw-w-full">
                                <span class="tw-text-xs">{formatHour(event.end)}</span>
                                <hr class="tw-border-gray-300 tw-mx-2 tw-w-full tw-opacity-30 tw-border-dashed" />
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .calendar {
        position: absolute !important;
        top: 0;
        right: 0;
        width: fit-content !important;
        z-index: 425;

        pointer-events: auto;
        color: whitesmoke;

        button.close-window {
            right: 0.5rem;
        }

        .sidebar {
            position: relative !important;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 1.5em;
            width: 23em !important;
        }
    }
</style>
