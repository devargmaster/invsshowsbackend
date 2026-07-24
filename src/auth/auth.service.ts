import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('google.clientId'));
  }

  // ─── Register ────────────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Ya existe una cuenta con ese email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`Usuario registrado: ${user.email}`);
    return { user: this.sanitize(user), ...tokens };
  }

  // ─── Login ───────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // passwordHash es null en cuentas creadas solo con Google — no tienen
    // contraseña para comparar, mensaje explícito en vez de romper.
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(
        !user
          ? 'Email o contraseña incorrectos.'
          : 'Esta cuenta se creó con Google — iniciá sesión con Google o configurá una contraseña desde tu perfil.',
      );
    }
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`Login: ${user.email}`);
    return { user: this.sanitize(user), ...tokens };
  }

  // ─── Login con Google ────────────────────────────────────────────
  // Un solo endpoint sirve tanto a web (Google Identity Services) como a
  // mobile (expo-auth-session): ambos obtienen un idToken del lado del
  // cliente y lo mandan acá para verificarlo server-side — evita manejar
  // flows de redirect/sesión distintos por plataforma.
  async loginWithGoogle(idToken: string) {
    const clientId = this.config.get<string>('google.clientId');
    if (!clientId) {
      throw new ServiceUnavailableException(
        'El login con Google todavía no está configurado en este ambiente.',
      );
    }

    let payload: { sub: string; email?: string; email_verified?: boolean; name?: string } | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token de Google inválido o vencido.');
    }

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('No se pudo verificar tu cuenta de Google.');
    }

    let user = await this.prisma.user.findUnique({ where: { googleId: payload.sub } });

    if (!user) {
      // ¿Ya existe una cuenta con contraseña para este email? La vinculamos
      // en vez de crear una cuenta duplicada — el email ya viene verificado
      // por Google, así que es seguro asumir que es la misma persona.
      const existingByEmail = await this.prisma.user.findUnique({ where: { email: payload.email } });
      user = existingByEmail
        ? await this.prisma.user.update({ where: { id: existingByEmail.id }, data: { googleId: payload.sub } })
        : await this.prisma.user.create({
            data: {
              email: payload.email,
              fullName: payload.name ?? payload.email,
              googleId: payload.sub,
            },
          });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`Login con Google: ${user.email}`);
    return { user: this.sanitize(user), ...tokens };
  }

  // ─── Refresh ─────────────────────────────────────────────────────
  async refresh(userId: string, rawRefreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Acceso denegado.');
    }

    const isValid = await bcrypt.compare(rawRefreshToken, user.refreshToken);
    if (!isValid) {
      throw new ForbiddenException('Refresh token inválido.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ─── Logout ──────────────────────────────────────────────────────
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Sesión cerrada correctamente.' };
  }

  // ─── Recuperar contraseña (self-service, comunidad) ───────────────
  // Nunca revela si el email existe o no — misma respuesta genérica en los
  // dos casos, para no habilitar enumeración de cuentas.
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      });

      const webBaseUrl = this.config.get<string>('webBaseUrl');
      const resetUrl = `${webBaseUrl}/resetear-password?token=${rawToken}`;
      this.mailService.sendPasswordReset(user.email, resetUrl);
      this.logger.log(`Reset de contraseña solicitado: ${user.email}`);
    }

    return { message: 'Si el email existe, te enviamos un link para restablecer tu contraseña.' };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: tokenHash, passwordResetExpiresAt: { gt: new Date() } },
    });
    if (!user) {
      throw new UnauthorizedException('El link venció o no es válido. Pedí uno nuevo.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        refreshToken: null, // cierra cualquier sesión existente
      },
    });

    this.logger.log(`Contraseña restablecida: ${user.email}`);
    return { message: 'Contraseña actualizada. Ya podés iniciar sesión.' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  private sanitize(user: { id: string; email: string; fullName: string; role: string }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
