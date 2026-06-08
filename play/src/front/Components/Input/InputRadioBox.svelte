<script lang="ts">
    import type { Snippet } from "svelte";
    interface Props {
        id?: string | undefined;
        label: string;
        onchange?: () => void;
        disabled?: boolean;
        value: unknown;
        group: unknown;
        outerClass?: string;
        children?: Snippet;
    }

    let {
        id = undefined,
        label,
        onchange = () => {},
        disabled = false,
        value,
        group = $bindable(),
        outerClass = undefined,
        children,
    }: Props = $props();

    let uniqueId = (() => id || `input-${Math.random().toString(36).substring(2, 9)} `)();
</script>

<div class={outerClass}>
    <input id={uniqueId} class="hidden peer radio-ds" type="radio" bind:group {value} {onchange} {disabled} />
    <label
        for={uniqueId}
        class="inline-flex items-center justify-between w-full h-full p-5 text-white bg-transparent border border-solid border-white rounded-lg cursor-pointer opacity-50 peer-checked:bg-white/10 peer-checked:opacity-100 hover:bg-white/10 bg-no-repeat bg-[center_left_1rem] pl-14 min-w-[170px]"
    >
        <div class="flex flex-col">
            <div class="w-full text-lg font-semibold">{label}</div>
            <div>
                {@render children?.()}
            </div>
        </div>
    </label>
</div>

<style>
    input[type="radio"].peer.radio-ds + label {
        background-image: url("./images/icon-radio.svg");
    }
    input[type="radio"].peer.radio-ds:checked + label {
        background-image: url("./images/icon-radio-checked.svg");
    }
</style>
