import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { setupApp } from './setup-app.js';

const app = await NestFactory.create(AppModule);
const config = app.get<ConfigService<Env, true>>(ConfigService);
const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

// Without this, req.ip is the proxy's address behind a load balancer, so every
// client shares one rate-limit bucket.
const trustProxy = config.get('TRUST_PROXY', { infer: true });
if (trustProxy > 0) {
  app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
}

setupApp(app);
app.enableCors({
  origin: config.get('WEB_ORIGIN', { infer: true }),
  credentials: true,
});

// The docs describe every route, DTO and validation rule, including how to
// create an admin: useful in development, reconnaissance in production.
if (!isProduction) {
  const doc = new DocumentBuilder()
    .setTitle('ProcessNow API')
    .setDescription(
      `All responses use one envelope: { status_code, message, data }. ` +
        `Errors add \`fields\` for per-field validation messages. ` +
        `Money is returned as exact decimal strings.`,
    )
    .addCookieAuth('access_token')
    .build();
  // Served at /docs, outside the version prefix: the docs describe every version,
  // and a bookmarked /docs shouldn't break when the API version moves on.
  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, doc),
  );
}

const server = await app.listen(config.get('PORT', { infer: true }));
// Longer than a typical proxy idle timeout (60s), so the proxy closes idle
// connections rather than the app racing it and producing sporadic 502s.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
