import { Router, Request, Response } from "express";

const router = Router();

interface User {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface ExpenseRecord {
  id: number;
  userId: number;
  categoryId: number;
  amount: number;
  createdAt: string;
}

let users: User[] = [];
let categories: Category[] = [];
let records: ExpenseRecord[] = [];

let nextUserId = 1;
let nextCategoryId = 1;
let nextRecordId = 1;

router.get("/healthcheck", (_req: Request, res: Response) => {
  res.status(200).json({
    date: new Date().toISOString(),
    status: "ok",
  });
});

// GET /user/<user_id>
router.get("/user/:userId", (req: Request, res: Response) => {
  const userId = Number(req.params.userId);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json(user);
});

// DELETE /user/<user_id>
router.delete("/user/:userId", (req: Request, res: Response) => {
  const userId = Number(req.params.userId);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const existingLength = users.length;
  users = users.filter((u) => u.id !== userId);

  if (users.length === existingLength) {
    return res.status(404).json({ message: "User not found" });
  }

  records = records.filter((r) => r.userId !== userId);

  return res.status(204).send();
});

// POST /user
// body: { "name": "John" }
router.post("/user", (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };

  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "Field 'name' is required" });
  }

  const newUser: User = {
    id: nextUserId++,
    name: name.trim(),
  };

  users.push(newUser);

  return res.status(201).json(newUser);
});

// GET /users
router.get("/users", (_req: Request, res: Response) => {
  return res.status(200).json(users);
});

// GET /category
router.get("/category", (_req: Request, res: Response) => {
  return res.status(200).json(categories);
});

// POST /category
// body: { "name": "Food" }
router.post("/category", (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };

  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "Field 'name' is required" });
  }

  const newCategory: Category = {
    id: nextCategoryId++,
    name: name.trim(),
  };

  categories.push(newCategory);

  return res.status(201).json(newCategory);
});

// DELETE /category?id=
router.delete("/category", (req: Request, res: Response) => {
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

  const existingLength = categories.length;
  categories = categories.filter((c) => c.id !== categoryId);

  if (categories.length === existingLength) {
    return res.status(404).json({ message: "Category not found" });
  }

  records = records.filter((r) => r.categoryId !== categoryId);

  return res.status(204).send();
});

// GET /record/<record_id>
router.get("/record/:recordId", (req: Request, res: Response) => {
  const recordId = Number(req.params.recordId);

  if (Number.isNaN(recordId)) {
    return res.status(400).json({ message: "Invalid record id" });
  }

  const record = records.find((r) => r.id === recordId);

  if (!record) {
    return res.status(404).json({ message: "Record not found" });
  }

  return res.status(200).json(record);
});

// DELETE /record/<record_id>
router.delete("/record/:recordId", (req: Request, res: Response) => {
  const recordId = Number(req.params.recordId);

  if (Number.isNaN(recordId)) {
    return res.status(400).json({ message: "Invalid record id" });
  }

  const existingLength = records.length;
  records = records.filter((r) => r.id !== recordId);

  if (records.length === existingLength) {
    return res.status(404).json({ message: "Record not found" });
  }

  return res.status(204).send();
});

// POST /record
// body: { "userId": 1, "categoryId": 2, "amount": 150.5 }
router.post("/record", (req: Request, res: Response) => {
  const { userId, categoryId, amount } = req.body as {
    userId?: number;
    categoryId?: number;
    amount?: number;
  };

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

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(400).json({ message: "User does not exist" });
  }

  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    return res.status(400).json({ message: "Category does not exist" });
  }

  const newRecord: ExpenseRecord = {
    id: nextRecordId++,
    userId,
    categoryId,
    amount,
    createdAt: new Date().toISOString(),
  };

  records.push(newRecord);

  return res.status(201).json(newRecord);
});

// GET /record?user_id=&category_id=
router.get("/record", (req: Request, res: Response) => {
  const userIdParam = req.query.user_id as string | undefined;
  const categoryIdParam = req.query.category_id as string | undefined;

  if (!userIdParam && !categoryIdParam) {
    return res.status(400).json({
      message:
        "At least one of query parameters 'user_id' or 'category_id' is required",
    });
  }

  let filtered = records;

  if (userIdParam) {
    const userId = Number(userIdParam);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user_id" });
    }
    filtered = filtered.filter((r) => r.userId === userId);
  }

  if (categoryIdParam) {
    const categoryId = Number(categoryIdParam);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid category_id" });
    }
    filtered = filtered.filter((r) => r.categoryId === categoryId);
  }

  return res.status(200).json(filtered);
});

export default router;
