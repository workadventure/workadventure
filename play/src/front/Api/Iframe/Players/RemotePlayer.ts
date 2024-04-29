import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import type { AddPlayerEvent } from "../../Events/AddPlayerEvent";
import type { PlayerPosition } from "../../Events/PlayerPosition";
import { ActionsMenuAction } from "../ui";
import { queryWorkadventure, sendToWorkadventure } from "../IframeApiContribution";
import { PublicPlayerState, ReadOnlyPublicPlayerState } from "../PublicPlayerState";

export interface RemotePlayerInterface {
    /**
     * A unique ID for this player. Each character on the map has a unique ID
     */
    readonly playerId: number;
    /**
     * The displayed name for this player
     */
    readonly name: string;
    /**
     * A unique ID for the user. Unlike the "id", 2 characters can have the same UUID if they belong to the same user
     * (i.e. if the same user logged twice using 2 different tabs)
     */
    readonly uuid: string;
    /*get availabilityStatus();*/

    /**
     * The color of the outline around the player's name
     */
    readonly outlineColor: number | undefined;

    /**
     * The position of the current player, expressed in game pixels, relative to the top - left of the map.
     */
    readonly position: PlayerPosition;
    /**
     * A stream updated with the position of this current player.
     */
    readonly position$: Observable<PlayerPosition>;
    /**
     * An object storing players variables
     */
    readonly state: ReadOnlyPublicPlayerState;

    /**
     * Send an event to the player.
     * Remote player can listen to this event using `WA.event.on(key).subscribe((event) => { ... })`.
     */
    sendEvent(key: string, value: unknown): Promise<void>;
}

export class RemotePlayer implements RemotePlayerInterface {
    private _playerId: number;
    private _name: string;
    private _userUuid: string;
    private _availabilityStatus: string;
    private _outlineColor: number | undefined;
    private _position: PlayerPosition;
    private _variables: { [key in keyof PublicPlayerState]?: PublicPlayerState[key] } = {};
    private _variablesSubjects: { [key in keyof PublicPlayerState]?: Subject<PublicPlayerState[key]> } = {};
    public readonly state: ReadOnlyPublicPlayerState;
    private actions: Map<string, ActionsMenuAction> = new Map<string, ActionsMenuAction>();

    public constructor(addPlayerEvent: AddPlayerEvent) {
        this._playerId = addPlayerEvent.playerId;
        this._name = addPlayerEvent.name;
        this._userUuid = addPlayerEvent.userUuid;
        this._availabilityStatus = addPlayerEvent.availabilityStatus;
        this._outlineColor = addPlayerEvent.outlineColor;
        this._position = addPlayerEvent.position;
        // We don't know the type of the variables sent to us, but act as if we do.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._variables = Object.fromEntries(addPlayerEvent.variables) as any;
        const variableSubjects = this._variablesSubjects;
        const variables = this._variables;
        this.state = new Proxy(
            {
                onVariableChange<K extends keyof PublicPlayerState>(key: K): Observable<PublicPlayerState[K]> {
                    let subject = variableSubjects[key];
                    if (subject === undefined) {
                        subject = new Subject<PublicPlayerState[K]>();
                        variableSubjects[key] = subject;
                    }
                    return subject.asObservable();
                },
            },
            {
                get(target, p: PropertyKey, receiver: unknown): unknown {
                    if (p in target) {
                        return Reflect.get(target, p, receiver);
                    }
                    return variables[p.toString()];
                },
                has(target, p: PropertyKey): boolean {
                    if (p in target) {
                        return true;
                    }
                    return p.toString() in variables;
                },
            }
        );
    }

    get playerId(): number {
        return this._playerId;
    }

    get name(): string {
        return this._name;
    }

    get uuid(): string {
        return this._userUuid;
    }

    /**
     * Todo
     */
    /*get availabilityStatus(): string {
        return this._availabilityStatus;
    }*/

    get outlineColor(): number | undefined {
        return this._outlineColor;
    }

    get position(): PlayerPosition {
        return this._position;
    }

    set position(_position: PlayerPosition) {
        this._position = _position;
        this._position$.next(_position);
    }

    public readonly _position$ = new Subject<PlayerPosition>();
    public readonly position$ = this._position$.asObservable();

    public destroy() {
        this._position$.complete();
        for (const subject of Object.values(this._variablesSubjects)) {
            subject?.complete();
        }
    }

    public setVariable<K extends keyof PublicPlayerState>(name: K, value: PublicPlayerState[K]): void {
        this._variables[name] = value;
        const observable = this._variablesSubjects[name];
        if (observable) {
            observable.next(value);
        }
    }

    public addAction(key: string, callback: () => void): ActionsMenuAction {
        const newAction = new ActionsMenuAction(this, key, callback);
        this.actions.set(key, newAction);
        sendToWorkadventure({
            type: "addActionsMenuKeyToRemotePlayer",
            data: { id: this._playerId, actionKey: key },
        });
        return newAction;
    }

    public callAction(key: string): void {
        const action = this.actions.get(key);
        if (action) {
            action.call();
        }
    }

    public removeAction(key: string): void {
        this.actions.delete(key);
        sendToWorkadventure({
            type: "removeActionsMenuKeyFromRemotePlayer",
            data: { id: this._playerId, actionKey: key },
        });
    }

    public sendEvent(name: string, data: unknown): Promise<void> {
        return queryWorkadventure({
            type: "dispatchEvent",
            data: {
                name,
                data,
                targetUserIds: [this._playerId],
            },
        });
    }
}

export interface RemotePlayerMoved {
    player: RemotePlayerInterface;
    newPosition: PlayerPosition;
    oldPosition: PlayerPosition;
}
