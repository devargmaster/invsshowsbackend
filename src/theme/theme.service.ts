import { Injectable } from '@nestjs/common';
import { ThemeModule as ThemeModuleEnum } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { UpdateThemeModuleDto } from './dto/update-theme-module.dto';

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

export type PartialThemePalette = Partial<Record<keyof ThemePalette, string | null>>;

const THEME_ID = 'singleton';

const PALETTE_KEYS: (keyof ThemePalette)[] = [
  'colorBg',
  'colorSurface',
  'colorBorder',
  'colorAccent',
  'colorAccentHover',
  'colorText',
  'colorTextSecondary',
  'colorTextMuted',
  'colorSuccess',
  'colorDanger',
];

// Mismos valores que el :root de invs-web/src/index.css — una instalación
// sin configurar todavía se ve bien, sin necesitar un seed en producción
// (el Dockerfile solo corre `migrate deploy`, nunca `prisma:seed`).
const DEFAULT_THEME: ThemePalette = {
  colorBg: '#0B0C0E',
  colorSurface: '#15171A',
  colorBorder: '#30343A',
  colorAccent: '#D9F5F8',
  colorAccentHover: '#F4FEFF',
  colorText: '#F4F4F2',
  colorTextSecondary: '#B8BBC0',
  colorTextMuted: '#7C8188',
  colorSuccess: '#3DCC8C',
  colorDanger: '#FF626A',
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

  // Override crudo (con null donde el módulo no personaliza ese color) —
  // lo consume la pantalla de Apariencia para saber el estado de cada
  // toggle, no el público (que necesita todo ya resuelto).
  async getModuleOverrideRaw(module: ThemeModuleEnum): Promise<PartialThemePalette> {
    const row = await this.prisma.themeModuleOverride.findUnique({ where: { module } });
    if (!row) return Object.fromEntries(PALETTE_KEYS.map((key) => [key, null]));
    return Object.fromEntries(PALETTE_KEYS.map((key) => [key, row[key]]));
  }

  async getAllModuleOverridesRaw(): Promise<Record<ThemeModuleEnum, PartialThemePalette>> {
    const entries = await Promise.all(
      Object.values(ThemeModuleEnum).map(
        async (module) => [module, await this.getModuleOverrideRaw(module)] as const,
      ),
    );
    return Object.fromEntries(entries) as Record<ThemeModuleEnum, PartialThemePalette>;
  }

  async getResolvedModule(module: ThemeModuleEnum): Promise<ThemePalette> {
    const [global, override] = await Promise.all([this.getEffective(), this.getModuleOverrideRaw(module)]);
    const resolved = { ...global };
    for (const key of PALETTE_KEYS) {
      if (override[key]) resolved[key] = override[key] as string;
    }
    return resolved;
  }

  // Payload único para el bootstrap de invs-web: la paleta global más los
  // módulos ya resueltos, para no pedir uno por uno al montar la app.
  async getPublicPayload(): Promise<ThemePalette & { modules: Record<ThemeModuleEnum, ThemePalette> }> {
    const global = await this.getEffective();
    const modules = Object.fromEntries(
      await Promise.all(
        Object.values(ThemeModuleEnum).map(async (module) => [module, await this.getResolvedModule(module)] as const),
      ),
    ) as Record<ThemeModuleEnum, ThemePalette>;
    return { ...global, modules };
  }

  // Reemplazo completo del override (no merge): el form de Apariencia manda
  // siempre las 10 claves, cada una en hex (personaliza) o null (hereda).
  async upsertModuleOverride(
    adminId: string,
    module: ThemeModuleEnum,
    dto: UpdateThemeModuleDto,
  ): Promise<PartialThemePalette> {
    const values = Object.fromEntries(PALETTE_KEYS.map((key) => [key, dto[key] ?? null]));
    await this.prisma.themeModuleOverride.upsert({
      where: { module },
      update: { ...values, updatedByUserId: adminId },
      create: { module, ...values, updatedByUserId: adminId },
    });
    return this.getModuleOverrideRaw(module);
  }
}
