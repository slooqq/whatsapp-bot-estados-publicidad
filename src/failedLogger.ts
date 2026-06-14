import fs from 'fs';
import path from 'path';

const LOG_PATH = path.join(process.cwd(), 'failed.log');

export function registrarFallo(cuenta: string, archivo: string, error: string): void {
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const linea = `[${ts}] [Cuenta ${cuenta.toUpperCase()}] ${archivo} - ${error}\n`;
  fs.appendFileSync(LOG_PATH, linea, 'utf-8');
  console.log(`   ⚠️  Fallo registrado en failed.log (${cuenta})`);
}
