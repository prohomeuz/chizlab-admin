import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import type { PathItemObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import type { AppConfig } from './config/config';

/** Remove paths from a Swagger document that don't match the given tag set. */
function filterDocumentByTags(doc: OpenAPIObject, allowedTags: Set<string>): void {
  const filteredPaths: Record<string, PathItemObject> = {};
  for (const [routePath, pathItem] of Object.entries(doc.paths ?? {})) {
    const filteredItem: PathItemObject = {};
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
    for (const method of methods) {
      const op = (pathItem as Record<string, unknown>)[method] as { tags?: string[] } | undefined;
      if (op && op.tags?.some((t: string) => allowedTags.has(t))) {
        (filteredItem as Record<string, unknown>)[method] = op;
      }
    }
    if (Object.keys(filteredItem).length > 0) {
      filteredPaths[routePath] = filteredItem;
    }
  }
  doc.paths = filteredPaths;
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS — restricted to configured origins; empty = deny all cross-origin
  const cs = app.get(ConfigService);
  const cfg = cs.get<AppConfig>('app')!;
  const allowedOrigins = cfg.corsOrigins;
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  // ── Swagger: Admin docs ─────────────────────────────────────────────────
  const adminDocConfig = new DocumentBuilder()
    .setTitle('Chizlab Admin API')
    .setDescription('Full CRUD admin API — JWT-protected.')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'BearerAuth',
    )
    .addTag('admin-auth', 'Admin authentication')
    .addTag('admin-materials', 'Materials CRUD (admin)')
    .addTag('admin-categories', 'Category management (admin)')
    .addTag('admin-upload', 'Media upload (admin)')
    .build();

  const adminDocument = SwaggerModule.createDocument(app, adminDocConfig, {
    include: [],  // included via tags filter below
    deepScanRoutes: true,
  });

  // Filter: keep only admin-* tagged operations
  const adminTags = new Set(['admin-auth', 'admin-materials', 'admin-categories', 'admin-upload']);
  filterDocumentByTags(adminDocument, adminTags);
  SwaggerModule.setup('docs/admin', app, adminDocument);

  // ── Swagger: Public docs ─────────────────────────────────────────────────
  const publicDocConfig = new DocumentBuilder()
    .setTitle('Chizlab Public API')
    .setDescription('Read-only public API — X-API-Key protected.')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' }, 'ApiKeyAuth')
    .addTag('public-materials', 'Read-only materials (public)')
    .addTag('public-categories', 'Read-only categories (public)')
    .build();

  const publicDocument = SwaggerModule.createDocument(app, publicDocConfig, {
    deepScanRoutes: true,
  });

  const publicTags = new Set(['public-materials', 'public-categories']);
  filterDocumentByTags(publicDocument, publicTags);
  SwaggerModule.setup('docs/public', app, publicDocument);
  // Also mounted at the bare `/docs` path so the dedicated api.chizlab.uz
  // subdomain (which proxies only /api/public/* and /docs) can serve Swagger
  // without any nginx path rewriting.
  SwaggerModule.setup('docs', app, publicDocument);

  // ── Listen ────────────────────────────────────────────────────────────────
  // Admin PIN seeding is handled by AuthService.onApplicationBootstrap()
  await app.listen(cfg.port);
  logger.log(`API listening on port ${cfg.port}`);
}

void bootstrap();
