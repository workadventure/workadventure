import { loginSceneVisibleIframeStore, loginSceneVisibleStore } from "../../Stores/LoginSceneStore";
import { localUserStore } from "../../Connection/LocalUserStore";
import { connectionManager } from "../../Connection/ConnectionManager";
import { gameManager } from "../Game/GameManager";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { isUserNameTooLong, isUserNameValid } from "../../Connection/LocalUser";
import { NameNotValidError, NameTooLongError } from "../../Exception/NameError";
import { ResizableScene } from "./ResizableScene";
import { SelectCharacterSceneName } from "./SelectCharacterScene";

export const LoginSceneName = "LoginScene";

export class LoginScene extends ResizableScene {
    private name = "";

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
            const redirect = connectionManager.loadOpenIDScreen();
            if (redirect !== null) {
                window.location.assign(redirect.toString());
            }
            loginSceneVisibleIframeStore.set(true);
        }
        loginSceneVisibleStore.set(true);

        if (gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }

    public async login(name: string): Promise<void> {
        if (isUserNameTooLong(name)) {
            throw new NameTooLongError();
        }
        if (!isUserNameValid(name)) {
            throw new NameNotValidError();
        }

        analyticsClient.validationName();
        name = name.trim();
        await connectionManager.saveName(name);
        gameManager.setPlayerName(name);

        this.scene.stop(LoginSceneName);
        gameManager.tryResumingGame(SelectCharacterSceneName);
        this.scene.remove(LoginSceneName);
        loginSceneVisibleStore.set(false);
    }

    update(_time: number, _delta: number): void {}

    public onResize(): void {}
}
