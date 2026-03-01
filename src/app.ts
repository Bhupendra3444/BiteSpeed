import express from "express";
import identifyRouter from "./routes/identify";

const app = express();

// Middleware
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "BiteSpeed Identity Reconciliation Service is running" });
});

// Routes
app.use("/", identifyRouter);

export default app;
