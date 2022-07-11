import { AddPlayerEvent } from "../../Events/AddPlayerEvent";
import { Observable, Subject } from "rxjs";
import { PlayerPosition } from "../../Events/PlayerPosition";

export const remotePlayers = new Map<number, RemotePlayer>();

export interface RemotePlayerInterface {
    readonly id: number;
    readonly name: string;
    readonly uuid: string;
    /*get availabilityStatus();*/
    readonly outlineColor: number | undefined;
    readonly position: PlayerPosition;
    /**
     * A stream updated with the position of this current player.
     */
    readonly position$: Observable<PlayerPosition>;
    readonly state: ReadOnlyState;
}

export type ReadOnlyState = { onVariableChange(key: string): Observable<unknown> } & {
    readonly [key: string]: unknown;
};

export class RemotePlayer implements RemotePlayerInterface {
    private _userId: number;
    private _name: string;
    private _userUuid: string;
    private _availabilityStatus: string;
    private _outlineColor: number | undefined;
    private _position: PlayerPosition;
    private _variables: Map<string, unknown>;
    private _variablesSubjects = new Map<string, Subject<unknown>>();
    public readonly state: ReadOnlyState;

    public constructor(addPlayerEvent: AddPlayerEvent) {
        this._userId = addPlayerEvent.userId;
        this._name = addPlayerEvent.name;
        this._userUuid = addPlayerEvent.userUuid;
        this._availabilityStatus = addPlayerEvent.availabilityStatus;
        this._outlineColor = addPlayerEvent.outlineColor;
        this._position = addPlayerEvent.position;
        this._variables = addPlayerEvent.variables;
        const variableSubjects = this._variablesSubjects;
        const variables = this._variables;
        this.state = new Proxy(
            {
                onVariableChange(key: string): Observable<unknown> {
                    let subject = variableSubjects.get(key);
                    if (subject === undefined) {
                        subject = new Subject<unknown>();
                        variableSubjects.set(key, subject);
                    }
                    return subject.asObservable();
                },
            },
            {
                get(target, p: PropertyKey, receiver: unknown): unknown {
                    if (p in target) {
                        return Reflect.get(target, p, receiver);
                    }
                    return variables.get(p.toString());
                },
                has(target, p: PropertyKey): boolean {
                    if (p in target) {
                        return true;
                    }
                    return variables.has(p.toString());
                },
            }
        );
    }

    get id(): number {
        return this._userId;
    }

    get name(): string {
        return this._name;
    }

    get uuid(): string {
        return this._userUuid;
    }

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
    }

    public setVariable(name: string, value: unknown): void {
        this._variables.set(name, value);
        const observable = this._variablesSubjects.get(name);
        if (observable) {
            observable.next(value);
        }
    }
}

export interface RemotePlayerMoved {
    player: RemotePlayerInterface;
    newPosition: PlayerPosition;
    oldPosition: PlayerPosition;
}
