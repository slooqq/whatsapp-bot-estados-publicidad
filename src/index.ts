import cron from 'node-cron';
import { cargarConfig } from './config';
import {
  obtenerDiaActual, obtenerAsignacionDelDia, obtenerCarpeta,
  listarImagenes, initHistorial, getVarianteActual,
} from './fileManager';
import { initWhatsApp } from './platforms/whatsapp';
import { publicarPorCuentas } from './publisher';
import type { ImagenPendiente } from './fileManager';

async function ejecutarCiclo(): Promise<void> {
  const dia = obtenerDiaActual();

  if (dia === 'domingo') {
    console.log(`\n📅 Domingo — sin carpetas, saltando`);
    return;
  }

  console.log(`\n📅 ${dia.charAt(0).toUpperCase() + dia.slice(1)} — consultando asignación...`);

  const asignacion = obtenerAsignacionDelDia(dia);
  if (!asignacion) {
    console.log(`   ❌ No se pudo obtener asignación para ${dia}`);
    return;
  }

  const variante = getVarianteActual();
  const label = variante === 1 ? 'CON PRECIOS' : 'SIN PRECIOS';
  console.log(`   🏷️  Variante ${variante} (${label})`);

  const cfg = cargarConfig();
  const cuentasActivas = Object.keys(cfg.cuentas).filter(k => cfg.cuentas[k].activa);

  const publicaciones: Record<string, ImagenPendiente[]> = {};

  for (const cuenta of cuentasActivas) {
    const categoria = asignacion[cuenta];
    if (!categoria) {
      console.log(`   ⚠️ ${cuenta.toUpperCase()} sin categoría asignada`);
      continue;
    }

    console.log(`   ${cuenta.toUpperCase()} → ${categoria}`);

    const carpeta = obtenerCarpeta(categoria, variante);
    if (!carpeta) {
      console.log(`      ⚠️ Carpeta no encontrada para "${categoria}" (v${variante})`);
      continue;
    }

    const imagenes = listarImagenes(carpeta.ruta, carpeta.nombre, cuenta);

    if (imagenes.length === 0) {
      console.log(`      ✅ "${carpeta.nombre}" — completada`);
      continue;
    }

    console.log(`      📁 ${carpeta.nombre} — ${imagenes.length} pendiente(s)`);
    publicaciones[cuenta] = imagenes;
  }

  if (Object.keys(publicaciones).length === 0) {
    console.log(`   ✅ Todas las cuentas sin imágenes pendientes.`);
    return;
  }

  await publicarPorCuentas(publicaciones);
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   BOT PUBLICIDAD — CAMPAÑA AUTOMÁTICA    ║');
  console.log('║  Latin Square · 3 Cuentas · 6 Categorías ║');
  console.log('╚══════════════════════════════════════════╝');

  initHistorial();
  console.log('📁 historial.json listo');

  const cfg = cargarConfig();
  const cuentas = Object.keys(cfg.cuentas).filter(k => cfg.cuentas[k].activa);
  console.log(`👤 ${cuentas.length} cuenta(s) activa(s): ${cuentas.join(', ').toUpperCase()}`);

  await initWhatsApp();

  await ejecutarCiclo();

  console.log(`\n⏰ Programando revisión cada 1 minuto`);
  cron.schedule('* * * * *', () => {
    ejecutarCiclo();
  });

  process.on('SIGINT', () => {
    console.log('\n👋 Cerrando bot...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n👋 Cerrando bot...');
    process.exit(0);
  });
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
