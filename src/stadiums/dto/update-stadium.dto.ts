import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateStadiumDto } from './create-stadium.dto';

// DIQQAT: status maydoni bu yerda ham yo'q (CreateStadiumDto'da yo'q edi) —
// status faqat maxsus /submit va /approve endpoint'lari orqali o'zgaradi,
// oddiy PATCH orqali emas. Batafsil: Dev3 qo'llanma, 6-BOB, TASK-06 (Hafta 2).
export class UpdateStadiumDto extends PartialType(CreateStadiumDto) {}
