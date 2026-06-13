import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

export interface Configuracion {
  directorio_base: string;
  delay_segundos: number;
  reintentos_por_imagen: number;
  cuentas: Record<string, { activa: boolean }>;
}

export function cargarConfig(): Configuracion {
  const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const cfg = JSON.parse(data) as Configuracion;
  if (!cfg.directorio_base) throw new Error('config.json: falta directorio_base');
  if (!cfg.cuentas || Object.keys(cfg.cuentas).length === 0) {
    throw new Error('config.json: debe haber al menos una cuenta');
  }
  return cfg;
}
