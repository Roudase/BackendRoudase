import express, { Request, Response, NextFunction } from "express";
import router from "./routes";

const app = express();

app.use(express.json());
app.use("/", router);

app.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unexpected error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
);

export default app;
