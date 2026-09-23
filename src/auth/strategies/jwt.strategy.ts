import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

// Token payload: { sub: userId, role, iat, exp }
// Batafsil: Dev1 qo'llanma, 6-BOB, TASK-04
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-CHANGE-ME',
    });
  }

  async validate(payload: { sub: string; role: string }) {
    // Bu obyekt keyinchalik req.user sifatida har joyda ishlatiladi.
    return { userId: payload.sub, role: payload.role };
  }
}
