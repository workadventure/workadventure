<script lang="typescript">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { SelectCompanionScene, SelectCompanionSceneName } from "../../Phaser/Login/SelectCompanionScene";
    import { menuIconVisiblilityStore, menuVisiblilityStore, userIsConnected } from "../../Stores/MenuStore";
    import { selectCompanionSceneVisibleStore } from "../../Stores/SelectCompanionStore";
    import { LoginScene, LoginSceneName } from "../../Phaser/Login/LoginScene";
    import { loginSceneVisibleStore } from "../../Stores/LoginSceneStore";
    import { selectCharacterSceneVisibleStore } from "../../Stores/SelectCharacterStore";
    import { SelectCharacterScene, SelectCharacterSceneName } from "../../Phaser/Login/SelectCharacterScene";
    import { connectionManager } from "../../Connexion/ConnectionManager";
    import { PROFILE_URL } from "../../Enum/EnvironmentVariable";
    import { localUserStore } from "../../Connexion/LocalUserStore";
    import { EnableCameraScene, EnableCameraSceneName } from "../../Phaser/Login/EnableCameraScene";
    import { enableCameraSceneVisibilityStore } from "../../Stores/MediaStore";
    import btnProfileSubMenuCamera from "../images/btn-menu-profile-camera.svg";
    import btnProfileSubMenuIdentity from "../images/btn-menu-profile-identity.svg";
    import btnProfileSubMenuCompanion from "../images/btn-menu-profile-companion.svg";
    import Woka from "../Woka/Woka.svelte";
    import Companion from "../Companion/Companion.svelte";
    import LL from "../../i18n/i18n-svelte";

    function disableMenuStores() {
        menuVisiblilityStore.set(false);
        menuIconVisiblilityStore.set(false);
    }

    function openEditCompanionScene() {
        disableMenuStores();
        selectCompanionSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCompanionSceneName, new SelectCompanionScene());
    }

    function openEditNameScene() {
        disableMenuStores();
        loginSceneVisibleStore.set(true);
        gameManager.leaveGame(LoginSceneName, new LoginScene());
    }

    function openEditSkinScene() {
        disableMenuStores();
        selectCharacterSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCharacterSceneName, new SelectCharacterScene());
    }

    async function logOut() {
        disableMenuStores();
        loginSceneVisibleStore.set(true);
        return connectionManager.logout();
    }

    function getProfileUrl() {
        return PROFILE_URL + `?token=${localUserStore.getAuthToken()}`;
    }

    function openEnableCameraScene() {
        disableMenuStores();
        enableCameraSceneVisibilityStore.showEnableCameraScene();
        gameManager.leaveGame(EnableCameraSceneName, new EnableCameraScene());
    }
</script>

<div class="customize-main">
    <div class="submenu">
        <section>
            <button type="button" class="nes-btn" on:click|preventDefault={openEditNameScene}>
                <img src={btnProfileSubMenuIdentity} alt={$LL.menu.profile.edit.name()} />
                <span class="btn-hover">{$LL.menu.profile.edit.name()}</span>
            </button>
            <button type="button" class="nes-btn" on:click|preventDefault={openEditSkinScene}>
                <Woka userId={-1} placeholderSrc="" width="26px" height="26px" />
                <span class="btn-hover">{$LL.menu.profile.edit.woka()}</span>
            </button>
            <button type="button" class="nes-btn" on:click|preventDefault={openEditCompanionScene}>
                <Companion userId={-1} placeholderSrc={btnProfileSubMenuCompanion} width="26px" height="26px" />
                <span class="btn-hover">{$LL.menu.profile.edit.companion()}</span>
            </button>
            <button type="button" class="nes-btn" on:click|preventDefault={openEnableCameraScene}>
                <img src={btnProfileSubMenuCamera} alt={$LL.menu.profile.edit.camera()} />
                <span class="btn-hover">{$LL.menu.profile.edit.camera()}</span>
            </button>
        </section>
    </div>

    <div class="content">
        {#if $userIsConnected}
            <section>
                {#if PROFILE_URL != undefined}
                    <iframe title="profile" src={getProfileUrl()} />
                {/if}
            </section>
            <section>
                <button type="button" class="nes-btn" on:click|preventDefault={logOut}
                    >{$LL.menu.profile.logout()}</button
                >
            </section>
        {:else}
            <section>
                <a type="button" class="nes-btn" href="/login">{$LL.menu.profile.login()}</a>
            </section>
        {/if}
    </div>
</div>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    div.customize-main {
        width: 100%;
        display: inline-flex;

        div.submenu {
            height: 100%;
            width: 50px;

            button {
                transition: all 0.5s ease;
                text-align: left;
                white-space: nowrap;
                margin-bottom: 10px;
                max-height: 44px;

                img {
                    height: 26px;
                    width: 26px;
                    cursor: pointer;
                }

                span.btn-hover {
                    display: none;
                    font-family: "Press Start 2P";
                }

                &:hover {
                    width: auto;

                    span.btn-hover {
                        display: initial;
                    }
                }
            }
        }

        div.content {
            width: 100%;
            section {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
                margin-bottom: 20px;

                iframe {
                    width: 100%;
                    height: 50vh;
                    border: none;
                }

                button {
                    height: 50px;
                    width: 250px;
                }
            }
        }
    }

    @include media-breakpoint-up(md) {
        div.customize-main.content section button {
            width: 130px;
        }
    }
</style>
