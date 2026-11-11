<script lang="ts">
    import { acceleratorFromKeyPress, acceleratorLabel } from "../shortcut-policy";
    import { t } from "./desktop";

    let {
        accelerator,
        platform,
        labelledby,
        onchange,
        onerror,
    }: {
        accelerator: string;
        platform: string;
        labelledby: string;
        onchange: (accelerator: string) => void;
        onerror: (message: string) => void;
    } = $props();

    let capturing = $state(false);

    function onkeydown(event: KeyboardEvent) {
        // Not capturing, Enter and Space press the button like any other.
        if (!capturing) return;
        const modified = event.ctrlKey || event.altKey || event.metaKey;
        if (event.key === "Tab" && !modified) {
            // Never trap the keyboard: Tab leaves the field, and blur ends the capture.
            return;
        }
        event.preventDefault();
        if (event.key === "Escape" && !modified && !event.shiftKey) {
            capturing = false;
            return;
        }
        const result = acceleratorFromKeyPress(event, platform);
        if (result === "needs-modifier") {
            onerror(t("settings.shortcutNeedsModifier"));
        } else if (result) {
            capturing = false;
            onchange(result.accelerator);
        }
    }
</script>

<!-- A button: it takes the focus and presses, and while it captures it keeps the keys for itself. -->
<button
    type="button"
    aria-labelledby={labelledby}
    aria-pressed={capturing}
    class={[
        "min-w-[11rem] cursor-pointer rounded border px-3 py-2 text-center text-[14px] transition-colors duration-140",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        capturing ? "border-accent bg-accent/15" : "border-white/20 bg-white/5 hover:bg-white/10",
    ]}
    onclick={() => {
        capturing = !capturing;
        onerror("");
    }}
    {onkeydown}
    onblur={() => (capturing = false)}
>
    {#if capturing}
        {t("settings.shortcutPress")}
    {:else if accelerator}
        <kbd class="font-main">{acceleratorLabel(accelerator, platform)}</kbd>
    {:else}
        <span class="text-muted">{t("settings.shortcutNone")}</span>
    {/if}
</button>
