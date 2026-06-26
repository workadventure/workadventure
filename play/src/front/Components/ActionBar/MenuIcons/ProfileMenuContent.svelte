<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { setContext } from "svelte";
    import type { Readable } from "svelte/store";
    import { derived, get } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import { ENABLE_OPENID, SENTRY_DSN_FRONT } from "../../../Enum/EnvironmentVariable";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { EnableCameraScene, EnableCameraSceneName } from "../../../Phaser/Login/EnableCameraScene";
    import { LoginScene, LoginSceneName } from "../../../Phaser/Login/LoginScene";
    import { PwaInstallScene, PwaInstallSceneName } from "../../../Phaser/Login/PwaInstallScene";
    import { SelectCharacterScene, SelectCharacterSceneName } from "../../../Phaser/Login/SelectCharacterScene";
    import { SelectCompanionScene, SelectCompanionSceneName } from "../../../Phaser/Login/SelectCompanionScene";
    import type { RequestedStatus } from "../../../Rules/StatusRules/statusRules";
    import { loginSceneVisibleStore } from "../../../Stores/LoginSceneStore";
    import { enableCameraSceneVisibilityStore } from "../../../Stores/MediaStore";
    import type { RightMenuItem } from "../../../Stores/MenuStore";
    import {
        openedMenuStore,
        rightActionBarMenuItems,
        showMenuItem,
        SubMenusInterface,
        userIsConnected,
    } from "../../../Stores/MenuStore";
    import { onboardingStore } from "../../../Stores/OnboardingStore";
    import { pwaInstallProfileMenuEligibleStore } from "../../../Stores/PwaInstallStore";
    import { selectCharacterSceneVisibleStore } from "../../../Stores/SelectCharacterStore";
    import { selectCompanionSceneVisibleStore } from "../../../Stores/SelectCompanionStore";
    import { getStatusInformation } from "../../../Utils/AvailabilityStatus";
    import { LL } from "../../../../i18n/i18n-svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import AvailabilityStatusList from "../AvailabilityStatus/AvailabilityStatusList.svelte";
    import Companion from "../../Companion/Companion.svelte";
    import ExternalComponents from "../../ExternalModules/ExternalComponents.svelte";
    import CamSettingsIcon from "../../Icons/CamSettingsIcon.svelte";
    import { IconBug, IconFileDownload, IconHelpCircle, IconLogout } from "../../Icons";
    import ProfilIcon from "../../Icons/ProfilIcon.svelte";
    import SettingsIcon from "../../Icons/SettingsIcon.svelte";
    import Woka from "../../Woka/WokaFromUserId.svelte";
    import AdditionalMenuItems from "./AdditionalMenuItems.svelte";
    import ContextualMenuItems from "./ContextualMenuItems.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";

    interface Props {
        showContextualMenuItems: boolean;
    }

    let { showContextualMenuItems }: Props = $props();

    // This component is mounted in the global floating UI layer, so it must provide
    // the menu contexts itself rather than inheriting them from the action bar.
    setContext("profileMenu", true);
    setContext("inMenu", true);

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
                gameManager.getCurrentGameScene().userInputManager.disableControls("store");
                gameManager.getCurrentGameScene().userInputManager.disableRightClick();
                openedMenuStore.close("profileMenu");
            },
            onFormClose: () => {
                gameManager.getCurrentGameScene().userInputManager.restoreControls("store");
                gameManager.getCurrentGameScene().userInputManager.restoreRightClick();
                form?.close();
            },
            onSubmitSuccess: () => {
                gameManager.getCurrentGameScene().userInputManager.restoreControls("store");
                gameManager.getCurrentGameScene().userInputManager.restoreRightClick();
                form?.close();
            },
        });
        const form = await feedbackIntegrationInstance?.createForm();
        form?.appendToDom();
        form?.open();
    }

    let rightActionBarMenuItemsInBurgerMenu: Readable<RightMenuItem[]> = derived(
        rightActionBarMenuItems,
        ($rightActionBarMenuItems, set) => {
            const theDerived = derived(
                $rightActionBarMenuItems.map((item) => item.fallsInBurgerMenuStore),
                (items) => items,
            );
            const ghostSubscriptionUnsubscribe = theDerived.subscribe(() => {
                set(get(rightActionBarMenuItems).filter((item) => get(item.fallsInBurgerMenuStore)));
            });
            return () => ghostSubscriptionUnsubscribe();
        },
    );

    function openPwaInstallPrompt(): void {
        analyticsClient.pwaInstallFromProfileMenuClick();
        openedMenuStore.close("profileMenu");
        gameManager.leaveGame(PwaInstallSceneName, new PwaInstallScene());
    }
