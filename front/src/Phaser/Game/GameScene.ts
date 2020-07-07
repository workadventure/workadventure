import {GameManager, gameManager, HasMovedEvent} from "./GameManager";
import {
    Connection,
    GroupCreatedUpdatedMessageInterface, MessageUserJoined,
    MessageUserMovedInterface,
    MessageUserPositionInterface, PointInterface, PositionInterface
} from "../../Connection";
import {CurrentGamerInterface, hasMovedEventName, Player} from "../Player/Player";
import { DEBUG_MODE, ZOOM_LEVEL, POSITION_DELAY } from "../../Enum/EnvironmentVariable";
import {
    ITiledMap,
    ITiledMapLayer,
    ITiledMapLayerProperty,
    ITiledTileSet
} from "../Map/ITiledMap";
import {PLAYER_RESOURCES, PlayerResourceDescriptionInterface} from "../Entity/Character";
import Texture = Phaser.Textures.Texture;
import Sprite = Phaser.GameObjects.Sprite;
import CanvasTexture = Phaser.Textures.CanvasTexture;
import {AddPlayerInterface} from "./AddPlayerInterface";
import {PlayerAnimationNames} from "../Player/Animation";
import {PlayerMovement} from "./PlayerMovement";
import {PlayersPositionInterpolator} from "./PlayersPositionInterpolator";
import {RemotePlayer} from "../Entity/RemotePlayer";
import GameObject = Phaser.GameObjects.GameObject;
import { Queue } from 'queue-typescript';
import {SimplePeer} from "../../WebRtc/SimplePeer";
import {ReconnectingSceneName} from "../Reconnecting/ReconnectingScene";
import FILE_LOAD_ERROR = Phaser.Loader.Events.FILE_LOAD_ERROR;
import {FourOFourSceneName} from "../Reconnecting/FourOFourScene";


export enum Textures {
    Player = "male1"
}

export interface GameSceneInitInterface {
    initPosition: PointInterface|null,
    startLayerName: string|undefined
}

interface InitUserPositionEventInterface {
    type: 'InitUserPositionEvent'
    event: MessageUserPositionInterface[]
}

interface AddPlayerEventInterface {
    type: 'AddPlayerEvent'
    event: AddPlayerInterface
}

interface RemovePlayerEventInterface {
    type: 'RemovePlayerEvent'
    userId: string
}

interface UserMovedEventInterface {
    type: 'UserMovedEvent'
    event: MessageUserMovedInterface
}

interface GroupCreatedUpdatedEventInterface {
    type: 'GroupCreatedUpdatedEvent'
    event: GroupCreatedUpdatedMessageInterface
}

interface DeleteGroupEventInterface {
    type: 'DeleteGroupEvent'
    groupId: string
}

export class GameScene extends Phaser.Scene {
    GameManager : GameManager;
    Terrains : Array<Phaser.Tilemaps.Tileset>;
    CurrentPlayer: CurrentGamerInterface;
    MapPlayers : Phaser.Physics.Arcade.Group;
    MapPlayersByKey : Map<string, RemotePlayer> = new Map<string, RemotePlayer>();
    Map: Phaser.Tilemaps.Tilemap;
    Layers : Array<Phaser.Tilemaps.StaticTilemapLayer>;
    Objects : Array<Phaser.Physics.Arcade.Sprite>;
    mapFile: ITiledMap;
    groups: Map<string, Sprite>;
    startX: number;
    startY: number;
    circleTexture: CanvasTexture;
    pendingEvents: Queue<InitUserPositionEventInterface|AddPlayerEventInterface|RemovePlayerEventInterface|UserMovedEventInterface|GroupCreatedUpdatedEventInterface|DeleteGroupEventInterface> = new Queue<InitUserPositionEventInterface|AddPlayerEventInterface|RemovePlayerEventInterface|UserMovedEventInterface|GroupCreatedUpdatedEventInterface|DeleteGroupEventInterface>();
    private initPosition: PositionInterface|null = null;
    private playersPositionInterpolator = new PlayersPositionInterpolator();
    private connection: Connection;
    private simplePeer : SimplePeer;
    private connectionPromise: Promise<Connection>

