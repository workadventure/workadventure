<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { scale } from "svelte/transition";
    import { closeModal } from "svelte-modals";
    import type { MatrixChatConnectionLike, MatrixUserSettingsDiagnostics } from "../Connection/ChatConnection";
    import ButtonClose from "../../Components/Input/ButtonClose.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { clearIgnoredSuggestedRooms } from "../Stores/ChatStore";
    import { DEBUG_MODE } from "../../Enum/EnvironmentVariable";
    import { IconCheck, IconLoader } from "@wa-icons";

    export let connection: MatrixChatConnectionLike;

    type MatrixFooterAction = "clearSuggested" | "syncAccount";

    let successFlash: MatrixFooterAction | null = null;
    let successFlashTimer: ReturnType<typeof setTimeout> | undefined;

    function flashSuccess(action: MatrixFooterAction) {
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

    let loading = true;
    let syncing = false;
    let loadError: string | undefined;
    let data: MatrixUserSettingsDiagnostics | undefined;
    let copiedField: string | undefined;

    async function loadDiagnostics() {
        loading = true;
        loadError = undefined;
        try {
            data = await connection.getMatrixUserSettingsDiagnostics();
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

    onMount(() => {
        loadDiagnostics().catch(() => undefined);
    });

    onDestroy(() => {
        if (successFlashTimer) {
            clearTimeout(successFlashTimer);
        }
    });
</script>

<div
    class="fixed inset-0 z-[2001] flex items-center justify-center p-4 pointer-events-auto bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="matrix-settings-title"
>
    <button
        type="button"
        class="absolute inset-0 w-full h-full cursor-default"
        aria-label={$LL.chat.matrixSettings.close()}
        on:click={() => closeModal()}
    />
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-contrast/90 text-white shadow-xl backdrop-blur-md pointer-events-auto"
        on:click|stopPropagation
    >
        <div class="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
            <div>
                <h2 id="matrix-settings-title" class="text-lg font-semibold sm:text-xl">
                    {$LL.chat.matrixSettings.title()}
                </h2>
                <p class="mt-1 text-sm text-white/70">{$LL.chat.matrixSettings.subtitle()}</p>
            </div>
            <ButtonClose dataTestId="close-matrix-settings" size="sm" on:click={() => closeModal()} />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
            {#if loading}
                <div class="flex flex-col items-center justify-center gap-3 py-12 text-white/80">
                    <IconLoader class="animate-spin" font-size="2rem" />
                    <span class="text-sm">{$LL.chat.loader()}</span>
                </div>
            {:else if loadError}
                <p class="rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-100">
                    {loadError}
                </p>
            {:else if data}
                {@const snapshot = data}
                <div class="flex flex-col gap-4 text-sm">
                    <section class="flex flex-col gap-2">
                        <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50">
                            {$LL.chat.matrixSettings.identitySection()}
                        </h3>
                        <button
                            type="button"
                            class="group flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-white/20"
                            on:click={() => copyText("id", snapshot.matrixUserId)}
                        >
                            <span class="text-white/60">{$LL.chat.matrixSettings.matrixUserId()}</span>
                            <span class="line-clamp-2 break-all text-right text-xs text-white/90"
                                >{snapshot.matrixUserId}</span
                            >
                            <span class="shrink-0 text-xs text-light-blue opacity-80 group-hover:opacity-100">
                                {copiedField === "id"
                                    ? $LL.chat.matrixSettings.copied()
                                    : $LL.chat.matrixSettings.copy()}
                            </span>
                        </button>
                        <button
                            type="button"
                            class="group flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-white/20"
                            on:click={() => copyText("hs", snapshot.homeserverUrl)}
                        >
                            <span class="text-white/60">{$LL.chat.matrixSettings.homeserver()}</span>
                            <span class="line-clamp-2 break-all text-right text-xs text-white/90"
                                >{snapshot.homeserverUrl}</span
                            >
                            <span class="shrink-0 text-xs text-light-blue opacity-80 group-hover:opacity-100">
                                {copiedField === "hs"
                                    ? $LL.chat.matrixSettings.copied()
                                    : $LL.chat.matrixSettings.copy()}
                            </span>
                        </button>
                    </section>

                    <section class="flex flex-col gap-2">
                        <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50">
                            {$LL.chat.matrixSettings.profileSection()}
                        </h3>
                        <div class="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                            <div class="flex justify-between gap-2">
                                <span class="text-white/60">{$LL.chat.matrixSettings.displayName()}</span>
                                <span class="text-right text-white/90">{snapshot.profileDisplayName ?? "—"}</span>
                            </div>
                            <div class="mt-2 flex items-start justify-between gap-2">
                                <span class="shrink-0 text-white/60">{$LL.chat.matrixSettings.avatar()}</span>
                                <div class="flex min-w-0 flex-1 flex-col items-end gap-1">
                                    {#if snapshot.profileAvatarPreviewUrl}
                                        <img
                                            src={snapshot.profileAvatarPreviewUrl}
                                            alt=""
                                            class="h-12 w-12 rounded-lg object-cover"
                                        />
                                    {/if}
                                    <span class="break-all text-right text-xs text-white/70"
                                        >{snapshot.profileAvatarMxc ?? "—"}</span
                                    >
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="flex flex-col gap-2">
                        <h3 class="text-xs font-semibold uppercase tracking-wide text-white/50">
                            {$LL.chat.matrixSettings.accountDataSection()}
                        </h3>
                        <div class="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                            <div class="flex justify-between gap-2">
                                <span class="text-white/60">{$LL.chat.matrixSettings.localName()}</span>
                                <span class="text-right text-white/90">{snapshot.localDisplayName ?? "—"}</span>
                            </div>
                        </div>
                        <p class="text-xs text-white/60">
                            {#if snapshot.profileNeedsSync}
                                {$LL.chat.matrixSettings.needsSyncHint()}
                            {:else}
                                {$LL.chat.matrixSettings.upToDateHint()}
                            {/if}
                        </p>
                    </section>
                </div>
            {/if}
        </div>

        {#if !loading && data}
            <div class="flex flex-shrink-0 flex-col gap-2 border-t border-white/10 p-4 sm:p-5">
                <p class="text-xs text-white/55">{$LL.chat.matrixSettings.clearSuggestedRoomsHint()}</p>
                <button
                    type="button"
                    class="flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 {successFlash ===
                    'clearSuggested'
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.22)] matrix-settings-btn-success'
                        : 'border-white/15 bg-white/[0.06] text-white hover:bg-white/10'}"
                    disabled={syncing}
                    on:click={handleClearSuggested}
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
                </button>
                {#if DEBUG_MODE}
                    <p class="text-xs text-white/55 pt-1">{$LL.chat.matrixSettings.publishWokaToMatrixProfileHint()}</p>
                {/if}
                <button
                    type="button"
                    class="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 {successFlash ===
                    'syncAccount'
                        ? 'border-2 border-emerald-400/55 bg-emerald-600/90 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] matrix-settings-btn-success'
                        : 'bg-secondary text-contrast hover:opacity-90'}"
                    disabled={syncing}
                    on:click={syncAccountData}
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
                </button>
            </div>
        {/if}
    </div>
</div>

<style>
    @keyframes matrix-settings-success-pop {
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
    .matrix-settings-btn-success {
        animation: matrix-settings-success-pop 0.55s cubic-bezier(0.34, 1.25, 0.64, 1);
    }
</style>
