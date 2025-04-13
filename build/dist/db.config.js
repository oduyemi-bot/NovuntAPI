"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbName = process.env.DB_NAME || "novuntdb";
const dbHost = "127.0.0.1";
const dbPort = 27017;
exports.dbConfig = {
    url: `mongodb://${dbHost}:${dbPort}/${dbName}`
};