    MapKey: string;
    MapUrlFile: string;
    RoomId: string;
    instance: string;

    currentTick: number;
    lastSentTick: number; // The last tick at which a position was sent.
    lastMoveEventSent: HasMovedEvent = {
        direction: '',
        moving: false,
        x: -1000,
        y: -1000
    }

    private PositionNextScene: Array<Array<{ key: string, hash: string }>> = new Array<Array<{ key: string, hash: string }>>();
    private startLayerName: string|undefined;

    static createFromUrl(mapUrlFile: string, instance: string, key: string|null = null): GameScene {
        const mapKey = GameScene.getMapKeyByUrl(mapUrlFile);
        if (key === null) {
            key = mapKey;
        }
        return new GameScene(mapKey, mapUrlFile, instance, key);
    }

    constructor(MapKey : string, MapUrlFile: string, instance: string, key: string) {
        super({
            key: key
        });

        this.GameManager = gameManager;
        this.Terrains = [];
        this.groups = new Map<string, Sprite>();
        this.instance = instance;

        this.MapKey = MapKey;
        this.MapUrlFile = MapUrlFile;
        this.RoomId = this.instance + '__' + MapKey;
    }

    //hook preload scene
    preload(): void {
        this.load.on(FILE_LOAD_ERROR, (file: {src: string}) => {
            this.scene.start(FourOFourSceneName, {
                file: file.src
            });
        });
        this.load.on('filecomplete-tilemapJSON-'+this.MapKey, (key: string, type: string, data: unknown) => {
            this.onMapLoad(data);
        });
        //TODO strategy to add access token
        this.load.tilemapTiledJSON(this.MapKey, this.MapUrlFile);
        // If the map has already been loaded as part of another GameScene, the "on load" event will not be triggered.
        // In this case, we check in the cache to see if the map is here and trigger the event manually.
        if (this.cache.tilemap.exists(this.MapKey)) {
            const data = this.cache.tilemap.get(this.MapKey);
            this.onMapLoad(data);
        }

        //add player png
        PLAYER_RESOURCES.forEach((playerResource: PlayerResourceDescriptionInterface) => {
            this.load.spritesheet(
                playerResource.name,
                playerResource.img,
                {frameWidth: 32, frameHeight: 32}
            );
        });

        this.load.bitmapFont('main_font', 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');

        this.connectionPromise = Connection.createConnection(gameManager.getPlayerName(), gameManager.getCharacterSelected()).then((connection : Connection) => {
            this.connection = connection;

            connection.onUserJoins((message: MessageUserJoined) => {
                const userMessage: AddPlayerInterface = {
                    userId: message.userId,
                    character: message.character,
                    name: message.name,
                    position: message.position
                }
                this.addPlayer(userMessage);
            });

            connection.onUserMoved((message: MessageUserMovedInterface) => {
                this.updatePlayerPosition(message);
            });

            connection.onUserLeft((userId: string) => {
                this.removePlayer(userId);
            });

            connection.onGroupUpdatedOrCreated((groupPositionMessage: GroupCreatedUpdatedMessageInterface) => {
                this.shareGroupPosition(groupPositionMessage);
            })

            connection.onGroupDeleted((groupId: string) => {
                try {
                    this.deleteGroup(groupId);
                } catch (e) {
                    console.error(e);
                }
            })

            connection.onServerDisconnected(() => {
                console.log('Player disconnected from server. Reloading scene.');

                this.simplePeer.closeAllConnections();
                this.simplePeer.unregister();

                const key = 'somekey'+Math.round(Math.random()*10000);
                const game : Phaser.Scene = GameScene.createFromUrl(this.MapUrlFile, this.instance, key);
                this.scene.add(key, game, true,
                    {
                        initPosition: {
                            x: this.CurrentPlayer.x,
                            y: this.CurrentPlayer.y
                        }
                    });

                this.scene.stop(this.scene.key);
                this.scene.remove(this.scene.key);
            })

            // When connection is performed, let's connect SimplePeer
            this.simplePeer = new SimplePeer(this.connection);

            this.scene.wake();
            this.scene.sleep(ReconnectingSceneName);

            return connection;
        });
    }

    // FIXME: we need to put a "unknown" instead of a "any" and validate the structure of the JSON we are receiving.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private onMapLoad(data: any): void {
        // Triggered when the map is loaded
        // Load tiles attached to the map recursively
        this.mapFile = data.data;
        const url = this.MapUrlFile.substr(0, this.MapUrlFile.lastIndexOf('/'));
        this.mapFile.tilesets.forEach((tileset) => {
            if (typeof tileset.name === 'undefined' || typeof tileset.image === 'undefined') {
                console.warn("Don't know how to handle tileset ", tileset)
                return;
            }
            //TODO strategy to add access token
            this.load.image(`${url}/${tileset.image}`, `${url}/${tileset.image}`);
        })
    }

