import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "./db";

const router = express.Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

const asyncHandler =
  (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

interface AuthRequest extends Request {
  userId?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// ---------- Public routes ----------

router.get(
  "/healthcheck",
  (req: Request, res: Response) => {
    res.json({
      date: new Date().toISOString(),
      status: "ok",
    });
  }
);

router.post(
  "/user",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Field 'name' is required" });
    }

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Field 'email' is required" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        defaultCurrencyId: true,
      },
    });

    return res.status(201).json(user);
  })
);

router.post(
  "/auth/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.json({
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        defaultCurrencyId: user.defaultCurrencyId,
      },
    });
  })
);

// ---------- Auth middleware ----------

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({
      error: "authorization_required",
      description: "Request does not contain an access token.",
    });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "invalid_token",
      message: "Authorization header must be in the format: Bearer <token>.",
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; iat: number; exp: number };
    req.userId = payload.userId;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "token_expired",
        message: "The token has expired.",
      });
    }

    return res.status(401).json({
      error: "invalid_token",
      message: "Signature verification failed.",
    });
  }
};

router.use(authMiddleware);

// ---------- Users ----------

router.get(
  "/user/:userId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);

    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        defaultCurrencyId: true,
        defaultCurrency: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  })
);

router.get(
  "/users",
  asyncHandler(async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        defaultCurrencyId: true,
        defaultCurrency: true,
      },
    });
    return res.json(users);
  })
);

router.patch(
  "/user/:userId/currency",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    const { currencyId } = req.body;

    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const parsedCurrencyId = Number(currencyId);
    if (Number.isNaN(parsedCurrencyId)) {
      return res.status(400).json({ message: "Invalid currency id" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currency = await prisma.currency.findUnique({
      where: { id: parsedCurrencyId },
    });

    if (!currency) {
      return res.status(400).json({ message: "Currency does not exist" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { defaultCurrencyId: parsedCurrencyId },
      select: {
        id: true,
        name: true,
        email: true,
        defaultCurrencyId: true,
        defaultCurrency: true,
      },
    });

    return res.json(updated);
  })
);

router.delete(
  "/user/:userId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);

    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    await prisma.user.delete({ where: { id: userId } });

    return res.status(204).send();
  })
);

// ---------- Categories ----------

router.get(
  "/category",
  asyncHandler(async (req: Request, res: Response) => {
    const categories = await prisma.category.findMany();
    return res.json(categories);
  })
);

router.post(
  "/category",
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Field 'name' is required" });
    }

    const category = await prisma.category.create({
      data: { name: name.trim() },
    });

    return res.status(201).json(category);
  })
);

router.delete(
  "/category",
  asyncHandler(async (req: Request, res: Response) => {
    const idParam = req.query.id;

    if (!idParam) {
      return res.status(400).json({ message: "Query parameter 'id' is required" });
    }

    const categoryId = Number(idParam);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await prisma.record.deleteMany({
      where: { categoryId },
    });

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return res.status(204).send();
  })
);

// ---------- Currencies ----------

router.get(
  "/currency",
  asyncHandler(async (req: Request, res: Response) => {
    const currencies = await prisma.currency.findMany();
    return res.json(currencies);
  })
);

router.post(
  "/currency",
  asyncHandler(async (req: Request, res: Response) => {
    const { code, name } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Field 'code' is required" });
    }

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Field 'name' is required" });
    }

    const currency = await prisma.currency.create({
      data: {
        code: code.trim(),
        name: name.trim(),
      },
    });

    return res.status(201).json(currency);
  })
);

router.delete(
  "/currency/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const currencyId = Number(req.params.id);

    if (Number.isNaN(currencyId)) {
      return res.status(400).json({ message: "Invalid currency id" });
    }

    const existing = await prisma.currency.findUnique({
      where: { id: currencyId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Currency not found" });
    }

    await prisma.currency.delete({
      where: { id: currencyId },
    });

    return res.status(204).send();
  })
);

// ---------- Records ----------

router.post(
  "/record",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, categoryId, amount, currencyId } = req.body;

    const parsedUserId = Number(userId);
    const parsedCategoryId = Number(categoryId);
    const parsedAmount = Number(amount);

    if (Number.isNaN(parsedUserId) || Number.isNaN(parsedCategoryId) || Number.isNaN(parsedAmount)) {
      return res.status(400).json({ message: "Fields 'userId', 'categoryId' and 'amount' must be numbers" });
    }

    const user = await prisma.user.findUnique({
      where: { id: parsedUserId },
    });

    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const category = await prisma.category.findUnique({
      where: { id: parsedCategoryId },
    });

    if (!category) {
      return res.status(400).json({ message: "Category does not exist" });
    }

    let finalCurrencyId: number | null = null;

    if (currencyId !== undefined && currencyId !== null) {
      const parsedCurrencyId = Number(currencyId);
      if (Number.isNaN(parsedCurrencyId)) {
        return res.status(400).json({ message: "Invalid currency id" });
      }

      const currency = await prisma.currency.findUnique({
        where: { id: parsedCurrencyId },
      });

      if (!currency) {
        return res.status(400).json({ message: "Currency does not exist" });
      }

      finalCurrencyId = parsedCurrencyId;
    } else {
      if (!user.defaultCurrencyId) {
        return res.status(400).json({
          message: "User has no default currency and no currencyId was provided",
        });
      }
      finalCurrencyId = user.defaultCurrencyId;
    }

    const record = await prisma.record.create({
      data: {
        userId: parsedUserId,
        categoryId: parsedCategoryId,
        currencyId: finalCurrencyId,
        amount: parsedAmount,
      },
    });

    return res.status(201).json(record);
  })
);

router.get(
  "/record/:recordId",
  asyncHandler(async (req: Request, res: Response) => {
    const recordId = Number(req.params.recordId);

    if (Number.isNaN(recordId)) {
      return res.status(400).json({ message: "Invalid record id" });
    }

    const record = await prisma.record.findUnique({
      where: { id: recordId },
      include: {
        user: true,
        category: true,
        currency: true,
      },
    });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    return res.json(record);
  })
);

router.get(
  "/record",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, categoryId } = req.query;

    const where: {
      userId?: number;
      categoryId?: number;
    } = {};

    if (userId !== undefined) {
      const parsedUserId = Number(userId);
      if (Number.isNaN(parsedUserId)) {
        return res.status(400).json({ message: "Invalid userId" });
      }
      where.userId = parsedUserId;
    }

    if (categoryId !== undefined) {
      const parsedCategoryId = Number(categoryId);
      if (Number.isNaN(parsedCategoryId)) {
        return res.status(400).json({ message: "Invalid categoryId" });
      }
      where.categoryId = parsedCategoryId;
    }

    const records = await prisma.record.findMany({
      where,
      include: {
        user: true,
        category: true,
        currency: true,
      },
    });

    return res.json(records);
  })
);

router.delete(
  "/record/:recordId",
  asyncHandler(async (req: Request, res: Response) => {
    const recordId = Number(req.params.recordId);

    if (Number.isNaN(recordId)) {
      return res.status(400).json({ message: "Invalid record id" });
    }

    const existing = await prisma.record.findUnique({
      where: { id: recordId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Record not found" });
    }

    await prisma.record.delete({
      where: { id: recordId },
    });

    return res.status(204).send();
  })
);

export default router;
