// Constants
let MIN_DISTANCE = 12;
let MAX_PER_GROUP = 3;
let NB_USERS = 10;

// Utils
let rand = function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

let compareDistances = function(distA, distB) {
    if (distA.distance < distB.distance) {
        return -1;
    }
    if (distA.distance > distB.distance) {
        return 1;
    }
    return 0;
};

let computeDistance = function (user1, user2) {
    return Math.sqrt(Math.pow(user2.X - user1.X, 2) + Math.pow(user2.Y - user1.Y, 2));
};

// Test Data
let users = [];
for(let i = 1; i <= NB_USERS; i++) {
    let user = {};
    user.id = rand(0,99999);
    user.X = rand(0, 40);
    user.Y = rand(0, 40);
    users.push(user);
}

// Compute distance between each user
let getDistanceOfEachUser = function(users) {
    let i = 0;
    let distances = [];

    users.forEach(function(user1, key1) {
        users.forEach(function(user2, key2) {
            if(key1 < key2) {
                let distanceObj = {};
                distanceObj.distance = computeDistance(user1, user2);
                distanceObj.first = user1;
                distanceObj.second = user2;

                distances[i] = distanceObj;
                i++;
            }
        });
    });

    return distances;
};

// Organise groups
let createGroups = function(distances) {
    let i = 0;
    let groups = [];
    let alreadyInAGroup = [];

    for(let j = 0; j < distances.length; j++) {
        let dist = distances[j];

        if(dist.distance <= MIN_DISTANCE) {
            if(typeof groups[i] === 'undefined') {
                groups[i] = [];
            }

            if(groups[i].indexOf(dist.first) === -1 && typeof alreadyInAGroup[dist.first.id] === 'undefined') {
                if(groups[i].length > 1) {
                    // if group is not empty we check current user can be added in the group according to its distance to the others already in it
                    for(let l = 0; l < groups[i].length; l++) {
                        let userTotest = groups[i][l];
                        if(computeDistance(dist.first, userTotest) <= MIN_DISTANCE) {
                            groups[i].push(dist.first);
                            alreadyInAGroup[dist.first.id] = true;
                            break;
                        }
                    }
                } else {
                    groups[i].push(dist.first);
                    alreadyInAGroup[dist.first.id] = true;
                }
            }

            if(groups[i].length === MAX_PER_GROUP) {
                i++; // on créé un nouveau groupe
                if(i > (NB_USERS / MAX_PER_GROUP)) {
                    console.log('There is no room left for user ID : ' + dist.second.id + ' !');
                    break;
                }
                continue;
            }

            if(groups[i].indexOf(dist.second) === -1 && typeof alreadyInAGroup[dist.second.id] === 'undefined') {
                if(groups[i].length > 1) {
                    // if group is not empty we check current user can be added in the group according to its distance to the others already in it
                    for(let l = 0; l < groups[i].length; l++) {
                        let userTotest = groups[i][l];
                        if(computeDistance(dist.second, userTotest) <= MIN_DISTANCE) {
                            groups[i].push(dist.second);
                            alreadyInAGroup[dist.second.id] = true;
                            break;
                        }
                    }
                } else {
                    groups[i].push(dist.second);
                    alreadyInAGroup[dist.second.id] = true;
                }
            }
        }
    }

    return groups;
};

let distances = getDistanceOfEachUser(users);

// ordonner par distance pour prioriser l'association en groupe des utilisateurs les plus proches
distances.sort(compareDistances);

let groups = createGroups(distances);

// Compute distance between each user of a already existing group
let checkGroupDistance = function(groups) {
    for(let i = 0; i < groups.length; i++) {
        let group = groups[i];
            group.forEach(function(user1, key1) {
                group.forEach(function(user2, key2) {
                    if(key1 < key2) {
                        let distance = computeDistance(user1, user2);
                        if(distance > MIN_DISTANCE) {
                            // TODO : message a user1 et user2
                        }
                    }
            });
        });
    }
};

console.log(users);
console.log(distances);
console.log(groups);

