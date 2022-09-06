import { RoomConnection } from "../../../../Connexion/RoomConnection";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";

export abstract class MapEditorTool {
    public abstract clear(): void;
    public abstract activate(): void;
    public abstract destroy(): void;
    public abstract subscribeToRoomConnection(connection: RoomConnection): void;
    public abstract subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void;
    public abstract unsubscribeFromGameMapFrontWrapperEvents(): void;
    public abstract handleKeyDownEvent(event: KeyboardEvent): void;
}
