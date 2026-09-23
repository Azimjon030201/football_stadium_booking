import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

// TASK-07 (Dev2, Hafta 2): butun ilova uchun BITTA standart xato formati
// (SRS 27-bo'lim): { success, statusCode, message, error, timestamp, path }
//
// TODO (Dev2 TASK-07):
// 1) exception HttpException bo'lsa exception.getStatus()/getResponse()
//    orqali status va xabarni oling, aks holda 500 + umumiy xabar.
// 2) response.status(status).json({ success:false, statusCode, message,
//    error, timestamp: new Date().toISOString(), path: request.url })
//    shaklida qaytaring.
// 3) Implement qilgach, main.ts'da
//    app.useGlobalFilters(new AllExceptionsFilter()) qatorini oching
//    (hozircha izohda qoldirilgan — shu ishga tushmaguncha NestJS'ning
//    o'zining standart xato formatidan foydalaniladi).
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Implement qilinmaguncha — NestJS standart xatosiga topshiriladi.
    throw exception;
  }
}
