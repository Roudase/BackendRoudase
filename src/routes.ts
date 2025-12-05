import { Router, Request, Response, NextFunction } from "express";
import prisma from "./db";

const router = Router();

interface CreateUserBody {
  name?: string;
}

interface CreateCategoryBody {
  name?: string;
}

interface CreateRecordBody {
  userId?: number;
  categoryId?: number;
  amount?: number;
  currencyId?: number;
}

interface CreateCurrencyBody {
  code?: string;
  name?: string;
}

interface SetUserCurrencyBody {
  currencyId?: number;
}

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

const asyncHandler =
  (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  "/healthcheck",
  asyncHandler(async (_req, res) => {
    res.status(200).json({
      date: new Date().toISOString(),
      status: "ok",
    });
  })
);

// POST /user
router.post(
  "/user",
  asyncHandler(async (req, res) => {
    const { name } = req.body as CreateUserBody;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Field 'name' is required" });
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
      },
    });

    return res.status(201).json(user);
  })
);

// GET /user/<user_id>
router.get(
  "/user/:userId",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { defaultCurrency: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  })
);

// DELETE /user/<user_id>
router.delete(
  "/user/:userId",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    await prisma.record.deleteMany({
      where: { userId },
    });

    await prisma.user.delete({
      where: { id: userId },
    });

    return res.status(204).send();
  })
);

// GET /users
router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: { defaultCurrency: true },
    });
    return res.status(200).json(users);
  })
);

// PATCH /user/:userId/currency
router.patch(
  "/user/:userId/currency",
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const { currencyId } = req.body as SetUserCurrencyBody;
    if (typeof currencyId !== "number") {
      return res
        .status(400)
        .json({ message: "Field 'currencyId' is required and must be number" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currency = await prisma.currency.findUnique({
      where: { id: currencyId },
    });
    if (!currency) {
      return res.status(404).json({ message: "Currency not found" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        defaultCurrencyId: currencyId,
      },
      include: { defaultCurrency: true },
    });

    return res.status(200).json(updated);
  })
);

// GET /category
router.get(
  "/category",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany();
    return res.status(200).json(categories);
  })
);

// POST /category
router.post(
  "/category",
  asyncHandler(async (req, res) => {
    const { name } = req.body as CreateCategoryBody;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Field 'name' is required" });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
      },
    });

    return res.status(201).json(category);
  })
);

// DELETE /category?id=1
router.delete(
  "/category",
  asyncHandler(async (req, res) => {
    const idParam = req.query.id as string | undefined;

    if (!idParam) {
      return res
        .status(400)
        .json({ message: "Query parameter 'id' is required" });
    }

    const categoryId = Number(idParam);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!existing) {
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

// GET /currency
router.get(
  "/currency",
  asyncHandler(async (_req, res) => {
    const currencies = await prisma.currency.findMany();
    return res.status(200).json(currencies);
  })
);

// POST /currency
router.post(
  "/currency",
  asyncHandler(async (req, res) => {
    const { code, name } = req.body as CreateCurrencyBody;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Field 'code' is required" });
    }
    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Field 'name' is required" });
    }

    const currency = await prisma.currency.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
      },
    });

    return res.status(201).json(currency);
  })
);

// DELETE /currency/:id
router.delete(
  "/currency/:id",
  asyncHandler(async (req, res) => {
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

    const recordsCount = await prisma.record.count({
      where: { currencyId },
    });

    if (recordsCount > 0) {
      return res.status(400).json({
        message: "Cannot delete currency: there are records using this currency",
      });
    }

    await prisma.currency.delete({
      where: { id: currencyId },
    });

    return res.status(204).send();
  })
);

// POST /record
router.post(
  "/record",
  asyncHandler(async (req, res) => {
    const { userId, categoryId, amount, currencyId } =
      req.body as CreateRecordBody;

    if (
      typeof userId !== "number" ||
      typeof categoryId !== "number" ||
      typeof amount !== "number"
    ) {
      return res.status(400).json({
        message:
          "Fields 'userId', 'categoryId' and 'amount' are required and must be numbers",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res.status(400).json({ message: "Category does not exist" });
    }

    let finalCurrencyId: number | null = null;

    if (typeof currencyId === "number") {
      const currency = await prisma.currency.findUnique({
        where: { id: currencyId },
      });
      if (!currency) {
        return res.status(400).json({ message: "Currency does not exist" });
      }
      finalCurrencyId = currencyId;
    } else {
      if (!user.defaultCurrencyId) {
        return res.status(400).json({
          message:
            "User has no default currency and no currencyId was provided",
        });
      }
      finalCurrencyId = user.defaultCurrencyId;
    }

    const record = await prisma.record.create({
      data: {
        userId,
        categoryId,
        currencyId: finalCurrencyId!,
        amount,
      },
    });

    return res.status(201).json(record);
  })
);

// GET /record/<record_id>
router.get(
  "/record/:recordId",
  asyncHandler(async (req, res) => {
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

    return res.status(200).json(record);
  })
);

// DELETE /record/<record_id>
router.delete(
  "/record/:recordId",
  asyncHandler(async (req, res) => {
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

// GET /record?user_id=&category_id=
router.get(
  "/record",
  asyncHandler(async (req, res) => {
    const userIdParam = req.query.user_id as string | undefined;
    const categoryIdParam = req.query.category_id as string | undefined;

    if (!userIdParam && !categoryIdParam) {
      return res.status(400).json({
        message:
          "At least one of query parameters 'user_id' or 'category_id' is required",
      });
    }

    const where: {
      userId?: number;
      categoryId?: number;
    } = {};

    if (userIdParam) {
      const userId = Number(userIdParam);
      if (Number.isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user_id" });
      }
      where.userId = userId;
    }

    if (categoryIdParam) {
      const categoryId = Number(categoryIdParam);
      if (Number.isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category_id" });
      }
      where.categoryId = categoryId;
    }

    const records = await prisma.record.findMany({
      where,
      include: {
        user: true,
        category: true,
        currency: true,
      },
    });

    return res.status(200).json(records);
  })
);

export default router;
