<script lang="ts">
    import { floatingUiComponents } from "../../Utils/svelte-floatingui-show";

    interface Props {
        /** Only the popups anchored in this document (the desktop companion window has its own list). */
        targetDocument?: Document;
        [key: string]: unknown;
    }

    let { targetDocument = document, ...rest }: Props = $props();
</script>

{#each [...$floatingUiComponents.entries()].filter(([, value]) => value.ownerDocument === targetDocument) as [key, value] (`${key}`)}
    {@const valueProps = value.props ?? {}}
    {@const Component = value.componentType}
    {@const action = value.action}
    {@const arrowAction = value.arrowAction}
    <div class="absolute z-[3000]" style:z-index={value.zIndex} use:action>
        {#if arrowAction}
            <div use:arrowAction></div>
        {/if}
        <Component {...rest} {...valueProps} />
    </div>
{/each}
