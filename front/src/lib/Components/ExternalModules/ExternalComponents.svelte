<script lang="ts">
    import {
        ExternalComponentZones,
        externalSvelteComponentService,
    } from "../../Stores/Utils/externalSvelteComponentService";

    export let zone: ExternalComponentZones;

    const components = externalSvelteComponentService.getComponentsByZone(zone);
</script>

{#each [...$components.entries()] as [key, value] (`${key}`)}
    {@const valueProps = value.props ?? {}}
    <svelte:component this={value.componentType} {...$$restProps} {...valueProps} />
{/each}
