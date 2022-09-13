import {
    CommandConfig,
    UpdateAreaCommand,
    CreateAreaCommand,
    Command,
    DeleteAreaCommand,
} from "@workadventure/map-editor";
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
    private localCommandsHistory: Command[];

    /**
     * Commands sent by us that are still to be acknowledged by the server
     */
    private pendingCommands: Command[];
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

        this.localCommandsHistory = [];
        this.pendingCommands = [];
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

    public executeCommand(
        commandConfig: CommandConfig,
        emitMapEditorUpdate = true,
        alterLocalCommandsHistory = true
    ): CommandConfig | undefined {
        let command: Command;
        switch (commandConfig.type) {
            case "UpdateAreaCommand": {
                command = new UpdateAreaCommand(this.scene.getGameMap(), commandConfig);
                break;
            }
            case "CreateAreaCommand": {
                command = new CreateAreaCommand(this.scene.getGameMap(), commandConfig);
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
        if (!command) {
            return;
        }
        // We do an execution instantly so there will be no lag from user's perspective
        const executedCommandConfig = command.execute();

        // do any necessary changes for active tool interface
        if (this.activeTool) {
            this.editorTools.get(this.activeTool)?.handleCommandExecution(executedCommandConfig);
        }

        if (emitMapEditorUpdate) {
            this.emitMapEditorUpdate(command.id, commandConfig);
        }

        if (alterLocalCommandsHistory) {
            // if we are not at the end of commands history and perform an action, get rid of commands later in history than our current point in time
            if (this.currentCommandIndex !== this.localCommandsHistory.length - 1) {
                this.localCommandsHistory.splice(this.currentCommandIndex + 1);
            }
            this.pendingCommands.push(command);
            this.localCommandsHistory.push(command);
            this.currentCommandIndex += 1;
        }
        return executedCommandConfig;
    }

    public undoCommand(): void {
        if (this.localCommandsHistory.length === 0 || this.currentCommandIndex === -1) {
            return;
        }
        const command = this.localCommandsHistory[this.currentCommandIndex];
        const commandConfig = command.undo();
        // this should not be called with every change. Use some sort of debounce
        this.emitMapEditorUpdate(command.id, commandConfig);
        this.currentCommandIndex -= 1;
    }

    public redoCommand(): void {
        if (
            this.localCommandsHistory.length === 0 ||
            this.currentCommandIndex === this.localCommandsHistory.length - 1
        ) {
            return;
        }
        const command = this.localCommandsHistory[this.currentCommandIndex + 1];
        const commandConfig = command.execute();
        // this should not be called with every change. Use some sort of debounce
        this.emitMapEditorUpdate(command.id, commandConfig);
        this.currentCommandIndex += 1;
    }

    public revertPendingCommands(): void {
        while (this.pendingCommands.length > 0) {
            const command = this.pendingCommands.pop();
            if (command) {
                command.undo();
                // also remove from local history of commands as this is invalid
                const index = this.localCommandsHistory.findIndex((localCommand) => localCommand.id === command.id);
                if (index !== -1) {
                    this.localCommandsHistory.splice(index, 1);
                    this.currentCommandIndex -= 1;
                }
            }
        }
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

    private emitMapEditorUpdate(commandId: string, commandConfig: CommandConfig): void {
        switch (commandConfig.type) {
            case "UpdateAreaCommand": {
                this.scene.connection?.emitMapEditorModifyArea(commandId, commandConfig.areaObjectConfig);
                break;
            }
            case "CreateAreaCommand": {
                this.scene.connection?.emitMapEditorCreateArea(commandId, commandConfig.areaObjectConfig);
                break;
            }
            case "DeleteAreaCommand": {
                this.scene.connection?.emitMapEditorDeleteArea(commandId, commandConfig.id);
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

    public getPendingCommands(): Command[] {
        return this.pendingCommands;
    }

    public getScene(): GameScene {
        return this.scene;
    }
}
