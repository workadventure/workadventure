<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { showModalGlobalComminucationVisibilityStore } from "../../Stores/ModalStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
    import TextToast from "../Toasts/TextToast.svelte";
    import TextGlobalMessage, { type TextGlobalMessageHandle } from "../Menu/TextGlobalMessage.svelte";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import Select from "../Input/Select.svelte";
    import Button from "../UI/Button.svelte";
    import AnnouncementCard from "./AnnouncementCard.svelte";
    import { IconAlertTriangle, IconMapPin, IconMessageShare, IconSend } from "@wa-icons";

    const scene = gameManager.getCurrentGameScene();
    const senderName = gameManager.getPlayerName() ?? "";

    // The named areas of this map, the places an announcement can lead to.
    const places = [...(scene.getGameMapFrontWrapper().getAreas()?.values() ?? [])]
        .map((area) => area.name)
        .filter((name) => name.trim() !== "")
        .filter((name, index, names) => names.indexOf(name) === index)
        .sort((a, b) => a.localeCompare(b));

    let handleSendText: TextGlobalMessageHandle | undefined = $state();
    let broadcastToWorld = $state(false);
    let place = $state("");
    let delta = $state("");
    let confirmingWorld = $state(false);

    let joinUrl = $derived(
        place ? `${window.location.origin}${window.location.pathname}#moveTo=${encodeURIComponent(place)}` : "",
    );
    let previewDate = new Date();

    function close() {
        showModalGlobalComminucationVisibilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") close();
    }

    function setAudience(world: boolean) {
        broadcastToWorld = world;
        confirmingWorld = false;
    }

    function send() {
        if (!delta) return;
        // Beyond the room, one more click: the announcement reaches every room of the world.
        if (broadcastToWorld && !confirmingWorld) {
            confirmingWorld = true;
            return;
        }
        analyticsClient.trackAdminEvent("global_message.text_sent");
        handleSendText?.sendTextMessage(broadcastToWorld, joinUrl);
        toastStore.addToast(TextToast, {
            message: broadcastToWorld
                ? $LL.megaphone.announcement.sentToWorld()
                : $LL.megaphone.announcement.sentToRoom(),
            theme: "success",
        });
        close();
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<div
    class="absolute z-[308] w-full h-full inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
>
    <div
        class="pointer-events-auto bg-contrast/80 backdrop-blur rounded-md max-h-screen overflow-y-auto w-full md:w-[46rem] text-white"
        data-testid="announcement-composer"
    >
        <header class="flex flex-row items-center justify-between p-4 pb-2">
            <h2 class="text-base md:text-xl m-0 flex items-center gap-2">
                <IconMessageShare font-size="22" />
                {$LL.megaphone.announcement.title()}
            </h2>
            <ButtonClose onclick={close} />
        </header>

        <div class="flex flex-col gap-4 p-4 pt-2">
            <!-- The audience first: it is the heaviest choice. -->
            <section>
                <h3 class="text-sm uppercase text-white/60 mb-2">{$LL.megaphone.announcement.audience()}</h3>
                <div class="flex gap-2" role="radiogroup">
                    <button
                        type="button"
                        role="radio"
                        aria-checked={!broadcastToWorld}
                        class="btn btn-sm {broadcastToWorld ? 'btn-ghost btn-light' : 'btn-light'}"
                        onclick={() => setAudience(false)}
                    >
                        {$LL.megaphone.announcement.thisRoom()}
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={broadcastToWorld}
                        class="btn btn-sm {broadcastToWorld ? 'btn-light' : 'btn-ghost btn-light'}"
                        onclick={() => setAudience(true)}
                    >
                        {$LL.megaphone.announcement.wholeWorld()}
                    </button>
                </div>
            </section>

            <section class="h-48">
                <TextGlobalMessage bind:handleSending={handleSendText} onchange={(value) => (delta = value)} />
            </section>

            <section>
                <h3 class="text-sm uppercase text-white/60 mb-2 flex items-center gap-1">
                    <IconMapPin font-size="16" />
                    {$LL.megaphone.announcement.place()}
                </h3>
                <Select bind:value={place} dataTestId="announcement-place">
                    <option value="">{$LL.megaphone.announcement.noPlace()}</option>
                    {#each places as name (name)}
                        <option value={name}>{name}</option>
                    {/each}
                </Select>
                {#if places.length === 0}
                    <p class="text-xs text-white/60 mt-1 mb-0">{$LL.megaphone.announcement.noPlaceOnMap()}</p>
                {/if}
            </section>

            {#if delta}
                <section>
                    <h3 class="text-sm uppercase text-white/60 mb-2">{$LL.megaphone.announcement.preview()}</h3>
                    <AnnouncementCard
                        text={delta}
                        {senderName}
                        senderTextures={[]}
                        wokaSrc={$currentPlayerWokaStore ?? ""}
                        {broadcastToWorld}
                        {joinUrl}
                        receivedAt={previewDate}
                        preview
                    />
                </section>
            {/if}

            <footer class="flex flex-wrap items-center justify-end gap-2">
                {#if confirmingWorld}
                    <p class="m-0 me-auto text-sm flex items-center gap-1 text-warning-400">
                        <IconAlertTriangle font-size="16" />
                        {$LL.megaphone.announcement.confirmWorld()}
                    </p>
                    <Button variant="light" appearance="border" onclick={() => (confirmingWorld = false)}>
                        {$LL.megaphone.announcement.cancel()}
                    </Button>
                {/if}
                <Button variant="secondary" disabled={!delta} onclick={send} dataTestId="announcement-send">
                    {#snippet icon()}<IconSend class="h-4 w-4" />{/snippet}
                    {confirmingWorld
                        ? $LL.megaphone.announcement.confirmSend()
                        : broadcastToWorld
                          ? $LL.megaphone.announcement.sendToWorld()
                          : $LL.megaphone.announcement.sendToRoom()}
                </Button>
            </footer>
        </div>
    </div>
</div>
