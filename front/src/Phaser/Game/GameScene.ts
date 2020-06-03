import {GameManager, gameManager, HasMovedEvent} from "./GameManager";
import {
    GroupCreatedUpdatedMessageInterface,
    MessageUserMovedInterface,
    MessageUserPositionInterface, PointInterface, PositionInterface
} from "../../Connection";
import {CurrentGamerInterface, GamerInterface, hasMovedEventName, Player} from "../Player/Player";
import { DEBUG_MODE, ZOOM_LEVEL, POSITION_DELAY } from "../../Enum/EnvironmentVariable";
import {ITiledMap, ITiledMapLayer, ITiledTileSet} from "../Map/ITiledMap";
import {PLAYER_RESOURCES} from "../Entity/PlayableCaracter";
import Texture = Phaser.Textures.Texture;
import Sprite = Phaser.GameObjects.Sprite;
import CanvasTexture = Phaser.Textures.CanvasTexture;
import {AddPlayerInterface} from "./AddPlayerInterface";
import {PlayerAnimationNames} from "../Player/Animation";
import {PlayerMovement} from "./PlayerMovement";
import {PlayersPositionInterpolator} from "./PlayersPositionInterpolator";

export enum Textures {
    Player = "male1"
}

interface GameSceneInitInterface {
    initPosition: PointInterface|null
}

export class GameScene extends Phaser.Scene {
    GameManager : GameManager;
    Terrains : Array<Phaser.Tilemaps.Tileset>;
    CurrentPlayer: CurrentGamerInterface;
    MapPlayers : Phaser.Physics.Arcade.Group;
    MapPlayersByKey : Map<string, GamerInterface> = new Map<string, GamerInterface>();
    Map: Phaser.Tilemaps.Tilemap|null = null;
    Layers : Array<Phaser.Tilemaps.StaticTilemapLayer>;
    Objects : Array<Phaser.Physics.Arcade.Sprite>;
    mapFile: ITiledMap|null;
    groups: Map<string, Sprite>;
    startX = 704;// 22 case
    startY = 32; // 1 case
    circleTexture: CanvasTexture;
    initPosition: PositionInterface|null = null;
    private playersPositionInterpolator = new PlayersPositionInterpolator();

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

    PositionNextScene: Array<any> = new Array<any>();

    static createFromUrl(mapUrlFile: string, instance: string): GameScene {
        let key = GameScene.getMapKeyByUrl(mapUrlFile);
        return new GameScene(key, mapUrlFile, instance);
    }

    constructor(MapKey : string, MapUrlFile: string, instance: string) {
        super({
            key: MapKey
        });

        this.GameManager = gameManager;
        this.Terrains = [];
        this.groups = new Map<string, Sprite>();
        this.instance = instance;

        this.MapKey = MapKey;
        this.MapUrlFile = MapUrlFile;
        this.RoomId = this.instance + '__' + this.MapKey;
    }

