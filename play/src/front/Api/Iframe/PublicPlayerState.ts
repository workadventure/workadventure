import { Observable } from "rxjs";

/**
 * PublicPlayerState is the part of the state of a player that is shared with other players.
 * The interface is empty. It is meant to be extended by the ScriptingAPI developers to add custom properties.
 */
export interface PublicPlayerState {
    [key: string]: unknown;
}

export type ReadOnlyPublicPlayerState = Readonly<PublicPlayerState> & {
    onVariableChange<K extends keyof PublicPlayerState>(key: K): Observable<PublicPlayerState[K]>;
};
