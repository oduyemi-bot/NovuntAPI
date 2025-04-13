import dotenv from "dotenv";

dotenv.config();

const dbName = process.env.DB_NAME || "novuntdb";
const dbHost = "127.0.0.1";
const dbPort = 27017; 

export const dbConfig = {
    url: `mongodb://${dbHost}:${dbPort}/${dbName}`
};