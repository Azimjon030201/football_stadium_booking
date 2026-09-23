import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
// import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Barcha DTO'lar uchun global validatsiya.
  // whitelist+forbidNonWhitelisted — mass assignment hujumidan himoya
  // (masalan register so'roviga { role: 'ADMIN' } qo'shib yuborishning
  // oldini oladi). Batafsil: Dev2 qo'llanma, TASK-09.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // TODO (Dev2 TASK-07): AllExceptionsFilter implement qilingach,
  // quyidagi qatorni oching — shu payngacha NestJS standart xato
  // formatidan foydalaniladi.
  // app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Football Mini Stadium Booking Platform')
    .setDescription('Backend API hujjati')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server ishga tushdi: http://localhost:${port}/api/docs`);
}
bootstrap();
