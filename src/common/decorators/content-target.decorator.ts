import { SetMetadata } from '@nestjs/common';

export const CONTENT_TARGET_KEY = 'contentTarget';

export type ContentTargetType = 'recording' | 'event';

/**
 * Marca qué tipo de contenido protege ContentAccessGuard en esta ruta —
 * el guard usa esto para saber si busca un Recording o un Event (y de qué
 * param de la ruta saca el id; por default `id`, pasar el segundo arg si
 * el param se llama distinto, ej: 'eventId').
 * Uso: @ContentTarget('recording') / @ContentTarget('event', 'eventId')
 */
export const ContentTarget = (type: ContentTargetType, paramName = 'id') =>
  SetMetadata(CONTENT_TARGET_KEY, { type, paramName });
