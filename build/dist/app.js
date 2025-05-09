"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
require("./jobs/depositListener");
require("./jobs/stakeRoiPayout");
const app_error_1 = __importDefault(require("./utils/app.error"));
require("./utils/mockNowPayments");
require("./utils/mockDepositListener");
require("./utils/mockWithdrawalListener");
const app_route_1 = __importDefault(require("./routes/app.route"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const user_route_1 = __importDefault(require("./routes/user.route"));
const transaction_route_1 = __importDefault(require("./routes/transaction.route"));
const admin_route_1 = __importDefault(require("./routes/admin.route"));
const withdrawal_route_1 = __importDefault(require("./routes/withdrawal.route"));
const wallet_route_1 = __importDefault(require("./routes/wallet.route"));
const bonus_route_1 = __importDefault(require("./routes/bonus.route"));
const transfer_route_1 = __importDefault(require("./routes/transfer.route"));
const mockNowPayments_1 = require("./utils/mockNowPayments");
const mockNowPayments_2 = require("./utils/mockNowPayments");
dotenv_1.default.config();
const app = (0, express_1.default)();
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    const deposits = yield (0, mockNowPayments_1.checkMockNowPaymentsDeposits)();
    for (const deposit of deposits) {
        (0, mockNowPayments_1.simulateDepositConfirmation)(deposit);
    }
}), 5000);
(0, mockNowPayments_2.mockNowPaymentsWithdraw)({
    userId: "6810d6a7380c8efae91eac5d",
    address: "usdt_mock_wallet_address_here",
    amount: 50,
});
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
app.use("/api/v1/transactions", transaction_route_1.default);
app.use("/api/v1/admin", admin_route_1.default);
app.use("/api/v1/withdrawals", withdrawal_route_1.default);
app.use("/api/v1/wallets", wallet_route_1.default);
app.use("/api/v1/bonus", bonus_route_1.default);
app.use("/api/v1/transfer", transfer_route_1.default);
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
