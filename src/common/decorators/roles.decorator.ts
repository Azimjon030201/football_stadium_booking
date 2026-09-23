import { SetMetadata } from '@nestjs/common';

// Ishlatilishi: @Roles('ADMIN') yoki @Roles('OWNER', 'ADMIN')
// Batafsil: Dev2 qo'llanma, 6-BOB, TASK-03
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
