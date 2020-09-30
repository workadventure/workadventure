import {MessageUserPosition, Point} from "./Websocket/MessageUserPosition";
import {PointInterface} from "./Websocket/PointInterface";
import {Group} from "./Group";
import {Distance} from "./Distance";
import {User} from "./User";
import {ExSocketInterface} from "_Model/Websocket/ExSocketInterface";
import {PositionInterface} from "_Model/PositionInterface";
import {Identificable} from "_Model/Websocket/Identificable";
import {EntersCallback, LeavesCallback, MovesCallback, Zone} from "_Model/Zone";
import {PositionNotifier} from "./PositionNotifier";
import {ViewportInterface} from "_Model/Websocket/ViewportMessage";
import {Movable} from "_Model/Movable";

export type ConnectCallback = (user: User, group: Group) => void;
export type DisconnectCallback = (user: User, group: Group) => void;

export class World {
    private readonly minDistance: number;
    private readonly groupRadius: number;

    // Users, sorted by ID
    private readonly users: Map<number, User>;
    private readonly groups: Set<Group>;

    private readonly connectCallback: ConnectCallback;
    private readonly disconnectCallback: DisconnectCallback;

    private itemsState: Map<number, unknown> = new Map<number, unknown>();

    private readonly positionNotifier: PositionNotifier;

    constructor(connectCallback: ConnectCallback,
                disconnectCallback: DisconnectCallback,
                minDistance: number,
                groupRadius: number,
                onEnters: EntersCallback,
                onMoves: MovesCallback,
                onLeaves: LeavesCallback)
    {
        this.users = new Map<number, User>();
        this.groups = new Set<Group>();
        this.connectCallback = connectCallback;
        this.disconnectCallback = disconnectCallback;
        this.minDistance = minDistance;
        this.groupRadius = groupRadius;
        // A zone is 10 sprites wide.
        this.positionNotifier = new PositionNotifier(320, 320, onEnters, onMoves, onLeaves);
    }

    public getGroups(): Group[] {
        return Array.from(this.groups.values());
    }

    public getUsers(): Map<number, User> {
        return this.users;
    }

    public join(socket : ExSocketInterface, userPosition: PointInterface): void {
        const user = new User(socket.userId, userPosition, false, this.positionNotifier, socket);
        this.users.set(socket.userId, user);
        // Let's call update position to trigger the join / leave room
        //this.updatePosition(socket, userPosition);
        this.updateUserGroup(user);
    }

    public leave(user : Identificable){
        const userObj = this.users.get(user.userId);
        if (userObj === undefined) {
            console.warn('User ', user.userId, 'does not belong to world! It should!');
        }
        if (userObj !== undefined && typeof userObj.group !== 'undefined') {
            this.leaveGroup(userObj);
        }
        this.users.delete(user.userId);

        if (userObj !== undefined) {
            this.positionNotifier.removeViewport(userObj);
            this.positionNotifier.leave(userObj);
        }
    }

    public isEmpty(): boolean {
        return this.users.size === 0;
    }

    public updatePosition(socket : Identificable, userPosition: PointInterface): void {
        const user = this.users.get(socket.userId);
        if(typeof user === 'undefined') {
            return;
        }

        user.setPosition(userPosition);

        this.updateUserGroup(user);
    }

    private updateUserGroup(user: User): void {
        user.group?.updatePosition();

        if (user.silent) {
            return;
        }

        if (user.group === undefined) {
            // If the user is not part of a group:
            //  should he join a group?
            const closestItem: User|Group|null = this.searchClosestAvailableUserOrGroup(user);

            if (closestItem !== null) {
                if (closestItem instanceof Group) {
                    // Let's join the group!
                    closestItem.join(user);
                } else {
                    const closestUser : User = closestItem;
                    const group: Group = new Group([
                        user,
                        closestUser
                    ], this.connectCallback, this.disconnectCallback, this.positionNotifier);
                    this.groups.add(group);
                }
            }

        } else {
            // If the user is part of a group:
            //  should he leave the group?
            const distance = World.computeDistanceBetweenPositions(user.getPosition(), user.group.getPosition());
            if (distance > this.groupRadius) {
                this.leaveGroup(user);
            }
        }
    }

