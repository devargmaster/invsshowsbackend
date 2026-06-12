import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      // Extraer refresh token del cookie HttpOnly o del header Authorization
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'],
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string; email: string; role: string }) {
    const refreshToken =
      req?.cookies?.['refresh_token'] ??
      req?.headers?.authorization?.split(' ')[1];

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken,
    };
  }
}
