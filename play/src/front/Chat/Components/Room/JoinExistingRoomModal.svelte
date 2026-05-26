<script lang="ts">
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import Input from "../../../Components/Input/Input.svelte";
    import Spinner from "../../../Components/Icons/Spinner.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { MATRIX_DOMAIN } from "../../../Enum/EnvironmentVariable";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import type {
        ExternalRoomDirectoryResult,
        ExternalRoomErrorState,
        ExternalRoomPreview,
        JoinExistingRoomInput,
    } from "../../Connection/ChatConnection";
    import { IconClock, IconMessage, IconSearch, IconUsers, IconWorldSearch } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
    }

    let { isOpen }: Props = $props();

    const chat = gameManager.chatConnection;
    const defaultDirectoryServer =
        MATRIX_DOMAIN ?? getDefaultMatrixServerHost() ?? get(LL).chat.joinExternalRoom.directory.serverPlaceholder();

    let address = $state("");
    let directorySearch = $state("");
    let directoryServer = $state("");
    let reason = $state("");
    let loadingAddress = $state(false);
    let loadingSearch = $state(false);
    let loadingAction = $state(false);
    let errorMessage = $state<string | undefined>(undefined);
    let errorState = $state<ExternalRoomErrorState | undefined>(undefined);
    let directoryMessage = $state<string | undefined>(undefined);
    let selectedDirectoryRoomId = $state<string | undefined>(undefined);
    let results = $state<ExternalRoomDirectoryResult[]>([]);
    let preview = $state<ExternalRoomPreview | undefined>(undefined);
    let knockedRoomId = $state<string | undefined>(undefined);

    let canPreviewAddress = $derived(address.trim().length > 0 && !loadingAddress);
    let canSearch = $derived(!loadingSearch);
    let canJoin = $derived(preview !== undefined && !loadingAction && knockedRoomId === undefined);
    let canAskToJoin = $derived(
        preview !== undefined &&
            !loadingAction &&
            knockedRoomId === undefined &&
            (preview.joinRule === "knock" || preview.joinRule === "knock_restricted" || errorState === "forbidden"),
    );

    function focusChatInput() {
        chatInputFocusStore.set(true);
    }

    function unfocusChatInput() {
        chatInputFocusStore.set(false);
    }

    function setUnknownError(error: unknown) {
        console.error(error);
        errorMessage = error instanceof Error ? error.message : get(LL).chat.unknownError();
    }

    function getDefaultMatrixServerHost(): string | undefined {
        const matrixServerUrl = gameManager.getMatrixServerUrl();
        if (!matrixServerUrl) {
            return undefined;
        }

        try {
            return new URL(matrixServerUrl).host;
        } catch {
            return undefined;
        }
    }

    function resetTransientState() {
        errorMessage = undefined;
        errorState = undefined;
        directoryMessage = undefined;
        knockedRoomId = undefined;
    }

    function clearDirectoryMessage() {
        directoryMessage = undefined;
    }

    async function previewAddress() {
        resetTransientState();
        preview = undefined;
        selectedDirectoryRoomId = undefined;
        loadingAddress = true;

        try {
            const parsedInput = chat.parseExternalRoomAddress(address);
            preview = await chat.previewExistingRoom({ ...parsedInput, shouldPeek: true });
        } catch (error) {
            setUnknownError(error);
        } finally {
            loadingAddress = false;
        }
    }

    async function searchDirectory() {
        resetTransientState();
        results = [];
        selectedDirectoryRoomId = undefined;

        if (directorySearch.trim().length === 0) {
            directoryMessage = get(LL).chat.joinExternalRoom.directory.emptySearch();
            return;
        }

        loadingSearch = true;

        try {
            results = await chat.searchExternalPublicRooms(directorySearch.trim(), directoryServer.trim() || undefined);
            if (results.length === 0) {
                directoryMessage = get(LL).chat.joinExternalRoom.directory.noResults();
            }
        } catch (error) {
            setUnknownError(error);
        } finally {
            loadingSearch = false;
        }
    }

    async function selectDirectoryRoom(room: ExternalRoomDirectoryResult) {
        resetTransientState();
        selectedDirectoryRoomId = room.roomId;
        loadingAddress = true;

        try {
            preview = await chat.previewExistingRoom({
                roomId: room.roomId,
                roomAlias: room.roomAlias,
                viaServers: room.viaServers,
                shouldPeek: room.worldReadable,
                joinRule: room.joinRule,
                worldReadable: room.worldReadable,
                name: room.name,
                topic: room.topic,
                avatarUrl: room.avatarUrl,
                numJoinedMembers: room.numJoinedMembers,
                guestCanJoin: room.guestCanJoin,
                roomType: room.roomType,
            });
        } catch (error) {
            setUnknownError(error);
        } finally {
            loadingAddress = false;
        }
    }

    async function joinRoom() {
        if (!preview) return;
        loadingAction = true;
        errorMessage = undefined;
        errorState = undefined;

        try {
            const result = await chat.joinExistingRoom(preview);
            if (result.mode === "joined") {
                modals.close();
                return;
            }
            errorState = result.errorState;
            preview = {
                ...preview,
                roomId: result.roomId ?? preview.roomId,
                roomAlias: result.roomAlias ?? preview.roomAlias,
                viaServers: result.viaServers,
                errorState: result.errorState,
            };
        } catch (error) {
            setUnknownError(error);
        } finally {
            loadingAction = false;
        }
    }

    async function askToJoin() {
        if (!preview) return;
        loadingAction = true;
        errorMessage = undefined;

        try {
            const result = await chat.knockExistingRoom({
                ...preview,
                reason: reason.trim() || undefined,
            } satisfies JoinExistingRoomInput);
            knockedRoomId = result.roomId ?? preview.roomId;
        } catch (error) {
            setUnknownError(error);
        } finally {
            loadingAction = false;
        }
    }

    function cancelRequest() {
        const roomIdToCancel = knockedRoomId;
        if (!roomIdToCancel) return;

        loadingAction = true;
        errorMessage = undefined;

        chat.cancelExternalRoomRequest(roomIdToCancel)
            .then(() => {
                knockedRoomId = undefined;
                loadingAction = false;
            })
            .catch((error) => {
                setUnknownError(error);
                loadingAction = false;
            });
    }

    function roomTitle(room: Pick<ExternalRoomPreview, "name" | "roomAlias" | "roomId">) {
        return room.name || room.roomAlias || room.roomId;
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>{$LL.chat.joinExternalRoom.title()}</h1>
    {/snippet}

    {#snippet content()}
        <div class="flex w-full flex-col gap-5">
        <section class="flex w-full flex-col gap-3">
            <Input
                dataTestId="joinExternalRoomAddress"
                label={$LL.chat.joinExternalRoom.address.label()}
                placeholder={$LL.chat.joinExternalRoom.address.placeholder()}
                bind:value={address}
                onfocusin={focusChatInput}
                onfocusout={unfocusChatInput}
                onkeydown={(event) => {
                    if (event.key === "Enter" && canPreviewAddress) previewAddress().catch(setUnknownError);
                }}
            />
            <button
                type="button"
                class="btn btn-secondary m-0 w-fit px-4 py-2 disabled:bg-gray-500 disabled:text-gray-400"
                disabled={!canPreviewAddress}
                onclick={previewAddress}
            >
                {#if loadingAddress}
                    <Spinner />
                {:else}
                    <IconWorldSearch class="mr-2" />
                    {$LL.chat.joinExternalRoom.buttons.preview()}
                {/if}
            </button>
        </section>

        <section class="flex w-full flex-col gap-3 border border-solid border-x-0 border-white/10 py-4">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_12rem]">
                <Input
                    dataTestId="joinExternalRoomDirectorySearch"
                    label={$LL.chat.joinExternalRoom.directory.searchLabel()}
                    placeholder={$LL.chat.joinExternalRoom.directory.searchPlaceholder()}
                    bind:value={directorySearch}
                    oninput={clearDirectoryMessage}
                    onfocusin={focusChatInput}
                    onfocusout={unfocusChatInput}
                    onkeydown={(event) => {
                        if (event.key === "Enter" && canSearch) searchDirectory().catch(setUnknownError);
                    }}
                />
                <Input
                    dataTestId="joinExternalRoomDirectoryServer"
                    label={$LL.chat.joinExternalRoom.directory.serverLabel()}
                    placeholder={defaultDirectoryServer}
                    bind:value={directoryServer}
                    onfocusin={focusChatInput}
                    onfocusout={unfocusChatInput}
                />
            </div>
            <button
                type="button"
                class="btn btn-contrast m-0 w-fit px-4 py-2 disabled:bg-gray-500 disabled:text-gray-400"
                disabled={!canSearch}
                onclick={searchDirectory}
            >
                {#if loadingSearch}
                    <Spinner />
                {:else}
                    <IconSearch class="mr-2" />
                    {$LL.chat.joinExternalRoom.buttons.search()}
                {/if}
            </button>
            {#if directoryMessage}
                <div class="rounded-md bg-white/10 p-2 text-sm text-white/75">{directoryMessage}</div>
            {/if}
            {#if results.length > 0}
                <div class="flex max-h-56 flex-col gap-2 overflow-y-auto">
                    {#each results as room (room.roomId)}
                        <button
                            type="button"
                            class="m-0 flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors {selectedDirectoryRoomId ===
                            room.roomId
                                ? 'bg-white/20'
                                : 'hover:bg-white/10'}"
                            aria-pressed={selectedDirectoryRoomId === room.roomId}
                            onclick={() => selectDirectoryRoom(room)}
                        >
                            <div class="mt-1 shrink-0">
                                <IconMessage />
                            </div>
                            <div class="min-w-0 grow">
                                <div class="truncate text-sm font-bold">{roomTitle(room)}</div>
                                {#if room.topic}
                                    <div class="line-clamp-2 text-xs text-white/60">{room.topic}</div>
                                {/if}
                            </div>
                            {#if room.numJoinedMembers !== undefined}
                                <span class="flex shrink-0 items-center gap-1 text-xs text-white/70">
                                    <IconUsers />
                                    {room.numJoinedMembers}
                                </span>
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </section>

        {#if errorMessage}
            <div class="w-full rounded-md bg-danger-900 p-3 text-sm">{errorMessage}</div>
        {/if}

        {#if preview}
            <section class="flex w-full flex-col gap-3 rounded-md bg-white/10 p-4">
                <div class="flex items-start gap-3">
                    <div class="mt-1 shrink-0">
                        <IconMessage />
                    </div>
                    <div class="min-w-0 grow">
                        <h2 class="m-0 truncate text-base font-bold">{roomTitle(preview)}</h2>
                        {#if preview.roomAlias}
                            <div class="truncate text-xs text-white/60">{preview.roomAlias}</div>
                        {/if}
                        {#if preview.topic}
                            <p class="m-0 mt-2 text-sm text-white/75">{preview.topic}</p>
                        {/if}
                    </div>
                </div>

                <div class="flex flex-wrap gap-2 text-xs text-white/70">
                    {#if preview.numJoinedMembers !== undefined}
                        <span class="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1">
                            <IconUsers />
                            {$LL.chat.joinExternalRoom.preview.members({ count: preview.numJoinedMembers })}
                        </span>
                    {/if}
                    {#if preview.joinRule}
                        <span class="rounded-md bg-white/10 px-2 py-1">{preview.joinRule}</span>
                    {/if}
                    {#if preview.worldReadable}
                        <span class="rounded-md bg-white/10 px-2 py-1"
                            >{$LL.chat.joinExternalRoom.preview.worldReadable()}</span
                        >
                    {/if}
                </div>

                {#if preview.timelinePreview && preview.timelinePreview.length > 0}
                    <div class="flex flex-col gap-2 border border-solid border-x-0 border-b-0 border-white/10 pt-3">
                        <div class="flex items-center gap-2 text-xs font-bold uppercase text-white/60">
                            <IconClock />
                            {$LL.chat.joinExternalRoom.preview.recentMessages()}
                        </div>
                        {#each preview.timelinePreview as message, index (`${message.id ?? index}`)}
                            <div class="rounded-md bg-black/20 p-2">
                                <div class="text-xs text-white/50">{message.sender}</div>
                                <div class="text-sm">{message.body}</div>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if errorState === "forbidden"}
                    <div class="rounded-md bg-amber-500/20 p-2 text-sm text-amber-100">
                        {$LL.chat.joinExternalRoom.errors.forbidden()}
                    </div>
                {/if}

                {#if canAskToJoin || knockedRoomId}
                    <Input
                        dataTestId="joinExternalRoomReason"
                        label={$LL.chat.joinExternalRoom.reason.label()}
                        placeholder={$LL.chat.joinExternalRoom.reason.placeholder()}
                        bind:value={reason}
                        onfocusin={focusChatInput}
                        onfocusout={unfocusChatInput}
                        disabled={knockedRoomId !== undefined}
                    />
                {/if}

                {#if knockedRoomId}
                    <div class="rounded-md bg-success-900 p-2 text-sm">
                        {$LL.chat.joinExternalRoom.knocked()}
                    </div>
                {/if}
            </section>
        {/if}
        </div>
    {/snippet}

    {#snippet action()}
        <button class="btn btn-contrast m-1 flex-1 justify-center" onclick={() => modals.close()}>
            {$LL.chat.joinExternalRoom.buttons.cancel()}
        </button>
        {#if knockedRoomId}
            <button
                class="btn border border-solid border-danger bg-transparent text-danger m-1 flex-1 justify-center"
                disabled={loadingAction}
                onclick={cancelRequest}
            >
                {#if loadingAction}
                    <Spinner />
                {:else}
                    {$LL.chat.joinExternalRoom.buttons.cancelRequest()}
                {/if}
            </button>
        {:else if canAskToJoin}
            <button
                class="btn btn-secondary m-1 flex-1 justify-center disabled:bg-gray-500 disabled:text-gray-400"
                disabled={loadingAction}
                onclick={askToJoin}
            >
                {#if loadingAction}
                    <Spinner />
                {:else}
                    {$LL.chat.joinExternalRoom.buttons.askToJoin()}
                {/if}
            </button>
        {:else}
            <button
                data-testid="joinExternalRoomButton"
                class="btn btn-secondary m-1 flex-1 justify-center disabled:bg-gray-500 disabled:text-gray-400"
                disabled={!canJoin}
                onclick={joinRoom}
            >
                {#if loadingAction}
                    <Spinner />
                {:else}
                    {$LL.chat.joinExternalRoom.buttons.join()}
                {/if}
            </button>
        {/if}
    {/snippet}
</Popup>
