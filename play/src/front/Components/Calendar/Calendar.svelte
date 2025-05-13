<script lang="ts">
    import { fly } from "svelte/transition";
    import { CalendarEventInterface } from "@workadventure/shared-utils";
    import { calendarEventsStore, isCalendarVisibleStore } from "../../Stores/CalendarStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { extensionModuleStore } from "../../Stores/GameSceneStore";
    import LL from "../../../i18n/i18n-svelte";

    import calendarSvg from "../images/applications/outlook.svg";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";

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
            if (extensionModule?.openPopupMeeting && event.resource?.onlineMeeting?.joinUrl) {
                extensionModule.openPopupMeeting(
                    event.title,
                    event.resource?.onlineMeeting?.joinUrl,
                    event.id,
                    event.start,
                    event.end,
                    event.resource?.onlineMeeting?.passcode
                );
            }
        });
    }

    function goToLoginPage() {
        analyticsClient.login();
        window.location.href = "/login";
    }
</script>

<div class="calendar p-1 @md/actions:p-2 max-h-screen select-text flex">
    <div
        class="sidebar p-2 [&>*]:p-1 max-h-full bg-contrast/80 rounded-lg backdrop-blur mobile:w-64 w-96"
        in:fly={{ x: 100, duration: 250, delay: 200 }}
        out:fly={{ x: 100, duration: 200 }}
    >
        <div class="mapexplorer flex flex-col overflow-auto">
            <div class="header-container">
                <div class="flex flex-row items-start justify-between">
                    <div class="flex flex-row items-center gap-2 flex-wrap">
                        <img draggable="false" src={calendarSvg} class="w-8" alt={$LL.menu.icon.open.calendar()} />
                        <h3 class="text-xl text-left leading-none">
                            {new Date().toLocaleString("en-EN", {
                                month: "long",
                                day: "2-digit",
                                year: "numeric",
                            })}
                        </h3>
                        <span class="ml-1 px-1 py-0.5 rounded-sm bg-white text-secondary text-xxs font-bold">Beta</span>
                    </div>

                    <ButtonClose on:click={closeCalendar} />
                </div>
                <div class="bg-white/20 h-[1px] w-full my-2" />
                <h4 class=" text-base font-bold text-left">Your meeting today 🗓️ ({$calendarEventsStore.size})</h4>
            </div>
            <div class="flex flex-col justify-center gap-4">
                {#if !$userIsConnected}
                    <div class="flex flex-col justify-center items-center">
                        <h4 class="text-l text-left">{$LL.externalModule.teams.userNotConnected()}</h4>
                        <p class="text-xs text-left">{$LL.externalModule.teams.connectToYourTeams()}</p>
                        <button
                            class="btn disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
                            on:click={goToLoginPage}
                            >{$LL.menu.profile.login()}
                        </button>
                    </div>
                {/if}
                {#if $calendarEventsStore.size > 0}
                    {#each [...$calendarEventsStore.entries()] as [eventId, event] (eventId)}
                        <div class="flex flex-col justify-center">
                            <div class="flex flex-row justify-start w-full">
                                <span class="text-xs">{formatHour(event.start)}</span>
                                <hr class="border-gray-300 mx-2 w-full opacity-30 border-dashed" />
                            </div>
                            <div
                                id={`event-id-${eventId}`}
                                class="flex flex-col justify-center p-2 bg-white/5 border border-white/10 border-solid rounded-md"
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
                                            class="text-xs text-right text-secondary-500"
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
        }
    }
</style>
