<script lang="ts">
    import { onMount } from "svelte";
    import { closeModal } from "svelte-modals";
    import type { MatrixChatConnection, MatrixPeerProfileDiagnostics } from "../Connection/Matrix/MatrixChatConnection";
    import ButtonClose from "../../Components/Input/ButtonClose.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { IconLoader } from "@wa-icons";

    export let connection: MatrixChatConnection;
    /** Matrix user ID (@user:server) */
    export let matrixUserId: string;
    /** Optional label (e.g. WA username) for the dialog title */
    export let label: string | undefined = undefined;

    let loading = true;
    let loadError: string | undefined;
    let data: MatrixPeerProfileDiagnostics | undefined;
    let copiedField: string | undefined;

    async function loadDiagnostics() {
        loading = true;
        loadError = undefined;
        try {
            data = await connection.getMatrixPeerProfileDiagnostics(matrixUserId);
            if (!data) {
                loadError = $LL.chat.matrixPeerProfileDebug.loadError();
            }
        } catch (e) {
            console.error(e);
            loadError = $LL.chat.matrixPeerProfileDebug.loadError();
        } finally {
            loading = false;
        }
    }

    function copyText(labelKey: string, text: string) {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                copiedField = labelKey;
                setTimeout(() => {
                    copiedField = undefined;
                }, 2000);
            })
            .catch(() => undefined);
    }

    onMount(() => {
        loadDiagnostics().catch(() => undefined);
    });
</script>

<div
    class="fixed inset-0 z-[2001] flex items-center justify-center p-4 pointer-events-auto bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="matrix-peer-debug-title"
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
                <h2 id="matrix-peer-debug-title" class="text-lg font-semibold sm:text-xl">
                    {$LL.chat.matrixPeerProfileDebug.title()}{#if label}
                        <span class="text-white/80"> — {label}</span>{/if}
                </h2>
                <p class="mt-1 text-sm text-white/70">{$LL.chat.matrixPeerProfileDebug.subtitle()}</p>
            </div>
            <ButtonClose dataTestId="close-matrix-peer-debug" size="sm" on:click={() => closeModal()} />
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
                                <span class="text-white/60">{$LL.chat.matrixSettings.waDisplayName()}</span>
                                <span class="text-right text-white/90">{snapshot.accountDataWaDisplayName ?? "—"}</span>
                            </div>
                            <div class="mt-2 flex items-start justify-between gap-2 border-t border-white/10 pt-2">
                                <span class="shrink-0 text-white/60">{$LL.chat.matrixSettings.waAvatar()}</span>
                                <div class="flex min-w-0 flex-1 flex-col items-end gap-1">
                                    {#if snapshot.accountDataWaAvatarPreviewUrl}
                                        <img
                                            src={snapshot.accountDataWaAvatarPreviewUrl}
                                            alt=""
                                            class="h-12 w-12 rounded-lg object-cover"
                                        />
                                    {/if}
                                    <span class="break-all text-right text-xs text-white/70"
                                        >{snapshot.accountDataWaAvatarMxc ?? "—"}</span
                                    >
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            {/if}
        </div>
    </div>
</div>
