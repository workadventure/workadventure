<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import { IconEye, IconEyeOff } from "@wa-icons";

    interface Props {
        id: string;
        label: string;
        value: string;
        dataTestId: string;
        placeholder?: string;
        mono?: boolean;
        invalid?: boolean;
        onEnter?: () => void;
    }

    let {
        id,
        label,
        value = $bindable(),
        dataTestId,
        placeholder = undefined,
        mono = false,
        invalid = false,
        onEnter = undefined,
    }: Props = $props();

    let revealed = $state(false);
</script>

<div class="flex flex-col gap-1.5">
    <label for={id} class="m-0 text-sm font-bold text-white/80">{label}</label>
    <div
        class="flex items-center rounded-md border border-solid bg-contrast {invalid
            ? 'border-danger-400'
            : 'border-white/20 focus-within:border-white/70'}"
    >
        <input
            {id}
            type={revealed ? "text" : "password"}
            autocomplete="new-password"
            spellcheck="false"
            data-testid={dataTestId}
            aria-invalid={invalid}
            class="grow min-w-0 bg-transparent border-0 outline-none focus-visible:outline-none focus:ring-0 focus:shadow-none text-white placeholder:text-sm px-3 py-2 {mono
                ? 'font-mono tracking-wide'
                : ''}"
            {placeholder}
            bind:value
            onkeydown={(event) => {
                if (event.key === "Enter") onEnter?.();
            }}
            onfocusin={() => chatInputFocusStore.set(true)}
            onfocusout={() => chatInputFocusStore.set(false)}
        />
        <button
            type="button"
            class="px-3 py-2 text-white/60 hover:text-white"
            aria-label={revealed ? $LL.chat.e2ee.hideSecret() : $LL.chat.e2ee.showSecret()}
            aria-pressed={revealed}
            onclick={() => (revealed = !revealed)}
        >
            {#if revealed}<IconEyeOff font-size="18" />{:else}<IconEye font-size="18" />{/if}
        </button>
    </div>
</div>
