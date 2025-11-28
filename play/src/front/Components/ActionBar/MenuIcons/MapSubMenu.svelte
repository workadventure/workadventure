<script lang="ts">
    import { clickOutside } from "svelte-outside";
    import { getContext, setContext } from "svelte";
    import { mapMenuVisibleStore, openedMenuStore } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconChevronDown,IconAdminPan } from "@wa-icons";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";
    import MapSubMenuContent from "./MapSubMenuContent.svelte";
    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "bottom-end",
            //strategy: 'fixed',
        },
        8
    );

    function closeMapMenu() {
        openedMenuStore.close("mapMenu");
    }
</script>

{#if $mapMenuVisibleStore}
    {#if !inProfileMenu}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            data-testid="map-menu"
            class="items-center relative cursor-pointer pointer-events-auto"
            use:floatingUiRef
            on:click|preventDefault={() => {
                openedMenuStore.toggle("mapMenu");
            }}
        >
            <div class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2mr">
                <div class="flex items-center h-full group-hover:bg-white/10mr group-hover:rounded gap-2 pl-4 pr-3">
                    <IconAdminPan font-size="20" class="text-white" />
                    <div class="pr-2">
                        <div
                            class="font-bold text-white leading-3 whitespace-nowrap select-none text-base @sm/actions:text-sm @xl/actions:text-base"
                        >
                            {$LL.actionbar.map()}
                        </div>
                    </div>
                    <IconChevronDown
                        stroke={2}
                        Class="h-4 w-4 aspect-square transition-all opacity-50 {$openedMenuStore === 'mapMenu'
                            ? 'rotate-180'
                            : ''}"
                        height="16px"
                        width="16px"
                    />
                </div>
            </div>
        </div>
        {#if $openedMenuStore === "mapMenu"}
            <div
                class="absolute bg-contrast/80 backdrop-blur rounded-md w-auto max-w-full text-white"
                data-testid="map-sub-menu"
                use:floatingUiContent
                use:clickOutside={closeMapMenu}
            >
                <div use:arrowAction />
                <div class="p-1 m-0">
                    <MapSubMenuContent />
                </div>
            </div>
        {/if}
    {:else}
        <HeaderMenuItem label={$LL.actionbar.map()} />
        <MapSubMenuContent />
    {/if}
{/if}
