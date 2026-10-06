<script lang="ts">
    import { fly } from "svelte/transition";
    import type { ExternalComponentZones } from "../../Stores/Utils/externalSvelteComponentService";
    import { externalSvelteComponentService } from "../../Stores/Utils/externalSvelteComponentService";

    interface Props {
        zone: ExternalComponentZones;
        [key: string]: unknown;
    }

    let { zone, ...rest }: Props = $props();
    let direction = 1;

    let components = $derived(externalSvelteComponentService.getComponentsByZone(zone));
</script>

<!-- Stack design for centered popup zone -->
{#if $components.size > 0}
    {#if zone === "centeredPopup"}
        <div class="absolute bottom-0 w-full h-full md:top-0 md:right-0 flex items-center justify-center">
            {#each [...$components.entries()].reverse() as [key, value], index (`${key}`)}
                {@const valueProps = value.props ?? {}}
                {@const Component = value.componentType}
                <div
                    in:fly={{ x: direction * 100, duration: 500 }}
                    out:fly={{ x: -direction * 100, duration: 500 }}
                    class="absolute w-11/12 md:max-w-3xl transition-all"
                    style={`margin-top: ${-index * 20}px; opacity: ${1 - index * 0.1}; z-index: ${400 - index};`}
                >
                    <Component {...rest} {...valueProps} />
                </div>
            {/each}
        </div>
    {:else}
        {#each [...$components.entries()] as [key, value] (`${key}`)}
            {@const valueProps = value.props ?? {}}
            {@const Component = value.componentType}
            <Component {...rest} {...valueProps} />
        {/each}
    {/if}
{/if}
