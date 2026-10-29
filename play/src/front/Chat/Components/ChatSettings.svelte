<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { scale } from "svelte/transition";
    import type { MatrixUserSettingsDiagnostics } from "../Connection/ChatConnection";
    import { hasMatrixChatCapabilities } from "../Connection/ChatConnection";
    import Button from "../../Components/UI/Button.svelte";
    import InputCheckbox from "../../Components/Input/InputCheckbox.svelte";
    import resetKeyStorageConfirmationModal from "../../Components/Menu/ResetKeyStorageConfirmationModal.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { clearIgnoredSuggestedRooms, navChat } from "../Stores/ChatStore";
    import { IconCheck, IconChevronLeft, IconLoader } from "@wa-icons";
    import { modals } from "@wa-modals";

    const chat = gameManager.chatConnection;
    const connection = hasMatrixChatCapabilities(chat) ? chat : undefined;

    type FooterAction = "clearSuggested" | "syncAccount";
    let successFlash: FooterAction | null = $state(null);
    let successFlashTimer: ReturnType<typeof setTimeout> | undefined;

    let chatSounds = $state(localUserStore.getChatSounds());
    let loading = $state(true);
    let syncing = $state(false);
    let loadError: string | undefined = $state();
    let data: MatrixUserSettingsDiagnostics | undefined = $state();
    let copiedField: string | undefined = $state();
    let avatarFailed = $state(false);

    function flashSuccess(action: FooterAction) {
        if (successFlashTimer) {
            clearTimeout(successFlashTimer);
        }
        successFlash = action;
        successFlashTimer = setTimeout(() => {
            successFlash = null;
            successFlashTimer = undefined;
        }, 2000);
    }

    function handleClearSuggested() {
        clearIgnoredSuggestedRooms();
        flashSuccess("clearSuggested");
    }

    async function loadDiagnostics() {
        loading = true;
        loadError = undefined;
        try {
            data = await connection?.getMatrixUserSettingsDiagnostics();
            if (!data) {
                loadError = $LL.chat.matrixSettings.notConnected();
            }
        } catch (e) {
            console.error(e);
            loadError = $LL.chat.matrixSettings.loadError();
        } finally {
            loading = false;
        }
    }

    async function syncAccountData() {
        if (!connection) return;
        syncing = true;
        try {
            await connection.syncMatrixGlobalProfileFromLocalWokaAndName(true);
            await loadDiagnostics();
            flashSuccess("syncAccount");
        } catch (e) {
            console.error(e);
            loadError = $LL.chat.matrixSettings.loadError();
        } finally {
            syncing = false;
        }
    }

    function copyText(label: string, text: string) {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                copiedField = label;
                setTimeout(() => {
                    copiedField = undefined;
                }, 2000);
            })
            .catch(() => undefined);
    }

    function back() {
        navChat.switchToChat();
    }

    onMount(() => {
        loadDiagnostics().catch(() => undefined);
    });

    onDestroy(() => {
        if (successFlashTimer) {
            clearTimeout(successFlashTimer);
        }
    });
</script>

<!-- Escape only goes back while the focus is inside the view, so it never fights the game or a modal. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="flex h-full min-h-0 flex-col text-white"
    data-testid="chatSettings"
    onkeydown={(event) => {
        if (event.key === "Escape") back();
    }}
