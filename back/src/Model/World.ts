import {MessageUserPosition, Point} from "./Websocket/MessageUserPosition";
import {PointInterface} from "./Websocket/PointInterface";
import {Group} from "./Group";
import {Distance} from "./Distance";

export class World {
    static readonly MIN_DISTANCE = 12;

    // Users, sorted by ID
    private users: Map<string, PointInterface>;
    private groups: Group[];

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
        let context = this;
        let usersToBeGroupedWith: Distance[] = [];
        this.users.forEach(function(user, userId) {
            let distance = World.computeDistance(userPosition.position, user); // compute distance between peers.
            if(distance <= World.MIN_DISTANCE) {
                if(context.groups.length > 0) {
                    
                    context.groups.forEach(group => {
                        if(group.isPartOfGroup(userPosition)) { // Is the user in a group ?
                            if(group.isStillIn(userPosition)) { // Is the user leaving the group ? (is the user at more than max distance of each player)
                                
                                // Should we split the group? (is each player reachable from the current player?)
                                // This is needed if
                                //         A <==> B <==> C <===> D
                                // becomes A <==> B <=====> C <> D
                                // If C moves right, the distance between B and C is too great and we must form 2 groups

                            }
                        } else {
                            // If the user is in no group
                            // Is there someone in a group close enough and with room in the group ?
                        }
                    });

                } else {
                    // Aucun groupe n'existe donc je stock les users assez proches de moi
                    let dist = {
                        distance: distance,
                        first: userPosition,
                        second: user // TODO: convertir en messageUserPosition
                    }
                    usersToBeGroupedWith.push(dist);
                }
            }
        
        }, context);

        usersToBeGroupedWith.sort(World.compareDistances);
       // TODO : vérifier qu'ils ne sont pas déja dans un groupe plein 

    }

    public static computeDistance(user1: PointInterface, user2: PointInterface): number
    {
        return Math.sqrt(Math.pow(user2.x - user1.x, 2) + Math.pow(user2.y - user1.y, 2));
    }

    getDistancesBetweenGroupUsers(group: Group): Distance[]
    {
        let i = 0;
        let users = group.getUsers();
        let distances: Distance[] = [];
        users.forEach(function(user1, key1) {
            users.forEach(function(user2, key2) {
                if(key1 < key2) {
                    distances[i] = {
                        distance: World.computeDistance(user1.position, user2.position),
                        first: user1,
                        second: user2
                    };
                    i++;
                }
            });
        });
        
        distances.sort(World.compareDistances);

        return distances;
    }

    filterGroup(distances: Distance[], group: Group): void
    {
        let users = group.getUsers();
        let usersToRemove = false;
        let groupTmp: MessageUserPosition[] = [];
        distances.forEach(dist => {
            if(dist.distance <= World.MIN_DISTANCE) {
                let users = [dist.first];
                let usersbis = [dist.second]
                groupTmp.push(dist.first);
                groupTmp.push(dist.second);
            } else {
                usersToRemove = true;
            }
        });

        if(usersToRemove) {
            // Detecte le ou les users qui se sont fait sortir du groupe
            let difference = users.filter(x => !groupTmp.includes(x));

            // TODO : Notify users un difference that they have left the group 
        }

        let newgroup = new Group(groupTmp);
        this.groups.push(newgroup);
    }

    private static compareDistances(distA: Distance, distB: Distance): number
    {
        if (distA.distance < distB.distance) {
            return -1;
        }
        if (distA.distance > distB.distance) {
            return 1;
        }
        return 0;
    }
}