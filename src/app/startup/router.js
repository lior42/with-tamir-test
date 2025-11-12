import { Router } from "express";
import { router as demoRouter } from "../routes/demo";
import { router as userRouter } from "../routes/users";

export const router = Router();

router.use("/users", userRouter);
router.use("/demo", demoRouter);
