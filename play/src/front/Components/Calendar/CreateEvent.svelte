<script lang="ts">
    import { fly } from "svelte/transition";
    import { calendarEventsStore } from "../../Stores/CalendarStore";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { createEvent } from "../../api/google-calendar";
    import type { CalendarEventInterface } from "@workadventure/shared-utils";

    export let close: () => void;

    let title = "";
    let description = "";
    let start = new Date();
    let end = new Date();

    async function create() {
        const event: Partial<CalendarEventInterface> = {
            title,
            description,
            start,
            end,
        };
        const newEvent = await createEvent("primary", event);
        if (newEvent) {
            calendarEventsStore.update((events) => {
                events.set(newEvent.id, {
                    ...newEvent,
                    start: new Date(newEvent.start),
                    end: new Date(newEvent.end),
                });
                return events;
            });
            close();
        }
    }
</script>

<div class="create-event p-1 @md/actions:p-2 max-h-screen select-text flex">
    <div
        class="sidebar p-2 [&>*]:p-1 max-h-full bg-contrast/80 rounded-lg backdrop-blur mobile:w-64 w-96"
        in:fly={{ x: 100, duration: 250, delay: 200 }}
        out:fly={{ x: 100, duration: 200 }}
    >
        <div class="mapexplorer flex flex-col overflow-auto">
            <div class="header-container">
                <div class="flex flex-row items-start justify-between">
                    <h3 class="text-xl text-left leading-none">
                        {$LL.externalModule.calendar.createEvent()}
                    </h3>
                    <ButtonClose on:click={close} />
                </div>
            </div>
            <div class="flex flex-col justify-center gap-4">
                <input type="text" placeholder="Title" bind:value={title} />
                <textarea placeholder="Description" bind:value={description} />
                <input type="datetime-local" bind:value={start} />
                <input type="datetime-local" bind:value={end} />
                <button on:click={create}>
                    {$LL.externalModule.calendar.createEvent()}
                </button>
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .create-event {
        position: absolute !important;
        top: 0;
        right: 0;
        width: fit-content !important;
        z-index: 426;

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
