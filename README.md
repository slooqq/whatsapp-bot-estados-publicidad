# WhatsApp Bot - Estados Publicidad

Bot automatizado para publicar estados de WhatsApp desde múltiples cuentas usando imágenes organizadas por categorías y variantes. Diseñado para campañas de publicidad rotativa sin repetición de contenido.

---

## Índice

- [Arquitectura General](#arquitectura-general)
- [Tecnologías y Recursos](#tecnologías-y-recursos)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Sistema Latin Square](#sistema-latin-square)
- [Variantes y Ciclo Semanal](#variantes-y-ciclo-semanal)
- [Mapeo Categoría → Carpeta](#mapeo-categoría--carpeta)
- [Conexiones entre Módulos](#conexiones-entre-módulos)
- [Configuración](#configuración)
- [Persistencia y Estado](#persistencia-y-estado)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Uso](#uso)
- [Mantenimiento](#mantenimiento)
- [Solución de Problemas](#solución-de-problemas)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                         index.ts (orquestador)                      │
│  Inicia sesiones WhatsApp → Programa ciclo 1min → Ejecuta ciclo    │
└────────┬────────────┬──────────────┬────────────────┬──────────────┘
         │            │              │                │
         ▼            ▼              ▼                ▼
┌──────────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────────┐
│  fileManager │ │ publisher│ │  config.ts │ │  platforms/       │
│  ─ Semana    │ │ ─ RR     │ │  ─ Carga   │ │  whatsapp.ts     │
│  ─ Latin Sq  │ │ ─ Reint. │ │  config.json│ │  ─ Multi-cliente  │
│  ─ Carpetas  │ │ ─ Fallos │ │            │ │  ─ QR secuencial   │
│  ─ Historial │ │          │ │            │ │  ─ Timeout/reconex  │
└──────────────┘ └──────────┘ └────────────┘ └──────────────────┘
         │                           ▲
         ▼                           │
┌──────────────────┐        ┌────────────────┐
│  D:\PUBLICIDAD   │        │  failed.log    │
│  AUTONOMA\       │        │  historial.json│
│  (18 carpetas)   │        │  semana.json   │
└──────────────────┘        └────────────────┘
```

**Componentes:**

1. **Orquestador** (`index.ts`) — Punto de entrada. Inicializa sesiones, programa el cron cada minuto y ejecuta el ciclo de publicación.
2. **Gestor de archivos** (`fileManager.ts`) — Corazón del negocio: maneja la semana, Latin Square, mapeo categoría→carpeta, historial de publicaciones.
3. **Publicador** (`publisher.ts`) — Ejecuta la publicación en modo round-robin con reintentos progresivos.
4. **Plataforma WhatsApp** (`platforms/whatsapp.ts`) — Cliente multi-cuenta usando `whatsapp-web.js`. Inicialización secuencial, reconexión automática, timeout por envío.
5. **Configuración** (`config.ts`) — Carga validada de `config.json`.

---

## Tecnologías y Recursos

### Runtime

| Recurso | Versión | Propósito |
|---------|---------|-----------|
| Node.js | v24.16.0 | Entorno de ejecución |
| TypeScript | 5.7+ | Lenguaje, compilación a JS |
| ts-node | ~10.9 | Ejecución directa de TS en desarrollo |

### Librerías Principales

| Librería | Versión | Propósito |
|----------|---------|-----------|
| **whatsapp-web.js** | ^1.26.0 | Cliente no oficial de WhatsApp Web. Abstrae BAILEYS y Puppeteer para conectar múltiples cuentas, escanear QR, enviar estados (`status@broadcast`). |
| **Puppeteer** | ^23.0.0 | Navegador headless Chrome. Usado internamente por whatsapp-web.js para renderizar WhatsApp Web. |
| **qrcode-terminal** | ^0.12.0 | Renderiza QR codes en la terminal para escanear con WhatsApp. |
| **node-cron** | ^3.0.0 | Programador de tareas. Ejecuta `ejecutarCiclo()` cada 1 minuto. |
| **axios** | ^1.7.0 | Cliente HTTP (reservado para futura integración Facebook/Instagram). |
| **form-data** | ^4.0.0 | Construcción de formularios multipart (reservado para APIs externas). |
| **dotenv** | ^16.4.0 | Carga de variables de entorno (`.`env`, reservado). |

### APIs y Servicios Externos

| API | Medio | Propósito |
|-----|-------|-----------|
| **WhatsApp Web** | Vía `whatsapp-web.js` (BAILEYS + Puppeteer) | Envío de estados (`status@broadcast`) |
| **Google Chrome** | Ejecutable local (`chrome.exe`) | Motor de renderizado para Puppeteer |

### Almacenamiento Local

| Archivo | Formato | Propósito |
|---------|---------|-----------|
| `config.json` | JSON | Configuración de cuentas, rutas, delays |
| `semana.json` | JSON | Estado semanal: clave de semana, variante activa, orden shuffled de categorías |
| `historial.json` | JSON | Registro de todas las imágenes publicadas por cuenta (evita repetición) |
| `failed.log` | Texto plano | Log de errores con timestamp, cuenta, archivo y mensaje de error |
| `auth/session-cuenta_X/` | Directorio | Sesiones persistentes de WhatsApp Web (LocalAuth) |

---

## Estructura del Proyecto

### Código Fuente (`src/`)

```
📁 C:\repo\bot-publicidad\
├── 📄 config.json                  # Configuración del bot
├── 📄 package.json                 # Dependencias y scripts
├── 📄 tsconfig.json                # Configuración TypeScript
├── 📄 .gitignore                   # Archivos ignorados por git
├── 📄 semana.json                  # Estado semanal (autogenerado)
├── 📄 historial.json               # Historial de publicaciones (autogenerado)
├── 📄 failed.log                   # Log de errores (autogenerado)
├── 📁 src/
│   ├── 📄 index.ts                 # Orquestador principal
│   │   Inicializa historial → carga config → inicia WhatsApp →
│   │   ejecuta ciclo → programa cron cada 1 minuto
│   │
│   ├── 📄 config.ts                # Carga y validación de config.json
│   │   Exporta: cargarConfig() → Configuracion
│   │   Interfaz: Configuracion { directorio_base, delay_segundos,
│   │             reintentos_por_imagen, cuentas }
│   │
│   ├── 📄 fileManager.ts           # Gestión de archivos y lógica semanal
│   │   ─ Semana: getCurrentWeekKey(), asegurarSemana(), getVarianteActual()
│   │   ─ Latin Square: obtenerAsignacionDelDia()
│   │   ─ Carpetas: obtenerCarpeta(categoria, variante) con fallback
│   │   ─ Historial: initHistorial(), listarImagenes(), registrarPublicacion()
│   │   Constantes: CATEGORIAS, CATEGORIA_FOLDERS, LATIN_SQUARE
│   │
│   ├── 📄 publisher.ts             # Publicador round-robin
│   │   publicarPorCuentas(Record<cuenta, ImagenPendiente[]>)
│   │   1 imagen por cuenta por ronda → delay entre imágenes
│   │
│   ├── 📄 failedLogger.ts          # Registro de fallos
│   │   registrarFallo(cuenta, archivo, error) → failed.log
│   │
│   └── 📁 platforms/
│       └── 📄 whatsapp.ts          # Cliente WhatsApp multi-cuenta
│           ─ initWhatsApp(): inicializa N cuentas secuencialmente
│           ─ publicarWhatsApp(cuentaId, filePath, reintentos)
│           ─ Reconexión automática en detached Frame
│           ─ Timeout de envío 60s
│           ─ QR code secuencial (uno a la vez)
│
├── 📁 auth/                        # Sesiones WhatsApp (autogenerado)
├── 📁 dist/                        # Código compilado (autogenerado)
└── 📁 node_modules/                # Dependencias (autogenerado)
```

### Carpetas de Imágenes (`directorio_base`, 18 carpetas)

```
📁 D:\PUBLICIDAD AUTONOMA\
│
├── 📁 1 p/                     # Sábado — Variante 1 (56 archivos)
├── 📁 1 p -  domotica/         # Domótica — Variante 1 (26)
├── 📁 1 p -  electronica/      # Electrónica — Variante 1 (36)
├── 📁 1 p -  solar/            # Solar — Variante 1 (33)
├── 📁 1 p - pos pc/            # POS/PC — Variante 1 (32)
├── 📁 1 p - UNI T/             # UNI T — Variante 1 (37)
│
├── 📁 2 p/                     # Sábado — Variante 2 (44)
├── 📁 2 p - domotica/          # Domótica — Variante 2 (24)
├── 📁 2 p - electronica/       # Electrónica — Variante 2 (34)
├── 📁 2 p - pos pc/            # POS/PC — Variante 2 (22)
├── 📁 2 p - solar/             # Solar — Variante 2 (35)
├── 📁 2 p - u t/               # UNI T — Variante 2 (48)
│
├── 📁 3 p - domotica/          # Domótica — Variante 3 (28)
├── 📁 3 p - electronica/       # Electrónica — Variante 3 (41)
├── 📁 3 p - UNI T/             # UNI T — Variante 3 (29)
│
├── 📁 4 p - electronica/       # Electrónica — Variante 4 (34)
├── 📁 4 p - UNI T/             # UNI T — Variante 4 (37)
│
└── 📁 5 p - UNI T/             # UNI T — Variante 5 (35)
```

**Convención de nombres:** `{variante} p [- ] {categoria}`

---

## Flujo de Trabajo

### 1. Inicio del Bot (`index.ts:main()`)

```
main()
 ├─ initHistorial() → crea historial.json si no existe
 ├─ cargarConfig() → lee config.json, valida campos
 ├─ initWhatsApp()
 │   └─ Por cada cuenta activa (secuencial):
 │       ├─ Crear Client(LocalAuth, puppeteer)
 │       ├─ Esperar evento: 'qr' | 'ready' | 'auth_failure' | 'error'
 │       ├─ Si 'qr' → mostrar QR en terminal, esperar a que usuario escanee
 │       ├─ Si 'ready' → marcar conectada, pasar a siguiente cuenta
 │       └─ Timeout global: 120s por cuenta
 ├─ ejecutarCiclo() → primera pasada inmediata
 └─ cron.schedule('* * * * *') → ejecutarCiclo() cada 1 minuto
```

### 2. Ciclo de Publicación (`ejecutarCiclo()`)

```
ejecutarCiclo()
 ├─ Si es domingo → ⛔ saltar (sin carpetas)
 ├─ obtenerDiaActual() → lunes | martes | miércoles | jueves | viernes | sábado
 ├─ obtenerAsignacionDelDia(día)
 │   ├─ asegurarSemana()
 │   │   ├─ ¿Semana cambió? (nuevo lunes)
 │   │   │   ├─ sí → nuevo shuffle de categorías + nueva variante
 │   │   │   └─ no → usar semana actual
 │   │   └─ guardar/retornar SemanaInfo
 │   └─ Aplicar Latin Square → { a: categoría, b: categoría, c: categoría }
 ├─ getVarianteActual() → 1 | 2 | 3 | 4 | 5
 │
 ├─ Por cada cuenta activa:
 │   ├─ Obtener categoría asignada
 │   ├─ obtenerCarpeta(categoría, variante)
 │   │   ├─ ¿Existe carpeta para esta variante?
 │   │   │   ├─ sí → usarla
 │   │   │   └─ no → fallback a variante 1
 │   │   └─ ¿Existe? → retornar { ruta, nombre } | null
 │   ├─ listarImagenes(ruta, nombre, cuenta)
 │   │   ├─ Leer historial.json
 │   │   ├─ Filtrar archivos no publicados por esta cuenta
 │   │   └─ Ordenar por fecha de creación (más antiguos primero)
 │   └─ Acumular en { cuenta: [ImagenPendiente...] }
 │
 └─ publicarPorCuentas(publicaciones)
     └─ Round-robin (ver abajo)
```

### 3. Publicación Round-Robin (`publisher.ts`)

```
publicarPorCuentas({ a: [...], b: [...], c: [...] })
 │
 ├─ Calcular totales por cuenta
 ├─ Inicializar índices [a=0, b=0, c=0]
 │
 └─ Bucle mientras haya imágenes:
     └─ Por cada cuenta (a, b, c):
         ├─ Saltar si la cuenta ya no tiene más imágenes
         ├─ publicarWhatsApp(cuenta, rutaImagen, reintentos)
         │   ├─ ¿Cliente listo? no → esperar 10s
         │   ├─ Enviar a status@broadcast con timeout 60s
         │   ├─ ¿Éxito? → registrarPublicacion() en historial.json
         │   ├─ ¿detached Frame? → reconectar (máx 30s) y reintentar
         │   ├─ ¿Timeout? → reintentar
         │   └─ ¿Otro error? → backoff: 15s → 30s → 60s
         ├─ Incrementar índice de la cuenta
         └─ ¿Quedan más imágenes? → esperar delay (15s)
```

### 4. Rotación Semanal

```
Lunes 00:00 (detectado por cambio de semana_clave)

asegurarSemana()
 ├─ Calcular semana_clave = "YYYY-MM-DD" (lunes de la semana actual)
 ├─ ¿semana_clave cambió vs semana.json?
 │   ├─ NO → mantener variante y orden actuales
 │   └─ SÍ → 
 │       ├─ nuevaVariante = (varianteAnterior % 5) + 1
 │       │   Ciclo: 1 → 2 → 3 → 4 → 5 → 1 → ...
 │       ├─ nuevoOrden = shuffle(CATEGORIAS)
 │       │   Las 6 categorías se reordenan aleatoriamente
 │       └─ Guardar en semana.json
 │
 └─ Retornar { semana_clave, variante, orden }
```

---

## Sistema Latin Square

Matriz fija de 6 filas (días) × 3 columnas (cuentas). Cada fila es una permutación de las 6 categorías tal que cada columna contiene cada categoría exactamente 1 vez.

```typescript
const LATIN_SQUARE = [
  [0, 1, 2],   // Lunes
  [3, 4, 5],   // Martes
  [1, 2, 0],   // Miércoles
  [4, 5, 3],   // Jueves
  [2, 0, 1],   // Viernes
  [5, 3, 4],   // Sábado
];
```

`cat[n]` se resuelve del orden shuffled de la semana. Ejemplo con una semana cualquiera:

| Día | Cuenta A | Cuenta B | Cuenta C |
|-----|----------|----------|----------|
| Lunes | electronica | domotica | sabado |
| Martes | UNI T | solar | pos pc |
| Miércoles | domotica | sabado | electronica |
| Jueves | solar | pos pc | UNI T |
| Viernes | sabado | electronica | domotica |
| Sábado | pos pc | UNI T | solar |

**Propiedad:** Cada cuenta ve las 6 categorías exactamente 1 vez por semana. Sin repetición.

---

## Variantes y Ciclo Semanal

Actualmente hay 5 variantes en rotación. El ciclo es:

| Semana | Variante | Etiqueta |
|--------|----------|----------|
| Semana 1 | 1 | CON PRECIOS |
| Semana 2 | 2 | SIN PRECIOS |
| Semana 3 | 3 | MARCA 1 |
| Semana 4 | 4 | MARCA 2 |
| Semana 5 | 5 | SIN MARCA |
| Semana 6 | 1 | CON PRECIOS (reinicio) |

**Fallback:** Si una categoría no tiene carpeta para la variante actual (ej. `solar` no tiene variante 3), el sistema usa automáticamente la variante 1 como respaldo.

---

## Mapeo Categoría → Carpeta

Definido en `fileManager.ts:CATEGORIA_FOLDERS`:

| Categoría | v1 | v2 | v3 | v4 | v5 |
|-----------|----|----|----|----|----|
| **solar** | `1 p -  solar` | `2 p - solar` | — (usa v1) | — (usa v1) | — (usa v1) |
| **UNI T** | `1 p - UNI T` | `2 p - u t` | `3 p - UNI T` | `4 p - UNI T` | `5 p - UNI T` |
| **domotica** | `1 p -  domotica` | `2 p - domotica` | `3 p - domotica` | — (usa v1) | — (usa v1) |
| **electronica** | `1 p -  electronica` | `2 p - electronica` | `3 p - electronica` | `4 p - electronica` | — (usa v1) |
| **pos pc** | `1 p - pos pc` | `2 p - pos pc` | — (usa v1) | — (usa v1) | — (usa v1) |
| **sabado** | `1 p` | `2 p` | — (usa v1) | — (usa v1) | — (usa v1) |

**Nota:** Las carpetas de variante 1 para `domotica`, `electronica` y `solar` tienen **doble espacio** (`1 p -  domotica`). Es intencional y debe respetarse.

---

## Conexiones entre Módulos

```
index.ts
  ├── import { cargarConfig } from './config'
  │     └── config.ts → fs.readFileSync(config.json)
  │
  ├── import { obtenerDiaActual, obtenerAsignacionDelDia,
  │           obtenerCarpeta, listarImagenes, initHistorial,
  │           getVarianteActual } from './fileManager'
  │     └── fileManager.ts
  │           ├── import { cargarConfig } from './config'
  │           ├── fs.readFileSync / writeFileSync (semana.json)
  │           ├── fs.readFileSync / writeFileSync (historial.json)
  │           └── fs.readdirSync / statSync (D:\PUBLICIDAD AUTONOMA)
  │
  ├── import { initWhatsApp } from './platforms/whatsapp'
  │     └── platforms/whatsapp.ts
  │           ├── import { cargarConfig } from '../config'
  │           ├── whatsapp-web.js (Client, LocalAuth, MessageMedia)
  │           ├── qrcode-terminal
  │           └── puppeteer (headless Chrome)
  │
  └── import { publicarPorCuentas } from './publisher'
        └── publisher.ts
              ├── import { cargarConfig } from './config'
              ├── import { ImagenPendiente, registrarPublicacion }
              │     from './fileManager'
              ├── import { publicarWhatsApp }
              │     from './platforms/whatsapp'
              │     └── whatsapp.ts → MessageMedia.fromFilePath()
              │                    → client.sendMessage('status@broadcast')
              └── import { registrarFallo } from './failedLogger'
                    └── failedLogger.ts → fs.appendFileSync(failed.log)
```

**Flujo de datos:**

```
Disco (imágenes)
  → fileManager.listarImagenes() → ImagenPendiente[]
  → publisher.publicarPorCuentas()
    → whatsapp.publicarWhatsApp(cuenta, ruta)
      → MessageMedia.fromFilePath(ruta)
      → client.sendMessage('status@broadcast', media)
    → fileManager.registrarPublicacion() → historial.json
    → (on fail) failedLogger.registrarFallo() → failed.log
```

---

## Configuración

### `config.json`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `directorio_base` | string | — | Ruta absoluta a la carpeta con imágenes. Ej: `D:\\PUBLICIDAD AUTONOMA` |
| `delay_segundos` | number | 15 | Segundos de espera entre cada publicación individual |
| `reintentos_por_imagen` | number | 3 | Número de reintentos por imagen fallida (backoff: 15s, 30s, 60s) |
| `cuentas` | object | — | Objeto con IDs de cuenta (`a`..`z`). Cada una con `activa: bool` |

Backoff de reintentos:
- Intento 1 falla → esperar 15s
- Intento 2 falla → esperar 30s
- Intento 3 falla → esperar 60s
- Si persiste → registrar en `failed.log` y continuar con la siguiente imagen

### `semana.json` (autogenerado)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `semana_clave` | string | Fecha del lunes de la semana actual (`YYYY-MM-DD`) |
| `variante` | number | Variante activa (1-5) |
| `orden` | string[] | Orden shuffled de las 6 categorías para esta semana |

**No editar manualmente** a menos que quieras forzar una variante específica.

### `tsconfig.json`

| Opción | Valor | Propósito |
|--------|-------|-----------|
| target | ES2022 | Compilación a JS moderno |
| module | commonjs | Módulos Node.js estándar |
| strict | true | Type checking estricto |
| outDir | ./dist | Output de compilación |
| rootDir | ./src | Código fuente |

---

## Persistencia y Estado

### `historial.json`

Registro plano de todas las imágenes publicadas:

```json
[
  {
    "archivo": "panel_solar_300w.jpg",
    "carpeta": "1 p -  solar",
    "publicado_en": "2026-06-15 10:30:00",
    "cuenta": "a"
  }
]
```

**Formato actual (post-migración):** Cada entrada tiene `cuenta` como string. El formato anterior usaba `cuentas: { a: "timestamp", ... }`.

**Garantía:** Una imagen no se publica dos veces en la misma cuenta, incluso si la carpeta se asigna de nuevo en otra semana.

### `failed.log`

```
[2026-06-15 10:35:00] [Cuenta B] panel_solar_300w.jpg - Timeout tras 60s
```

### `auth/session-cuenta_X/`

Directorio con datos de sesión persistente de WhatsApp Web. Eliminar una carpeta fuerza a re-escanear el QR de esa cuenta.

---

## Requisitos

- **Node.js** v18+ (v24.16.0 recomendado)
- **Google Chrome** instalado en `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Cuentas de WhatsApp** activas (1 a 26, identificadas `a`-`z`)
- **Sistema operativo** Windows (paths estilo `D:\...`)

---

## Instalación

```bash
git clone https://github.com/slooqq/whatsapp-bot-estados-publicidad.git
cd whatsapp-bot-estados-publicidad
npm install
```

Compilar TypeScript (opcional, `npm start` usa `ts-node` directamente):

```bash
npx tsc
```

---

## Uso

```bash
npm start
```

### Primer uso

1. Ejecutar `npm start`
2. El bot inicializa las cuentas una por una
3. Cuando aparece un QR, escanear con WhatsApp:
   - WhatsApp → 3 puntos → Dispositivos vinculados → Vincular dispositivo
4. Una vez escaneadas todas las cuentas, el bot publica automáticamente
5. Las sesiones se guardan en `auth/` — no es necesario re-escanear a menos que se borren

### Inicio automático en Windows

Crear `iniciar.bat`:

```batch
cd /d C:\repo\bot-publicidad
npm start
```

Colocar acceso directo en `shell:startup` para inicio automático al encender el PC.

---

## Mantenimiento

### Forzar una variante específica

Editar `semana.json` y cambiar `variante` al número deseado (1-5). El bot usará esa variante hasta el próximo lunes.

### Limpiar historial de publicaciones

Eliminar `historial.json` y reiniciar el bot. Esto permite republicar todas las imágenes desde cero. Útil después de agregar mucho contenido nuevo.

### Agregar nuevas carpetas

1. Crear carpeta en `D:\PUBLICIDAD AUTONOMA` con el formato `{n} p - {categoria}`
2. Agregar la entrada en `CATEGORIA_FOLDERS` en `src/fileManager.ts`
3. Recompilar: `npx tsc`

### Agregar una nueva cuenta

1. En `config.json`, crear entrada: `"x": { "activa": true }`
2. El bot automáticamente la detecta como nueva cuenta de WhatsApp
3. Escanear el QR cuando aparezca
4. La cuenta se integra al Latin Square (hasta 6 cuentas simultáneas)

### Eliminar sesión de una cuenta

Borrar `auth/session-cuenta_X/` y reiniciar. Aparecerá un QR nuevo para esa cuenta.

---

## Solución de Problemas

### Error: `No se puede cargar el archivo npx.ps1`

Política de ejecución de PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
npm start
```

### Cuenta no se conecta / QR no aparece

Borrar `auth/session-cuenta_X/` para esa cuenta y reiniciar.

### Error `detached Frame` recurrente

El bot reconecta automáticamente (máx 30s). Si persiste:
1. Verificar conexión a internet
2. Reducir número de cuentas activas
3. Aumentar `protocolTimeout` en `whatsapp.ts`

### Timeout en envío (60s)

Cada envío tiene timeout de 60s. El bot reintenta automáticamente 3 veces con backoff. Si falla consistentemente:
1. Verificar tamaño de las imágenes (reducir si >10MB)
2. Verificar conexión de red
3. Revisar `failed.log` para ver el error específico

### Rate limiting de WhatsApp

Si se escanean varios QR seguidos, WhatsApp puede bloquear temporalmente. Esperar 48-72 horas.

### El bot no publica el domingo

Intencional. No hay carpeta para domingo. El bot salta automáticamente.

### Variante incorrecta

Verificar `semana.json`:
- `semana_clave` debe corresponder al lunes de la semana actual
- `variante` debe ser 1-5
- Si es necesario, editar manualmente y reiniciar

---

## Licencia

MIT
