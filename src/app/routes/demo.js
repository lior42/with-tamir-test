import { Router } from "express";
import * as z from "zod";
import {
  defineValidator,
  validatedRoute,
} from "../middleware/validated-routes";

const output = z.coerce.number();
const validator = defineValidator({ output });

export const router = Router();

router.get(
  "/",
  validatedRoute(validator, () => new Date()),
);
