import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// React Native's HTTP cache can revalidate API responses and surface a bare
// 304 response without the cached JSON body. The mobile client then renders
// empty lists and zero totals even though the database still contains data.
// API responses are small and user-specific, so always send a fresh body.
app.disable("etag");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, router);

export default app;
