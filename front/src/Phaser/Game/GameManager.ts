import {GameScene} from "./GameScene";
import {
    Connection,
    GroupCreatedUpdatedMessageInterface,
    ListMessageUserPositionInterface,
    MessageUserJoined,
    MessageUserMovedInterface,
    MessageUserPositionInterface,
    Point,
    PointInterface
} from "../../Connection";
import {SimplePeer} from "../../WebRtc/SimplePeer";
import {AddPlayerInterface} from "./AddPlayerInterface";
import {ReconnectingSceneName} from "../Reconnecting/ReconnectingScene";

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
    private ConnectionInstance: Connection;
    private currentGameScene: GameScene;
    private playerName: string;
    SimplePeer : SimplePeer;
    private characterUserSelected: string;

    constructor() {
        //this.status = StatusGameManagerEnum.IN_PROGRESS;
    }

    connect(name: string, characterUserSelected : string) {
        this.playerName = name;
        this.characterUserSelected = characterUserSelected;
        this.ConnectionInstance = new Connection(this);
        return this.ConnectionInstance.createConnection(name, characterUserSelected).then((data : any) => {
            this.SimplePeer = new SimplePeer(this.ConnectionInstance);
            return data;
        }).catch((err) => {
          throw err;
        });
    }

    loadStartMap(){
        return this.ConnectionInstance.loadStartMap().then((data) => {
            return data;
        }).catch((err) => {
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

    joinRoom(sceneKey: string, startX: number, startY: number, direction: string, moving: boolean){
        this.ConnectionInstance.joinARoom(sceneKey, startX, startY, direction, moving);
    }

    onUserJoins(message: MessageUserJoined): void {
        let userMessage: AddPlayerInterface = {
            userId: message.userId,
            character: message.character,
            name: message.name,
            position: message.position
        }
        this.currentGameScene.addPlayer(userMessage);
    }

    onUserMoved(message: MessageUserMovedInterface): void {
        this.currentGameScene.updatePlayerPosition(message);
    }

    onUserLeft(userId: string): void {
        this.currentGameScene.removePlayer(userId);
    }

    initUsersPosition(usersPosition: MessageUserPositionInterface[]): void {
        // Shall we wait for room to be loaded?
        /*if (this.status === StatusGameManagerEnum.IN_PROGRESS) {
            return;
        }*/
        try {
            this.currentGameScene.initUsersPosition(usersPosition)
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Share group position in game
     */
    shareGroupPosition(groupPositionMessage: GroupCreatedUpdatedMessageInterface): void {
        /*if (this.status === StatusGameManagerEnum.IN_PROGRESS) {
            return;
        }*/
        try {
            this.currentGameScene.shareGroupPosition(groupPositionMessage)
        } catch (e) {
            console.error(e);
        }
    }

    deleteGroup(groupId: string): void {
        /*if (this.status === StatusGameManagerEnum.IN_PROGRESS) {
            return;
        }*/
        try {
            this.currentGameScene.deleteGroup(groupId)
        } catch (e) {
            console.error(e);
        }
    }

    getPlayerName(): string {
        return this.playerName;
    }

    getPlayerId(): string|null {
        return this.ConnectionInstance.userId;
    }

    getCharacterSelected(): string {
        return this.characterUserSelected;
    }

    pushPlayerPosition(event: HasMovedEvent) {
        this.ConnectionInstance.sharePosition(event.x, event.y, event.direction, event.moving);
    }

    loadMap(mapUrl: string, scene: Phaser.Scenes.ScenePlugin, instance: string): string {
        let sceneKey = GameScene.getMapKeyByUrl(mapUrl);

        let gameIndex = scene.getIndex(sceneKey);
        if(gameIndex === -1){
            let game : Phaser.Scene = GameScene.createFromUrl(mapUrl, instance);
            scene.add(sceneKey, game, false);
        }
        return sceneKey;
    }

    private oldSceneKey : string;
    switchToDisconnectedScene(): void {
        this.oldSceneKey = this.currentGameScene.scene.key;
        this.currentGameScene.scene.start(ReconnectingSceneName);
    }

    reconnectToGameScene(lastPositionShared: PointInterface) {
        this.currentGameScene.scene.start(this.oldSceneKey, { initPosition: lastPositionShared });
    }
}

export const gameManager = new GameManager();
