import fs from 'fs';
import path from 'path';
import { cargarConfig } from './config';

const EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.mp4', '.mov', '.avi', '.mkv', '.3gp',
]);

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const SEMANA_PATH = path.join(process.cwd(), 'semana.json');
const HISTORIAL_PATH = path.join(process.cwd(), 'historial.json');

const CATEGORIAS = ['solar', 'UNI T', 'domotica', 'electronica', 'pos pc', 'sabado'];

const CATEGORIA_FOLDERS: Record<string, Record<number, string>> = {
  'solar':       { 1: '1 p -  solar', 2: '2 p - solar' },
  'UNI T':       { 1: '1 p - UNI T', 2: '2 p - u t', 3: '3 p - UNI T', 4: '4 p - UNI T', 5: '5 p - UNI T' },
  'domotica':    { 1: '1 p -  domotica', 2: '2 p - domotica', 3: '3 p - domotica' },
  'electronica': { 1: '1 p -  electronica', 2: '2 p - electronica', 3: '3 p - electronica', 4: '4 p - electronica' },
  'pos pc':      { 1: '1 p - pos pc', 2: '2 p - pos pc' },
  'sabado':      { 1: '1 p', 2: '2 p' },
};

const LATIN_SQUARE: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [1, 2, 0],
  [4, 5, 3],
  [2, 0, 1],
  [5, 3, 4],
];

// ─── DÍA ACTUAL ────────────────────────────────────────

export function obtenerDiaActual(): string {
  return DIAS[new Date().getDay()];
}

// ─── SEMANA ─────────────────────────────────────────────

interface SemanaInfo {
  semana_clave: string;
  variante: number;
  orden: string[];
}

function getCurrentWeekKey(): string {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function cargarSemana(): SemanaInfo {
  if (!fs.existsSync(SEMANA_PATH)) {
    return { semana_clave: '', variante: 0, orden: [] };
  }
  return JSON.parse(fs.readFileSync(SEMANA_PATH, 'utf-8'));
}

function guardarSemana(s: SemanaInfo): void {
  fs.writeFileSync(SEMANA_PATH, JSON.stringify(s, null, 2), 'utf-8');
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function asegurarSemana(): SemanaInfo {
  const prev = cargarSemana();
  const currentKey = getCurrentWeekKey();

  if (prev.semana_clave === currentKey && prev.orden.length > 0) {
    return prev;
  }

  const nuevaVariante = prev.variante === 0 ? 1 : (prev.variante % 5) + 1;
  const nuevoOrden = shuffleArray(CATEGORIAS);

  const labels: Record<number, string> = {
    1: 'CON PRECIOS', 2: 'SIN PRECIOS',
    3: 'MARCA 1', 4: 'MARCA 2', 5: 'SIN MARCA',
  };

  const nueva: SemanaInfo = {
    semana_clave: currentKey,
    variante: nuevaVariante,
    orden: nuevoOrden,
  };

  guardarSemana(nueva);

  console.log(`\n📅 Nueva semana (${currentKey}) — Variante ${nuevaVariante} (${labels[nuevaVariante] || ''})`);
  console.log(`   Orden: ${nuevoOrden.join(' → ')}`);

  return nueva;
}

export function getVarianteActual(): number {
  return asegurarSemana().variante;
}

// ─── ASIGNACIÓN DEL DÍA ────────────────────────────────

export function obtenerAsignacionDelDia(dia: string): Record<string, string> | null {
  const idx = DIAS.indexOf(dia) - 1;
  if (idx < 0 || idx > 5) return null;

  const semana = asegurarSemana();

  return {
    a: semana.orden[LATIN_SQUARE[idx][0]],
    b: semana.orden[LATIN_SQUARE[idx][1]],
    c: semana.orden[LATIN_SQUARE[idx][2]],
  };
}

// ─── RESOLVER CARPETA ──────────────────────────────────

export function obtenerCarpeta(categoria: string, variante: number): { ruta: string; nombre: string } | null {
  const folderName = CATEGORIA_FOLDERS[categoria]?.[variante];
  const cfg = cargarConfig();

  if (folderName) {
    const ruta = path.join(cfg.directorio_base, folderName);
    if (fs.existsSync(ruta)) return { ruta, nombre: folderName };
  }

  // Fallback a variante 1 si la actual no existe
  if (variante !== 1) {
    const fallbackName = CATEGORIA_FOLDERS[categoria]?.[1];
    if (fallbackName) {
      const fallbackRuta = path.join(cfg.directorio_base, fallbackName);
      if (fs.existsSync(fallbackRuta)) {
        console.log(`   ⚠️ "${categoria}" no tiene variante ${variante}, usando variante 1`);
        return { ruta: fallbackRuta, nombre: fallbackName };
      }
    }
  }

  return null;
}

// ─── HISTORIAL ─────────────────────────────────────────

export interface HistorialEntry {
  archivo: string;
  carpeta: string;
  publicado_en: string;
  cuenta: string;
}

function leerHistorial(): HistorialEntry[] {
  if (!fs.existsSync(HISTORIAL_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORIAL_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function guardarHistorial(h: HistorialEntry[]): void {
  fs.writeFileSync(HISTORIAL_PATH, JSON.stringify(h, null, 2), 'utf-8');
}

export function initHistorial(): void {
  if (!fs.existsSync(HISTORIAL_PATH)) {
    guardarHistorial([]);
  }
}

// ─── LISTAR IMÁGENES PENDIENTES ────────────────────────

export interface ImagenPendiente {
  nombre: string;
  ruta: string;
  carpeta: string;
}

function yaPublicada(historial: HistorialEntry[], archivo: string, carpeta: string, cuenta: string): boolean {
  return historial.some(e =>
    e.archivo === archivo &&
    e.carpeta === carpeta &&
    e.cuenta === cuenta
  );
}

export function listarImagenes(rutaCarpeta: string, nombreCarpeta: string, cuenta: string): ImagenPendiente[] {
  if (!fs.existsSync(rutaCarpeta)) return [];

  const publicadas = leerHistorial();

  return fs.readdirSync(rutaCarpeta)
    .filter(f => {
      const ext = path.extname(f).toLowerCase();
      if (!EXTENSIONS.has(ext)) return false;
      if (!fs.statSync(path.join(rutaCarpeta, f)).isFile()) return false;
      return !yaPublicada(publicadas, f, nombreCarpeta, cuenta);
    })
    .sort((a, b) => {
      const tA = fs.statSync(path.join(rutaCarpeta, a)).birthtimeMs;
      const tB = fs.statSync(path.join(rutaCarpeta, b)).birthtimeMs;
      return tA - tB;
    })
    .map(f => ({
      nombre: f,
      ruta: path.join(rutaCarpeta, f),
      carpeta: nombreCarpeta,
    }));
}

export function registrarPublicacion(archivo: string, carpeta: string, cuenta: string): void {
  const now = new Date();
  now.setHours(now.getHours() - 5);
  const ts = now.toISOString().slice(0, 19).replace('T', ' ');

  const h = leerHistorial();
  h.push({ archivo, carpeta, publicado_en: ts, cuenta });
  guardarHistorial(h);
}
