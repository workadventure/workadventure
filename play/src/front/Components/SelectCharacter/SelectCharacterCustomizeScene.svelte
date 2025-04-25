<script lang="ts">
    import type { Game } from "../../Phaser/Game/Game";
    import { LL } from "../../../i18n/i18n-svelte";
    import { CustomizeScene, CustomizeSceneName } from "../../Phaser/Login/CustomizeScene";

    export let game: Game;

    const customizeScene = game.scene.getScene(CustomizeSceneName) as CustomizeScene;

    function backToPreviousScene() {
        customizeScene.backToPreviousScene();
    }
</script>

<section class="action flex flex-row justify-center">
    <button type="submit" class="outline mr-2 backTodefaultWoka" on:click={backToPreviousScene}
        >{$LL.woka.customWoka.navigation.backTodefaultWoka()}</button
    >
</section>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    section {
        color: #ebeeee;
        height: auto;
        margin: 5px;

        &.action {
            position: absolute;
            margin-top: 90vh;
            top: 0;
            width: 100%;
            text-align: center;
        }
    }

    button {
        pointer-events: auto;
    }
</style>
