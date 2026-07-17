<script lang="ts">
    import { LL } from "../../../../i18n/i18n-svelte";
    import Button from "../../UI/Button.svelte";

    interface Props {
        mode?: "settings" | "background";
    }

    let { mode = $bindable<"settings" | "background">() }: Props = $props();

    if (mode === undefined) {
        mode = "settings";
    }
</script>

<div class="flex flex-row gap-2 px-1">
    <div class="flex-1 flex text-xxs uppercase text-white/50 pb-0.5 pt-1 relative bold">
        <div class="group flex items-center relative z-10 w-full">
            <Button
                variant="light"
                appearance="ghost"
                size="sm"
                class="w-full rounded text-nowrap {mode === 'settings' ? '!bg-white/10' : ''}"
                onclick={() => {
                    mode = "settings";
                }}
            >
                {$LL.actionbar.background.settings()}
            </Button>
        </div>
    </div>
    <div class="flex-1 flex text-xxs uppercase text-white/50 pb-0.5 pt-1 relative bold">
        <div class="group flex items-center relative z-10 w-full">
            <Button
                variant="light"
                appearance="ghost"
                size="sm"
                class="w-full rounded text-nowrap {mode === 'background' ? '!bg-white/10' : ''}"
                onclick={() => {
                    mode = "background";
                }}
            >
                {$LL.actionbar.background.cameraBackground()}
            </Button>
        </div>
    </div>
</div>
