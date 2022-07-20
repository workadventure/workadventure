import { Unsubscriber } from "svelte/store";
import { RoomConnection } from "../../../Connexion/RoomConnection";
import { mapEditorModeDragCameraPointerDownStore, mapEditorModeStore } from "../../../Stores/MapEditorStore";
import { GameScene } from "../GameScene";
import { UpdateAreaCommand, UpdateAreaCommandPayload } from "./Commands/Area/UpdateAreaCommand";
import { Command } from "./Commands/Command";
import { AreaEditorTool } from "./Tools/AreaEditorTool";
import { MapEditorTool } from "./Tools/MapEditorTool";

export enum EditorToolName {
    AreaEditor = "AreaEditor",
}

export enum CommandType {
    UpdateAreaCommand = "UpdateAreaCommand",
}

export type CommandPayload = UpdateAreaCommandPayload;

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

    constructor(scene: GameScene) {
        this.scene = scene;

        this.commandsHistory = [];
        this.currentCommandIndex = -1;

        this.active = false;
        this.pointerDown = false;

        this.editorTools = new Map<EditorToolName, MapEditorTool>([
            [EditorToolName.AreaEditor, new AreaEditorTool(this)],
        ]);
        this.activeTool = undefined;

        this.subscribeToStores();
    }

    public executeCommand(type: CommandType, payload: CommandPayload): void {
        let command: Command;
        switch (type) {
            case CommandType.UpdateAreaCommand: {
                command = new UpdateAreaCommand(payload);
                command.execute();
                break;
            }
            default: {
                return;
            }
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
        this.commandsHistory[this.currentCommandIndex].undo();
        this.currentCommandIndex -= 1;
        console.log("undo command");
    }

    public redoCommand(): void {
        if (this.commandsHistory.length === 0 || this.currentCommandIndex === this.commandsHistory.length - 1) {
            return;
        }
        console.log("redo command");
        this.commandsHistory[this.currentCommandIndex + 1].execute();
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
        this.pointerDownUnsubscriber();
    }

    public handleKeyDownEvent(event: KeyboardEvent): void {
        switch (event.key) {
            case "`": {
                this.equipTool();
                break;
            }
            case "1": {
                this.equipTool(EditorToolName.AreaEditor);
                break;
            }
            case "r": {
                this.redoCommand();
                console.log(`Commands size: ${this.commandsHistory.length}`);
                console.log(`INDEX: ${this.currentCommandIndex}`);
                break;
            }
            case "u": {
                this.undoCommand();
                console.log(`Commands size: ${this.commandsHistory.length}`);
                console.log(`INDEX: ${this.currentCommandIndex}`);
                break;
            }
            default: {
                break;
            }
        }
    }

    public subscribeToStreams(connection: RoomConnection): void {
        this.editorTools.forEach((tool) => tool.subscribeToStreams(connection));
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

    private unsubscribeFromStores(): void {
        this.mapEditorModeUnsubscriber();
    }

    public getScene(): GameScene {
        return this.scene;
    }
}
