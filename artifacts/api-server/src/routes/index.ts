import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import customersRouter from "./customers";
import invoicesRouter from "./invoices";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import backupRouter from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/customers", customersRouter);
router.use("/invoices", invoicesRouter);
router.use("/payments", paymentsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportsRouter);
router.use("/backup", backupRouter);

export default router;
