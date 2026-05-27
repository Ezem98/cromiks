/**
 * Catálogo de error codes que las server actions devuelven en
 * `{ ok: false, code: string }`. La UI llama a `errorCopy(code)` para mostrar
 * el texto al user. Codes en inglés snake_case, copy en español.
 *
 * Si una action introduce un code nuevo, agregarlo acá; sino la UI cae al
 * fallback 'unknown' y el usuario ve un mensaje genérico.
 */
export const ERROR_COPY: Record<string, string> = {
  // Cross-cutting
  invalid_input: 'Revisá los datos e intentá de nuevo',
  unauthenticated: 'Iniciá sesión para continuar',
  rate_limited: 'Demasiados intentos. Esperá un momento',
  unknown: 'Algo salió mal. Intentá de nuevo',
  empty_result: 'No recibimos respuesta. Intentá de nuevo',

  // Pack opening (post B-22/B-23: codes alineados con el RPC SQL)
  pack_not_found: 'No encontramos ese sobre',
  pack_not_pending: 'Este sobre no puede abrirse',
  pack_expired: 'Este sobre expiró',
  // auth_required ya está mapeado más abajo (cross-cutting)

  // Album / dismantle (match exacto con codes del RPC dismantle_card)
  invalid_count: 'Cantidad inválida',
  card_not_found: 'No encontramos ese cromo',
  legendary_not_dismantlable: 'Las legendarias no se canjean',
  card_not_owned: 'No tenés ese cromo',
  must_keep_one: 'Tenés que conservar al menos una copia',

  // Missions
  mission_not_found: 'No encontramos esa misión',
  mission_not_completed: 'La misión todavía no está completa',
  template_not_found: 'No encontramos esa misión',
  auth_required: 'Iniciá sesión para continuar',

  // Home / daily pack
  already_claimed: 'Ya reclamaste el sobre de hoy',
  no_streak: 'Tu racha no está inicializada',
  no_pack_returned: 'No recibimos el sobre. Intentá de nuevo',
  no_templates_available: 'No hay misiones disponibles ahora',
  insert_failed: 'No pudimos guardar. Intentá de nuevo',

  // Onboarding / profile
  invalid_username: 'Usuario inválido',
  invalid_country: 'País inválido',
  username_taken: 'Ese usuario ya está tomado',
  invalid_format: 'Formato inválido',
  empty: 'No puede estar vacío',

  // Auth
  email_invalid: 'Email inválido',
  invalid_token_format: 'Código inválido',
  invalid_token: 'Código incorrecto',
  expired: 'El código expiró. Pedí uno nuevo',
  no_user: 'No encontramos esa cuenta',
}

export function errorCopy(code: string): string {
  return ERROR_COPY[code] ?? ERROR_COPY.unknown
}
