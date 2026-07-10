// ============================================================
// index.ts — サーバのエントリポイント（起動処理をまとめるファイル）
// ============================================================
import "dotenv/config";


import { createServer } from "http";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { Server } from "socket.io";
import authRouter from "./routes/auth";
import promptsRouter from "./routes/prompts";
import stickersRouter from "./routes/stickers";
import messagesRouter from "./routes/messages";
import collectionsRouter from "./routes/collections";
import usersRouter from "./routes/users";
import { socketGateway } from "./infrastructure/SocketGateway";
import { promptScheduler } from "./infrastructure/PromptScheduler";

const port: string = process.env.PORT || "3000";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/prompts", promptsRouter);
app.use("/api", stickersRouter);
app.use("/api", messagesRouter);
app.use("/api", collectionsRouter);
app.use("/api", usersRouter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Socket.IOの初期化
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});
socketGateway.init(io);

// スケジューラの起動
promptScheduler.start();

httpServer.listen(Number(port), () => {
  console.log(`server listening on port ${port}`);
});