    setSilent(socket: Identificable, silent: boolean) {
        const user = this.users.get(socket.userId);
        if(typeof user === 'undefined') {
            console.warn('In setSilent, could not find user with ID "'+socket.userId+'" in world.');
            return;
        }
        if (user.silent === silent) {
            return;
        }

        user.silent = silent;
        if (silent && user.group !== undefined) {
            this.leaveGroup(user);
        }
        if (!silent) {
            // If we are back to life, let's trigger a position update to see if we can join some group.
            this.updatePosition(socket, user.getPosition());
        }
    }

    /**
     * Makes a user leave a group and closes and destroy the group if the group contains only one remaining person.
     *
     * @param user
     */
    private leaveGroup(user: User): void {
        const group = user.group;
        if (group === undefined) {
            throw new Error("The user is part of no group");
        }
        const oldPosition = group.getPosition();
        group.leave(user);
        if (group.isEmpty()) {
            this.positionNotifier.leave(group);
            group.destroy();
            if (!this.groups.has(group)) {
                throw new Error("Could not find group "+group.getId()+" referenced by user "+user.id+" in World.");
            }
            this.groups.delete(group);
        } else {
            group.updatePosition();
            //this.positionNotifier.updatePosition(group, group.getPosition(), oldPosition);
        }
    }

    /**
     * Looks for the closest user that is:
     * - close enough (distance <= minDistance)
     * - not in a group
     * - not silent
     * OR
     * - close enough to a group (distance <= groupRadius)
     */
    private searchClosestAvailableUserOrGroup(user: User): User|Group|null
    {
        let minimumDistanceFound: number = Math.max(this.minDistance, this.groupRadius);
        let matchingItem: User | Group | null = null;
        this.users.forEach((currentUser, userId) => {
            // Let's only check users that are not part of a group
            if (typeof currentUser.group !== 'undefined') {
                return;
            }
            if(currentUser === user) {
                return;
            }
            if (currentUser.silent) {
                return;
            }

            const distance = World.computeDistance(user, currentUser); // compute distance between peers.

            if(distance <= minimumDistanceFound && distance <= this.minDistance) {
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

        this.groups.forEach((group: Group) => {
            if (group.isFull()) {
                return;
            }
            const distance = World.computeDistanceBetweenPositions(user.getPosition(), group.getPosition());
            if(distance <= minimumDistanceFound && distance <= this.groupRadius) {
                minimumDistanceFound = distance;
                matchingItem = group;
            }
        });

        return matchingItem;
    }

    public static computeDistance(user1: User, user2: User): number
    {
        const user1Position = user1.getPosition();
        const user2Position = user2.getPosition();
        return Math.sqrt(Math.pow(user2Position.x - user1Position.x, 2) + Math.pow(user2Position.y - user1Position.y, 2));
    }

    public static computeDistanceBetweenPositions(position1: PositionInterface, position2: PositionInterface): number
    {
        return Math.sqrt(Math.pow(position2.x - position1.x, 2) + Math.pow(position2.y - position1.y, 2));
    }

    public setItemState(itemId: number, state: unknown) {
        this.itemsState.set(itemId, state);
    }

    public getItemsState(): Map<number, unknown> {
        return this.itemsState;
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
    setViewport(socket : Identificable, viewport: ViewportInterface): Movable[] {
        const user = this.users.get(socket.userId);
        if(typeof user === 'undefined') {
            console.warn('In setViewport, could not find user with ID "'+socket.userId+'" in world.');
            return [];
        }
        return this.positionNotifier.setViewport(user, viewport);
    }
}
