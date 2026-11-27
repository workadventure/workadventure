<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import {
        calendarSelectionStore,
        calendarSourcesStore,
        isCalendarShown,
        setCalendarChoice,
    } from "../../Stores/CalendarStore";
    import { IconAlertTriangle } from "@wa-icons";
</script>

<section
    aria-label={$LL.externalModule.calendar.chooseCalendars()}
    class="flex flex-col gap-1.5 rounded-lg border border-solid border-white/15 bg-white/5 p-3"
>
    {#each [...$calendarSourcesStore.values()] as source (source.id)}
        <label class="flex min-h-9 cursor-pointer items-center gap-2.5">
            <input
                type="checkbox"
                class="m-0 h-4 w-4 shrink-0 accent-secondary"
                checked={isCalendarShown(source.id, source, $calendarSelectionStore)}
                onchange={(event) => setCalendarChoice(source.id, event.currentTarget.checked)}
            />
            <span class="flex min-w-0 flex-col">
                <span class="truncate">{source.name}</span>
                {#if source.stale}
                    <span class="flex items-center gap-1 text-xs text-warning">
                        <IconAlertTriangle class="h-3 w-3 shrink-0" aria-hidden="true" />
                        {$LL.externalModule.calendar.stale()}
                    </span>
                {:else if source.primary}
                    <span class="text-xs text-contrast-200">{$LL.externalModule.calendar.primaryCalendar()}</span>
                {/if}
            </span>
        </label>
    {/each}
    <p class="m-0 mt-1 text-xs leading-snug text-contrast-200">
        {$LL.externalModule.calendar.defaultSelectionHelp()}
    </p>
</section>
