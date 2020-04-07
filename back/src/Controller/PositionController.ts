import {MessageUserPosition} from "_Model/Websocket/MessageUserPosition";
import {Distance} from "_Model/Distance";

export class PositionController {
    static readonly MIN_DISTANCE = 12;
    static readonly MAX_PER_GROUP = 3;

    constructor ()
    {
        // Injecter socket ?
    }

    getDistancesBetweenAllUsers(users: MessageUserPosition[]): Distance[]
    {
        let i = 0;
        let distances: Distance[] = [];
        users.forEach(function(user1, key1) {
            users.forEach(function(user2, key2) {
                if(key1 < key2) {
                    distances[i] = {
                        distance: PositionController.computeDistance(user1, user2),
                        user1: user1,
                        user2: user2
                    };
                    i++;
                }
            });
        });

        distances.sort(PositionController.compareDistances);

        return distances;
    }

    createGroups(distances: Distance[], nbOfUsers: number, Oldgroups: MessageUserPosition[][]): MessageUserPosition[][]
    {
        // TODO : detect in existing groups if a user must be removed from the group
        let alreadyInAGroup: any[string] = [];
        let groups: MessageUserPosition[][] = [];

        let roomId = 0;
        for(let i = 0; i < distances.length; i++) {
            let dist = distances[i];

            if(dist.distance <= PositionController.MIN_DISTANCE) {
                if(typeof groups[roomId] === 'undefined') {
                    groups[roomId] = [];
                }

                if(groups[roomId].indexOf(dist.user1) === -1 && typeof alreadyInAGroup[dist.user1.userId] === 'undefined') {
                    if(groups[roomId].length > 1) {
                        // if group is not empty we check current user can be added in the group according to its distance to the others already in it
                        for(let j = 0; j < groups[roomId].length; j++) {
                            let userTotest = groups[roomId][j];
                            if(PositionController.computeDistance(dist.user1, userTotest) <= PositionController.MIN_DISTANCE) {
                                groups[roomId].push(dist.user1);
                                alreadyInAGroup[dist.user1.userId] = true;
                                break;
                            }
                        }
                    } else {
                        groups[roomId].push(dist.user1);
                        alreadyInAGroup[dist.user1.userId] = true;
                    }
                }

                if(groups[roomId].length === PositionController.MAX_PER_GROUP) {
                    roomId++; // on créé un nouveau groupe
                    if(roomId > (nbOfUsers / PositionController.MAX_PER_GROUP)) {
                        console.log('There is no room left for user ID : ' + dist.user2.userId + ' !');
                        break;
                    }
                    continue;
                }

                if(groups[roomId].indexOf(dist.user2) === -1 && typeof alreadyInAGroup[dist.user2.userId] === 'undefined') {
                    if(groups[roomId].length > 1) {
                        // if group is not empty we check current user can be added in the group according to its distance to the others already in it
                        for(let j = 0; j < groups[roomId].length; j++) {
                            let userTotest = groups[roomId][j];
                            if(PositionController.computeDistance(dist.user2, userTotest) <= PositionController.MIN_DISTANCE) {
                                groups[roomId].push(dist.user2);
                                alreadyInAGroup[dist.user2.userId] = true;
                                break;
                            }
                        }
                    } else {
                        groups[roomId].push(dist.user2);
                        alreadyInAGroup[dist.user2.userId] = true;
                    }
                }
            }
        }
        return groups;
    }

    // FIXME
    checkGroupDistance (groups: MessageUserPosition[][])
    {
        for(let i = 0; i < groups.length; i++) {
            let group = groups[i];
            group.forEach((user1, key1) => {
                group.forEach((user2, key2) => {
                    if(key1 < key2) {
                        let distance = PositionController.computeDistance(user1, user2);
                        if(distance > PositionController.MIN_DISTANCE) {
                            // TODO : message a user1 et user2
                        }
                    }
                });
            });
        }
    }

    private static computeDistance(user1: MessageUserPosition, user2: MessageUserPosition): number
    {
        return Math.sqrt(Math.pow(user2.position.x - user1.position.x, 2) + Math.pow(user2.position.y - user1.position.y, 2));
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