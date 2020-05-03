import {MessageUserPosition, Point} from "./Websocket/MessageUserPosition";
import {PointInterface} from "./Websocket/PointInterface";
import {Group} from "./Group";
import {Distance} from "./Distance";
import {UserInterface} from "./UserInterface";
import {ExSocketInterface} from "_Model/Websocket/ExSocketInterface";
import {PositionInterface} from "_Model/PositionInterface";

export type ConnectCallback = (user: string, group: Group) => void;
export type DisconnectCallback = (user: string, group: Group) => void;

export class World {
    static readonly MIN_DISTANCE = 160;

    // Users, sorted by ID
    private users: Map<string, UserInterface>;
    private groups: Group[];

    private connectCallback: ConnectCallback;
    private disconnectCallback: DisconnectCallback;

    constructor(connectCallback: ConnectCallback, disconnectCallback: DisconnectCallback)
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
        // Let's call update position to trigger the join / leave room
        this.updatePosition(userPosition);
    }

    public leave(user : ExSocketInterface){
        let userObj = this.users.get(user.id);
        if (userObj !== undefined && typeof userObj.group !== 'undefined') {
            this.leaveGroup(user);
        }
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
            let closestItem: UserInterface|Group|null = this.searchClosestAvailableUserOrGroup(user);

            if (closestItem !== null) {
                if (closestItem instanceof Group) {
                    // Let's join the group!
                    closestItem.join(user);
                } else {
                    let closestUser : UserInterface = closestItem;
                    let group: Group = new Group([
                        user,
                        closestUser
                    ], this.connectCallback, this.disconnectCallback);
                    this.groups.push(group);
                }
            }

        } else {
            // If the user is part of a group:
            //  should he leave the group?
            let distance = World.computeDistanceBetweenPositions(user.position, user.group.getPosition());
            if (distance > World.MIN_DISTANCE) {
                this.leaveGroup(user);
            }
        }
    }

    /**
     * Makes a user leave a group and closes and destroy the group if the group contains only one remaining person.
     *
     * @param user
     */
    private leaveGroup(user: UserInterface): void {
        let group = user.group;
        if (typeof group === 'undefined') {
            throw new Error("The user is part of no group");
        }
        group.leave(user);

        if (group.isEmpty()) {
            group.destroy();
            const index = this.groups.indexOf(group, 0);
            if (index === -1) {
                throw new Error("Could not find group");
            }
            this.groups.splice(index, 1);
        }
    }

    /**
     * Looks for the closest user that is:
     * - close enough (distance <= MIN_DISTANCE)
     * - not in a group OR in a group that is not full
     */
    private searchClosestAvailableUserOrGroup(user: UserInterface): UserInterface|Group|null
    {
        let usersToBeGroupedWith: Distance[] = [];
        let minimumDistanceFound: number = World.MIN_DISTANCE;
        let matchingItem: UserInterface | Group | null = null;
        this.users.forEach(function(currentUser, userId) {
            // Let's only check users that are not part of a group
            if (typeof currentUser.group !== 'undefined') {
                return;
            }
            if(currentUser === user) {
                return;
            }

            let distance = World.computeDistance(user, currentUser); // compute distance between peers.

            if(distance <= minimumDistanceFound) {
                minimumDistanceFound = distance;
                matchingItem = currentUser;
            }
                /*if (typeof currentUser.group === 'undefined' || !currentUser.group.isFull()) {
                    // We found a user we can bind to.
                    return;
                }*/
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
        });

        this.groups.forEach(function(group: Group) {
            if (group.isFull()) {
                return;
            }
            let distance = World.computeDistanceBetweenPositions(user.position, group.getPosition());
            if(distance <= minimumDistanceFound) {
                minimumDistanceFound = distance;
                matchingItem = group;
            }
        });

        return matchingItem;
    }

    public static computeDistance(user1: UserInterface, user2: UserInterface): number
    {
        return Math.sqrt(Math.pow(user2.position.x - user1.position.x, 2) + Math.pow(user2.position.y - user1.position.y, 2));
    }

    public static computeDistanceBetweenPositions(position1: PositionInterface, position2: PositionInterface): number
    {
        return Math.sqrt(Math.pow(position2.x - position1.x, 2) + Math.pow(position2.y - position1.y, 2));
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
