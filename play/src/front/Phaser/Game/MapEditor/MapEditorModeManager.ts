import { Command, UpdateWAMSettingCommand } from "@workadventure/map-editor";
import { Unsubscriber, get } from "svelte/store";
import { EditMapCommandMessage } from "@workadventure/messages";
import type { RoomConnection } from "../../../Connection/RoomConnection";
import type { GameScene } from "../GameScene";
import { mapEditorModeStore, mapEditorSelectedToolStore } from "../../../Stores/MapEditorStore";
import { AreaEditorTool } from "./Tools/AreaEditorTool";
import type { MapEditorTool } from "./Tools/MapEditorTool";
import { FloorEditorTool } from "./Tools/FloorEditorTool";
import { EntityEditorTool } from "./Tools/EntityEditorTool";
import { WAMSettingsEditorTool } from "./Tools/WAMSettingsEditorTool";
import { FrontCommandInterface } from "./Commands/FrontCommandInterface";
import { FrontCommand } from "./Commands/FrontCommand";
import { TrashEditorTool } from "./Tools/TrashEditorTool";

export enum EditorToolName {
    AreaEditor = "AreaEditor",
    FloorEditor = "FloorEditor",
    EntityEditor = "EntityEditor",
    WAMSettingsEditor = "WAMSettingsEditor",
    TrashEditor = "TrashEditor",
}

export class MapEditorModeManager {
    private scene: GameScene;

    /**
     * Is user currently in Editor Mode
     */
    private active: boolean;

    /**
     * Tools that we can work with inside Editor
     */
    private editorTools: Record<EditorToolName, MapEditorTool>;

    /**
     * What tool are we using right now
     */
    private activeTool?: EditorToolName;
    /**
     * Last tool used before closing map editor
     */
    private lastlyUsedTool?: EditorToolName;

    /**
     * We are making use of CommandPattern to implement an Undo-Redo mechanism
     */
    private localCommandsHistory: FrontCommand[];

    /**
     * Commands sent by us that are still to be acknowledged by the server
     */
    private pendingCommands: FrontCommand[];
    /**
     * Which command was called most recently
     */
    private currentCommandIndex: number;

    private mapEditorModeUnsubscriber!: Unsubscriber;

    private ctrlKey?: Phaser.Input.Keyboard.Key;
    private shiftKey?: Phaser.Input.Keyboard.Key;

    constructor(scene: GameScene) {
        this.scene = scene;

        this.ctrlKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
        this.shiftKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.localCommandsHistory = [];
        this.pendingCommands = [];
        this.currentCommandIndex = -1;

        this.active = false;

        this.editorTools = {
            [EditorToolName.AreaEditor]: new AreaEditorTool(this),
            [EditorToolName.EntityEditor]: new EntityEditorTool(this),
            [EditorToolName.FloorEditor]: new FloorEditorTool(this),
            [EditorToolName.WAMSettingsEditor]: new WAMSettingsEditorTool(this),
            [EditorToolName.TrashEditor]: new TrashEditorTool(this),
        };
        this.activeTool = undefined;
        this.lastlyUsedTool = undefined;

        this.subscribeToStores();
        this.subscribeToGameMapFrontWrapperEvents();

        this.currentRunningCommand = this.scene.getGameMapFrontWrapper().initializedPromise.promise;
    }

    public update(time: number, dt: number): void {
        this.currentlyActiveTool?.update(time, dt);
    }

    private currentRunningCommand: Promise<void>;

    /**
     * Creates new Command object from given command config and executes it, both local and from the back.
     * @param command what to execute
     * @param emitMapEditorUpdate Should the command be emitted further to the game room? Default true.
     * (for example if command came from the back)
     * @param addToLocalCommandsHistory Should the command be added to the local commands history to be used in undo/redo mechanism? Default true.
     */
    public async executeCommand(
        command: Command & FrontCommandInterface,
        emitMapEditorUpdate = true,
        addToLocalCommandsHistory = true
    ): Promise<void> {
        // Commands are throttled. Only one at a time.
        return (this.currentRunningCommand = this.currentRunningCommand.then(async () => {
            const delay = 0;
            try {
                // We do an execution instantly so there will be no lag from user's perspective
                await command.execute();

                if (emitMapEditorUpdate) {
                    this.emitMapEditorUpdate(command, delay);
                }

                // FIXME: why the exception here regarding UpdateWAMSettingCommand ?
                if (addToLocalCommandsHistory && !(command instanceof UpdateWAMSettingCommand)) {
                    // if we are not at the end of commands history and perform an action, get rid of commands later in history than our current point in time
                    if (this.currentCommandIndex !== this.localCommandsHistory.length - 1) {
                        this.localCommandsHistory.splice(this.currentCommandIndex + 1);
                    }
                    this.pendingCommands.push(command);
                    this.localCommandsHistory.push(command);
                    this.currentCommandIndex += 1;
                }

                this.scene.getGameMap().updateLastCommandIdProperty(command.commandId);
                return;
                //return true;
            } catch (error) {
                console.warn(error);
                //return false;
                return;
            }
        }));
    }