>
    <div class="flex items-center gap-2 border border-solid border-x-0 border-t-0 border-white/10 p-2">
        <button
            type="button"
            class="m-0 flex aspect-square h-12 w-12 shrink-0 items-center justify-center rounded hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
            data-testid="chatSettingsBackButton"
            title={$LL.chat.roomPanel.back()}
            aria-label={$LL.chat.roomPanel.back()}
            onclick={back}
        >
            <IconChevronLeft font-size="20" />
        </button>
        <h2 class="m-0 min-w-0 flex-1 truncate text-base font-bold">{$LL.chat.matrixSettings.title()}</h2>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 text-sm">
        <section class="flex flex-col gap-2">
            <h3 class="m-0 text-xs font-semibold uppercase tracking-wide text-white/50">
                {$LL.chat.matrixSettings.notificationsSection()}
            </h3>
            <InputCheckbox
                dataTestId="chatSounds"
                bind:value={chatSounds}
                onchange={() => localUserStore.setChatSounds(chatSounds)}
                label={$LL.menu.settings.chatSounds()}
            />
            <p class="m-0 text-xs text-white/60">{$LL.chat.matrixSettings.browserNotificationsHint()}</p>
        </section>

        {#if loading}
            <div class="flex flex-col items-center justify-center gap-3 py-8 text-white/80">
                <IconLoader class="animate-spin" font-size="2rem" />
                <span class="text-sm">{$LL.chat.loader()}</span>
            </div>
        {:else if loadError}
            <p class="m-0 rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-100">
                {loadError}
            </p>
        {:else if data}
            {@const snapshot = data}
            <section class="flex flex-col gap-2">
                <h3 class="m-0 text-xs font-semibold uppercase tracking-wide text-white/50">
                    {$LL.chat.matrixSettings.profileSection()}
                </h3>
                <div class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    {#if snapshot.profileAvatarPreviewUrl && !avatarFailed}
                        <img
                            src={snapshot.profileAvatarPreviewUrl}
                            alt={$LL.chat.matrixSettings.avatar()}
                            class="h-10 w-10 shrink-0 rounded-lg object-cover"
                            onerror={() => (avatarFailed = true)}
                        />
                    {/if}
                    <span class="min-w-0 flex-1 truncate font-medium">{snapshot.profileDisplayName ?? "—"}</span>
                </div>
                <p class="m-0 text-xs text-white/60">
                    {#if snapshot.profileNeedsSync}
                        {$LL.chat.matrixSettings.needsSyncHint()}
                    {:else}
                        {$LL.chat.matrixSettings.upToDateHint()}
                    {/if}
                </p>
                <Button
                    type="button"
                    variant={successFlash === "syncAccount" ? "success" : "secondary"}
                    class={`transition-all duration-200 active:scale-[0.98] disabled:opacity-50 ${
                        successFlash === "syncAccount" ? "matrix-settings-btn-success" : ""
                    }`}
                    disabled={syncing}
                    onclick={syncAccountData}
                >
                    {#if syncing}
                        <IconLoader class="animate-spin" font-size="1.25rem" />
                        {$LL.chat.matrixSettings.syncing()}
                    {:else if successFlash === "syncAccount"}
                        <span
                            class="flex items-center justify-center gap-2"
                            in:scale={{ duration: 200, delay: 0, opacity: 0.5, start: 0.85 }}
                        >
                            <IconCheck font-size="1.25rem" class="shrink-0 text-white" />
                            {$LL.chat.matrixSettings.actionDone()}
                        </span>
                    {:else}
                        {$LL.chat.matrixSettings.syncButton()}
                    {/if}
                </Button>
            </section>

            <section class="flex flex-col gap-2">
                <h3 class="m-0 text-xs font-semibold uppercase tracking-wide text-white/50">
                    {$LL.chat.matrixSettings.securitySection()}
                </h3>
                <p class="m-0 text-xs text-white/60">{$LL.chat.matrixSettings.securityHint()}</p>
                <Button
                    type="button"
                    variant="danger"
                    appearance="border"
                    dataTestId="resetKeyStorageButton"
                    onclick={() => modals.open(resetKeyStorageConfirmationModal)}
                >
                    {$LL.menu.chat.resetKeyStorageUpButtonLabel()}
                </Button>
            </section>

            <details class="flex flex-col gap-2">
                <summary
                    class="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-white/50 hover:text-white/80"
                >
                    {$LL.chat.matrixSettings.advancedSection()}
                </summary>
                <div class="mt-2 flex flex-col gap-2">
                    {#each [{ key: "id", label: $LL.chat.matrixSettings.matrixUserId(), value: snapshot.matrixUserId }, { key: "hs", label: $LL.chat.matrixSettings.homeserver(), value: snapshot.homeserverUrl }] as row (row.key)}
                        <button
                            type="button"
                            class="group flex w-full flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/60"
                            onclick={() => copyText(row.key, row.value)}
                        >
                            <span class="flex w-full justify-between gap-2 text-xs">
                                <span class="text-white/60">{row.label}</span>
                                <span class="text-light-blue opacity-80 group-hover:opacity-100">
                                    {copiedField === row.key
                                        ? $LL.chat.matrixSettings.copied()
                                        : $LL.chat.matrixSettings.copy()}
                                </span>
                            </span>
                            <span class="w-full break-all text-xs text-white/90">{row.value}</span>
                        </button>
                    {/each}
                    <p class="m-0 text-xs text-white/55">{$LL.chat.matrixSettings.clearSuggestedRoomsHint()}</p>
                    <Button
                        type="button"
                        variant={successFlash === "clearSuggested" ? "success" : "light"}
                        appearance={successFlash === "clearSuggested" ? "filled" : "border"}
                        class={`transition-all duration-200 active:scale-[0.98] ${
                            successFlash === "clearSuggested" ? "matrix-settings-btn-success" : ""
                        }`}
                        onclick={handleClearSuggested}
                    >
                        {#if successFlash === "clearSuggested"}
                            <span
                                class="flex items-center justify-center gap-2"
                                in:scale={{ duration: 200, delay: 0, opacity: 0.5, start: 0.85 }}
                            >
                                <IconCheck font-size="1.25rem" class="shrink-0 text-emerald-300" />
                                {$LL.chat.matrixSettings.actionDone()}
                            </span>
                        {:else}
                            {$LL.chat.matrixSettings.clearSuggestedRoomsButton()}
                        {/if}
                    </Button>
                </div>
            </details>
        {/if}
    </div>
</div>

<style>
    /* -global- keeps the keyframe name un-hashed so the :global() rule below can reference it. */
    @keyframes -global-matrix-settings-success-pop {
        0% {
            transform: scale(1);
        }
        40% {
            transform: scale(1.035);
        }
        100% {
            transform: scale(1);
        }
    }
    /* Global so it survives on the <button> that <Button> renders (scoped CSS would not reach it). */
    :global(.matrix-settings-btn-success) {
        animation: matrix-settings-success-pop 0.55s cubic-bezier(0.34, 1.25, 0.64, 1);
    }
</style>
