<script lang="ts">
    import { fly } from "svelte/transition";
    import {
        ExternalComponentZones,
        externalSvelteComponentService,
    } from "../../Stores/Utils/externalSvelteComponentService";

    export let zone: ExternalComponentZones;
    let direction = 1;

    const components = externalSvelteComponentService.getComponentsByZone(zone);
</script>

<!-- Stack design for centered popup zone -->
{#if zone === "centeredPopup"}
    {#each [...$components.entries()].reverse() as [key, value], index (`${key}`)}
        {@const valueProps = value.props ?? {}}
        <div
            in:fly={{ x: direction * 100, duration: 500 }}
            out:fly={{ x: -direction * 100, duration: 500 }}
            class="absolute w-11/12 md:max-w-3xl transition-all"
            style={`margin-top: ${-index * 20}px; opacity: ${1 - index * 0.1}; z-index: ${400 - index};`}
        >
            <svelte:component this={value.componentType} {...$$restProps} {...valueProps} />
        </div>
    {/each}
{:else}
    {#each [...$components.entries()] as [key, value] (`${key}`)}
        {@const valueProps = value.props ?? {}}
        <svelte:component this={value.componentType} {...$$restProps} {...valueProps} />
    {/each}
{/if}
