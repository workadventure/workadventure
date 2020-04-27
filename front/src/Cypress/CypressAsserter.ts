import {DEBUG_MODE} from "../Enum/EnvironmentVariable";
import {LogincScene} from "../Phaser/Login/LogincScene";

declare let window:any;

//this class is used to communicate with cypress, our e2e testing client
//Since cypress cannot manipulate canvas, we notified it with console logs
class CypressAsserter {
    gameStarted = false;
    preload = false;
    loginPage = false;
    gameScene = false;
    private loginScene: LogincScene;
    
    constructor() {
        window.cypressAsserter = this
    }
    
    reachedLoginScene(loginScene: LogincScene) {
        this.loginPage = true
        this.loginScene = loginScene
    }
    
    async remoteConnect(): Promise<void> {
        await this.loginScene.loginFromEmail('test@email.com')
        //we implement this timeout to give Phaser the time needed to change scene
        return new Promise((r) => {
            setTimeout(() => r(), 200);
        })
    }

    reachedGameScene() {
        this.loginPage = false;
        this.gameScene = true;
    }
}

export const cypressAsserter = new CypressAsserter()