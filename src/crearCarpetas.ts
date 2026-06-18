import fs from 'fs';
import path from 'path';
import { cargarConfig } from './config';

const CATEGORIA_FOLDERS: Record<string, Record<number, string>> = {
  'solar':       { 1: '1 p -  solar', 2: '2 p - solar' },
  'UNI T':       { 1: '1 p - UNI T', 2: '2 p - u t', 3: '3 p - UNI T', 4: '4 p - UNI T', 5: '5 p - UNI T' },
  'domotica':    { 1: '1 p -  domotica', 2: '2 p - domotica', 3: '3 p - domotica' },
  'electronica': { 1: '1 p -  electronica', 2: '2 p - electronica', 3: '3 p - electronica', 4: '4 p - electronica' },
  'pos pc':      { 1: '1 p - pos pc', 2: '2 p - pos pc' },
  'sabado':      { 1: '1 p', 2: '2 p' },
};

function main() {
  const cfg = cargarConfig();
  const base = cfg.directorio_base;

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   CREADOR DE CARPETAS — PUBLICIDAD       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n📂 Base: ${base}\n`);

  if (!fs.existsSync(base)) {
    console.log(`❌ El directorio base no existe: ${base}`);
    console.log('   Verifica config.json -> directorio_base');
    process.exit(1);
  }

  let creadas = 0;
  let existentes = 0;

  for (const [categoria, variantes] of Object.entries(CATEGORIA_FOLDERS)) {
    console.log(`\n🏷️  ${categoria}:`);

    for (const [v, folderName] of Object.entries(variantes)) {
      const ruta = path.join(base, folderName);

      if (fs.existsSync(ruta)) {
        const count = fs.readdirSync(ruta).filter(f => {
          const ext = path.extname(f).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.mkv', '.3gp'].includes(ext);
        }).length;
        console.log(`   ✅ v${v} — "${folderName}" (${count} archivos)`);
        existentes++;
      } else {
        fs.mkdirSync(ruta, { recursive: true });
        console.log(`   ✅ v${v} — "${folderName}" (🆕 creada)`);
        creadas++;
      }
    }

    for (let v = 1; v <= 5; v++) {
      if (!(v in variantes)) {
        const fallbackName = variantes[1];
        console.log(`   ⬜ v${v} — no definida (usará "${fallbackName}" como fallback)`);
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Resumen:`);
  console.log(`   Carpetas existentes: ${existentes}`);
  console.log(`   Carpetas creadas:    ${creadas}`);
  console.log(`   Total:               ${existentes + creadas}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main();
