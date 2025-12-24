import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// 1. Define the Payload Interface (Type Safety for God Mode)
// This must match exactly what we signed in auth.service.ts
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  teamId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // 🛡️ Standard Bearer Token extraction
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 🔐 Get secret from env (ensure JWT_SECRET is in your .env)
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // 2. Validation / Decryption
  // The object returned here is automatically attached to 'req.user' in your Controllers
  validate(payload: JwtPayload) {
    return {
      id: payload.sub, // Map 'sub' back to 'id' for easier access in controllers
      email: payload.email,
      role: payload.role,
      teamId: payload.teamId, // 🔥 Available in every request now!
    };
  }
}
