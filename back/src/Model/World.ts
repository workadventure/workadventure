import {MessageUserPosition} from "./Websocket/MessageUserPosition";
import {PointInterface} from "./Websocket/PointInterface";
import {Group} from "./Group";

export class World {
    // Users, sorted by ID
    private users: Map<string, PointInterface>;
    private groups: Group[]
    private connectCallback: (user1: string, user2: string) => void;
    private disconnectCallback: (user1: string, user2: string) => void;

    constructor(connectCallback: (user1: string, user2: string) => void, disconnectCallback: (user1: string, user2: string) => void) 
    {
        this.users = new Map<string, PointInterface>();
        this.groups = [];
        this.connectCallback = connectCallback;
        this.disconnectCallback = disconnectCallback;
    }    

    public join(userPosition: MessageUserPosition): void {
        this.users.set(userPosition.userId, userPosition.position);
    }

    public updatePosition(userPosition: MessageUserPosition): void {
        if(typeof userPosition.userId === 'undefined') {
            throw new Error('unkown id');
        }
        //this.users.get(userPosition.userId).x;

        // TODO: compute distance between peers.

        // Is the user in a group?

        // Is the user leaving the group? (is the user at more than max distance of each player)

        // Should we split the group? (is each player reachable from the current player?)
                // This is needed if
                //         A <==> B <==> C <===> D
                // becomes A <==> B <=====> C <> D
                // If C moves right, the distance between B and C is too great and we must form 2 groups

        // If the user is in no group
        //    is there someone in a group close enough and with room in the group?
    }

}