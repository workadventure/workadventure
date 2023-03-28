import dotenv from 'dotenv';
dotenv.config();

// export environment variables API_TOKEN
export const API_TOKEN = process.env.API_TOKEN||"MySuperSecretToken";

// export environment variables PORT
export const PORT = process.env.PORT||8080;
