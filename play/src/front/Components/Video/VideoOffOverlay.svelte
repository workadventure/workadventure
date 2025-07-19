<script lang="ts">
    import { LocalPlayer } from "@workadventure/phaser-api";
    import { userStore } from "../../../Stores/UserStore";
    import Woka from "../Woka/Woka.svelte";

    export let player: LocalPlayer;
</script>

<div class="video-off-overlay">
    <div class="avatar">
        <Woka woka={player.woka} />
    </div>
    <div class="message">
        {$userStore.user?.name}, your video is off.
    </div>
</div>

<style lang="scss">
    .video-off-overlay {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        background-color: #202124;
        border-radius: 8px;
    }

    .avatar {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        overflow: hidden;
        margin-bottom: 16px;
    }

    .message {
        font-size: 16px;
        font-weight: 500;
        color: #fff;
    }
</style>
