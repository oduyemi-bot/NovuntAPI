"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_1 = require("./config/index");
const app_error_1 = __importDefault(require("./utils/app.error"));
const app_route_1 = __importDefault(require("./routes/app.route"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const user_route_1 = __importDefault(require("./routes/user.route"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const corsOptions = {
    origin: ["http://localhost:3000"],
    credentials: true,
};
app.use(express_1.default.json());
app.use((0, cors_1.default)(corsOptions));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log("Headers:", req.headers);
    console.log("Request Body:", req.body);
    next();
});
// Session configuration
app.use((0, express_session_1.default)({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: index_1.store,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));
app.use((0, helmet_1.default)());
app.use((0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // limit to 10 requests per IP
}));
// Routes
app.use("/api/v1", app_route_1.default);
app.use("/api/v1/auth", auth_route_1.default);
app.use("/api/v1/users", user_route_1.default);
app.all("*", (req, res, next) => {
    next(new app_error_1.default(`The route ${req.originalUrl} with the ${req.method} method does not exist on this server! 💨`, 404));
});
// Global error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json(Object.assign({ status: "error", message: err.message }, (process.env.NODE_ENV === 'development' && { stack: err.stack })));
});
index_1.db.once("open", () => {
    console.log("Connected to MongoDB");
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
index_1.db.on("error", console.error.bind(console, "MongoDB Connection Error:"));
exports.default = app;
