import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { cargarConfig } from '../config';

interface WAClient {
  id: string;
  client: Client;
  ready: boolean;
}

const clientes: WAClient[] = [];
const TIEMPO_MAXIMO_INICIO = 120_000;
const TIEMPO_MAXIMO_ENVIO = 60_000;

export async function initWhatsApp(): Promise<void> {
  const cfg = cargarConfig();
  const cuentas = Object.keys(cfg.cuentas).filter(k => cfg.cuentas[k].activa);

  if (cuentas.length === 0) {
    throw new Error('No hay cuentas activas en config.json');
  }

  console.log(`📱 Inicializando ${cuentas.length} cuenta(s) de WhatsApp...`);

  for (const id of cuentas) {
    await iniciarCliente(id);
  }

  const conectadas = clientes.filter(c => c.ready).length;
  console.log(`✅ ${conectadas}/${cuentas.length} cuentas conectadas`);
}

function iniciarCliente(id: string): Promise<void> {
  return new Promise((resolve) => {
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: `cuenta_${id}`,
        dataPath: path.join(__dirname, '..', '..', 'auth'),
      }),
      puppeteer: {
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        protocolTimeout: 300_000,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    const entry: WAClient = { id, client, ready: false };
    clientes.push(entry);

    let resuelto = false;
    function resolver() {
      if (resuelto) return;
      resuelto = true;
      resolve();
    }

    client.on('qr', (qr: string) => {
      console.log(`\n⚠️  ESCANEA EL QR PARA CUENTA ${id.toUpperCase()}`);
      console.log('   WhatsApp → 3 puntos → Dispositivos vinculados → Vincular dispositivo');
      qrcode.generate(qr, { small: true });
      resolver();
    });

    client.on('ready', () => {
      console.log(`✅ Cuenta ${id.toUpperCase()} conectada`);
      entry.ready = true;
      resolver();
    });

    client.on('auth_failure', (msg: string) => {
      console.log(`❌ Cuenta ${id.toUpperCase()} error de autenticación: ${msg}`);
      resolver();
    });

    client.on('disconnected', (reason: string) => {
      console.log(`⚠️ Cuenta ${id.toUpperCase()} desconectada: ${reason}. Reintentando...`);
      entry.ready = false;
      setTimeout(() => {
        client.initialize().catch(() => {});
      }, 5000);
    });

    client.on('error', (err: Error) => {
      console.log(`⚠️ Cuenta ${id.toUpperCase()} error: ${err.message}`);
      resolver();
    });

    setTimeout(() => {
      if (!resuelto) {
        console.log(`⏰ Cuenta ${id.toUpperCase()} tiempo de espera agotado (${TIEMPO_MAXIMO_INICIO / 1000}s)`);
        resolver();
      }
    }, TIEMPO_MAXIMO_INICIO);

    client.initialize();
  });
}

export async function publicarWhatsApp(
  cuentaId: string,
  filePath: string,
  reintentos: number = 3,
): Promise<{ ok: boolean; error?: string }> {
  const entry = clientes.find(c => c.id === cuentaId);
  if (!entry) {
    console.log(`   ⚠️ Cuenta ${cuentaId.toUpperCase()} no encontrada`);
    return { ok: false, error: 'Cliente no encontrado' };
  }

  let ultimoError = '';

  for (let intento = 1; intento <= reintentos; intento++) {
    try {
      if (!entry.ready) {
        console.log(`   ⚠️ ${cuentaId.toUpperCase()} no conectada, esperando...`);
        await esperar(10000);
        continue;
      }

      const media = MessageMedia.fromFilePath(path.resolve(filePath));
      await Promise.race([
        entry.client.sendMessage('status@broadcast', media),
        esperar(TIEMPO_MAXIMO_ENVIO).then(() => { throw new Error('Timeout'); }),
      ]);
      return { ok: true };
    } catch (err: any) {
      const msg = err.message || 'Error desconocido';
      ultimoError = msg;

      if (msg.includes('detached') || msg.includes('Frame')) {
        console.log(`   ♻️ ${cuentaId.toUpperCase()} frame detached, esperando reconexión...`);
        entry.ready = false;
        for (let w = 0; w < 30; w++) {
          await esperar(1000);
          if (entry.ready) break;
        }
        if (entry.ready) console.log(`   ✅ ${cuentaId.toUpperCase()} reconectada`);
        continue;
      }

      if (msg === 'Timeout') {
        console.log(`   ⏰ ${cuentaId.toUpperCase()} tiempo excedido (60s), reintentando...`);
        if (intento < reintentos) {
          await esperar(10000);
          continue;
        }
        console.log(`   ❌ ${cuentaId.toUpperCase()} agotó reintentos: Timeout`);
        return { ok: false, error: 'Timeout tras 60s' };
      }

      if (intento < reintentos) {
        const espera = intento === 1 ? 15000 : intento === 2 ? 30000 : 60000;
        console.log(`   🔄 ${cuentaId.toUpperCase()} intento ${intento}/${reintentos} falló: ${msg}. Reintentando en ${espera / 1000}s...`);
        await esperar(espera);
      } else {
        console.log(`   ❌ ${cuentaId.toUpperCase()} agotó reintentos: ${msg}`);
      }
    }
  }
  return { ok: false, error: ultimoError || 'Error desconocido' };
}

function esperar(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export function isWhatsAppReady(): boolean {
  if (clientes.length === 0) return false;
  return clientes.every(c => c.ready);
}
