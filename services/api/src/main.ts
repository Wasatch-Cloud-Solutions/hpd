import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  config.getOrThrow<string>("JWT_ACCESS_SECRET");
  config.getOrThrow<string>("JWT_REFRESH_SECRET");
  app.use(helmet());
  const corsOrigins = config.get<string>("CORS_ORIGIN");
  app.enableCors({ origin: corsOrigins ? corsOrigins.split(",") : false });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Hidden Peak Dining API")
    .setDescription("Restaurant operations, team communication, and inventory API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swaggerConfig));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`Hidden Peak API listening on http://localhost:${port}/api`);
}

void bootstrap();
