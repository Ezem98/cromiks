/**
 * Frontera del ciclo diario de misiones: la próxima medianoche de Argentina
 * (UTC-3), en ISO. Todas las misiones que se asignan dentro de un mismo día AR
 * comparten este `expires_at`, así que funciona como clave de ciclo:
 *
 *  - `assignDailyMissions` lo usa como expiry al insertar Y para chequear, de
 *    forma idempotente, si el usuario ya tiene las 3 del día (en cualquier
 *    estado, incluido `claimed`).
 *  - `getHomeData` lo usa para contar las misiones del ciclo y distinguir
 *    "ya reclamaste todo hoy" de "no se asignaron ninguna".
 *
 * Una sola fuente para los dos lados: si el insert y el chequeo usaran cálculos
 * distintos, la idempotencia se rompe (era parte del bug viejo).
 *
 * Puro (el `now` se inyecta) para poder testearlo sin reloj real.
 */
export function nextDailyCycleExpiry(now: Date = new Date()): string {
  const next = new Date(now)
  next.setUTCDate(next.getUTCDate() + 1)
  next.setUTCHours(3, 0, 0, 0) // 00:00 AR = 03:00 UTC
  return next.toISOString()
}
