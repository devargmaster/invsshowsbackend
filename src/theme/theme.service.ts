import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateThemeDto } from './dto/update-theme.dto';

export type ThemePalette = {
  colorBg: string;
  colorSurface: string;
  colorBorder: string;
  colorAccent: string;
  colorAccentHover: string;
  colorText: string;
  colorTextSecondary: string;
  colorTextMuted: string;
  colorSuccess: string;
  colorDanger: string;
};

const THEME_ID = 'singleton';

// Mismos valores que el :root de invs-web/src/index.css — una instalación
// sin configurar todavía se ve bien, sin necesitar un seed en producción
// (el Dockerfile solo corre `migrate deploy`, nunca `prisma:seed`).
const DEFAULT_THEME: ThemePalette = {
  colorBg: '#0B0B12',
  colorSurface: '#13131F',
  colorBorder: '#1E1E33',
  colorAccent: '#A78BFA',
  colorAccentHover: '#8B5CF6',
  colorText: '#F0F0F5',
  colorTextSecondary: '#C4C4D4',
  colorTextMuted: '#8F8FA3',
  colorSuccess: '#22C55E',
  colorDanger: '#EF4444',
};

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffective(): Promise<ThemePalette> {
    const row = await this.prisma.themeSettings.findUnique({ where: { id: THEME_ID } });
    if (!row) return DEFAULT_THEME;
    const { id, createdAt, updatedAt, updatedByUserId, ...palette } = row;
    return palette;
  }

  async upsert(adminId: string, dto: UpdateThemeDto): Promise<ThemePalette> {
    const merged = { ...(await this.getEffective()), ...dto };
    await this.prisma.themeSettings.upsert({
      where: { id: THEME_ID },
      update: { ...merged, updatedByUserId: adminId },
      create: { id: THEME_ID, ...merged, updatedByUserId: adminId },
    });
    return this.getEffective();
  }
}
