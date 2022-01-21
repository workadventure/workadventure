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
</script>

<svelte:window />

<main class="menuIcon">
    {#if $limitMapStore}
        <img
            src={logoInvite}
            alt={$LL.menu.icon.open.invite()}
            class="nes-pointer"
            on:click|preventDefault={showInvite}
        />
        <img
            src={logoRegister}
            alt={$LL.menu.icon.open.register()}
            class="nes-pointer"
            on:click|preventDefault={register}
        />
    {:else}
        <img src={logoWA} alt={$LL.menu.icon.open.menu()} class="nes-pointer" on:click|preventDefault={showMenu} />
        <img src={logoTalk} alt={$LL.menu.icon.open.chat()} class="nes-pointer" on:click|preventDefault={showChat} />
    {/if}
</main>

<style lang="scss">
    .menuIcon {
        display: inline-grid;
        z-index: 90;
        position: relative;
        margin: 25px;
        img {
            pointer-events: auto;
            width: 60px;
            padding-top: 0;
            margin: 3px;
            image-rendering: pixelated;
        }
    }
    .menuIcon img:hover {
        transform: scale(1.2);
    }
    @media only screen and (max-width: 800px), only screen and (max-height: 800px) {
        .menuIcon {
            display: inline-grid;
            z-index: 90;
            position: relative;
            margin: 25px;
            img {
                pointer-events: auto;
                width: 60px;
                padding-top: 0;
                margin: 3px;
            }
        }
        .menuIcon img:hover {
            transform: scale(1.2);
        }
        @media only screen and (max-width: 800px), only screen and (max-height: 800px) {
            .menuIcon {
                margin: 3px;
                img {
                    width: 50px;
                }
            }
        }
    }
</style>
