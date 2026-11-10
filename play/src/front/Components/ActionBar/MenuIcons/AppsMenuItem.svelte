<script lang="ts">
    import { getContext, setContext } from "svelte";
    import { clickOutside } from "svelte-outside";
    import { openedMenuStore, userIsConnected } from "../../../Stores/MenuStore";
    import AppsIcon from "../../Icons/AppsIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { isActivatedStore as isCalendarActivatedStore } from "../../../Stores/CalendarStore";
    import { isActivatedStore as isTodoListActivatedStore } from "../../../Stores/TodoListStore";
    import { userIsAdminStore } from "../../../Stores/GameStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { externalSvelteComponentService } from "../../../Stores/Utils/externalSvelteComponentService";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";
    import { getAdditionalMenuItemStore } from "../../../Stores/AdditionalItemsMenuStore";
    import AppsMenuContent from "./AppsMenuContent.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    const inProfileMenu = getContext("profileMenu");

    const externalActionBarSvelteComponent = externalSvelteComponentService.getComponentsByZone("actionBarAppsMenu");
    const additionalMenuItemsStore = getAdditionalMenuItemStore("appsMenu");
    // The same conditions as the items of AppsMenuContent: without any, there is no menu to open.
    const recording = gameManager.currentStartedRoom.recording;
    const hasApps = $derived(
        (recording?.buttonState !== "hidden" && $userIsConnected) ||
            $isCalendarActivatedStore ||
            $isTodoListActivatedStore ||
            $userIsAdminStore ||
            $externalActionBarSvelteComponent.size > 0 ||
            $additionalMenuItemsStore.size > 0,
    );

    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "bottom-start",
            //strategy: 'fixed',
        },
        8,
    );
</script>

{#if hasApps && !inProfileMenu}
    <ActionBarButton
        onclick={() => openedMenuStore.toggle("appMenu")}
        classList="group/btn-apps"
        context="actionBar"
        tooltipTitle={$LL.actionbar.help.apps.title()}
        disabledHelp={$openedMenuStore === "appMenu"}
        state={$openedMenuStore === "appMenu" ? "active" : "normal"}
        dataTestId="apps-button"
        action={floatingUiRef}
        media="./static/images/tooltip-exemple.gif"
        desc={$LL.actionbar.help.apps.desc()}
    >
        <AppsIcon
            strokeColor={$openedMenuStore === "appMenu"
                ? "stroke-white fill-white"
                : "stroke-white fill-transparent group-hover/btn-apps:fill-white"}
            hover="group-hover/btn-apps:fill-white"
        />
    </ActionBarButton>

    {#if $openedMenuStore === "appMenu"}
        <nav
            class="absolute"
            use:floatingUiContent
            use:clickOutside={() => {
                openedMenuStore.close("appMenu");
            }}
        >
            <div class="flex justify-center m-[unset]" data-testid="apps-menu">
                <div use:arrowAction></div>
                <div class="bottom-action-bar">
                    <div
                        class="bottom-action-section flex flex-col animate bg-contrast/80 backdrop-blur rounded-md p-1"
                    >
                        <AppsMenuContent />
                    </div>
                </div>
            </div>
        </nav>
    {/if}
{:else if hasApps}
    <HeaderMenuItem label={$LL.actionbar.help.apps.title()} />
    <AppsMenuContent />
{/if}
