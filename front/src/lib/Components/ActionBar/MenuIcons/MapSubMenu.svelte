<script lang="ts">
    import { clickOutside } from "svelte-outside";
    import { createPopperActions } from "svelte-popperjs";
    import { getContext, setContext } from "svelte";
    import { streamingMegaphoneStore } from "../../../Stores/MediaStore";
    import { mapMenuVisibleStore, openedMenuStore } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import AdminPanIcon from "../../Icons/AdminPanIcon.svelte";
    import ChevronDownIcon from "../../Icons/ChevronDownIcon.svelte";
    import MegaphoneConfirm from "../MegaphoneConfirm.svelte";
    import MapSubMenuContent from "./MapSubMenuContent.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    const inProfileMenu = getContext("profileMenu");

    // Useless property. It is here only to avoid a warning because we set the "first" prop on all the right menu items
    export let first: boolean | undefined = undefined;

    const [popperRef, popperContent] = createPopperActions({
        placement: "bottom-end",
        //strategy: 'fixed',
    });
    const extraOpts = {
        modifiers: [
            { name: "offset", options: { offset: [0, 8] } },
            {
                name: "popper-arrow",
                options: {
                    element: ".popper-arrow",
                    padding: 12,
                },
            },

            {
                name: "flip",
                options: {
                    fallbackPlacements: ["top-end", "top-start", "top"],
                },
            },
        ],
    };

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
            use:popperRef
            on:click|preventDefault={() => {
                openedMenuStore.toggle("mapMenu");
            }}
        >
            <div class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2mr">
                <div class="flex items-center h-full group-hover:bg-white/10mr group-hover:rounded space-x-2 pl-4 pr-3">
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
                class="popper-tooltip mt-2 bg-contrast/80 backdrop-blur rounded-md w-56 text-white"
                data-testid="map-sub-menu"
                use:popperContent={extraOpts}
                use:clickOutside={closeMapMenu}
            >
                <div class="popper-arrow" data-popper-arrow />
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
