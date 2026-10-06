<script lang="ts">
    import { StringUtils } from "../../../Utils/StringUtils";
    import { IconCheck } from "@wa-icons";

    interface Props {
        label: string;
        isSelected: boolean;
        onclick: () => void;
    }

    let { label, isSelected, onclick }: Props = $props();
</script>

<button
    class="group flex items-center relative z-10 p-1 pl-2 overflow-hidden rounded {isSelected
        ? 'bg-secondary'
        : 'hover:bg-white/10'}"
    onclick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onclick();
    }}
>
    <div
        class="grow text-left text-sm text-ellipsis overflow-hidden whitespace-nowrap {isSelected
            ? 'opacity-100'
            : 'opacity-80 group-hover:opacity-100'}"
        title={StringUtils.normalizeDeviceName(label)}
    >
        {StringUtils.normalizeDeviceName(label)}
    </div>

    {#if isSelected}
        <IconCheck font-size="20" />
    {/if}
</button>
