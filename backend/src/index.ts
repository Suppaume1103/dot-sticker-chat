// ============================================================
// index.ts — サーバのエントリポイント（起動処理をまとめるファイル）
//
// 今回のゴール：Expressサーバを起動し、/api/health だけを返す最小構成。
// auth・prompts等の実装は次のステップ以降で追加する（backend/CLAUDE.md参照）。
// ============================================================
import "dotenv/config";


import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import promptsRouter from "./routes/prompts";
import stickersRouter from "./routes/stickers";
import messagesRouter from "./routes/messages";

const port: string = process.env.PORT || "3000";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/prompts", promptsRouter);
app.use("/api", stickersRouter);
app.use("/api", messagesRouter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(Number(port), () => {
  console.log(`server listening on port ${port}`);
});
