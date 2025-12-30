<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import { clickOutside } from "svelte-outside";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { onMount, onDestroy, setContext } from "svelte";
    import type { SvelteComponentTyped } from "svelte";
    import type { Readable } from "svelte/store";
    import { derived, get } from "svelte/store";
    import type { AreaData } from "@workadventure/map-editor";
    import { availabilityStatusStore, enableCameraSceneVisibilityStore } from "../../../Stores/MediaStore";

    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import type { RightMenuItem } from "../../../Stores/MenuStore";
    import {
        SubMenusInterface,
        userIsConnected,
        openedMenuStore,
        showMenuItem,
        rightActionBarMenuItems,
    } from "../../../Stores/MenuStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { ENABLE_OPENID, SENTRY_DSN_FRONT } from "../../../Enum/EnvironmentVariable";
    import Woka from "../../Woka/WokaFromUserId.svelte";
    import Companion from "../../Companion/Companion.svelte";
    import ChevronDownIcon from "../../Icons/ChevronDownIcon.svelte";
    import ProfilIcon from "../../Icons/ProfilIcon.svelte";
    import CamSettingsIcon from "../../Icons/CamSettingsIcon.svelte";
    import SettingsIcon from "../../Icons/SettingsIcon.svelte";
    import XIcon from "../../Icons/XIcon.svelte";
    import MenuBurgerIcon from "../../Icons/MenuBurgerIcon.svelte";
    import DeskIcon from "../../Icons/DeskIcon.svelte";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import { getColorHexOfStatus, getStatusInformation, getStatusLabel } from "../../../Utils/AvailabilityStatus";
    import ExternalComponents from "../../ExternalModules/ExternalComponents.svelte";
    import AvailabilityStatusList from "../AvailabilityStatus/AvailabilityStatusList.svelte";
    import type { RequestedStatus } from "../../../Rules/StatusRules/statusRules";
    import { loginSceneVisibleStore } from "../../../Stores/LoginSceneStore";
    import { LoginScene, LoginSceneName } from "../../../Phaser/Login/LoginScene";
    import { selectCharacterSceneVisibleStore } from "../../../Stores/SelectCharacterStore";
    import { SelectCharacterScene, SelectCharacterSceneName } from "../../../Phaser/Login/SelectCharacterScene";
    import { selectCompanionSceneVisibleStore } from "../../../Stores/SelectCompanionStore";
    import { SelectCompanionScene, SelectCompanionSceneName } from "../../../Phaser/Login/SelectCompanionScene";
    import { EnableCameraScene, EnableCameraSceneName } from "../../../Phaser/Login/EnableCameraScene";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import ContextualMenuItems from "./ContextualMenuItems.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";
    import AdditionalMenuItems from "./AdditionalMenuItems.svelte";
    import { IconBug, IconLogout } from "@wa-icons";

    // The ActionBarButton component is displayed differently in the profile menu.
    // We use the context to decide how to render it.
    setContext("profileMenu", true);
    setContext("inMenu", true);

    let userName = gameManager.getPlayerName() || "";
    let hasPersonalDesk = false;
    let personalAreaData: AreaData | null = null;
    let isInsidePersonalDesk = false;

    // Check if user has a personal desk and if they're inside it
    function checkPersonalDesk() {
        const userUUID = localUserStore.getLocalUser()?.uuid;
        if (!userUUID) {
            hasPersonalDesk = false;
            personalAreaData = null;
            isInsidePersonalDesk = false;
            return;
        }

        const gameScene = gameManager.getCurrentGameScene();
        if (!gameScene) {
            hasPersonalDesk = false;
            personalAreaData = null;
            isInsidePersonalDesk = false;
            return;
        }

        const gameMapFrontWrapper = gameScene.getGameMapFrontWrapper();
        const personalAreas =
            gameMapFrontWrapper.areasManager?.getAreasByPropertyType("personalAreaPropertyData") ?? [];

        // Find the user's personal area
        for (const area of personalAreas) {
            const property = area.areaData.properties.find((property) => property.type === "personalAreaPropertyData");
            if (property && property.ownerId === userUUID) {
                hasPersonalDesk = true;
                personalAreaData = area.areaData;

                // Check if the current player is inside the personal desk
                const currentPlayer = gameScene.CurrentPlayer;
                if (currentPlayer && personalAreaData) {
                    isInsidePersonalDesk = gameMapFrontWrapper.isInsideAreaByCoordinates(
                        {
                            x: personalAreaData.x,
                            y: personalAreaData.y,
                            width: personalAreaData.width,
                            height: personalAreaData.height,
                        },
                        { x: currentPlayer.x, y: currentPlayer.y }
                    );
                } else {
                    isInsidePersonalDesk = false;
                }
                return;
            }
        }

        hasPersonalDesk = false;
        personalAreaData = null;
        isInsidePersonalDesk = false;
    }

    let checkInterval: ReturnType<typeof setInterval> | null = null;

    // Subscribe to menu state changes
    const unsubscribeOpenedMenuStore = openedMenuStore.subscribe((menuState) => {
        if (checkInterval) clearInterval(checkInterval);
        if (menuState === "profileMenu") {
            // Menu opened - start checking
            checkPersonalDesk();
            // Start checking periodically
            checkInterval = setInterval(() => {
                checkPersonalDesk();
            }, 2000);
        }
    });

    onMount(() => {
        // Check once on mount to set initial state
        checkPersonalDesk();

        // Unsubscribe from the opened menu store
        return () => {
            unsubscribeOpenedMenuStore();
            // Clear the interval
            if (checkInterval) clearInterval(checkInterval);
        };
    });

    onDestroy(() => {
        unsubscribeOpenedMenuStore();
        if (checkInterval) clearInterval(checkInterval);
    });

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

    function openEditCompanionScene() {
        selectCompanionSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCompanionSceneName, new SelectCompanionScene());
    }

    function openEnableCameraScene() {
        enableCameraSceneVisibilityStore.showEnableCameraScene();
        gameManager.leaveGame(EnableCameraSceneName, new EnableCameraScene());
        analyticsClient.editCamera();
    }

    async function openFeedbackScene() {
        // Get the instance returned by `feedbackIntegration()`
        const feedbackIntegrationInstance = Sentry.feedbackIntegration({
            colorScheme: "system",
            showBranding: false,
            enableScreenshot: true,
            formTitle: $LL.actionbar.issueReport.formTitle(),
            emailLabel: $LL.actionbar.issueReport.emailLabel(),
            nameLabel: $LL.actionbar.issueReport.nameLabel(),
            messageLabel: $LL.actionbar.issueReport.descriptionLabel(),
            messagePlaceholder: $LL.actionbar.issueReport.descriptionPlaceholder(),
            submitButtonLabel: $LL.actionbar.issueReport.submitButtonLabel(),
            cancelButtonLabel: $LL.actionbar.issueReport.cancelButtonLabel(),
            confirmButtonLabel: $LL.actionbar.issueReport.confirmButtonLabel(),
            addScreenshotButtonLabel: $LL.actionbar.issueReport.addScreenshotButtonLabel(),
            removeScreenshotButtonLabel: $LL.actionbar.issueReport.removeScreenshotButtonLabel(),
            successMessageText: $LL.actionbar.issueReport.successMessageText(),
            removeHighlightText: $LL.actionbar.issueReport.removeHighlightText(),
            highlightToolText: $LL.actionbar.issueReport.highlightToolText(),
            hideToolText: $LL.actionbar.issueReport.hideToolText(),
            isRequiredLabel: "",
            onFormOpen: () => {
                // Disable the user inputs
                gameManager.getCurrentGameScene().userInputManager.disableControls("store");
                // Close the menu
                openedMenuStore.close("profileMenu");
            },
            onFormClose: () => {
                gameManager.getCurrentGameScene().userInputManager.restoreControls("store");
                // Remove the actor buttom from the DOM
                form?.close();
            },
            onSubmitSuccess: () => {
                gameManager.getCurrentGameScene().userInputManager.restoreControls("store");
                // Remove the actor buttom from the DOM
                form?.close();
            },
        });
        const form = await feedbackIntegrationInstance?.createForm();
        form?.appendToDom();
        form?.open();
    }

    async function goToPersonalDesk() {
        // Close the menu
        openedMenuStore.close("profileMenu");

        // Walk to the personal desk using the GameScene method
        try {
            await gameManager.getCurrentGameScene()?.walkToPersonalDesk();
        } catch (error) {
            console.error("Error while walking to personal desk", error);
            warningMessageStore.addWarningMessage($LL.actionbar.personalDesk.errorMoving(), { closable: true });
        }
    }

    async function unclaimPersonalDesk() {
        if (!personalAreaData) {
            checkPersonalDesk();
            if (!personalAreaData) {
                warningMessageStore.addWarningMessage($LL.actionbar.personalDesk.errorNotFound(), { closable: true });
                return;
            }
        }

        try {
            const gameScene = gameManager.getCurrentGameScene();
            const mapEditorModeManager = gameScene.getMapEditorModeManager();
            if (!mapEditorModeManager) {
                warningMessageStore.addWarningMessage($LL.actionbar.personalDesk.errorUnclaiming(), { closable: true });
                return;
            }
            // Use unclaim personal area method of the map editor mode manager
            await mapEditorModeManager.unclaimPersonalArea(personalAreaData as unknown as AreaData);

            // Update local state to check if the personal desk is unclaimed
            checkPersonalDesk();

            // Send analytics event
            analyticsClient.unclaimPersonalDesk();

            // Close the menu
            openedMenuStore.close("profileMenu");
        } catch (error) {
            console.error("Error while unclaiming personal desk", error);
            warningMessageStore.addWarningMessage($LL.actionbar.personalDesk.errorUnclaiming(), { closable: true });
        }
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
<!-- svelte-ignore a11y-no-static-element-interactions -->
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
            class="hidden @md/actions:flex items-center h-full group-hover:bg-white/10 transition-all group-hover:rounded gap-2 pl-0 pr-3"
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
                <ActionBarButton
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
                </ActionBarButton>
                {#if hasPersonalDesk}
                    <ActionBarButton
                        label={$LL.actionbar.personalDesk.label()}
                        on:click={goToPersonalDesk}
                        state={isInsidePersonalDesk ? "disabled" : "normal"}
                        classList="group/btn-personal-desk"
                    >
                        <DeskIcon height="22" width="22" />
                    </ActionBarButton>
                    <ActionBarButton
                        label={$LL.actionbar.personalDesk.unclaim()}
                        on:click={unclaimPersonalDesk}
                        classList="group/btn-personal-desk"
                    >
                        <DeskIcon height="22" width="22" />
                    </ActionBarButton>
                {/if}
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

                {#if SENTRY_DSN_FRONT != undefined && connectionManager.currentRoom?.isIssueReportEnabled}
                    <ActionBarButton label={$LL.actionbar.issueReport.menuAction()} on:click={openFeedbackScene}>
                        <IconBug font-size="22" />
                    </ActionBarButton>
                {/if}

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

                <AdditionalMenuItems menu="profileMenu" />

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
                            <IconLogout height="20" width="20" class="text-danger-800 group-hover:text-white" />
                        </div>
                        <div class="text-start leading-4 text-danger-800 group-hover:text-white flex items-center">
                            {$LL.menu.profile.logout()}
                        </div>
                    </button>
                {/if}
            </div>
        </div>
    {/if}
</div>
