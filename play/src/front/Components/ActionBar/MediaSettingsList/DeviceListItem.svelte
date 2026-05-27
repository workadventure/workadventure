<script lang="ts">
    import { StringUtils } from "../../../Utils/StringUtils";
    import type { WorkAdventureComponent } from "../../../../types/component";
    import { IconCheck } from "@wa-icons";

    interface Props {
        label: string;
        isSelected: boolean;
        icon: WorkAdventureComponent;
        onclick: () => void;
    }

    let { label, isSelected, icon, onclick }: Props = $props();

    const IconComponent = $derived(icon);
</script>

<button
    class="group flex items-center relative z-10 p-1 overflow-hidden rounded {isSelected
        ? 'bg-secondary'
        : 'hover:bg-white/10'}"
    onclick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onclick();
    }}
>
    {#if isSelected}
        <div class="h-full aspect-square flex items-center justify-center rounded-md me-2">
            <IconComponent font-size="20" fillColor="fill-white" />
        </div>
    {/if}

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
