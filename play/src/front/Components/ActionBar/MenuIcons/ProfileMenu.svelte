<script lang="ts">
    import { clickOutside } from "svelte-outside";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { setContext, SvelteComponentTyped } from "svelte";
    import { derived, get, Readable } from "svelte/store";
    import { availabilityStatusStore, enableCameraSceneVisibilityStore } from "../../../Stores/MediaStore";

    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import {
        SubMenusInterface,
        userIsConnected,
        openedMenuStore,
        showMenuItem,
        rightActionBarMenuItems,
        RightMenuItem,
    } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { ENABLE_OPENID } from "../../../Enum/EnvironmentVariable";
    import Woka from "../../Woka/WokaFromUserId.svelte";
    //import Companion from "../../Companion/Companion.svelte";
    import ChevronDownIcon from "../../Icons/ChevronDownIcon.svelte";
    import ProfilIcon from "../../Icons/ProfilIcon.svelte";
    import CamSettingsIcon from "../../Icons/CamSettingsIcon.svelte";
    import SettingsIcon from "../../Icons/SettingsIcon.svelte";
    import XIcon from "../../Icons/XIcon.svelte";
    import MenuBurgerIcon from "../../Icons/MenuBurgerIcon.svelte";
    import { connectionManager } from "../../../Connection/ConnectionManager";

    import { getColorHexOfStatus, getStatusInformation, getStatusLabel } from "../../../Utils/AvailabilityStatus";
    import ExternalComponents from "../../ExternalModules/ExternalComponents.svelte";
    import AvailabilityStatusList from "../AvailabilityStatus/AvailabilityStatusList.svelte";
    import { RequestedStatus } from "../../../Rules/StatusRules/statusRules";
    import { loginSceneVisibleStore } from "../../../Stores/LoginSceneStore";
    import { LoginScene, LoginSceneName } from "../../../Phaser/Login/LoginScene";
    import { selectCharacterSceneVisibleStore } from "../../../Stores/SelectCharacterStore";
    import { SelectCharacterScene, SelectCharacterSceneName } from "../../../Phaser/Login/SelectCharacterScene";
    //import { selectCompanionSceneVisibleStore } from "../../../Stores/SelectCompanionStore";
    //import { SelectCompanionScene, SelectCompanionSceneName } from "../../../Phaser/Login/SelectCompanionScene";
    import { EnableCameraScene, EnableCameraSceneName } from "../../../Phaser/Login/EnableCameraScene";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";
    import ActionBarButton from "../ActionBarButton.svelte";
    import ContextualMenuItems from "./ContextualMenuItems.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";
    import { IconLogout } from "@wa-icons";

    // The ActionBarButton component is displayed differently in the profile menu.
    // We use the context to decide how to render it.
    setContext("profileMenu", true);
    setContext("inMenu", true);

    let userName = gameManager.getPlayerName() || "";

    const statusToShow: Array<RequestedStatus | AvailabilityStatus.ONLINE> = [
        AvailabilityStatus.ONLINE,
        AvailabilityStatus.BUSY,
        AvailabilityStatus.BACK_IN_A_MOMENT,
        AvailabilityStatus.DO_NOT_DISTURB,
    ];

    function showWokaNameMenuItem() {
        return connectionManager.currentRoom?.opidWokaNamePolicy !== "force_opid";
    }

    function openEditNameScene() {
        loginSceneVisibleStore.set(true);
        gameManager.leaveGame(LoginSceneName, new LoginScene());
    }

    function openEditSkinScene() {
        selectCharacterSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCharacterSceneName, new SelectCharacterScene());
    }

    /*function openEditCompanionScene() {
        selectCompanionSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCompanionSceneName, new SelectCompanionScene());
    }*/

    function openEnableCameraScene() {
        enableCameraSceneVisibilityStore.showEnableCameraScene();
        gameManager.leaveGame(EnableCameraSceneName, new EnableCameraScene());
        analyticsClient.editCamera();
    }

    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "bottom-end",
        },
        8
    );

    let rightActionBarMenuItemsInBurgerMenu: Readable<RightMenuItem<SvelteComponentTyped>[]> = derived(
        rightActionBarMenuItems,
        ($rightActionBarMenuItems, set) => {
            const theDerived = derived(
                $rightActionBarMenuItems.map((item) => item.fallsInBurgerMenuStore),
                (items) => {
                    //set(items);
                    // Each time we enter here, a fallsInBurgerMenuStore has been updated OR a rightActionBarMenuItems has been updated
                    return items;
                }
            );
            const ghostSubscriptionUnsubscribe = theDerived.subscribe(() => {
                set(get(rightActionBarMenuItems).filter((item) => get(item.fallsInBurgerMenuStore)));
            });
            return () => ghostSubscriptionUnsubscribe();
        }
    );
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div data-testid="action-user" class="flex items-center transition-all pointer-events-auto">
    <div
        class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2 cursor-pointer"
        use:floatingUiRef
        on:click|preventDefault={() => {
            openedMenuStore.toggle("profileMenu");
        }}
    >
        <div
            class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 p-1 m-0 items-center justify-center flex @md/actions:hidden"
        >
            {#if $openedMenuStore !== "profileMenu"}
                <!-- pointer-events-none is important for clickOutside to work. Otherwise, the
                     SVG is the target of the click, is removed from the DOM on click and considered to be
                     outside the main div -->
                <MenuBurgerIcon classList="pointer-events-none" />
            {:else}
                <XIcon classList="pointer-events-none" />
            {/if}
        </div>
        <div
            class="hidden @md/actions:flex items-center h-full group-hover:bg-white/10 transition-all group-hover:rounded gap-2 pl-0 pr-3 "
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
                    />
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
    {#if $openedMenuStore === "profileMenu"}
        <!-- before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-transparent before:border-b-contrast/80 -->
        <div
            class="absolute top-0 left-0 bg-contrast/80 backdrop-blur rounded-md p-1 w-56 text-white select-none"
            data-testid="profile-menu"
            use:floatingUiContent
            use:clickOutside={() => {
                openedMenuStore.close("profileMenu");
            }}
        >
            <div use:arrowAction />
            <div class="p-0 m-0 list-none overflow-y-auto max-h-[calc(100vh-96px)]">
                <ExternalComponents zone="menuTop" />
                <AvailabilityStatusList statusInformation={getStatusInformation(statusToShow)} />
                <HeaderMenuItem label={$LL.menu.sub.profile()} />
                {#if showWokaNameMenuItem()}
                    <ActionBarButton
                        label={$LL.actionbar.profil()}
                        on:click={() => {
                            openEditNameScene();
                            analyticsClient.editName();
                        }}
                    >
                        <ProfilIcon />
                    </ActionBarButton>
                {/if}
                <ActionBarButton
                    label={$LL.actionbar.woka()}
                    on:click={() => {
                        openEditSkinScene();
                        analyticsClient.editWoka();
                    }}
                >
                    <Woka userId={-1} placeholderSrc="" customWidth="26px" />
                </ActionBarButton>
                <!-- <ActionBarButton
                    label={$LL.actionbar.companion()}
                    on:click={() => {
                        openEditCompanionScene();
                        analyticsClient.editCompanion();
                    }}
                >
                    <Companion
                        userId={-1}
                        placeholderSrc="../static/images/default-companion.png"
                        width="26px"
                        height="26px"
                    />
                </ActionBarButton> -->
                <!--                                <button-->
                <!--                                    class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"-->
                <!--                                >-->
                <!--                                    <div-->
                <!--                                        class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center"-->
                <!--                                    >-->
                <!--                                        <AchievementIcon />-->
                <!--                                    </div>-->
                <!--                                    <div class="text-left flex items-center">{$LL.actionbar.quest()}</div>-->
                <!--                                </button>-->
                <HeaderMenuItem label={$LL.menu.sub.settings()} />
                <ActionBarButton label={$LL.actionbar.editCamMic()} on:click={openEnableCameraScene}>
                    <CamSettingsIcon />
                </ActionBarButton>
                <ActionBarButton
                    label={$LL.actionbar.allSettings()}
                    on:click={() => {
                        showMenuItem(SubMenusInterface.settings);
                        analyticsClient.openedMenu();
                        openedMenuStore.close("profileMenu");
                    }}
                >
                    <SettingsIcon />
                </ActionBarButton>

                <div class="@sm/actions:hidden items-center">
                    <ContextualMenuItems />
                </div>

                {#each $rightActionBarMenuItemsInBurgerMenu ?? [] as button (button.id)}
                    <svelte:component this={button.component} {...button.props} />
                {/each}

                {#if ENABLE_OPENID && $userIsConnected}
                    <button
                        on:click={() => analyticsClient.logout()}
                        on:click={() => connectionManager.logout()}
                        class="group flex p-2 gap-2 items-center hover:bg-danger-600 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-start rounded"
                    >
                        <div class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center">
                            <IconLogout height="20" width="20" class="text-danger-600 group-hover:text-white" />
                        </div>
                        <div class="text-start leading-4 text-danger-600 group-hover:text-white flex items-center">
                            {$LL.menu.profile.logout()}
                        </div>
                    </button>
                {/if}
            </div>
        </div>
    {/if}
</div>