</script>

<div class="bg-contrast/80 backdrop-blur rounded-md p-1 w-56 text-white select-none" data-testid="profile-menu">
    <div class="p-0 m-0 list-none overflow-y-auto max-h-[calc(100vh-96px)]">
        <ExternalComponents zone="menuTop" />
        <AvailabilityStatusList statusInformation={getStatusInformation(statusToShow)} />
        <HeaderMenuItem label={$LL.menu.sub.profile()} />
        {#if showWokaNameMenuItem()}
            <ActionBarButton
                label={$LL.actionbar.profil()}
                onclick={() => {
                    openEditNameScene();
                    analyticsClient.editName();
                }}
            >
                <ProfilIcon />
            </ActionBarButton>
        {/if}
        <ActionBarButton
            label={$LL.actionbar.woka()}
            onclick={() => {
                openEditSkinScene();
                analyticsClient.editWoka();
            }}
        >
            <Woka userId={-1} placeholderSrc="" customWidth="26px" />
        </ActionBarButton>
        <ActionBarButton
            label={$LL.actionbar.companion()}
            onclick={() => {
                openEditCompanionScene();
                analyticsClient.editCompanion();
            }}
        >
            <Companion userId={-1} placeholderSrc="../static/images/default-companion.png" width="26px" height="26px" />
        </ActionBarButton>

        <HeaderMenuItem label={$LL.menu.sub.settings()} />
        <ActionBarButton label={$LL.actionbar.editCamMic()} onclick={openEnableCameraScene}>
            <CamSettingsIcon />
        </ActionBarButton>

        {#if SENTRY_DSN_FRONT != undefined && connectionManager.currentRoom?.isIssueReportEnabled}
            <ActionBarButton label={$LL.actionbar.issueReport.menuAction()} onclick={openFeedbackScene}>
                <IconBug font-size="22" />
            </ActionBarButton>
        {/if}

        <ActionBarButton
            label={$LL.actionbar.allSettings()}
            onclick={() => {
                showMenuItem(SubMenusInterface.settings);
                analyticsClient.openedMenu();
                openedMenuStore.close("profileMenu");
            }}
        >
            <SettingsIcon />
        </ActionBarButton>

        {#if showContextualMenuItems}
            <div class="items-center">
                <ContextualMenuItems />
            </div>
        {/if}

        <AdditionalMenuItems menu="profileMenu" />

        {#each $rightActionBarMenuItemsInBurgerMenu ?? [] as button (button.id)}
            {@const ButtonComponent = button.component}
            <ButtonComponent {...button.props} />
        {/each}

        {#if $pwaInstallProfileMenuEligibleStore === true}
            <button
                data-testid="profile-menu-install-web-app"
                disabled={$pwaInstallProfileMenuEligibleStore !== true}
                onclick={openPwaInstallPrompt}
                class="group flex p-2 gap-2 items-center font-bold text-sm w-full pointer-events-auto text-start rounded transition-all {$pwaInstallProfileMenuEligibleStore ===
                true
                    ? 'hover:bg-white/10 cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'}"
            >
                <div class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center">
                    <IconFileDownload height="20" width="20" class="text-white" />
                </div>
                <div class="text-start leading-4 text-white flex items-center">
                    {$LL.actionbar.installPwa()}
                </div>
            </button>
        {/if}

        <button
            onclick={() => {
                onboardingStore.restart();
                openedMenuStore.close("profileMenu");
            }}
            class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-start rounded"
        >
            <div class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center">
                <IconHelpCircle height="20" width="20" class="text-white" />
            </div>
            <div class="text-start leading-4 text-white flex items-center">
                {$LL.menu.profile.helpAndTips()}
            </div>
        </button>

        {#if ENABLE_OPENID && $userIsConnected}
            <button
                onclick={() => {
                    analyticsClient.logout();
                    connectionManager.logout();
                }}
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
