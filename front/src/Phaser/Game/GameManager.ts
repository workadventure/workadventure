import {GameScene} from "./GameScene";
import {
    Connexion,
    GroupCreatedUpdatedMessageInterface,
    ListMessageUserPositionInterface, MessageUserJoined, MessageUserMovedInterface, MessageUserPositionInterface, Point
} from "../../Connexion";
import {SimplePeerInterface, SimplePeer} from "../../WebRtc/SimplePeer";
import {getMapKeyByUrl} from "../Login/LogincScene";
import ScenePlugin = Phaser.Scenes.ScenePlugin;
import {AddPlayerInterface} from "./AddPlayerInterface";

export enum StatusGameManagerEnum {
    IN_PROGRESS = 1,
    CURRENT_USER_CREATED = 2
}

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
    status: number;
    private ConnexionInstance: Connexion;
    private currentGameScene: GameScene;
    private playerName: string;
    SimplePeer : SimplePeerInterface;
    private characterUserSelected: string;

    constructor() {
        this.status = StatusGameManagerEnum.IN_PROGRESS;
    }

    connect(name: string, characterUserSelected : string) {
        this.playerName = name;
        this.characterUserSelected = characterUserSelected;
        this.ConnexionInstance = new Connexion(this);
        return this.ConnexionInstance.createConnexion(name, characterUserSelected).then((data : any) => {
            this.SimplePeer = new SimplePeer(this.ConnexionInstance);
            return data;
        }).catch((err) => {
          throw err;
        });
    }

    loadMaps(){
        return this.ConnexionInstance.loadMaps().then((data) => {
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
    createCurrentPlayer(): void {
        //Get started room send by the backend
        this.currentGameScene.createCurrentPlayer();
        this.status = StatusGameManagerEnum.CURRENT_USER_CREATED;
    }

    joinRoom(sceneKey: string, startX: number, startY: number, direction: string, moving: boolean){
        this.ConnexionInstance.joinARoom(sceneKey, startX, startY, direction, moving);
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

    /**
     * Share position in game
     * @param ListMessageUserPosition
     * @deprecated
     */
    shareUserPosition(ListMessageUserPosition: ListMessageUserPositionInterface): void {
        if (this.status === StatusGameManagerEnum.IN_PROGRESS) {
            return;
        }
        try {
            this.currentGameScene.shareUserPosition(ListMessageUserPosition.listUsersPosition)
        } catch (e) {
            console.error(e);
        }
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
        if (this.status === StatusGameManagerEnum.IN_PROGRESS) {
            return;
        }
        try {
            this.currentGameScene.shareGroupPosition(groupPositionMessage)
        } catch (e) {
            console.error(e);
        }
    }

    deleteGroup(groupId: string): void {
        if (this.status === StatusGameManagerEnum.IN_PROGRESS) {
            return;
        }
        try {
            this.currentGameScene.deleteGroup(groupId)
        } catch (e) {
            console.error(e);
        }
    }

    getPlayerName(): string {
        return this.playerName;
    }

    getPlayerId(): string {
        return this.ConnexionInstance.userId;
    }

    getCharacterSelected(): string {
        return this.characterUserSelected;
    }

    pushPlayerPosition(event: HasMovedEvent) {
        this.ConnexionInstance.sharePosition(event.x, event.y, event.direction, event.moving);
    }

    loadMap(mapUrl: string, scene: ScenePlugin): string {
        let sceneKey = getMapKeyByUrl(mapUrl);

        let gameIndex = scene.getIndex(sceneKey);
        let game : Phaser.Scene = null;
        if(gameIndex === -1){
            game = new GameScene(sceneKey, mapUrl);
            scene.add(sceneKey, game, false);
        }
        return sceneKey;
    }
}

export const gameManager = new GameManager();
