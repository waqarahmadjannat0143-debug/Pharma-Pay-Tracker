import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import legalRouter from "./routes/legal";
import { logger } from "./lib/logger";

const app: Express = express();

// Render terminates TLS at its proxy. Trust only the first proxy so request IPs
// used by authentication rate limits cannot be spoofed through forwarded headers.
app.set("trust proxy", 1);

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
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(legalRouter);

app.use(
  "/api",
  (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  },
  router,
);

export default app;
