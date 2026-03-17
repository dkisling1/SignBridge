import "./session.d";
import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import router from "./routes";
import { seedMasterAccount } from "./seed";

const app: Express = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET ?? "signbridge-secret-key-change-in-prod",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 60 * 1000,
  },
}));

app.use("/api", router);

seedMasterAccount().catch(console.error);

export default app;
