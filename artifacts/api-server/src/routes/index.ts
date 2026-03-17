import { Router, type IRouter } from "express";
import healthRouter from "./health";
import translateRouter from "./translate";
import dictionaryRouter from "./dictionary";
import authRouter from "./auth";
import accountsRouter from "./accounts";
import transcribeRouter from "./transcribe";
import ocrRouter from "./ocr";

const router: IRouter = Router();

router.use(authRouter);
router.use(accountsRouter);
router.use(transcribeRouter);
router.use(ocrRouter);
router.use(healthRouter);
router.use(translateRouter);
router.use(dictionaryRouter);

export default router;
