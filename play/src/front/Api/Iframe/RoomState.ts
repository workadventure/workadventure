/**
 * RoomState is the state of a room (i.e. the type associated with the room variables).
 * The interface is empty. It is meant to be extended by the ScriptingAPI developers to add custom properties.
 */
export interface RoomState {
    [key: string]: unknown;
}
