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

    private mapEditorModeUnsubscriber!: Unsubscriber;
    private pointerDownUnsubscriber!: Unsubscriber;

    constructor(scene: GameScene) {
        this.scene = scene;

        this.commandsHistory = [];

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
        this.commandsHistory.push(command);
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
