import { SelectCharacterSceneName } from "./SelectCharacterScene";
import { ResizableScene } from "./ResizableScene";
import { loginSceneVisibleIframeStore, loginSceneVisibleStore } from "../../Stores/LoginSceneStore";
import { localUserStore } from "../../Connexion/LocalUserStore";
import { connectionManager } from "../../Connexion/ConnectionManager";
import { gameManager } from "../Game/GameManager";
import { analyticsClient } from "../../Administration/AnalyticsClient";

export const LoginSceneName = "LoginScene";

export class LoginScene extends ResizableScene {
    private name: string = "";

    constructor() {
        super({
            key: LoginSceneName,
        });
        this.name = gameManager.getPlayerName() || "";
    }

    preload() {}

    create() {
        loginSceneVisibleIframeStore.set(false);
        //If authentication is mandatory, push authentication iframe
        if (
            localUserStore.getAuthToken() == undefined &&
            gameManager.currentStartedRoom &&
            gameManager.currentStartedRoom.authenticationMandatory
        ) {
            connectionManager.loadOpenIDScreen();
            loginSceneVisibleIframeStore.set(true);
        }
        loginSceneVisibleStore.set(true);
    }

    public login(name: string): void {
        analyticsClient.validationName();

        name = name.trim();
        gameManager.setPlayerName(name);

        this.scene.stop(LoginSceneName);
        gameManager.tryResumingGame(SelectCharacterSceneName);
        this.scene.remove(LoginSceneName);
        loginSceneVisibleStore.set(false);
    }

    update(time: number, delta: number): void {}

    public onResize(): void {}
}
