import {AddPlayerEvent} from "../../Events/AddPlayerEvent";
import {PositionInterface} from "../../../Connexion/ConnexionModels";

export const remotePlayers = new Map<number, RemotePlayer>();

export class RemotePlayer {
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
}
