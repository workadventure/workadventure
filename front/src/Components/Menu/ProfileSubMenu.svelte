<script lang="typescript">
    import {gameManager} from "../../Phaser/Game/GameManager";
    import {SelectCompanionScene, SelectCompanionSceneName} from "../../Phaser/Login/SelectCompanionScene";
    import {menuIconVisiblilityStore, menuVisiblilityStore, userIsConnected} from "../../Stores/MenuStore";
    import {selectCompanionSceneVisibleStore} from "../../Stores/SelectCompanionStore";
    import {LoginScene, LoginSceneName} from "../../Phaser/Login/LoginScene";
    import {loginSceneVisibleStore} from "../../Stores/LoginSceneStore";
    import {selectCharacterSceneVisibleStore} from "../../Stores/SelectCharacterStore";
    import {SelectCharacterScene, SelectCharacterSceneName} from "../../Phaser/Login/SelectCharacterScene";
    import {connectionManager} from "../../Connexion/ConnectionManager";
    import {PROFILE_URL} from "../../Enum/EnvironmentVariable";
    import {localUserStore} from "../../Connexion/LocalUserStore";
    import {EnableCameraScene, EnableCameraSceneName} from "../../Phaser/Login/EnableCameraScene";
    import {enableCameraSceneVisibilityStore} from "../../Stores/MediaStore";


    function disableMenuStores(){
        menuVisiblilityStore.set(false);
        menuIconVisiblilityStore.set(false);
    }

    function openEditCompanionScene(){
        disableMenuStores();
        selectCompanionSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCompanionSceneName,new SelectCompanionScene());
    }

    function openEditNameScene(){
        disableMenuStores();
        loginSceneVisibleStore.set(true);
        gameManager.leaveGame(LoginSceneName,new LoginScene());
    }

    function openEditSkinScene(){
        disableMenuStores();
        selectCharacterSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCharacterSceneName,new SelectCharacterScene());
    }

    function logOut(){
        disableMenuStores();
        loginSceneVisibleStore.set(true);
        connectionManager.logout();
    }

    function getProfileUrl(){
        return PROFILE_URL + `?token=${localUserStore.getAuthToken()}`;
    }

    function openEnableCameraScene(){
        disableMenuStores();
        enableCameraSceneVisibilityStore.showEnableCameraScene();
        gameManager.leaveGame(EnableCameraSceneName,new EnableCameraScene());
    }
</script>

<div class="customize-main">
    {#if $userIsConnected}
        <section>
            {#if PROFILE_URL != undefined}
                <iframe title="profile" src="{getProfileUrl()}"></iframe>
            {/if}
        </section>
        <section>
            <button type="button" class="nes-btn" on:click|preventDefault={logOut}>Log out</button>
        </section>
    {:else}
        <section>
            <a type="button" class="nes-btn" href="/login">Sign in</a>
        </section>
    {/if}
    <section>
        <button type="button" class="nes-btn" on:click|preventDefault={openEditNameScene}>Edit Name</button>
        <button type="button" class="nes-btn" on:click|preventDefault={openEditSkinScene}>Edit Skin</button>
        <button type="button" class="nes-btn" on:click|preventDefault={openEditCompanionScene}>Edit Companion</button>
    </section>
    <section>
        <button type="button" class="nes-btn" on:click|preventDefault={openEnableCameraScene}>Setup camera</button>
    </section>
</div>

<style lang="scss">
    div.customize-main{
      section {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 20px;

        iframe{
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

    @media only screen and (max-width: 800px) {
      div.customize-main section button {
        width: 130px;
      }
    }
</style>