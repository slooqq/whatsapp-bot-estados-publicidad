import { cargarConfig } from './config';
import { ImagenPendiente, registrarPublicacion } from './fileManager';
import { publicarWhatsApp } from './platforms/whatsapp';
import { registrarFallo } from './failedLogger';

export async function publicarPorCuentas(
  publicaciones: Record<string, ImagenPendiente[]>,
): Promise<void> {
  const cfg = cargarConfig();
  const delayMs = cfg.delay_segundos * 1000;
  const reintentos = cfg.reintentos_por_imagen;

  const cuentas = Object.keys(publicaciones);
  if (cuentas.length === 0) return;

  const totales: Record<string, number> = {};
  for (const c of cuentas) totales[c] = publicaciones[c].length;

  console.log(`\n📱 Cuentas: ${cuentas.map(c => `${c.toUpperCase()} (${totales[c]})`).join(', ')}`);
  console.log(`   Modo round-robin — 1 imagen por cuenta por ronda\n`);

  const indices: Record<string, number> = {};
  for (const c of cuentas) indices[c] = 0;

  let publicadas = true;
  while (publicadas) {
    publicadas = false;

    for (const cuenta of cuentas) {
      const i = indices[cuenta];
      if (i >= publicaciones[cuenta].length) continue;

      const img = publicaciones[cuenta][i];
      console.log(`   📱 ${cuenta.toUpperCase()} [${i + 1}/${totales[cuenta]}] ${img.nombre} (${img.carpeta})`);

      const { ok, error } = await publicarWhatsApp(cuenta, img.ruta, reintentos);

      if (ok) {
        registrarPublicacion(img.nombre, img.carpeta, cuenta);
        console.log(`   ✅ Publicado en cuenta ${cuenta.toUpperCase()}`);
      } else {
        registrarFallo(cuenta, img.nombre, error || `Falló tras ${reintentos} intentos`);
      }

      indices[cuenta]++;
      publicadas = true;

      if (hayMasImagenes(cuentas, indices, publicaciones)) {
        console.log(`   ⏳ Esperando ${cfg.delay_segundos}s...`);
        await esperar(delayMs);
      }
    }
  }
}

function hayMasImagenes(
  cuentas: string[],
  indices: Record<string, number>,
  publicaciones: Record<string, ImagenPendiente[]>,
): boolean {
  return cuentas.some(c => indices[c] < publicaciones[c].length);
}

function esperar(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
