<script lang="ts">
    import { LL } from "../../../../i18n/i18n-svelte";

    export let mode: "settings" | "background";
</script>

<div class="flex flex-row gap-2 px-1">
    <div class="flex-1 flex text-xxs uppercase text-white/50 pb-0.5 pt-1 relative bold">
        <div class="group flex items-center relative z-10 w-full">
            <button
                class="btn btn-sm btn-ghost btn-light justify-center w-full rounded text-nowrap {mode === 'settings'
                    ? '!bg-white/10'
                    : ''}"
                on:click={() => {
                    mode = "settings";
                }}
            >
                {$LL.actionbar.background.settings()}
            </button>
        </div>
    </div>
    <div class="flex-1 flex text-xxs uppercase text-white/50 pb-0.5 pt-1 relative bold">
        <div class="group flex items-center relative z-10 w-full">
            <button
                class="btn btn-sm btn-ghost btn-light justify-center w-full rounded text-nowrap {mode === 'background'
                    ? '!bg-white/10'
                    : ''}"
                on:click={() => {
                    mode = "background";
                }}
            >
                {$LL.actionbar.background.cameraBackground()}
            </button>
        </div>
    </div>
</div>
