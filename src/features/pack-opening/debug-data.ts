import type { OpenPackResult } from './types'

/**
 * Mock data para debug mode.
 *
 * Cuando `?debug=true` está en la URL, en lugar de llamar a openPack real,
 * devolvemos esta data fake con 1 cromo de cada tier (salvo legendary,
 * que va al final para máximo impacto).
 *
 * Solo en development (la página chequea NODE_ENV antes de exponer esto).
 *
 * Está en un archivo separado porque actions.ts es 'use server' y solo
 * puede exportar funciones async.
 */
export const debugMockResult: OpenPackResult = {
  packType: 'daily',
  coinsEarned: 12,
  coinsAfter: 12,
  cards: [
    {
      cardId: 'debug-common',
      name: 'Paredes',
      playerRole: 'Mediocampista · Argentina',
      number: 5,
      tier: 'common',
      isNew: true,
      reward: null,
      imageUrl: null,
      seed: 'paredes',
    },
    {
      cardId: 'debug-rare',
      name: 'Dibu Martínez',
      playerRole: 'Arquero · Argentina',
      number: 23,
      tier: 'rare',
      isNew: true,
      reward: null,
      imageUrl: null,
      seed: 'dibu-debug',
    },
    {
      cardId: 'debug-epic',
      name: 'Julián Álvarez',
      playerRole: 'Delantero · Argentina',
      number: 9,
      tier: 'epic',
      isNew: false,
      reward: 12,
      imageUrl: null,
      seed: 'julian-debug',
    },
    {
      cardId: 'debug-legendary',
      name: 'Messi',
      playerRole: 'Capitán · Argentina',
      number: 10,
      tier: 'legendary',
      isNew: true,
      reward: null,
      imageUrl: null,
      seed: 'messi-debug',
    },
  ],
}
