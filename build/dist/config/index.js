"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = exports.db = exports.dbConfig = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongodb_session_1 = __importDefault(require("connect-mongodb-session"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoDBURI = process.env.MONGODB_URI !== undefined ? process.env.MONGODB_URI : "mongodb://127.0.0.1:27017/novuntdb";
const dbName = process.env.DB_NAME || "novuntdb";
const dbHost = "127.0.0.1";
const dbPort = 27017;
exports.dbConfig = {
    url: `mongodb://${dbHost}:${dbPort}/${dbName}`
};
mongoose_1.default
    .connect(mongoDBURI)
    .catch((e) => {
    console.error("MongoDB connection error:", e.message);
    process.exit(1);
});
const db = mongoose_1.default.connection;
exports.db = db;
db.on("error", (error) => {
    console.error("MongoDB connection error:", error);
});
db.once("open", () => {
    console.log("Connected to MongoDB");
});
const MongoDBStore = (0, connect_mongodb_session_1.default)(express_session_1.default);
const store = new MongoDBStore({
    uri: mongoDBURI,
    collection: 'sessions'
});
exports.store = store;
store.on('error', function (error) {
    console.error('Session Store Error:', error);
});