    //hook preload scene
    preload(): void {
        this.GameManager.setCurrentGameScene(this);
        this.load.on('filecomplete-tilemapJSON-'+this.MapKey, (key: string, type: string, data: any) => {
            this.onMapLoad(data);
        });
        //TODO strategy to add access token
        this.load.tilemapTiledJSON(this.MapKey, this.MapUrlFile);
        // If the map has already been loaded as part of another GameScene, the "on load" event will not be triggered.
        // In this case, we check in the cache to see if the map is here and trigger the event manually.
        if (this.cache.tilemap.exists(this.MapKey)) {
            let data = this.cache.tilemap.get(this.MapKey);
            this.onMapLoad(data);
        }

        //add player png
        PLAYER_RESOURCES.forEach((playerResource: any) => {
            this.load.spritesheet(
                playerResource.name,
                playerResource.img,
                {frameWidth: 32, frameHeight: 32}
            );
        });

        this.load.bitmapFont('main_font', 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
    }

    private onMapLoad(data: any): void {
        // Triggered when the map is loaded
        // Load tiles attached to the map recursively
        this.mapFile = data.data;
        let url = this.MapUrlFile.substr(0, this.MapUrlFile.lastIndexOf('/'));
        this.mapFile.tilesets.forEach((tileset) => {
            if (typeof tileset.name === 'undefined' || typeof tileset.image === 'undefined') {
                console.warn("Don't know how to handle tileset ", tileset)
                return;
            }
            //TODO strategy to add access token
            this.load.image(tileset.name, `${url}/${tileset.image}`);
        })
    }

    //hook initialisation
    init(initData : GameSceneInitInterface) {
        this.initPosition = initData.initPosition;
    }

    //hook create scene
    create(): void {
        //initalise map
        this.Map = this.add.tilemap(this.MapKey);
        this.mapFile.tilesets.forEach((tileset: ITiledTileSet) => {
            this.Terrains.push(this.Map.addTilesetImage(tileset.name, tileset.name));
        });

        //permit to set bound collision
        this.physics.world.setBounds(0,0, this.Map.widthInPixels, this.Map.heightInPixels);

        //add layer on map
        this.Layers = new Array<Phaser.Tilemaps.StaticTilemapLayer>();
        let depth = -2;
        this.mapFile.layers.forEach((layer : ITiledMapLayer) => {
            if (layer.type === 'tilelayer') {
                this.addLayer(this.Map.createStaticLayer(layer.name, this.Terrains, 0, 0).setDepth(depth));
            }
            if (layer.type === 'tilelayer' && this.getExitSceneUrl(layer) !== undefined) {
                this.loadNextGame(layer, this.mapFile.width, this.mapFile.tilewidth, this.mapFile.tileheight);
            }
            if (layer.type === 'tilelayer' && layer.name === "start") {
                let startPosition = this.startUser(layer);
                this.startX = startPosition.x;
                this.startY = startPosition.y;
            }
            if (layer.type === 'objectgroup' && layer.name === 'floorLayer') {
                depth = 10000;
            }
        });

        if (depth === -2) {
            throw new Error('Your map MUST contain a layer of type "objectgroup" whose name is "floorLayer" that represents the layer characters are drawn at.');
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
        let circleElement = Object.values(this.textures.list).find((object: Texture) => object.key === 'circleSprite');
        if(circleElement) {
            this.textures.remove('circleSprite');
        }
        this.circleTexture = this.textures.createCanvas('circleSprite', 96, 96);
        let context = this.circleTexture.context;
        context.beginPath();
        context.arc(48, 48, 48, 0, 2 * Math.PI, false);
        // context.lineWidth = 5;
        context.strokeStyle = '#ffffff';
        context.stroke();
        this.circleTexture.refresh();

        // Let's alter browser history
        let url = new URL(this.MapUrlFile);
        let path = '/_/'+this.instance+'/'+url.host+url.pathname;
        if (url.hash) {
            // FIXME: entry should be dictated by a property passed to init()
            path += '#'+url.hash;
        }
        window.history.pushState({}, null, path);
    }

    private getExitSceneUrl(layer: ITiledMapLayer): string|undefined {
        let properties : any = layer.properties;
        if (!properties) {
            return undefined;
        }
        let obj = properties.find((property:any) => property.name === "exitSceneUrl");
        if (obj === undefined) {
            return undefined;
        }
        return obj.value;
    }

    private getExitSceneInstance(layer: ITiledMapLayer): string|undefined {
        let properties : any = layer.properties;
        if (!properties) {
            return undefined;
        }
        let obj = properties.find((property:any) => property.name === "exitInstance");
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
        let exitSceneUrl = this.getExitSceneUrl(layer);
        let instance = this.getExitSceneInstance(layer);
        if (instance === undefined) {
            instance = this.instance;
        }

        // TODO: eventually compute a relative URL
        let absoluteExitSceneUrl = new URL(exitSceneUrl, this.MapUrlFile).href;
        let exitSceneKey = gameManager.loadMap(absoluteExitSceneUrl, this.scene, instance);

        let tiles : any = layer.data;
        tiles.forEach((objectKey : number, key: number) => {
            if(objectKey === 0){
                return;
            }
            //key + 1 because the start x = 0;
            let y : number = parseInt(((key + 1) / mapWidth).toString());
            let x : number = key - (y * mapWidth);
            //push and save switching case
            // TODO: this is not efficient. We should refactor that to enable a search by key. For instance: this.PositionNextScene[y][x] = exitSceneKey
            this.PositionNextScene.push({
                xStart: (x * tileWidth),
                yStart: (y * tileWidth),
                xEnd: ((x +1) * tileHeight),
                yEnd: ((y + 1) * tileHeight),
                key: exitSceneKey
            })
        });
    }

    /**
     * @param layer
     */
    private startUser(layer: ITiledMapLayer): PositionInterface {
        if (this.initPosition !== null) {
            this.startX = this.initPosition.x;
            this.startY = this.initPosition.y;
            return {
                x: this.initPosition.x,
                y: this.initPosition.y
            };
        }

        let tiles : any = layer.data;
        let possibleStartPositions : PositionInterface[]  = [];
        tiles.forEach((objectKey : number, key: number) => {
            if(objectKey === 0){
                return;
            }
            let y = Math.floor(key / layer.width);
            let x = key % layer.width;

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
            this.physics.add.collider(this.CurrentPlayer, Layer, (object1: any, object2: any) => {
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
        this.Objects.forEach((Object : Phaser.Physics.Arcade.Sprite) => {
            this.physics.add.collider(this.CurrentPlayer, Object, (object1: any, object2: any) => {
                //this.CurrentPlayer.say("Collision with object : " + (object2 as Phaser.Physics.Arcade.Sprite).texture.key)
            });
        })
    }

    createCurrentPlayer(){
        //initialise player
        //TODO create animation moving between exit and start
        this.CurrentPlayer = new Player(
            null, // The current player is not has no id (because the id can change if connection is lost and we should check that id using the GameManager.
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
        this.GameManager.joinRoom(this.RoomId, this.startX, this.startY, PlayerAnimationNames.WalkDown, false);

        //listen event to share position of user
        this.CurrentPlayer.on(hasMovedEventName, this.pushPlayerPosition.bind(this))
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
        this.GameManager.pushPlayerPosition(event);
    }

    EventToClickOnTile(){
        // debug code to get a tile properties by clicking on it
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer)=>{
            //pixel position toz tile position
            let tile = this.Map.getTileAt(this.Map.worldToTileX(pointer.worldX), this.Map.worldToTileY(pointer.worldY));
            if(tile){
                this.CurrentPlayer.say("Your touch " + tile.layer.name);
            }
        });
    }

    /**
     * @param time
     * @param delta The delta time in ms since the last frame. This is a smoothed and capped value based on the FPS rate.
     */
    update(time: number, delta: number) : void {
        this.currentTick = time;
        this.CurrentPlayer.moveUser(delta);

        // Let's move all users
        let updatedPlayersPositions = this.playersPositionInterpolator.getUpdatedPositions(time);
        updatedPlayersPositions.forEach((moveEvent: HasMovedEvent, userId: string) => {
            let player : GamerInterface | undefined = this.MapPlayersByKey.get(userId);
            if (player === undefined) {
                throw new Error('Cannot find player with ID "' + userId +'"');
            }
            player.updatePosition(moveEvent);
        });

        let nextSceneKey = this.checkToExit();
        if(nextSceneKey){
            // We are completely destroying the current scene to avoid using a half-backed instance when coming back to the same map.
            this.scene.remove(this.scene.key);
            this.scene.start(nextSceneKey.key);
        }
    }

    /**
     *
     */
    checkToExit(){
        if(this.PositionNextScene.length === 0){
            return null;
        }
        return this.PositionNextScene.find((position : any) => {
            return position.xStart <= this.CurrentPlayer.x && this.CurrentPlayer.x <= position.xEnd
            && position.yStart <= this.CurrentPlayer.y && this.CurrentPlayer.y <= position.yEnd
        })
    }

    public initUsersPosition(usersPosition: MessageUserPositionInterface[]): void {
        if(!this.CurrentPlayer){
            console.error('Cannot initiate users list because map is not loaded yet')
            return;
        }

        let currentPlayerId = this.GameManager.getPlayerId();

        // clean map
        this.MapPlayersByKey.forEach((player: GamerInterface) => {
            player.destroy();
            this.MapPlayers.remove(player);
        });
        this.MapPlayersByKey = new Map<string, GamerInterface>();

        // load map
        usersPosition.forEach((userPosition : MessageUserPositionInterface) => {
            if(userPosition.userId === currentPlayerId){
                return;
            }
            this.addPlayer(userPosition);
        });
    }

    /**
     * Create new player
     */
    public addPlayer(addPlayerData : AddPlayerInterface) : void{
        //check if exist player, if exist, move position
        if(this.MapPlayersByKey.has(addPlayerData.userId)){
            this.updatePlayerPosition({
                userId: addPlayerData.userId,
                position: addPlayerData.position
            });
            return;
        }
        //initialise player
        let player = new Player(
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

    public removePlayer(userId: string) {
        console.log('Removing player ', userId)
        let player = this.MapPlayersByKey.get(userId);
        if (player === undefined) {
            console.error('Cannot find user with id ', userId);
        }
        player.destroy();
        this.MapPlayers.remove(player);
        this.MapPlayersByKey.delete(userId);
        this.playersPositionInterpolator.removePlayer(userId);
    }

    updatePlayerPosition(message: MessageUserMovedInterface): void {
        let player : GamerInterface | undefined = this.MapPlayersByKey.get(message.userId);
        if (player === undefined) {
            throw new Error('Cannot find player with ID "' + message.userId +'"');
        }

        // We do not update the player position directly (because it is sent only every 200ms).
        // Instead we use the PlayersPositionInterpolator that will do a smooth animation over the next 200ms.
        let playerMovement = new PlayerMovement({ x: player.x, y: player.y }, this.currentTick, message.position, this.currentTick + POSITION_DELAY);
        this.playersPositionInterpolator.updatePlayerPosition(player.userId, playerMovement);
    }

    shareGroupPosition(groupPositionMessage: GroupCreatedUpdatedMessageInterface) {
        let groupId = groupPositionMessage.groupId;

        if (this.groups.has(groupId)) {
            this.groups.get(groupId).setPosition(Math.round(groupPositionMessage.position.x), Math.round(groupPositionMessage.position.y));
        } else {
            // TODO: circle radius should not be hard stored
            let sprite = new Sprite(
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
        if(!this.groups.get(groupId)){
            return;
        }
        this.groups.get(groupId).destroy();
        this.groups.delete(groupId);
    }

    public static getMapKeyByUrl(mapUrlStart: string) : string {
        // FIXME: the key should be computed from the full URL of the map.
        let startPos = mapUrlStart.indexOf('://')+3;
        let endPos = mapUrlStart.indexOf(".json");
        return mapUrlStart.substring(startPos, endPos);
    }
}
