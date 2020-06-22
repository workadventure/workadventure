import {GameScene} from "./GameScene";
import {
    Connection,
    GroupCreatedUpdatedMessageInterface,
    ListMessageUserPositionInterface,
    MessageUserJoined,
    MessageUserMovedInterface,
    MessageUserPositionInterface,
    Point,
    PointInterface, StartMapInterface
} from "../../Connection";
import {SimplePeer} from "../../WebRtc/SimplePeer";
import {AddPlayerInterface} from "./AddPlayerInterface";
import {ReconnectingScene, ReconnectingSceneName} from "../Reconnecting/ReconnectingScene";
import ScenePlugin = Phaser.Scenes.ScenePlugin;
import {Scene} from "phaser";
import Axios from "axios";
import {API_URL} from "../../Enum/EnvironmentVariable";

/*export enum StatusGameManagerEnum {
    IN_PROGRESS = 1,
    CURRENT_USER_CREATED = 2
}*/

export interface HasMovedEvent {
    direction: string;
    moving: boolean;
    x: number;
    y: number;
}

export interface MapObject {
    key: string,
    url: string
}

export class GameManager {
    //status: number;
    //private ConnectionInstance: Connection;
    private currentGameScene: GameScene|null = null;
    private playerName: string;
    SimplePeer : SimplePeer;
    private characterUserSelected: string;

    constructor() {
        //this.status = StatusGameManagerEnum.IN_PROGRESS;
    }

    public storePlayerDetails(name: string, characterUserSelected : string) /*: Promise<Connection>*/ {
        this.playerName = name;
        this.characterUserSelected = characterUserSelected;
        /*this.ConnectionInstance = new Connection(this);
        return this.ConnectionInstance.createConnection(name, characterUserSelected).then((data : Connection) => {
            this.SimplePeer = new SimplePeer(this.ConnectionInstance);
            return data;
        }).catch((err) => {
          throw err;
        });*/
    }

    loadStartMap() : Promise<StartMapInterface> {
        return Axios.get(`${API_URL}/start-map`)
            .then((res) => {
                return res.data;
            }).catch((err) => {
                console.error(err);
                throw err;
            });
    }

    setCurrentGameScene(gameScene: GameScene) {
        this.currentGameScene = gameScene;
    }


    /**
     * Permit to create player in started room
     */
    /*createCurrentPlayer(): void {
        //Get started room send by the backend
        this.currentGameScene.createCurrentPlayer();
        //this.status = StatusGameManagerEnum.CURRENT_USER_CREATED;
    }*/

    getPlayerName(): string {
        return this.playerName;
    }

    getCharacterSelected(): string {
        return this.characterUserSelected;
    }

    loadMap(mapUrl: string, scene: Phaser.Scenes.ScenePlugin, instance: string): string {
        const sceneKey = GameScene.getMapKeyByUrl(mapUrl);

        const gameIndex = scene.getIndex(sceneKey);
        if(gameIndex === -1){
            const game : Phaser.Scene = GameScene.createFromUrl(mapUrl, instance);
            scene.add(sceneKey, game, false);
        }
        return sceneKey;
    }

    private oldSceneKey : string;
    private oldMapUrlFile : string;
    private oldInstance : string;
    private scenePlugin: ScenePlugin;
    private reconnectScene: Scene|null = null;
    switchToDisconnectedScene(): void {
        if (this.currentGameScene === null) {
            return;
        }
        console.log('Switching to disconnected scene');
        this.oldSceneKey = this.currentGameScene.scene.key;
        this.oldMapUrlFile = this.currentGameScene.MapUrlFile;
        this.oldInstance = this.currentGameScene.instance;
        this.currentGameScene.scene.start(ReconnectingSceneName);
        this.reconnectScene = this.currentGameScene.scene.get(ReconnectingSceneName);
        // Let's completely delete an purge the disconnected scene. We will start again from 0.
        this.currentGameScene.scene.remove(this.oldSceneKey);
        this.scenePlugin = this.currentGameScene.scene;
        this.currentGameScene = null;
    }

    private timeoutCallback: NodeJS.Timeout|null = null;
    reconnectToGameScene(lastPositionShared: PointInterface): void {
        if (this.timeoutCallback !== null) {
            console.log('Reconnect called but setTimeout in progress for the reconnection');
            return;
        }
        if (this.reconnectScene === null) {
            console.log('Reconnect called without switchToDisconnectedScene called first');

            if (!this.currentGameScene) {
                console.error('Reconnect called but we are not on a GameScene');
                return;
            }

            // In case we are asked to reconnect even if switchToDisconnectedScene was not triggered (can happen when a laptop goes to sleep)
            this.switchToDisconnectedScene();
            // Wait a bit for scene to load. Otherwise, starting ReconnectingSceneName and then starting GameScene one after the other fails for some reason.
            this.timeoutCallback = setTimeout(() => {
                console.log('Reconnecting to game scene from setTimeout');
                this.timeoutCallback = null;
                this.reconnectToGameScene(lastPositionShared);
            }, 500);
            return;
        }
        console.log('Reconnecting to game scene');
        const game : Phaser.Scene = GameScene.createFromUrl(this.oldMapUrlFile, this.oldInstance);
        this.reconnectScene.scene.add(this.oldSceneKey, game, true, { initPosition: lastPositionShared });
        this.reconnectScene = null;
    }

    private getCurrentGameScene(): GameScene {
        if (this.currentGameScene === null) {
            throw new Error('No current game scene enabled');
        }
        return this.currentGameScene;
    }
}

export const gameManager = new GameManager();
