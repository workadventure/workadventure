<script lang="ts">
    import { get } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { VideoPeer } from "../../../WebRtc/VideoPeer";
    import ScreenShareIcon from "../../Icons/ScreenShareIcon.svelte";
    import RemoteSoundWidget from "./RemoteSoundWidget.svelte";
    import RemoteVideoWidget from "./RemoteVideoWidget.svelte";

    const dispatch = createEventDispatcher();

    export let streamable: Streamable;
    export let isMinified = false;

    function getPlayerWokaPicture(): string {
        try {
            const gameScene = gameManager.getCurrentGameScene();
            const playerWokaPictureStore = [...gameScene.MapPlayersByKey].find(([, player]) =>
                streamable instanceof VideoPeer ? player.userUuid === streamable.player.userUuid : false
            )?.[1].pictureStore;
            return playerWokaPictureStore ? (get(playerWokaPictureStore) as string) : "";
        } catch (e) {
            console.warn("getPlayerWokaPicture error", e);
            return "";
        }
    }

    function hanglerClickVideo() {
        dispatch("click", { streamable });
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    id={`main-${streamable.uniqueId}`}
    class="w-full h-auto max-h-full aspect-video relative flex justify-center items-center z-40 rounded-xl bg-[#373a3e]"
    on:click={hanglerClickVideo}
>
    {#if streamable.uniqueId === "localScreenSharingStream"}
        <ScreenShareIcon />
    {:else}
        <img
            src={getPlayerWokaPicture()}
            class="w-auto h-full max-h-[8rem]"
            class:max-h-[3rem]={isMinified}
            alt="woka user"
        />
    {/if}
    <RemoteSoundWidget {streamable} {isMinified} />
    <RemoteVideoWidget {streamable} />
</div>
