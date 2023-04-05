db.getSiblingDB('admin').auth(
    process.env.MONGO_INITDB_ROOT_USERNAME,
    process.env.MONGO_INITDB_ROOT_PASSWORD
);
// Create user for database
db.createUser({
    user: process.env.MONGO_INIT_USER,
    pwd: process.env.MONGO_INIT_PASSWORD,
    roles: [
        {
            role: "readWrite",
            db: process.env.MONGO_INITDB_DATABASE
        }
    ]
});

/* dump database, exemple cmd docker
* docker exec -i workadventure-saas-marketplacemongodb-1 mongodump --uri mongodb://root:root@marketplacemongodb:27017/marketplace --out /dump/dump-28032023
* docker cp workadventure-saas-marketplacemongodb-1:/dump/dump-28032023 workadventure/marketplace/database
**/
