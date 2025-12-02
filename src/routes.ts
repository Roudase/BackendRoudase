import { Router } from "express";

const router = Router();

router.get("/healthcheck", (_req, res) => {
  res.status(200).json({
    date: new Date().toISOString(),
    status: "ok"
  });
});

export default router;
