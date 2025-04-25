<script lang="ts">
    import { clickOutside } from "svelte-outside";
    import { getContext, setContext } from "svelte";
    import { streamingMegaphoneStore } from "../../../Stores/MediaStore";
    import { mapMenuVisibleStore, openedMenuStore } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import AdminPanIcon from "../../Icons/AdminPanIcon.svelte";
    import ChevronDownIcon from "../../Icons/ChevronDownIcon.svelte";
    import MegaphoneConfirm from "../MegaphoneConfirm.svelte";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";
    import MapSubMenuContent from "./MapSubMenuContent.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    const inProfileMenu = getContext("profileMenu");

    // Useless properties. They are here only to avoid a warning because we set the "first" or "classList" prop on all the right menu items
    // svelte-ignore unused-export-let
    export let first: boolean | undefined = undefined;
    // svelte-ignore unused-export-let
    export let classList: string | undefined = undefined;

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
                    <AdminPanIcon />
                    <div class="pr-2">
                        <div
                            class="font-bold text-white leading-3 whitespace-nowrap select-none text-base @sm/actions:text-sm @xl/actions:text-base"
                        >
                            {$LL.actionbar.map()}
                        </div>
                    </div>
                    <ChevronDownIcon
                        strokeWidth="2"
                        classList="h-4 w-4 aspect-square transition-all opacity-50 {$openedMenuStore === 'mapMenu'
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
                class="absolute bg-contrast/80 backdrop-blur rounded-md  w-auto max-w-full  text-white"
                data-testid="map-sub-menu"
                use:floatingUiContent
                use:clickOutside={closeMapMenu}
            >
                <div use:arrowAction />
                <div class="p-1 m-0">
                    <MapSubMenuContent />
                    <!--{#if $megaphoneCanBeUsedStore && !$silentStore && ($myMicrophoneStore || $myCameraStore)}-->
                    <!--    <li-->
                    <!--        class="group flex p-2 gap-2 items-center hover:bg-white/10 cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"-->
                    <!--    >-->
                    <!--        <div-->
                    <!--            class="transition-all w-6 h-6 aspect-square text-center"-->
                    <!--            data-testid="megaphone"-->
                    <!--        >-->
                    <!--            <MegaphoneIcon />-->
                    <!--        </div>-->
                    <!--        <div>{$LL.actionbar.megaphone()}</div>-->
                    <!--    </li>-->
                    <!--{/if}-->
                </div>
                {#if $streamingMegaphoneStore}
                    <MegaphoneConfirm />
                {/if}
            </div>
        {/if}
    {:else}
        <HeaderMenuItem label={$LL.actionbar.map()} />
        <MapSubMenuContent />
    {/if}
{/if}
