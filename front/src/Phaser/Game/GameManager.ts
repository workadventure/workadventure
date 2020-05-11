import {GameScene, GameSceneInterface} from "./GameScene";
import {
    Connexion,
    GroupCreatedUpdatedMessageInterface,
    ListMessageUserPositionInterface
} from "../../Connexion";
import {SimplePeerInterface, SimplePeer} from "../../WebRtc/SimplePeer";
import {MAP_FILE_URL} from "../../Enum/EnvironmentVariable";
import {getMapKeyByUrl} from "../Login/LogincScene";
import SceneManager = Phaser.Scenes.SceneManager;
import ScenePlugin = Phaser.Scenes.ScenePlugin;

export enum StatusGameManagerEnum {
    IN_PROGRESS = 1,
    CURRENT_USER_CREATED = 2
}

export interface HasMovedEvent {
    direction: string;
    x: number;
    y: number;
    character: string;
}

export interface MapObject {
    key: string,
    url: string
}

export class GameManager {
    status: number;
    private ConnexionInstance: Connexion;
    private currentGameScene: GameSceneInterface;
    private playerName: string;
    SimplePeer : SimplePeerInterface;
    private characterUserSelected: string;

    constructor() {
        this.status = StatusGameManagerEnum.IN_PROGRESS;
    }

    connect(name: string, characterUserSelected : string) {
        this.playerName = name;
        this.characterUserSelected = characterUserSelected;
        this.ConnexionInstance = new Connexion(name, this);
        return this.ConnexionInstance.createConnexion(characterUserSelected).then((data : any) => {
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

    setCurrentGameScene(gameScene: GameSceneInterface) {
        this.currentGameScene = gameScene;
    }


    /**
     * Permit to create player in started room
     */
    createCurrentPlayer(): void {
        //Get started room send by the backend
        this.currentGameScene.createCurrentPlayer(this.ConnexionInstance.userId);
        this.status = StatusGameManagerEnum.CURRENT_USER_CREATED;
    }

    joinRoom(sceneKey : string, character: string){
        this.ConnexionInstance.joinARoom(sceneKey, character);
    }

    /**
     * Share position in game
     * @param ListMessageUserPosition
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

    getCharacterSelected(): string {
        return this.characterUserSelected;
    }

    pushPlayerPosition(event: HasMovedEvent) {
        this.ConnexionInstance.sharePosition(event.x, event.y, event.character, this.currentGameScene.scene.key, event.direction);
    }

    loadMap(mapUrl: string, scene: ScenePlugin): string {
        let sceneKey = getMapKeyByUrl(mapUrl);

        let gameIndex = scene.getIndex(sceneKey);
        let game : Phaser.Scene = null;
        if(gameIndex === -1){
            game = new GameScene(sceneKey, `${MAP_FILE_URL}${mapUrl}`);
            scene.add(sceneKey, game, false);
        }
        return sceneKey;
    }
}

export const gameManager = new GameManager();
