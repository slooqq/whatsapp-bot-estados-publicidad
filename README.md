# WhatsApp Bot - Estados Publicidad

Bot automatizado para publicar estados de WhatsApp desde múltiples cuentas usando imágenes organizadas por categorías y variantes. Diseñado para campañas de publicidad rotativa sin repetición de contenido.

## Características

- **Múltiples cuentas** — Soporta hasta 6 cuentas de WhatsApp simultáneas
- **6 categorías** — solar, UNI T, domotica, electrónica, pos pc, sabado
- **2 variantes** — Variante 1 (con precios) y Variante 2 (sin precios), alterna semanalmente
- **Latin Square** — Cada cuenta recibe cada categoría exactamente 1 vez por semana
- **Shuffle semanal** — El orden de categorías se reordena aleatoriamente cada semana
- **Round-robin** — Las cuentas publican intercaladas (1 imagen cada una por ronda)
- **Sin repetición** — historial.json evita que una misma imagen se publique dos veces en la misma cuenta
- **Reintentos** — 3 intentos por imagen con backoff progresivo (15s, 30s, 60s)
- **Timeout por envío** — 60s máximo por imagen
- **Reconexión automática** — Detecta frame detached y reconecta
- **QR secuencial** — Los códigos QR aparecen uno a la vez, no en paralelo
- **Ecuador timezone** — UTC-5

## Requisitos

- Node.js v18+
- Google Chrome instalado
- Cuentas de WhatsApp activas

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/whatsapp-bot-estados-publicidad.git
cd whatsapp-bot-estados-publicidad

# Instalar dependencias
npm install

# Compilar TypeScript
npx tsc
```

## Configuración

Editar `config.json`:

```json
{
  "directorio_base": "D:\\PUBLICIDAD AUTONOMA",
  "delay_segundos": 15,
  "reintentos_por_imagen": 3,
  "cuentas": {
    "a": { "activa": true },
    "b": { "activa": true },
    "c": { "activa": true }
  }
}
```

- `directorio_base`: Ruta a la carpeta con las imágenes organizadas
- `delay_segundos`: Tiempo de espera entre cada publicación
- `reintentos_por_imagen`: Número de reintentos por imagen fallida
- `cuentas`: Objeto con las cuentas de WhatsApp. `activa: true` para habilitar, `false` para deshabilitar

## Estructura de Carpetas

Las imágenes deben organizarse así en `directorio_base`:

```
📁 D:\PUBLICIDAD AUTONOMA
├── 📁 1 p -  domotica/       # Variante 1 - Domótica (con precios)
├── 📁 1 p -  electronica/    # Variante 1 - Electrónica (con precios)
├── 📁 1 p -  solar/          # Variante 1 - Solar (con precios)
├── 📁 1 p - pos pc/          # Variante 1 - POS/PC (con precios)
├── 📁 1 p - UNI T/           # Variante 1 - UNI T (con precios)
├── 📁 1 p/                   # Variante 1 - Sabado (con precios)
├── 📁 2 p - domotica/        # Variante 2 - Domótica (sin precios)
├── 📁 2 p - electronica/     # Variante 2 - Electrónica (sin precios)
├── 📁 2 p - solar/           # Variante 2 - Solar (sin precios)
├── 📁 2 p - pos pc/          # Variante 2 - POS/PC (sin precios)
├── 📁 2 p - u t/             # Variante 2 - UNI T (sin precios)
└── 📁 2 p/                   # Variante 2 - Sabado (sin precios)
```

**Nota:** Las carpetas con espacios dobles (`1 p -  domotica`) son intencionales y deben respetarse.

## Uso

```bash
npm start
```

O ejecutar directamente:

```bash
node dist/index.js
```

### Primer uso

1. Ejecutar `npm start`
2. Escanear el QR de cada cuenta cuando aparezca
3. Los QR aparecen uno a la vez (secuencial)
4. Una vez escaneados todos, el bot comienza a publicar automáticamente

### Inicio automático en Windows

El archivo `iniciar.bat` permite ejecutar el bot con doble clic:

```batch
cd /d C:\repo\bot-publicidad
npm start
```

Puedes crear un acceso directo a este archivo en `shell:startup` para que inicie automáticamente al encender el PC.

## Cómo funciona

### Asignación semanal (Latin Square)

Cada lunes se genera un nuevo orden aleatorio de las 6 categorías. El Latin Square garantiza que:

| Día | Cuenta A | Cuenta B | Cuenta C |
|-----|----------|----------|----------|
| Lun | cat[0]   | cat[1]   | cat[2]   |
| Mar | cat[3]   | cat[4]   | cat[5]   |
| Mié | cat[1]   | cat[2]   | cat[0]   |
| Jue | cat[4]   | cat[5]   | cat[3]   |
| Vie | cat[2]   | cat[0]   | cat[1]   |
| Sáb | cat[5]   | cat[3]   | cat[4]   |

Cada cuenta ve las 6 categorías exactamente 1 vez por semana.

### Variante semanal

- Semana 1: Variante 1 (con precios)
- Semana 2: Variante 2 (sin precios)
- Semana 3: Variante 1 (con precios, nuevo shuffle)
- ... y así sucesivamente

### Publicación round-robin

Las cuentas publican en rondas: A[0], B[0], C[0], A[1], B[1], C[1]... así ninguna cuenta espera demasiado por su turno.

## Archivos del proyecto

```
📁 C:\repo\bot-publicidad\
├── 📄 config.json           # Configuración de cuentas y rutas
├── 📄 package.json          # Dependencias y scripts
├── 📄 iniciar.bat           # Acceso directo para Windows
├── 📄 .gitignore            # Archivos ignorados por git
├── 📁 src/
│   ├── 📄 index.ts          # Punto de entrada
│   ├── 📄 config.ts         # Carga de configuración
│   ├── 📄 fileManager.ts    # Manejo de archivos, semana, asignación
│   ├── 📄 publisher.ts      # Publicación round-robin
│   ├── 📄 failedLogger.ts   # Registro de fallos
│   └── 📁 platforms/
│       └── 📄 whatsapp.ts   # Cliente WhatsApp multi-cuenta
├── 📁 auth/                 # Sesiones de WhatsApp (autogenerado)
├── 📁 dist/                 # Código compilado (autogenerado)
└── 📁 node_modules/         # Dependencias (autogenerado)
```

## Solución de problemas

### Cuenta no se conecta
Borrar la carpeta `auth/session-cuenta_X/` y reiniciar. Aparecerá un QR nuevo.

### Error "detached Frame"
El manejador automático reconecta la cuenta en máximo 30 segundos.

### Timeout en envío
Cada envío tiene un máximo de 60 segundos. Si falla, se reintenta automáticamente.

### Rate limiting de WhatsApp
Si escaneaste varios QR seguidos, WhatsApp puede bloquear temporalmente. Esperar 48-72 horas.

## Licencia

MIT
