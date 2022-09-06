import { CommandConfig, UpdateAreaCommand, Command, DeleteAreaCommand } from "@workadventure/map-editor";
import { Unsubscriber } from "svelte/store";
import { RoomConnection } from "../../../Connexion/RoomConnection";
import { mapEditorModeDragCameraPointerDownStore, mapEditorModeStore } from "../../../Stores/MapEditorStore";
import { GameScene } from "../GameScene";
import { AreaEditorTool } from "./Tools/AreaEditorTool";
import { MapEditorTool } from "./Tools/MapEditorTool";

export enum EditorToolName {
    AreaEditor = "AreaEditor",
}

export class MapEditorModeManager {
    private scene: GameScene;

    /**
     * Is user currently in Editor Mode
     */
    private active: boolean;

    /**
     * Is pointer currently down (map dragging etc)
     */
    private pointerDown: boolean;

    /**
     * Tools that we can work with inside Editor
     */
    private editorTools: Map<EditorToolName, MapEditorTool>;

    /**
     * What tool are we using right now
     */
    private activeTool?: EditorToolName;

    /**
     * We are making use of CommandPattern to implement an Undo-Redo mechanism
     */
    private commandsHistory: Command[];
    /**
     * Which command was called most recently
     */
    private currentCommandIndex: number;

    private mapEditorModeUnsubscriber!: Unsubscriber;
    private pointerDownUnsubscriber!: Unsubscriber;

    private ctrlKey: Phaser.Input.Keyboard.Key;
    private shiftKey: Phaser.Input.Keyboard.Key;

    constructor(scene: GameScene) {
        this.scene = scene;

        this.ctrlKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
        this.shiftKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.commandsHistory = [];
        this.currentCommandIndex = -1;

        this.active = false;
        this.pointerDown = false;

        this.editorTools = new Map<EditorToolName, MapEditorTool>([
            [EditorToolName.AreaEditor, new AreaEditorTool(this)],
        ]);
        this.activeTool = undefined;

        this.subscribeToStores();
        this.subscribeToGameMapFrontWrapperEvents();
    }

    public executeCommand(commandConfig: CommandConfig): void {
        let command: Command;
        switch (commandConfig.type) {
            case "UpdateAreaCommand": {
                command = new UpdateAreaCommand(this.scene.getGameMap(), commandConfig);
                break;
            }
            case "DeleteAreaCommand": {
                command = new DeleteAreaCommand(this.scene.getGameMap(), commandConfig);
                break;
            }
            default: {
                const _exhaustiveCheck: never = commandConfig;
                return;
            }
        }
        if (command) {
            // We do an execution instantly so there will be no lag from user's perspective
            command.execute();
            this.emitMapEditorUpdate(commandConfig);
        }
        // if we are not at the end of commands history and perform an action, get rid of commands later in history than our current point in time
        if (this.currentCommandIndex !== this.commandsHistory.length - 1) {
            this.commandsHistory.splice(this.currentCommandIndex + 1);
        }
        this.commandsHistory.push(command);
        this.currentCommandIndex += 1;
    }

    public undoCommand(): void {
        if (this.commandsHistory.length === 0 || this.currentCommandIndex === -1) {
            return;
        }
        const command = this.commandsHistory[this.currentCommandIndex].undo();
        // this should not be called with every change. Use some sort of debounce
        this.emitMapEditorUpdate(command);
        this.currentCommandIndex -= 1;
    }

    public redoCommand(): void {
        if (this.commandsHistory.length === 0 || this.currentCommandIndex === this.commandsHistory.length - 1) {
            return;
        }
        const command = this.commandsHistory[this.currentCommandIndex + 1].execute();
        // this should not be called with every change. Use some sort of debounce
        this.emitMapEditorUpdate(command);
        this.currentCommandIndex += 1;
    }

    public isActive(): boolean {
        return this.active;
    }

    public isPointerDown(): boolean {
        return this.pointerDown;
    }

    public destroy(): void {
        this.unsubscribeFromStores();
        this.unsubscribeFromGameMapFrontWrapperEvents();
        this.pointerDownUnsubscriber();
    }

    public handleKeyDownEvent(event: KeyboardEvent): void {
        if (this.activeTool) {
            this.editorTools.get(this.activeTool)?.handleKeyDownEvent(event);
        }
        switch (event.key.toLowerCase()) {
            case "`": {
                this.equipTool();
                break;
            }
            case "1": {
                this.equipTool(EditorToolName.AreaEditor);
                break;
            }
            case "z": {
                if (this.ctrlKey) {
                    this.shiftKey.isDown ? this.redoCommand() : this.undoCommand();
                }
                break;
            }
            default: {
                break;
            }
        }
    }

    public subscribeToRoomConnection(connection: RoomConnection): void {
        this.editorTools.forEach((tool) => tool.subscribeToRoomConnection(connection));
    }

    private equipTool(tool?: EditorToolName): void {
        if (this.activeTool === tool) {
            return;
        }
        this.clearToNeutralState();
        this.activeTool = tool;

        if (tool !== undefined) {
            this.activateTool();
        }
    }

    private emitMapEditorUpdate(commandConfig: CommandConfig): void {
        switch (commandConfig.type) {
            case "UpdateAreaCommand": {
                this.scene.connection?.emitMapEditorModifyArea(commandConfig.areaObjectConfig);
                break;
            }
            // case "CreateAreaCommand": {
            //     this.scene.connection?.emitMapEditorCreateArea(commandConfig.);
            //     break;
            // }
            case "DeleteAreaCommand": {
                console.log("EMIT DELETE AREA COMMAND");
                this.scene.connection?.emitMapEditorDeleteArea(commandConfig.id);
                break;
            }
            default: {
                break;
            }
        }
    }

    /**
     * Hide everything related to tools like Area Previews etc
     */
    private clearToNeutralState(): void {
        if (this.activeTool) {
            this.editorTools.get(this.activeTool)?.clear();
        }
    }

    /**
     * Show things necessary for tool's usage
     */
    private activateTool(): void {
        if (this.activeTool) {
            this.editorTools.get(this.activeTool)?.activate();
        }
    }

    private subscribeToStores(): void {
        this.mapEditorModeUnsubscriber = mapEditorModeStore.subscribe((active) => {
            this.active = active;
            if (active) {
                this.scene.CurrentPlayer.finishFollowingPath(true);
                this.scene.CurrentPlayer.stop();
                this.scene.getCameraManager().stopFollow();
            } else {
                this.scene.getCameraManager().startFollowPlayer(this.scene.CurrentPlayer);
                this.equipTool();
            }
        });

        this.pointerDownUnsubscriber = mapEditorModeDragCameraPointerDownStore.subscribe((pointerDown) => {
            this.pointerDown = pointerDown;
        });
    }

    private subscribeToGameMapFrontWrapperEvents(): void {
        this.editorTools.forEach((tool) =>
            tool.subscribeToGameMapFrontWrapperEvents(this.scene.getGameMapFrontWrapper())
        );
    }

    private unsubscribeFromGameMapFrontWrapperEvents(): void {
        this.editorTools.forEach((tool) => tool.unsubscribeFromGameMapFrontWrapperEvents());
    }

    private unsubscribeFromStores(): void {
        this.mapEditorModeUnsubscriber();
    }

    public getScene(): GameScene {
        return this.scene;
    }
}
