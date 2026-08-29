import type { Language } from './types'

/**
 * The preset catalogue. Categories are sent to the question generator as plain
 * text, so a custom category typed by the host works exactly like a preset one.
 */
export const PRESET_CATEGORIES: Record<Language, string[]> = {
  en: [
    'World History', 'Geography', 'Science', 'Space', 'Nature & Animals',
    'Movies', 'Music', 'Sports', 'Football', 'Basketball',
    'Food & Drink', 'Literature', 'Art', 'Technology', 'Video Games',
    'Mythology', 'Inventions', 'Famous People', 'Cars', 'Television',
  ],
  es: [
    'Historia Mundial', 'Geografía', 'Ciencia', 'Espacio', 'Naturaleza y Animales',
    'Cine', 'Música', 'Deportes', 'Fútbol', 'Baloncesto',
    'Comida y Bebida', 'Literatura', 'Arte', 'Tecnología', 'Videojuegos',
    'Mitología', 'Inventos', 'Personajes Famosos', 'Coches', 'Televisión',
  ],
  lt: [
    'Pasaulio istorija', 'Geografija', 'Mokslas', 'Kosmosas', 'Gamta ir gyvūnai',
    'Kinas', 'Muzika', 'Sportas', 'Futbolas', 'Krepšinis',
    'Maistas ir gėrimai', 'Literatūra', 'Menas', 'Technologijos', 'Vaizdo žaidimai',
    'Mitologija', 'Išradimai', 'Žymūs žmonės', 'Automobiliai', 'Televizija',
  ],
}

export function randomCategories(language: Language, count: number): string[] {
  const pool = [...PRESET_CATEGORIES[language]]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}