    //hook initialisation
    init(initData : GameSceneInitInterface) {
        if (initData.initPosition !== undefined) {
            this.initPosition = initData.initPosition;
        } else if (initData.startLayerName !== undefined) {
            this.startLayerName = initData.startLayerName;
        }
    }

    //hook create scene
    create(): void {
        //initalise map
        this.Map = this.add.tilemap(this.MapKey);
        const mapDirUrl = this.MapUrlFile.substr(0, this.MapUrlFile.lastIndexOf('/'));
        this.mapFile.tilesets.forEach((tileset: ITiledTileSet) => {
            this.Terrains.push(this.Map.addTilesetImage(tileset.name, `${mapDirUrl}/${tileset.image}`, tileset.tilewidth, tileset.tileheight, tileset.margin, tileset.spacing/*, tileset.firstgid*/));
        });

        //permit to set bound collision
        this.physics.world.setBounds(0,0, this.Map.widthInPixels, this.Map.heightInPixels);

        //add layer on map
        this.Layers = new Array<Phaser.Tilemaps.StaticTilemapLayer>();
        let depth = -2;
        for (const layer of this.mapFile.layers) {
            if (layer.type === 'tilelayer') {
                this.addLayer(this.Map.createStaticLayer(layer.name, this.Terrains, 0, 0).setDepth(depth));
            }
            if (layer.type === 'tilelayer' && this.getExitSceneUrl(layer) !== undefined) {
                this.loadNextGame(layer, this.mapFile.width, this.mapFile.tilewidth, this.mapFile.tileheight);
            }
            if (layer.type === 'objectgroup' && layer.name === 'floorLayer') {
                depth = 10000;
            }
        }
        if (depth === -2) {
            throw new Error('Your map MUST contain a layer of type "objectgroup" whose name is "floorLayer" that represents the layer characters are drawn at.');
        }

        // If there is an init position passed
        if (this.initPosition !== null) {
            this.startX = this.initPosition.x;
            this.startY = this.initPosition.y;
        } else {
            // Now, let's find the start layer
            if (this.startLayerName) {
                for (const layer of this.mapFile.layers) {
                    if (this.startLayerName === layer.name && layer.type === 'tilelayer' && this.isStartLayer(layer)) {
                        const startPosition = this.startUser(layer);
                        this.startX = startPosition.x;
                        this.startY = startPosition.y;
                    }
                }
            }
            if (this.startX === undefined) {
                // If we have no start layer specified or if the hash passed does not exist, let's go with the default start position.
                for (const layer of this.mapFile.layers) {
                    if (layer.type === 'tilelayer' && layer.name === "start") {
                        const startPosition = this.startUser(layer);
                        this.startX = startPosition.x;
                        this.startY = startPosition.y;
                    }
                }
            }
        }
        // Still no start position? Something is wrong with the map, we need a "start" layer.
        if (this.startX === undefined) {
            console.warn('This map is missing a layer named "start" that contains the available default start positions.');
            // Let's start in the middle of the map
            this.startX = this.mapFile.width * 16;
            this.startY = this.mapFile.height * 16;
        }

        //add entities
        this.Objects = new Array<Phaser.Physics.Arcade.Sprite>();

        //init event click
        this.EventToClickOnTile();

        //initialise list of other player
        this.MapPlayers = this.physics.add.group({ immovable: true });

        //notify game manager can to create currentUser in map
        this.createCurrentPlayer();

        //initialise camera
        this.initCamera();


        // Let's generate the circle for the group delimiter
        const circleElement = Object.values(this.textures.list).find((object: Texture) => object.key === 'circleSprite');
        if(circleElement) {
            this.textures.remove('circleSprite');
        }
        this.circleTexture = this.textures.createCanvas('circleSprite', 96, 96);
        const context = this.circleTexture.context;
        context.beginPath();
        context.arc(48, 48, 48, 0, 2 * Math.PI, false);
        // context.lineWidth = 5;
        context.strokeStyle = '#ffffff';
        context.stroke();
        this.circleTexture.refresh();

        // Let's alter browser history
        const url = new URL(this.MapUrlFile);
        let path = '/_/'+this.instance+'/'+url.host+url.pathname;
        if (this.startLayerName) {
            path += '#'+this.startLayerName;
        }
        window.history.pushState({}, 'WorkAdventure', path);

        // Let's pause the scene if the connection is not established yet
        if (this.connection === undefined) {
            // Let's wait 0.5 seconds before printing the "connecting" screen to avoid blinking
            setTimeout(() => {
                if (this.connection === undefined) {
                    this.scene.sleep();
                    this.scene.launch(ReconnectingSceneName);
                }
            }, 500);
        }
    }

