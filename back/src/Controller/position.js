// Constants
let MIN_DISTANCE = 15;
let MAX_PER_GROUP = 3;
let NB_USERS = 4;

// Utils
let rand = function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
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

console.log(users);

// Compute distance between each user
let computeDistance = function(users) {
    let i = 0;
    let distances = [];

    users.forEach(function(user1, key1) {
        users.forEach(function(user2, key2) {
            if(key1 < key2) {
                let distanceObj = {};
                distanceObj.distance = Math.sqrt(Math.pow(user2.X - user1.X, 2) + Math.pow(user2.Y - user1.Y, 2));
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

            if(groups[i].indexOf(dist.first) === -1 && typeof alreadyInAGroup[dist.first.id] == 'undefined') {
                groups[i].push(dist.first);
                alreadyInAGroup[dist.first.id] = true;
            }

            if(groups[i].length === MAX_PER_GROUP) {
                i++; // on créé un nouveau groupe
                if(i > (NB_USERS / MAX_PER_GROUP)) {
                    console.log('There is no room left for user ID : ' + dist.second.id + ' !');
                    break;
                }
                continue;
            }

            if(groups[i].indexOf(dist.second) === -1 && typeof alreadyInAGroup[dist.second.id] == 'undefined') {
                groups[i].push(dist.second);
                alreadyInAGroup [dist.second.id] = true;
            }
        }
    }

    return groups;
};

let distances = computeDistance(users);
let groups = createGroups(distances);

// TODO : Créer une méthode pour checker la distance entre les membres du groupes pour savoir s'il faut les dissoudre ou non

console.log(distances);
console.log(groups);

