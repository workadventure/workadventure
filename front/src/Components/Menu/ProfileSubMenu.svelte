<script lang="typescript">
    import {gameManager} from "../../Phaser/Game/GameManager";
    import {SelectCompanionScene, SelectCompanionSceneName} from "../../Phaser/Login/SelectCompanionScene";
    import {menuIconVisiblilityStore, menuVisiblilityStore} from "../../Stores/MenuStore";
    import {selectCompanionSceneVisibleStore} from "../../Stores/SelectCompanionStore";
    import {LoginScene, LoginSceneName} from "../../Phaser/Login/LoginScene";
    import {loginSceneVisibleStore} from "../../Stores/LoginSceneStore";
    import {selectCharacterSceneVisibleStore} from "../../Stores/SelectCharacterStore";
    import {SelectCharacterScene, SelectCharacterSceneName} from "../../Phaser/Login/SelectCharacterScene";
    //import {connectionManager} from "../../Connexion/ConnectionManager";


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

    //TODO: Uncomment when login will be completely developed
    /*function clickLogin() {
        connectionManager.loadOpenIDScreen();
    }*/

</script>

<div class="customize-main">
    <section>
        <button type="button" class="nes-btn" on:click|preventDefault={openEditNameScene}>Edit Name</button>
    </section>
    <section>
        <button type="button" class="nes-btn is-rounded" on:click|preventDefault={openEditSkinScene}>Edit Skin</button>
    </section>
    <section>
        <button type="button" class="nes-btn" on:click|preventDefault={openEditCompanionScene}>Edit Companion</button>
    </section>
<!--    <section>
        <button type="button" class="nes-btn is-primary" on:click|preventDefault={clickLogin}>Login</button>
    </section>-->
</div>

<style lang="scss">
    div.customize-main{
      section {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 20px;

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