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
    import { createFlotingUiActions } from "../../../Utils/svelte-floatingui";
    import AppsMenuContent from "./AppsMenuContent.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    const inProfileMenu = getContext("profileMenu");

    const externalActionBarSvelteComponent = externalSvelteComponentService.getComponentsByZone("actionBar");

    const [popperRef, popperContent, arrowAction] = createFlotingUiActions({
        placement: "bottom-start",
        //strategy: 'fixed',
    });
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
        tooltipDesc={$LL.actionbar.help.apps.desc()}
        disabledHelp={$openedMenuStore === "appMenu" || $roomListVisibilityStore}
        state={$openedMenuStore === "appMenu" || $roomListVisibilityStore ? "active" : "normal"}
        dataTestId={undefined}
        action={popperRef}
    >
        <AppsIcon
            strokeColor={$openedMenuStore === "appMenu" || $roomListVisibilityStore
                ? "stroke-white fill-white"
                : "stroke-white fill-transparent"}
            hover="group-hover/btn-apps:fill-white"
        />

        {#if $openedMenuStore === "appMenu" && ($roomListActivated || $isCalendarActivatedStore || $isTodoListActivatedStore || $externalActionBarSvelteComponent.size > 0)}
            <div class="absolute" use:popperContent>
                <div class="flex justify-center m-[unset] popper-tooltip">
                    <div use:arrowAction />
                    <div class="bottom-action-bar">
                        <div
                            class="bottom-action-section flex flex-col animate bg-contrast/80 backdrop-blur-md rounded-md p-1"
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
