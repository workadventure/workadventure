import { MONGO_HOST, MONGO_PORT, MONGO_DB, MONGO_USER, MONGO_PASSWORD } from "../Environement/Environement";
import { connect } from 'mongoose';

class MongoDBConnexionManager {
    constructor() {
        console.info(`⚡️[MongoDBConnexionManager]: Connecting to mongoDB database: ${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`);
        connect(`mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`, {})
        .then(() => {
            console.info(`⚡️[MongoDBConnexionManager]: Connected to mongoDB database: ${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`);
        })
        .catch((error) => {
            console.error('Error while connecting to mongoDB database: ', error);
        });
    }
}

export default new MongoDBConnexionManager();
