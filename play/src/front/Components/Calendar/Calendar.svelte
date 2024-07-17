<script lang="ts">
    import { fly } from "svelte/transition";
    import { calendarEventsStore, isCalendarVisibleStore } from "../../Stores/CalendarStore";

    function closeCalendar() {
        isCalendarVisibleStore.set(false);
    }
</script>

<div class="calendar tw-bg-dark-blue/95">
    <div class="sidebar" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
        <button class="close-window" data-testid="mapEditor-close-button" on:click={closeCalendar}>&#215;</button>

        <div class="mapexplorer tw-flex tw-flex-col tw-overflow-auto">
            <div class="header-container">
                <h3 class="tw-text-l tw-text-left">Your meeting today 📅</h3>
            </div>
            <div class="tw-flex tw-flex-col tw-justify-center">
                {#if $calendarEventsStore.size > 0}
                    {#each [...$calendarEventsStore.entries()] as [eventId, event] (eventId)}
                        <div id={`event-id-${eventId}`} class="tw-flex tw-flex-col tw-justify-center tw-p-2 tw-mb-2 tw-bg-dark-blue/90 tw-rounded-md">
                            {#if event.resource && event.resource.body?.contentType === "html" && event.resource.body?.content != undefined}
                                {@html event.resource.body.content}
                            {:else}
                                <div class="tw-flex tw-flex-col tw-justify-between tw-items-center">
                                    <h4 class="tw-text-l tw-text-left tw-font-bold">{event.title}</h4>
                                    <p class="tw-text-xs tw-text-right">{event.start}</p>
                                    <p class="tw-text-xs tw-text-right">{event.end}</p>
                                    {#if event.resource && event.resource.onlineMeeting?.joinUrl}
                                        <a href={event.resource.onlineMeeting?.joinUrl} class="tw-text-xs tw-text-right" target="_blank" >Click here to join the meeting</a>
                                    {/if}
                                </div>
                            {/if}
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
