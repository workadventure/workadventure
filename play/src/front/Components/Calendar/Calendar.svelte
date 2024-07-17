<script lang="ts">
    import { fly } from "svelte/transition";
    import { isCalendarVisibleStore } from "../../Stores/CalendarStore";

    function closeCalendar() {
        isCalendarVisibleStore.set(false);
    }
</script>

<div class="calendar tw-bg-dark-blue/95">
    <div class="sidebar" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
        <button class="close-window" data-testid="mapEditor-close-button" on:click={closeCalendar}>&#215;</button>
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