    // A simple queue to be sure we run only one undo or redo at once.
    private runningUndoRedoCommand: Promise<void> = Promise.resolve();

    public undoCommand(): void {
        if (this.localCommandsHistory.length === 0 || this.currentCommandIndex === -1) {
            return;
        }
        try {
            const command = this.localCommandsHistory[this.currentCommandIndex];
            const undoCommand1 = command.getUndoCommand();
            this.pendingCommands.push(command);

            // do any necessary changes for active tool interface
            //this.handleCommandExecutionByTools(undoCommand1, true);

            // this should not be called with every change. Use some sort of debounce
            this.emitMapEditorUpdate(undoCommand1);
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
            //const commandConfig = await command.execute();
            this.pendingCommands.push(command);

            // do any necessary changes for active tool interface
            //this.handleCommandExecutionByTools(commandConfig, true);

            // this should not be called with every change. Use some sort of debounce
            this.emitMapEditorUpdate(command);
            this.currentCommandIndex += 1;
        } catch (e) {
            this.localCommandsHistory.splice(this.currentCommandIndex, 1);
            this.currentCommandIndex -= 1;
            console.warn(e);
        }
    }

    /**
     * Update local map with missing commands given from the map-storage on RoomJoinedEvent. This commands
     * are applied locally and are not being send further.
     */
    public async updateMapToNewest(commands: EditMapCommandMessage[]): Promise<void> {
        if (!commands) {
            return;
        }
        for (const command of commands) {
            for (const tool of Object.values(this.editorTools)) {
                await tool.handleIncomingCommandMessage(command);
            }
        }
    }

    public isActive(): boolean {
        return this.active;
    }

    public destroy(): void {
        for (const tool of Object.values(this.editorTools)) {
            tool.destroy();
        }
        this.unsubscribeFromStores();
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
                this.equipTool(EditorToolName.EntityEditor);
                break;
            }
            case "3": {
                // NOTE: Hide it untill FloorEditing is done
                // this.equipTool(EditorToolName.FloorEditor);
                break;
            }
            case "z": {
                if (this.ctrlKey?.isDown) {
                    if (this.shiftKey?.isDown) {
                        this.runningUndoRedoCommand = this.runningUndoRedoCommand
                            .then(() => {
                                return this.redoCommand();
                            })
                            .catch((e) => console.error(e));
                    } else {
                        this.runningUndoRedoCommand = this.runningUndoRedoCommand
                            .then(() => {
                                return this.undoCommand();
                            })
                            .catch((e) => console.error(e));
                    }
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
            (async () => {
                if (this.pendingCommands.length > 0) {
                    if (this.pendingCommands[0].commandId === editMapCommandMessage.id) {
                        this.pendingCommands.shift();
                        return;
                    }
                    this.revertPendingCommands();
                }

                for (const tool of Object.values(this.editorTools)) {
                    await tool.handleIncomingCommandMessage(editMapCommandMessage);
                }
            })().catch((e) => console.error(e));
        });
    }

    private revertPendingCommands(): void {
        while (this.pendingCommands.length > 0) {
            const command = this.pendingCommands.pop();
            if (command) {
                //await command.getUndoCommand();
                // also remove from local history of commands as this is invalid
                const index = this.localCommandsHistory.findIndex(
                    (localCommand) => localCommand.commandId === command.commandId
                );
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

    private emitMapEditorUpdate(command: FrontCommandInterface, delay = 0): void {
        const func = () => {
            if (this.scene.connection === undefined) {
                throw new Error("No connection attached to room to emit map editor update");
            }
            command.emitEvent(this.scene.connection);
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
            if (!this.active) {
                this.lastlyUsedTool = get(mapEditorSelectedToolStore);
                this.equipTool(undefined);
                return;
            }
            this.equipTool(this.lastlyUsedTool ?? EditorToolName.EntityEditor);
        });
    }

    private subscribeToGameMapFrontWrapperEvents(): void {
        for (const tool of Object.values(this.editorTools)) {
            tool.subscribeToGameMapFrontWrapperEvents(this.scene.getGameMapFrontWrapper());
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