    private getExitSceneUrl(layer: ITiledMapLayer): string|undefined {
        return this.getProperty(layer, "exitSceneUrl") as string|undefined;
    }

    private getExitSceneInstance(layer: ITiledMapLayer): string|undefined {
        return this.getProperty(layer, "exitInstance") as string|undefined;
    }

    private isStartLayer(layer: ITiledMapLayer): boolean {
        return this.getProperty(layer, "startLayer") == true;
    }

    private getProperty(layer: ITiledMapLayer, name: string): string|boolean|number|undefined {
        const properties = layer.properties;
        if (!properties) {
            return undefined;
        }
        const obj = properties.find((property: ITiledMapLayerProperty) => property.name === name);
        if (obj === undefined) {
            return undefined;
        }
        return obj.value;
    }

    /**
     *
     * @param layer
     * @param mapWidth
     * @param tileWidth
     * @param tileHeight
     */
    private loadNextGame(layer: ITiledMapLayer, mapWidth: number, tileWidth: number, tileHeight: number){
        const exitSceneUrl = this.getExitSceneUrl(layer);
        if (exitSceneUrl === undefined) {
            throw new Error('Layer is not an exit scene layer.');
        }
        let instance = this.getExitSceneInstance(layer);
        if (instance === undefined) {
            instance = this.instance;
        }

        // TODO: eventually compute a relative URL
        const absoluteExitSceneUrl = new URL(exitSceneUrl, this.MapUrlFile).href;
        const exitSceneKey = gameManager.loadMap(absoluteExitSceneUrl, this.scene, instance);

        const tiles : number[] = layer.data as number[];
        for (let key=0; key < tiles.length; key++) {
            const objectKey = tiles[key];
            if(objectKey === 0){
                continue;
            }
            //key + 1 because the start x = 0;
            const y : number = parseInt(((key + 1) / mapWidth).toString());
            const x : number = key - (y * mapWidth);

            let hash = new URL(exitSceneUrl, this.MapUrlFile).hash;
            if (hash) {
                hash = hash.substr(1);
            }

            //push and save switching case
            if (this.PositionNextScene[y] === undefined) {
                this.PositionNextScene[y] = new Array<{key: string, hash: string}>();
            }
            this.PositionNextScene[y][x] = {
                key: exitSceneKey,
                hash
            }
        }
    }

