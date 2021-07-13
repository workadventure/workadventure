import { ExSocketInterface } from "_Model/Websocket/ExSocketInterface";
import { PositionDispatcher } from "./PositionDispatcher";
import { ViewportInterface } from "_Model/Websocket/ViewportMessage";
import { arrayIntersect } from "../Services/ArrayHelper";
import { ZoneEventListener } from "_Model/Zone";

export enum GameRoomPolicyTypes {
    ANONYMOUS_POLICY = 1,
    MEMBERS_ONLY_POLICY,
    USE_TAGS_POLICY,
}

export class PusherRoom {
    private readonly positionNotifier: PositionDispatcher;
    public tags: string[];
    public policyType: GameRoomPolicyTypes;
    private versionNumber: number = 1;

    constructor(public readonly roomUrl: string, private socketListener: ZoneEventListener) {
        this.tags = [];
        this.policyType = GameRoomPolicyTypes.ANONYMOUS_POLICY;

        // A zone is 10 sprites wide.
        this.positionNotifier = new PositionDispatcher(this.roomUrl, 320, 320, this.socketListener);
    }

    public setViewport(socket: ExSocketInterface, viewport: ViewportInterface): void {
        this.positionNotifier.setViewport(socket, viewport);
    }

    public leave(socket: ExSocketInterface) {
        this.positionNotifier.removeViewport(socket);
    }

    public canAccess(userTags: string[]): boolean {
        return arrayIntersect(userTags, this.tags);
    }

    public isEmpty(): boolean {
        return this.positionNotifier.isEmpty();
    }

    public needsUpdate(versionNumber: number): boolean {
        if (this.versionNumber < versionNumber) {
            this.versionNumber = versionNumber;
            return true;
        } else {
            return false;
        }
    }
}
