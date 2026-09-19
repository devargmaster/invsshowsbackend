import { BadRequestException, ValidationError, ValidationPipeOptions } from '@nestjs/common';

// class-validator devuelve sus mensajes por defecto en inglés (ej. "phone
// should not be empty", "property phone should not exist"). El resto de la
// API le habla en español al usuario (ver HttpExceptionFilter y los mensajes
// a mano en cada *.service.ts) — esto traduce por el NOMBRE del constraint
// (ej. "isNotEmpty", "whitelistValidation"), no por el texto en inglés, así
// que no depende de que class-validator no cambie su wording exacto.
const CONSTRAINT_MESSAGES: Record<string, (property: string) => string> = {
  isNotEmpty: (p) => `"${p}" no puede estar vacío.`,
  isDefined: (p) => `"${p}" es obligatorio.`,
  isString: (p) => `"${p}" debe ser un texto.`,
  isEmail: (p) => `"${p}" debe ser un email válido.`,
  isUrl: (p) => `"${p}" debe ser una URL válida.`,
  isInt: (p) => `"${p}" debe ser un número entero.`,
  isNumber: (p) => `"${p}" debe ser un número.`,
  min: (p) => `"${p}" es menor al mínimo permitido.`,
  max: (p) => `"${p}" supera el máximo permitido.`,
  isBoolean: (p) => `"${p}" debe ser verdadero o falso.`,
  isArray: (p) => `"${p}" debe ser una lista.`,
  arrayMinSize: (p) => `"${p}" tiene menos elementos de los permitidos.`,
  arrayMaxSize: (p) => `"${p}" tiene más elementos de los permitidos.`,
  isEnum: (p) => `"${p}" tiene un valor no permitido.`,
  isIn: (p) => `"${p}" tiene un valor no permitido.`,
  isDateString: (p) => `"${p}" debe ser una fecha válida.`,
  isObject: (p) => `"${p}" debe ser un objeto.`,
  minLength: (p) => `"${p}" es demasiado corto.`,
  maxLength: (p) => `"${p}" es demasiado largo.`,
  matches: (p) => `"${p}" no tiene un formato válido.`,
  whitelistValidation: (p) => `"${p}" no es un campo válido para esta solicitud.`,
};

function translate(error: ValidationError, parentPath = ''): string[] {
  const path = parentPath ? `${parentPath}.${error.property}` : error.property;
  const ownMessages = Object.keys(error.constraints ?? {}).map((key) => {
    const build = CONSTRAINT_MESSAGES[key];
    return build ? build(path) : `"${path}" es inválido.`;
  });
  const childMessages = (error.children ?? []).flatMap((child) => translate(child, path));
  return [...ownMessages, ...childMessages];
}

export const spanishValidationOptions: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  exceptionFactory: (errors: ValidationError[]) => {
    const messages = errors.flatMap((e) => translate(e));
    return new BadRequestException(messages.length ? messages : ['Datos inválidos.']);
  },
};