    /**
     * @param layer
     */
    private startUser(layer: ITiledMapLayer): PositionInterface {
        const tiles = layer.data;
        if (typeof(tiles) === 'string') {
            throw new Error('The content of a JSON map must be filled as a JSON array, not as a string');
        }
        const possibleStartPositions : PositionInterface[]  = [];
        tiles.forEach((objectKey : number, key: number) => {
            if(objectKey === 0){
                return;
            }
            const y = Math.floor(key / layer.width);
            const x = key % layer.width;

            possibleStartPositions.push({x: x*32, y: y*32});
        });
        // Get a value at random amongst allowed values
        if (possibleStartPositions.length === 0) {
            console.warn('The start layer "'+layer.name+'" for this map is empty.');
            return {
                x: 0,
                y: 0
            };
        }
        // Choose one of the available start positions at random amongst the list of available start positions.
        return possibleStartPositions[Math.floor(Math.random() * possibleStartPositions.length)];
    }

    //todo: in a dedicated class/function?
    initCamera() {
        this.cameras.main.setBounds(0,0, this.Map.widthInPixels, this.Map.heightInPixels);
        this.cameras.main.startFollow(this.CurrentPlayer);
        this.cameras.main.setZoom(ZOOM_LEVEL);
    }

    addLayer(Layer : Phaser.Tilemaps.StaticTilemapLayer){
        this.Layers.push(Layer);
    }

