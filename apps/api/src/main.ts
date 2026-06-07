import { config as loadEnv } from "dotenv";
import { join } from "path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

// Load apps/api/.env (works from dist/ when started via repo-root `npm run dev`).
loadEnv({ path: join(__dirname, "..", ".env") });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useStaticAssets(join(__dirname, "..", "uploads"), {
    prefix: "/api/uploads/",
  });

  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  app.enableCors({
    origin: corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix("api");

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`TrustLayer API listening on http://localhost:${port}`, "Bootstrap");
}

bootstrap();
