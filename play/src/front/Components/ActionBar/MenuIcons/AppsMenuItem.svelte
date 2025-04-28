<script lang="ts">
    import { getContext, setContext } from "svelte";
    import { openedMenuStore, roomListActivated } from "../../../Stores/MenuStore";
    import AppsIcon from "../../Icons/AppsIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { isActivatedStore as isCalendarActivatedStore } from "../../../Stores/CalendarStore";
    import { isActivatedStore as isTodoListActivatedStore } from "../../../Stores/TodoListStore";
    import { roomListVisibilityStore } from "../../../Stores/ModalStore";
    import { externalSvelteComponentService } from "../../../Stores/Utils/externalSvelteComponentService";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";
    import AppsMenuContent from "./AppsMenuContent.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    const inProfileMenu = getContext("profileMenu");

    const externalActionBarSvelteComponent = externalSvelteComponentService.getComponentsByZone("actionBarAppsMenu");

    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "bottom-start",
            //strategy: 'fixed',
        },
        8
    );
</script>

{#if !inProfileMenu}
    <ActionBarButton
        on:click={() => {
            if ($roomListVisibilityStore) return roomListVisibilityStore.set(false);
            openedMenuStore.toggle("appMenu");
        }}
        classList="group/btn-apps"
        context="actionBar"
        tooltipTitle={$LL.actionbar.help.apps.title()}
        disabledHelp={$openedMenuStore === "appMenu" || $roomListVisibilityStore}
        state={$openedMenuStore === "appMenu" || $roomListVisibilityStore ? "active" : "normal"}
        dataTestId={undefined}
        action={floatingUiRef}
        media="./static/images/tooltip-exemple.gif"
        desc={$LL.actionbar.help.apps.desc()}
    >
        <AppsIcon
            strokeColor={$openedMenuStore === "appMenu" || $roomListVisibilityStore
                ? "stroke-white fill-white"
                : "stroke-white fill-transparent"}
            hover="group-hover/btn-apps:fill-white"
        />

        {#if $openedMenuStore === "appMenu" && ($roomListActivated || $isCalendarActivatedStore || $isTodoListActivatedStore || $externalActionBarSvelteComponent.size > 0)}
            <div class="absolute" use:floatingUiContent>
                <div class="flex justify-center m-[unset]">
                    <div use:arrowAction />
                    <div class="bottom-action-bar">
                        <div
                            class="bottom-action-section flex flex-col animate bg-contrast/80 backdrop-blur rounded-md p-1"
                        >
                            <AppsMenuContent />
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </ActionBarButton>
{:else}
    <HeaderMenuItem label={$LL.actionbar.help.apps.title()} />
    <AppsMenuContent />
{/if}
