<script lang="ts">
    import { get } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { VideoPeer } from "../../../WebRtc/VideoPeer";
    import screenshareOn from "../../images/screenshare-on.png";
    import RemoteSoundWidget from "./RemoteSoundWidget.svelte";
    import RemoteVideoWidget from "./RemoteVideoWidget.svelte";

    const dispatch = createEventDispatcher();

    export let streamable: Streamable;
    export let isMinified = false;

    function getPlayerWokaPicture(): string {
        try {
            const gameScene = gameManager.getCurrentGameScene();
            const playerWokaPictureStore = [...gameScene.MapPlayersByKey].find(
                ([, player]) => player.userUuid === (streamable as VideoPeer).player.userUuid
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
    class="tw-w-full tw-h-auto tw-max-h-full tw-aspect-video tw-relative tw-flex tw-justify-center tw-items-center tw-z-40 tw-rounded-xl tw-bg-[#373a3e]"
    on:click={hanglerClickVideo}
>
    {#if streamable.uniqueId === "localScreenSharingStream"}
        <img
            src={screenshareOn}
            class="tw-w-auto tw-h-full tw-max-h-[2rem]"
            class:tw-max-h-[1rem]={isMinified}
            alt="woka user"
        />
    {:else}
        <img
            src={getPlayerWokaPicture()}
            class="tw-w-auto tw-h-full tw-max-h-[8rem]"
            class:tw-max-h-[3rem]={isMinified}
            alt="woka user"
        />
    {/if}
    <RemoteSoundWidget {streamable} {isMinified} />
    <RemoteVideoWidget {streamable} />
</div>
