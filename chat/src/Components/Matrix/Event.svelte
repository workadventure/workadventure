<script lang="ts">
    import { Color } from "@workadventure/shared-utils";
    import { locale } from "../../i18n/i18n-svelte";
    import { MatrixEvent } from "matrix-js-sdk";
    import * as MatrixEventsUtils from "../../Utils/MatrixEventUtils";

    export let event: MatrixEvent;
    const date = new Date(event.getTs());
</script>

<!-- Excluded events -->
{#if !["m.room.power_levels", "m.room.join_rules", "m.room.history_visibility", "m.room.guest_access"].includes(event.getType())}
    <div class="tw-w-full">
        <div class="event tw-text-center tw-mt-2">
            <div
                class="tw-mx-auto tw-w-fit tw-gap-x-1 tag tw-bg-dark tw-px-3 tw-py-1 tw-border tw-border-solid tw-rounded-xl tw-text-xs tw-border-lighter-purple tw-text-lighter-purple tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-flex-row"
            >
                <div class="tw-whitespace-normal tw-text-left tw-max-w-[85%]">
                    <b style={`color: ${Color.getColorByString(event.sender.name)}`}>{event.sender.name}</b>
                    {MatrixEventsUtils.getLocaleType(event)}
                </div>
                <div class="tw-text-xss tw-text-light-purple">
                    - {date.toLocaleTimeString($locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="scss">
    * {
        box-sizing: border-box;
    }
</style>
