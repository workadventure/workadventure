<script lang="ts">
    import { floatingUiComponents } from "../../Utils/svelte-floatingui-show";
</script>

{#each [...$floatingUiComponents.entries()] as [key, value] (`${key}`)}
    {@const valueProps = value.props ?? {}}
    {@const action = value.action}
    {@const arrowAction = value.arrowAction}
    <div class="absolute z-[3000]" use:action>
        {#if arrowAction}
            <div use:arrowAction />
        {/if}
        <svelte:component this={value.componentType} {...$$restProps} {...valueProps} />
    </div>
{/each}
