import dotenv from 'dotenv';
dotenv.config();

// export environment variables API_TOKEN
export const API_TOKEN = process.env.API_TOKEN||"MySuperSecretToken";

// export environment variables PORT
export const PORT = process.env.PORT||8080;

// export environment variables MONGO_HOST
export const MONGO_HOST = process.env.MONGO_HOST||"localhost";
// export environment variables MONGO_PORT
export const MONGO_PORT = process.env.MONGO_PORT||27017;
// export environment variables MONGO_DB
export const MONGO_DB = process.env.MONGO_DB||"test";
// export environment variables MONGO_USER
export const MONGO_USER = process.env.MONGO_USER||"root";
// export environment variables MONGO_PASSWORD
export const MONGO_PASSWORD = process.env.MONGO_PASSWORD||"root";
