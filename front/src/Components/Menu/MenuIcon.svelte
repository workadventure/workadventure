<script lang="typescript">
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

    function showMenu() {
        menuVisiblilityStore.set(!get(menuVisiblilityStore));
    }

    function showChat() {
        chatVisibilityStore.set(true);
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
            on:click|preventDefault={showInvite}
        />
        <img
            src={logoRegister}
            alt={$LL.menu.icon.open.register()}
            class="nes-pointer"
            draggable="false"
            on:dragstart|preventDefault={noDrag}
            on:click|preventDefault={register}
        />
    {:else}
        <img
            src={logoWA}
            alt={$LL.menu.icon.open.menu()}
            class="nes-pointer"
            draggable="false"
            on:dragstart|preventDefault={noDrag}
            on:click|preventDefault={showMenu}
        />
        <img
            src={logoTalk}
            alt={$LL.menu.icon.open.chat()}
            class="nes-pointer"
            draggable="false"
            on:dragstart|preventDefault={noDrag}
            on:click|preventDefault={showChat}
        />
    {/if}
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
            }
        }
    }
</style>
