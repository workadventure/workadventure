<script lang="ts">
    import { onDestroy } from "svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { availabilityStatusStore, inBbbStore, inJitsiStore, inLivekitStore } from "../../../Stores/MediaStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { isInRemoteConversation } from "../../../Stores/StreamableCollectionStore";
    import { getColorHexOfStatus, getStatusLabel } from "../../../Utils/AvailabilityStatus";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import ChevronDownIcon from "../../Icons/ChevronDownIcon.svelte";
    import MenuBurgerIcon from "../../Icons/MenuBurgerIcon.svelte";
    import XIcon from "../../Icons/XIcon.svelte";
    import Woka from "../../Woka/WokaFromUserId.svelte";
    import ProfileMenuContent from "./ProfileMenuContent.svelte";

    const PROFILE_MENU_Z_INDEX = 1100;

    let userName = gameManager.getPlayerName() || "";
    let forceBurgerMode = $derived($inJitsiStore || $inBbbStore || $inLivekitStore || $isInRemoteConversation);
    let triggerElement: HTMLDivElement | undefined = $state();
    let contextualMenuItemsMarker: HTMLSpanElement | undefined = $state();
    let closeFloatingUi: (() => void) | undefined;

    function closeProfileMenu(): void {
        const close = closeFloatingUi;
        closeFloatingUi = undefined;
        close?.();
    }

    function openProfileMenu(): void {
        if (triggerElement === undefined || closeFloatingUi !== undefined) {
            return;
        }

        closeFloatingUi = showFloatingUi(
            triggerElement,
            ProfileMenuContent,
            {
                showContextualMenuItems:
                    contextualMenuItemsMarker !== undefined &&
                    getComputedStyle(contextualMenuItemsMarker).display !== "none",
            },
            {
                placement: "bottom-end",
            },
            8,
            true,
            true,
            () => {
                closeFloatingUi = undefined;
                openedMenuStore.close("profileMenu");
            },
            PROFILE_MENU_Z_INDEX,
        );
    }

    $effect(() => {
        if ($openedMenuStore === "profileMenu") {
            openProfileMenu();
        } else {
            closeProfileMenu();
        }
    });

    onDestroy(closeProfileMenu);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div data-testid="action-user" class="flex items-center transition-all pointer-events-auto">
    <div
        class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2 cursor-pointer"
        class:profile-menu-force-burger={forceBurgerMode}
        bind:this={triggerElement}
        onclick={(event) => {
            event.preventDefault();
            openedMenuStore.toggle("profileMenu");
        }}
    >
        <span
            class="absolute size-0 pointer-events-none @sm/actions:hidden"
            aria-hidden="true"
            bind:this={contextualMenuItemsMarker}
        ></span>
        <div
            class="profile-menu-burger-icon h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 p-1 m-0 items-center justify-center flex @md/actions:hidden"
        >
            {#if $openedMenuStore !== "profileMenu"}
                <MenuBurgerIcon classList="pointer-events-none" />
            {:else}
                <XIcon classList="pointer-events-none" />
            {/if}
        </div>
        <div
            class="profile-menu-full hidden @md/actions:flex items-center h-full group-hover:bg-white/10 transition-all group-hover:rounded gap-2 pl-0 pr-3"
        >
            <div class="overflow-hidden p-2 flex items-center justify-center rounded h-full aspect-square relative">
                <Woka userId={-1} placeholderSrc="" customWidth="30px" />
            </div>
            <div class="grow flex flex-row @xl/actions:flex-col justify-start text-start pr-2">
                <div
                    class="font-bold text-white leading-5 whitespace-nowrap select-none text-base @sm/actions:text-sm @xl/actions:text-base order-last @xl/actions:order-first flex items-center"
                >
                    {userName}
                </div>
                <div class="text-xxs bold whitespace-nowrap select-none flex items-center">
                    <div
                        class="aspect-square h-2 w-2 rounded-full me-1.5"
                        style="background-color: {getColorHexOfStatus($availabilityStatusStore)}"
                    ></div>
                    <div
                        class="hidden @xl/actions:block"
                        style="color: {getColorHexOfStatus($availabilityStatusStore)};filter: brightness(200%);"
                    >
                        {getStatusLabel($availabilityStatusStore)}
                    </div>
                </div>
            </div>
            <div>
                <ChevronDownIcon
                    strokeWidth="2"
                    classList="transition-all opacity-50 {$openedMenuStore === 'profileMenu' ? 'rotate-180' : ''}"
                    height="h-4"
                    width="w-4"
                />
            </div>
        </div>
    </div>
</div>

<style>
    /* Force burger mode when in a meeting or conversation (more compact profile button) */
    :global(.profile-menu-force-burger .profile-menu-burger-icon) {
        display: flex !important;
    }
    :global(.profile-menu-force-burger .profile-menu-full) {
        display: none !important;
    }
</style>
