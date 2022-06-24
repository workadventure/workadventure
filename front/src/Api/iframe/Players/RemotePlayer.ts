import {AddPlayerEvent} from "../../Events/AddPlayerEvent";
import {PositionInterface} from "../../../Connexion/ConnexionModels";
import {Observable, Subject} from "rxjs";

export const remotePlayers = new Map<number, RemotePlayer>();

export interface RemotePlayerInterface {
    readonly id: number;
    readonly name: string;
    readonly uuid: string;
    /*get availabilityStatus();*/
    readonly outlineColor: number|undefined;
    readonly position: PositionInterface;
    /**
     * A stream updated with the position of this current player.
     */
    readonly position$: Observable<PositionInterface>;
}

export class RemotePlayer implements RemotePlayerInterface {
    private _userId: number;
    private _name: string;
    private _userUuid: string;
    private _availabilityStatus: string;
    private _outlineColor: number|undefined;
    private _position: PositionInterface;

    public constructor(addPlayerEvent: AddPlayerEvent) {
        this._userId = addPlayerEvent.userId;
        this._name = addPlayerEvent.name;
        this._userUuid = addPlayerEvent.userUuid;
        this._availabilityStatus = addPlayerEvent.availabilityStatus;
        this._outlineColor = addPlayerEvent.outlineColor;
        this._position = addPlayerEvent.position;
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

    get position(): PositionInterface {
        return this._position;
    }

    set position(_position: PositionInterface) {
        this._position = _position;
        this._position$.next(_position);
    }

    public readonly _position$ = new Subject<PositionInterface>;
    public readonly position$ = this._position$.asObservable();

    public destroy() {
        this._position$.complete();
    }
}

export interface RemotePlayerMoved {
    player: RemotePlayerInterface,
    newPosition: PositionInterface,
    oldPosition: PositionInterface,
}
