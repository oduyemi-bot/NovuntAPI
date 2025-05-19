import express, { Application } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { db, store } from "./config/index"; 
import "./jobs/depositListener";
import "./jobs/stakeRoiPayout"; 
import AppError from "./utils/app.error";
import "./utils/mockNowPayments";
import "./utils/mockDepositListener";
import "./utils/mockWithdrawalListener";
import appRoutes from "./routes/app.route";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import transactionRoutes from "./routes/transaction.route";
import adminRoutes from "./routes/admin.route";
import withdrawalRoutes from "./routes/withdrawal.route";
import walletRoutes from "./routes/wallet.route";
import referralBonusRoutes from "./routes/bonus.route";
import transferRoutes from "./routes/transfer.route";
import { checkMockNowPaymentsDeposits, simulateDepositConfirmation } from "./utils/mockNowPayments";
import { mockNowPaymentsWithdraw } from "./utils/mockNowPayments";


dotenv.config();
const app: Application = express();


setInterval(async () => {
  const deposits = await checkMockNowPaymentsDeposits();
  for (const deposit of deposits) {
    simulateDepositConfirmation(deposit); 
  }
}, 5000);

mockNowPaymentsWithdraw({
  userId: "6810d6a7380c8efae91eac5d",
  address: "usdt_mock_wallet_address_here",
  amount: 50,
});

const corsOptions = {
  origin: ["http://localhost:3000", "https://drabux-mu.vercel.app"],
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("Headers:", req.headers);
  console.log("Request Body:", req.body);
  next();
});


// Session configuration
app.use(session({
  secret: process.env.SECRET_KEY!,
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));




app.use(helmet());
app.use(rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit to 10 requests per IP
}));


// Routes
app.use("/api/v1", appRoutes);  
app.use("/api/v1/auth", authRoutes); 
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/withdrawals", withdrawalRoutes);
app.use("/api/v1/wallets", walletRoutes);
app.use("/api/v1/bonus", referralBonusRoutes);
app.use("/api/v1/transfer", transferRoutes);


app.all("*", (req, res, next) => {
  next(new AppError(`The route ${req.originalUrl} with the ${req.method} method does not exist on this server! 💨`, 404));
});


// Global error handling middleware
app.use((err: AppError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

db.once("open", () => {
  console.log("Connected to MongoDB");

  const PORT: number | string = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

db.on("error", console.error.bind(console, "MongoDB Connection Error:"));

export default app;