import {MessageUserPosition, Point} from "./Websocket/MessageUserPosition";
import {PointInterface} from "./Websocket/PointInterface";
import {Group} from "./Group";
import {Distance} from "./Distance";
import {UserInterface} from "./UserInterface";
import {ExSocketInterface} from "_Model/Websocket/ExSocketInterface";

export class World {
    static readonly MIN_DISTANCE = 160;

    // Users, sorted by ID
    private users: Map<string, UserInterface>;
    private groups: Group[];

    private connectCallback: (user1: string, user2: string, group: Group) => void;
    private disconnectCallback: (user1: string, user2: string, group: Group) => void;

    constructor(connectCallback: (user1: string, user2: string, group: Group) => void, disconnectCallback: (user1: string, user2: string, group: Group) => void)
    {
        this.users = new Map<string, UserInterface>();
        this.groups = [];
        this.connectCallback = connectCallback;
        this.disconnectCallback = disconnectCallback;
    }    

    public join(userPosition: MessageUserPosition): void {
        this.users.set(userPosition.userId, {
            id: userPosition.userId,
            position: userPosition.position
        });
    }

    public leave(user : ExSocketInterface){
        /*TODO leaver user in group*/
        this.users.delete(user.userId);
    }

    public updatePosition(userPosition: MessageUserPosition): void {
        let user = this.users.get(userPosition.userId);
        if(typeof user === 'undefined') {
            return;
        }

        user.position.x = userPosition.position.x;
        user.position.y = userPosition.position.y;

        if (typeof user.group === 'undefined') {
            // If the user is not part of a group:
            //  should he join a group?
            let closestUser: UserInterface|null = this.searchClosestAvailableUser(user);
            if (closestUser !== null) {
                // Is the closest user part of a group?
                if (typeof closestUser.group === 'undefined') {
                    let group: Group = new Group([
                        user,
                        closestUser
                    ], this.connectCallback, this.disconnectCallback);
                } else {
                    closestUser.group.join(user);
                }
            }
        }
       // TODO : vérifier qu'ils ne sont pas déja dans un groupe plein
    }

    /**
     * Looks for the closest user that is:
     * - close enough (distance <= MIN_DISTANCE)
     * - not in a group OR in a group that is not full
     */
    private searchClosestAvailableUser(user: UserInterface): UserInterface|null
    {
/*
        let sortedUsersByDistance: UserInteface[] = Array.from(this.users.values()).sort((user1: UserInteface, user2: UserInteface): number => {
            let distance1 = World.computeDistance(user, user1);
            let distance2 = World.computeDistance(user, user2);
            return distance1 - distance2;
        });

        // The first element should be the current user (distance 0). Let's remove it.
        if (sortedUsersByDistance[0] === user) {
            sortedUsersByDistance.shift();
        }

        for(let i = 0; i < sortedUsersByDistance.length; i++) {
            let currentUser = sortedUsersByDistance[i];
            let distance = World.computeDistance(currentUser, user);
            if(distance > World.MIN_DISTANCE) {
                return;
            }
        }
*/
        let usersToBeGroupedWith: Distance[] = [];
        let minimumDistanceFound: number = World.MIN_DISTANCE;
        let matchingUser: UserInterface | null = null;
        this.users.forEach(function(currentUser, userId) {
            if(currentUser === user) {
                return;
            }

            let distance = World.computeDistance(user, currentUser); // compute distance between peers.
            
            if(distance <= minimumDistanceFound) {

                if (typeof currentUser.group === 'undefined' || !currentUser.group.isFull()) {
                    // We found a user we can bind to.
                    minimumDistanceFound = distance;
                    matchingUser = currentUser;
                    return;
                }
            /*
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
                    let dist: Distance = {
                        distance: distance,
                        first: userPosition,
                        second: user // TODO: convertir en messageUserPosition
                    }
                    usersToBeGroupedWith.push(dist);
                }
            */
            }
        
        }, this.users);

        return matchingUser;
    }

    public static computeDistance(user1: UserInterface, user2: UserInterface): number
    {
        return Math.sqrt(Math.pow(user2.position.x - user1.position.x, 2) + Math.pow(user2.position.y - user1.position.y, 2));
    }

    /*getDistancesBetweenGroupUsers(group: Group): Distance[]
    {
        let i = 0;
        let users = group.getUsers();
        let distances: Distance[] = [];
        users.forEach(function(user1, key1) {
            users.forEach(function(user2, key2) {
                if(key1 < key2) {
                    distances[i] = {
                        distance: World.computeDistance(user1, user2),
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
    }*/
}