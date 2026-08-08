import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

// Catálogo v1 — sumar un tipo nuevo acá cuando invs-web tenga el componente
// que lo renderiza (ver StreamPlayer/Landing docs). No es exhaustivo a
// propósito: cada tipo nuevo es una decisión de producto, no algo que el
// admin deba poder inventar libremente escribiendo un string cualquiera.
export const LANDING_BLOCK_TYPES = ['hero', 'text', 'gallery', 'cta', 'countdown', 'video'] as const;
export type LandingBlockType = (typeof LANDING_BLOCK_TYPES)[number];

// content/style quedan como objetos sueltos (no tipados por bloque) a
// propósito: cada tipo de bloque tiene su propia forma, y una unión
// discriminada por DTO es más rigidez de la que este primer catálogo
// necesita. La validación de que existan las claves correctas para cada
// `type` queda del lado de invs-web (si falta algo, ese bloque no
// renderiza ese campo, no rompe la landing entera).
export class LandingBlockDto {
  @IsString()
  id: string;

  @IsIn(LANDING_BLOCK_TYPES)
  type: LandingBlockType;

  @IsObject()
  content: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  style?: Record<string, unknown>;
}