    createCollisionWithPlayer() {
        //add collision layer
        this.Layers.forEach((Layer: Phaser.Tilemaps.StaticTilemapLayer) => {
            this.physics.add.collider(this.CurrentPlayer, Layer, (object1: GameObject, object2: GameObject) => {
                //this.CurrentPlayer.say("Collision with layer : "+ (object2 as Tile).layer.name)
            });
            Layer.setCollisionByProperty({collides: true});
            if (DEBUG_MODE) {
                //debug code to see the collision hitbox of the object in the top layer
                Layer.renderDebug(this.add.graphics(), {
                    tileColor: null, //non-colliding tiles
                    collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200), // Colliding tiles,
                    faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Colliding face edges
                });
            }
        });
    }

    createCollisionObject(){
        /*this.Objects.forEach((Object : Phaser.Physics.Arcade.Sprite) => {
            this.physics.add.collider(this.CurrentPlayer, Object, (object1, object2) => {
                this.CurrentPlayer.say("Collision with object : " + (object2 as Phaser.Physics.Arcade.Sprite).texture.key)
            });
        })*/
    }

    createCurrentPlayer(){
        //initialise player
        //TODO create animation moving between exit and start
        this.CurrentPlayer = new Player(
            this,
            this.startX,
            this.startY,
            this.GameManager.getPlayerName(),
            this.GameManager.getCharacterSelected(),
            PlayerAnimationNames.WalkDown,
            false
        );

        //create collision
        this.createCollisionWithPlayer();
        this.createCollisionObject();

        //join room
        this.connectionPromise.then((connection: Connection) => {
            connection.joinARoom(this.RoomId, this.startX, this.startY, PlayerAnimationNames.WalkDown, false).then((userPositions: MessageUserPositionInterface[]) => {
                this.initUsersPosition(userPositions);
            });

            //listen event to share position of user
            this.CurrentPlayer.on(hasMovedEventName, this.pushPlayerPosition.bind(this))
        });
    }

    pushPlayerPosition(event: HasMovedEvent) {
        if (this.lastMoveEventSent === event) {
            return;
        }

        // If the player is not moving, let's send the info right now.
        if (event.moving === false) {
            this.doPushPlayerPosition(event);
            return;
        }

        // If the player is moving, and if it changed direction, let's send an event
        if (event.direction !== this.lastMoveEventSent.direction) {
            this.doPushPlayerPosition(event);
            return;
        }

        // If more than 200ms happened since last event sent
        if (this.currentTick - this.lastSentTick >= POSITION_DELAY) {
            this.doPushPlayerPosition(event);
            return;
        }

        // Otherwise, do nothing.
    }

    private doPushPlayerPosition(event: HasMovedEvent): void {
        this.lastMoveEventSent = event;
        this.lastSentTick = this.currentTick;
        this.connection.sharePosition(event.x, event.y, event.direction, event.moving);
    }

    EventToClickOnTile(){
        // debug code to get a tile properties by clicking on it
        /*this.input.on("pointerdown", (pointer: Phaser.Input.Pointer)=>{
            //pixel position toz tile position
            const tile = this.Map.getTileAt(this.Map.worldToTileX(pointer.worldX), this.Map.worldToTileY(pointer.worldY));
            if(tile){
                this.CurrentPlayer.say("Your touch " + tile.layer.name);
            }
        });*/
    }

    /**
     * @param time
     * @param delta The delta time in ms since the last frame. This is a smoothed and capped value based on the FPS rate.
     */
    update(time: number, delta: number) : void {
        this.currentTick = time;
        this.CurrentPlayer.moveUser(delta);

        // Let's handle all events
        while (this.pendingEvents.length !== 0) {
            const event = this.pendingEvents.dequeue();
            switch (event.type) {
                case "InitUserPositionEvent":
                    this.doInitUsersPosition(event.event);
                    break;
                case "AddPlayerEvent":
                    this.doAddPlayer(event.event);
                    break;
                case "RemovePlayerEvent":
                    this.doRemovePlayer(event.userId);
                    break;
                case "UserMovedEvent":
                    this.doUpdatePlayerPosition(event.event);
                    break;
                case "GroupCreatedUpdatedEvent":
                    this.doShareGroupPosition(event.event);
                    break;
                case "DeleteGroupEvent":
                    this.doDeleteGroup(event.groupId);
                    break;
            }
        }

        // Let's move all users
        const updatedPlayersPositions = this.playersPositionInterpolator.getUpdatedPositions(time);
        updatedPlayersPositions.forEach((moveEvent: HasMovedEvent, userId: string) => {
            const player : RemotePlayer | undefined = this.MapPlayersByKey.get(userId);
            if (player === undefined) {
                throw new Error('Cannot find player with ID "' + userId +'"');
            }
            player.updatePosition(moveEvent);
        });

        const nextSceneKey = this.checkToExit();
        if(nextSceneKey){
            // We are completely destroying the current scene to avoid using a half-backed instance when coming back to the same map.
            this.connection.closeConnection();
            this.simplePeer.unregister();
            this.scene.stop();
            this.scene.remove(this.scene.key);
            this.scene.start(nextSceneKey.key, {
                startLayerName: nextSceneKey.hash
            });
        }
    }

    /**
     *
     */
    checkToExit(): {key: string, hash: string} | null  {
        const x = Math.floor(this.CurrentPlayer.x / 32);
        const y = Math.floor(this.CurrentPlayer.y / 32);

        if (this.PositionNextScene[y] !== undefined && this.PositionNextScene[y][x] !== undefined) {
            return this.PositionNextScene[y][x];
        } else {
            return null;
        }
    }

    /**
     * Called by the connexion when the full list of user position is received.
     */
    private initUsersPosition(usersPosition: MessageUserPositionInterface[]): void {
        this.pendingEvents.enqueue({
            type: "InitUserPositionEvent",
            event: usersPosition
        });

    }

    /**
     * Put all the players on the map on map load.
     */
    private doInitUsersPosition(usersPosition: MessageUserPositionInterface[]): void {
        const currentPlayerId = this.connection.getUserId();

        // clean map
        this.MapPlayersByKey.forEach((player: RemotePlayer) => {
            player.destroy();
            this.MapPlayers.remove(player);
        });
        this.MapPlayersByKey = new Map<string, RemotePlayer>();

        // load map
        usersPosition.forEach((userPosition : MessageUserPositionInterface) => {
            if(userPosition.userId === currentPlayerId){
                return;
            }
            this.addPlayer(userPosition);
        });
    }

    /**
     * Called by the connexion when a new player arrives on a map
     */
    public addPlayer(addPlayerData : AddPlayerInterface) : void {
        this.pendingEvents.enqueue({
            type: "AddPlayerEvent",
            event: addPlayerData
        });
    }

    /**
     * Create new player
     */
    private doAddPlayer(addPlayerData : AddPlayerInterface) : void {
        //check if exist player, if exist, move position
        if(this.MapPlayersByKey.has(addPlayerData.userId)){
            this.updatePlayerPosition({
                userId: addPlayerData.userId,
                position: addPlayerData.position
            });
            return;
        }
        //initialise player
        const player = new RemotePlayer(
            addPlayerData.userId,
            this,
            addPlayerData.position.x,
            addPlayerData.position.y,
            addPlayerData.name,
            addPlayerData.character,
            addPlayerData.position.direction,
            addPlayerData.position.moving
        );
        this.MapPlayers.add(player);
        this.MapPlayersByKey.set(player.userId, player);
        player.updatePosition(addPlayerData.position);

        //init collision
        /*this.physics.add.collider(this.CurrentPlayer, player, (CurrentPlayer: CurrentGamerInterface, MapPlayer: GamerInterface) => {
            CurrentPlayer.say("Hello, how are you ? ");
        });*/
    }

    /**
     * Called by the connexion when a player is removed from the map
     */
    public removePlayer(userId: string) {
        this.pendingEvents.enqueue({
            type: "RemovePlayerEvent",
            userId
        });
    }

    private doRemovePlayer(userId: string) {
        const player = this.MapPlayersByKey.get(userId);
        if (player === undefined) {
            console.error('Cannot find user with id ', userId);
        } else {
            player.destroy();
            this.MapPlayers.remove(player);
        }
        this.MapPlayersByKey.delete(userId);
        this.playersPositionInterpolator.removePlayer(userId);
    }

    public updatePlayerPosition(message: MessageUserMovedInterface): void {
        this.pendingEvents.enqueue({
            type: "UserMovedEvent",
            event: message
        });
    }

    private doUpdatePlayerPosition(message: MessageUserMovedInterface): void {
        const player : RemotePlayer | undefined = this.MapPlayersByKey.get(message.userId);
        if (player === undefined) {
            //throw new Error('Cannot find player with ID "' + message.userId +'"');
            console.error('Cannot update position of player with ID "' + message.userId +'": player not found');
            return;
        }

        // We do not update the player position directly (because it is sent only every 200ms).
        // Instead we use the PlayersPositionInterpolator that will do a smooth animation over the next 200ms.
        const playerMovement = new PlayerMovement({ x: player.x, y: player.y }, this.currentTick, message.position, this.currentTick + POSITION_DELAY);
        this.playersPositionInterpolator.updatePlayerPosition(player.userId, playerMovement);
    }

    public shareGroupPosition(groupPositionMessage: GroupCreatedUpdatedMessageInterface) {
        this.pendingEvents.enqueue({
            type: "GroupCreatedUpdatedEvent",
            event: groupPositionMessage
        });
    }

    private doShareGroupPosition(groupPositionMessage: GroupCreatedUpdatedMessageInterface) {
        const groupId = groupPositionMessage.groupId;

        const group = this.groups.get(groupId);
        if (group !== undefined) {
            group.setPosition(Math.round(groupPositionMessage.position.x), Math.round(groupPositionMessage.position.y));
        } else {
            // TODO: circle radius should not be hard stored
            const sprite = new Sprite(
                this,
                Math.round(groupPositionMessage.position.x),
                Math.round(groupPositionMessage.position.y),
                'circleSprite');
            sprite.setDisplayOrigin(48, 48);
            this.add.existing(sprite);
            this.groups.set(groupId, sprite);
        }
    }

    deleteGroup(groupId: string): void {
        this.pendingEvents.enqueue({
            type: "DeleteGroupEvent",
            groupId
        });
    }

    doDeleteGroup(groupId: string): void {
        const group = this.groups.get(groupId);
        if(!group){
            return;
        }
        group.destroy();
        this.groups.delete(groupId);
    }

    public static getMapKeyByUrl(mapUrlStart: string) : string {
        // FIXME: the key should be computed from the full URL of the map.
        const startPos = mapUrlStart.indexOf('://')+3;
        const endPos = mapUrlStart.indexOf(".json");
        return mapUrlStart.substring(startPos, endPos);
    }
}
