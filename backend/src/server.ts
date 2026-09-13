import "dotenv/config";
import cors from "cors";
import express from "express";
import contactsRouter from "./routes/contacts";
import assessmentsRouter from "./routes/assessments";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(
    cors({
        origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    }),
);

app.use(express.json({ limit: "16kb" }));

app.get("/health", (_req, res) => {
    res.json({
        ok: true,
        service: "web3-guardian-api",
    });
});

app.use("/api/contacts", contactsRouter);
app.use("/api/assessments", assessmentsRouter);

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Web3 Guardian API running on http://localhost:${PORT}`);
    });
}

export default app;