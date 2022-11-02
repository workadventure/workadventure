import {
    CommandConfig,
    UpdateAreaCommand,
    CreateAreaCommand,
    Command,
    DeleteAreaCommand,
} from "@workadventure/map-editor";
import { Unsubscriber } from "svelte/store";
import { RoomConnection } from "../../../Connexion/RoomConnection";
import {
    mapEditorModeDragCameraPointerDownStore,
    mapEditorModeStore,
    mapEditorSelectedToolStore,
} from "../../../Stores/MapEditorStore";
import { GameScene } from "../GameScene";
import { AreaEditorTool } from "./Tools/AreaEditorTool";
import { FloorEditorTool } from "./Tools/FloorEditorTool";
import { MapEditorTool } from "./Tools/MapEditorTool";

export enum EditorToolName {
    AreaEditor = "AreaEditor",
    FloorEditor = "FloorEditor"
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
    private editorTools: Record<EditorToolName, MapEditorTool>;

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

        this.editorTools = {
            [EditorToolName.AreaEditor]: new AreaEditorTool(this),
            [EditorToolName.FloorEditor]: new FloorEditorTool(this),
        };
        this.activeTool = undefined;

        this.subscribeToStores();
        this.subscribeToGameMapFrontWrapperEvents();
    }

    public update(time: number, dt: number): void {
        this.currentlyActiveTool?.update(time, dt);
    }

    /**
     * Creates new Command object from given command config and executes it, both local and from the back.
     * @param commandConfig what to execute
     * @param emitMapEditorUpdate Should the command be emitted further to the game room? Default true.
     * (for example if command came from the back)
     * @param addToLocalCommandsHistory Should the command be added to the local commands history to be used in undo/redo mechanism? Default true.
     */
    public executeCommand(
        commandConfig: CommandConfig,
        emitMapEditorUpdate = true,
        addToLocalCommandsHistory = true
    ): boolean {
        let command: Command;
        const delay = 0;
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
                return false;
            }
        }
        if (!command) {
            return false;
        }
        // We do an execution instantly so there will be no lag from user's perspective
        const executedCommandConfig = command.execute();

        // do any necessary changes for active tool interface
        this.currentlyActiveTool?.handleCommandExecution(executedCommandConfig);

        if (emitMapEditorUpdate) {
            this.emitMapEditorUpdate(command.id, commandConfig, delay);
        }

        if (addToLocalCommandsHistory) {
            // if we are not at the end of commands history and perform an action, get rid of commands later in history than our current point in time
            if (this.currentCommandIndex !== this.localCommandsHistory.length - 1) {
                this.localCommandsHistory.splice(this.currentCommandIndex + 1);
            }
            this.pendingCommands.push(command);
            this.localCommandsHistory.push(command);
            this.currentCommandIndex += 1;
        }

        return true;
    }

    public undoCommand(): void {
        if (this.localCommandsHistory.length === 0 || this.currentCommandIndex === -1) {
            return;
        }
        try {
            const command = this.localCommandsHistory[this.currentCommandIndex];
            const commandConfig = command.undo();
            this.pendingCommands.push(command);

            // do any necessary changes for active tool interface
            this.currentlyActiveTool?.handleCommandExecution(commandConfig);

            // this should not be called with every change. Use some sort of debounce
            this.emitMapEditorUpdate(command.id, commandConfig);
            this.currentCommandIndex -= 1;
        } catch (e) {
            this.localCommandsHistory.splice(this.currentCommandIndex, 1);
            this.currentCommandIndex -= 1;
            console.warn(e);
        }
    }

    public redoCommand(): void {
        if (
            this.localCommandsHistory.length === 0 ||
            this.currentCommandIndex === this.localCommandsHistory.length - 1
        ) {
            return;
        }
        try {
            const command = this.localCommandsHistory[this.currentCommandIndex + 1];
            const commandConfig = command.execute();
            this.pendingCommands.push(command);

            // do any necessary changes for active tool interface
            this.currentlyActiveTool?.handleCommandExecution(commandConfig);

            // this should not be called with every change. Use some sort of debounce
            this.emitMapEditorUpdate(command.id, commandConfig);
            this.currentCommandIndex += 1;
        } catch (e) {
            this.localCommandsHistory.splice(this.currentCommandIndex, 1);
            this.currentCommandIndex -= 1;
            console.warn(e);
        }
    }

    public isActive(): boolean {
        return this.active;
    }

    public isPointerDown(): boolean {
        return this.pointerDown;
    }

    public destroy(): void {
        for (const key of Object.keys(this.editorTools)) {
            this.editorTools[key as EditorToolName].destroy();
        }
        this.unsubscribeFromStores();
        this.pointerDownUnsubscriber();
    }

    public handleKeyDownEvent(event: KeyboardEvent): void {
        this.currentlyActiveTool?.handleKeyDownEvent(event);
        switch (event.key.toLowerCase()) {
            case "`": {
                this.equipTool();
                break;
            }
            case "1": {
                this.equipTool(EditorToolName.AreaEditor);
                break;
            }
            case "2": {
                this.equipTool(EditorToolName.FloorEditor);
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
        connection.editMapCommandMessageStream.subscribe((editMapCommandMessage) => {
            if (this.pendingCommands.length > 0) {
                if (this.pendingCommands[0].id === editMapCommandMessage.id) {
                    this.pendingCommands.shift();
                    return;
                }
                this.revertPendingCommands();
            }

            for (const key of Object.keys(this.editorTools)) {
                this.editorTools[key as EditorToolName].handleIncomingCommandMessage(editMapCommandMessage);
            }
        });
    }

    private revertPendingCommands(): void {
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

    public equipTool(tool?: EditorToolName): void {
        if (this.activeTool === tool) {
            return;
        }
        this.clearToNeutralState();
        this.activeTool = tool;

        if (tool !== undefined) {
            this.activateTool();
        }
        mapEditorSelectedToolStore.set(tool);
    }

    private emitMapEditorUpdate(commandId: string, commandConfig: CommandConfig, delay = 0): void {
        const func = () => {
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
        };
        if (delay === 0) {
            func();
            return;
        }
        setTimeout(func, delay);
    }

    /**
     * Hide everything related to tools like Area Previews etc
     */
    private clearToNeutralState(): void {
        this.currentlyActiveTool?.clear();
    }

    /**
     * Show things necessary for tool's usage
     */
    private activateTool(): void {
        this.currentlyActiveTool?.activate();
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
        for (const key of Object.keys(this.editorTools)) {
            this.editorTools[key as EditorToolName].subscribeToGameMapFrontWrapperEvents(
                this.scene.getGameMapFrontWrapper()
            );
        }
    }

    private unsubscribeFromStores(): void {
        this.mapEditorModeUnsubscriber();
    }

    private get currentlyActiveTool(): MapEditorTool | undefined {
        return this.activeTool ? this.editorTools[this.activeTool] : undefined;
    }

    public getScene(): GameScene {
        return this.scene;
    }
}
