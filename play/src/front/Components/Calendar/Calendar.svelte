<script lang="ts">
    import { fly } from "svelte/transition";
    import { CalendarEventInterface } from "@workadventure/shared-utils";
    import { calendarEventsStore, isCalendarVisibleStore } from "../../Stores/CalendarStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { extensionModuleStore } from "../../Stores/GameSceneStore";
    import LL from "../../../i18n/i18n-svelte";

    import calendarSvg from "../images/applications/outlook.svg";

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

        [...$extensionModuleStore.values()].forEach((extensionModule) => {
            extensionModule?.openPopupMeeting &&
                event.resource?.onlineMeeting?.joinUrl &&
                extensionModule.openPopupMeeting(
                    event.title,
                    event.resource?.onlineMeeting?.joinUrl,
                    event.id,
                    event.start,
                    event.end,
                    event.resource?.onlineMeeting?.passcode
                );
        });
    }
</script>

<div class="calendar bg-dark-blue/95 select-text">
    <div class="sidebar " in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
        <button class="close-window" data-testid="mapEditor-close-button" on:click={closeCalendar}>&#215;</button>

        <div class="mapexplorer flex flex-col overflow-auto">
            <div class="header-container">
                <h3 class="text-l text-left">
                    <img draggable="false" src={calendarSvg} class="w-8 mx-2" alt={$LL.menu.icon.open.calendar()} />
                    {new Date().toLocaleString("en-EN", {
                        month: "long",
                        day: "2-digit",
                        year: "numeric",
                    })} (beta)
                </h3>
                <h4 class="text-l text-left">Your meeting today 🗓️ ({$calendarEventsStore.size})</h4>
            </div>
            <div class="flex flex-col justify-center gap-4">
                {#if $calendarEventsStore.size > 0}
                    {#each [...$calendarEventsStore.entries()] as [eventId, event] (eventId)}
                        <div class="flex flex-col justify-center">
                            <div class="flex flex-row justify-start w-full">
                                <span class="text-xs">{formatHour(event.start)}</span>
                                <hr class="border-gray-300 mx-2 w-full opacity-30 border-dashed" />
                            </div>
                            <div
                                id={`event-id-${eventId}`}
                                class="flex flex-col justify-center p-2 bg-dark-blue/90 rounded-md"
                            >
                                <div class="flex flex-col justify-between items-center">
                                    <h4 class="text-l text-left font-bold">{event.title}</h4>
                                    <p class="text-xs w-full whitespace-pre-line overflow-x-hidden">
                                        {event.description}
                                    </p>
                                    {#if event.resource && event.resource.onlineMeeting?.joinUrl != undefined}
                                        <a
                                            href={event.resource.onlineMeeting.joinUrl}
                                            on:click|preventDefault|stopPropagation={() => openMeeting(event)}
                                            class="text-xs text-right"
                                            target="_blank">Click here to join the meeting</a
                                        >
                                    {/if}
                                </div>
                            </div>
                            <div class="flex flex-row justify-start w-full">
                                <span class="text-xs">{formatHour(event.end)}</span>
                                <hr class="border-gray-300 mx-2 w-full opacity-30 border-dashed" />
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
