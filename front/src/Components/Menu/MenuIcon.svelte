<script lang="ts">
    import logoTalk from "../images/logo-message-pixel.png";
    import logoWA from "../images/logo-WA-pixel.png";
    import logoInvite from "../images/logo-invite-pixel.png";
    import logoRegister from "../images/logo-register-pixel.png";
    import { menuVisiblilityStore } from "../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { limitMapStore } from "../../Stores/GameStore";
    import { get } from "svelte/store";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";
    import { showShareLinkMapModalStore } from "../../Stores/ModalStore";
    import LL from "../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { mapEditorModeStore } from "../../Stores/MapEditorStore";

    let miniLogo = gameManager.currentStartedRoom?.miniLogo ?? logoWA;

    function showMenu() {
        menuVisiblilityStore.set(!get(menuVisiblilityStore));
    }

    function showChat() {
        chatVisibilityStore.set(true);
    }

    function toggleMapEditorMode() {
        mapEditorModeStore.switchMode(!$mapEditorModeStore);
    }

    function register() {
        window.open(`${ADMIN_URL}/second-step-register`, "_self");
    }

    function showInvite() {
        showShareLinkMapModalStore.set(true);
    }

    function noDrag() {
        return false;
    }
</script>

<svelte:window />

<main class="menuIcon noselect">
    {#if $limitMapStore}
        <img
            src={logoInvite}
            alt={$LL.menu.icon.open.invite()}
            class="nes-pointer"
            draggable="false"
            on:dragstart|preventDefault={noDrag}
            on:click={() => analyticsClient.openInvite()}
            on:click={showInvite}
        />
        <img
            src={logoRegister}
            alt={$LL.menu.icon.open.register()}
            class="nes-pointer"
            draggable="false"
            on:dragstart|preventDefault={noDrag}
            on:click={() => analyticsClient.openRegister()}
            on:click={register}
        />
    {:else}
        <img
            src={miniLogo}
            alt={$LL.menu.icon.open.menu()}
            class="nes-pointer"
            draggable="false"
            on:dragstart|preventDefault={noDrag}
            on:click={() => analyticsClient.openedMenu()}
            on:click={showMenu}
        />
    {/if}
    <img
        src={logoTalk}
        alt={$LL.menu.icon.open.chat()}
        class="nes-pointer"
        draggable="false"
        on:dragstart|preventDefault={noDrag}
        on:click={() => analyticsClient.openedChat()}
        on:click={showChat}
    />
    <img
        src={logoRegister}
        alt={$LL.menu.icon.open.chat()}
        class="nes-pointer"
        draggable="false"
        hidden={!gameManager.getCurrentGameScene().isMapEditorEnabled()}
        on:dragstart|preventDefault={noDrag}
        on:click={toggleMapEditorMode}
    />
</main>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    .menuIcon {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 20%;
        z-index: 800;
        position: relative;

        img {
            pointer-events: auto;
            width: 60px;
            padding-top: 0;
            margin: 5%;
            image-rendering: pixelated;
        }
    }

    .menuIcon img:hover {
        transform: scale(1.2);
    }

    @include media-breakpoint-up(sm) {
        .menuIcon {
            margin-top: 10%;
            img {
                pointer-events: auto;
                width: 60px;
                padding-top: 0;
                image-rendering: pixelated;
            }
        }
        .menuIcon img:hover {
            transform: scale(1.2);
        }
    }

    @include media-breakpoint-up(md) {
        .menuIcon {
            img {
                width: 50px;
                image-rendering: pixelated;
            }
        }
    }
</style>
