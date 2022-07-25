import { RoomConnection } from "../../../../Connexion/RoomConnection";

export abstract class MapEditorTool {
    public abstract clear(): void;
    public abstract activate(): void;
    public abstract subscribeToStreams(connection: RoomConnection): void;
}
