import { Router, type IRouter } from "express";
import healthRouter from "./health";
import translateRouter from "./translate";
import dictionaryRouter from "./dictionary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(translateRouter);
router.use(dictionaryRouter);

export default router;
