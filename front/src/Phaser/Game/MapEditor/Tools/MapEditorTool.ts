import { RoomConnection } from "../../../../Connexion/RoomConnection";
import { GameMap } from '../../GameMap';

export abstract class MapEditorTool {
    public abstract clear(): void;
    public abstract activate(): void;
    public abstract destroy(): void;
    public abstract subscribeToRoomConnection(connection: RoomConnection): void;
    public abstract subscribeToGameMapEvents(gameMap: GameMap): void;
    public abstract unsubscribeFromGameMapEvents(): void;
}
