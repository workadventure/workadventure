import type { AreaData, AtLeast, WamFile } from "@workadventure/map-editor";
import { UpdateAreaCommand } from "@workadventure/map-editor";
import type { AreaEditorTool } from "../../Tools/AreaEditorTool";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import type { RoomConnection } from "../../../../../Connection/RoomConnection";
import type { GameMapFrontWrapper } from "../../../GameMap/GameMapFrontWrapper";

export class UpdateAreaFrontCommand extends UpdateAreaCommand implements FrontCommandInterface {
    constructor(
        wamFile: WamFile,
        dataToModify: AtLeast<AreaData, "id">,
        commandId: string | undefined,
        oldConfig: AtLeast<AreaData, "id"> | undefined,
        private areaEditorTool: AreaEditorTool,
        private gameMapFrontWrapper: GameMapFrontWrapper
    ) {
        super(wamFile, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<void> {
        const returnVal = await super.execute();
        this.areaEditorTool.handleAreaUpdate(this.oldConfig, this.newConfig);

        this.gameMapFrontWrapper.recomputeAreasCollisionGrid();

        return returnVal;
    }

    public getUndoCommand(): UpdateAreaFrontCommand {
        return new UpdateAreaFrontCommand(
            this.wamFile,
            this.oldConfig,
            undefined,
            this.newConfig,
            this.areaEditorTool,
            this.gameMapFrontWrapper
        );
    }

    public setNewConfig(newConfig: AtLeast<AreaData, "id">): void {
        this.newConfig = newConfig;
    }

    public emitEvent(roomConnection: RoomConnection): void {
        const modifyGeometry = this.hasGeometryChanged(this.oldConfig, this.newConfig);
        roomConnection.emitMapEditorModifyArea(this.commandId, this.newConfig, modifyGeometry);
    }

    private hasGeometryChanged(
        oldConfig: AtLeast<AreaData, "id"> | undefined,
        newConfig: AtLeast<AreaData, "id">
    ): boolean {
        if (oldConfig == null) {
            return false;
        }
        const ox = oldConfig.x ?? 0;
        const oy = oldConfig.y ?? 0;
        const ow = oldConfig.width ?? 0;
        const oh = oldConfig.height ?? 0;
        const nx = newConfig.x ?? 0;
        const ny = newConfig.y ?? 0;
        const nw = newConfig.width ?? 0;
        const nh = newConfig.height ?? 0;
        return ox !== nx || oy !== ny || ow !== nw || oh !== nh;
    }
}
