<script lang="ts">
    import { floatingUiComponents } from "../../Utils/svelte-floatingui-show";

    interface Props {
        [key: string]: unknown;
    }

    let { ...rest }: Props = $props();
</script>

{#each [...$floatingUiComponents.entries()] as [key, value] (`${key}`)}
    {@const valueProps = value.props ?? {}}
    {@const Component = value.componentType}
    {@const action = value.action}
    {@const arrowAction = value.arrowAction}
    <div class="absolute z-[3000]" use:action>
        {#if arrowAction}
            <div use:arrowAction></div>
        {/if}
        <Component {...rest} {...valueProps} />
    </div>
{/each}
