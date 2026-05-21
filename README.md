# Outlet Hogar

Catálogo online de muebles, decoración y electrodomésticos. Sincronizado automáticamente con [Viena Muebles](https://vienamuebles.com/).

## Stack

- **Next.js 15** con App Router y TypeScript
- **TailwindCSS** para estilos
- **Prisma + SQLite** para base de datos local
- **Puppeteer Core** para scraping

---

## Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

El archivo `.env.local` ya está creado con valores por defecto. Editalo si necesitás cambiar la contraseña o el número de WhatsApp:

```env
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="outlet2024"
NEXT_PUBLIC_WHATSAPP="5491100000000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 3. Inicializar la base de datos

```bash
npx prisma generate
npx prisma db push
npm run seed
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) para ver el catálogo.

---

## Uso

### Catálogo público
Accedé a `http://localhost:3000` para ver el catálogo con búsqueda, filtros y botones de WhatsApp.

### Panel de administrador
Accedé a `http://localhost:3000/admin` con la contraseña definida en `ADMIN_PASSWORD`.

Desde el panel podés:
- Configurar márgenes de ganancia, cuotas e interés
- Ver y editar precios de productos
- Marcar/desmarcar disponibilidad
- Disparar sincronización manual
- Ver estadísticas del catálogo

### Sincronización manual

Desde el panel admin → pestaña "Sincronización" → botón "Sincronizar ahora".

O desde la terminal:

```bash
npm run scraper
```

> **Requisito:** Necesitás tener Google Chrome instalado en el sistema. El scraper usa `puppeteer-core` y detecta Chrome automáticamente en las rutas estándar de Windows.

### Seed inicial

```bash
npm run seed
```

Inserta la configuración inicial en la base de datos (márgenes, cuotas, WhatsApp).

---

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run scraper` | Ejecutar scraper manualmente |
| `npm run seed` | Insertar configuración inicial |

---

## Deploy en Vercel

1. Subí el proyecto a GitHub
2. Importalo en [vercel.com](https://vercel.com)
3. Configurá las variables de entorno en el panel de Vercel
4. El cron job (`vercel.json`) sincronizará automáticamente todos los días a las 6am

> **Nota sobre Vercel:** SQLite no persiste en Vercel (filesystem efímero). Para producción, migrá a PostgreSQL cambiando el `provider` en `prisma/schema.prisma` y actualizando `DATABASE_URL`.

---

## Estructura del proyecto

```
outlet-hogar/
├── app/
│   ├── api/
│   │   ├── productos/          → GET lista, GET por ID, PATCH
│   │   ├── categorias/         → GET categorías únicas
│   │   ├── configuracion/      → GET y PUT configuración
│   │   └── sync/
│   │       ├── route.ts        → POST dispara scraper
│   │       └── logs/           → GET últimos 10 logs
│   ├── admin/page.tsx          → Panel administrador
│   ├── page.tsx                → Catálogo público
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── TarjetaProducto.tsx     → Card de producto
│   └── CatalogoCliente.tsx     → Grid interactivo con filtros
├── lib/
│   ├── prisma.ts               → Singleton de Prisma
│   └── calculos.ts             → Cálculo de precios
├── prisma/
│   ├── schema.prisma           → Modelos de BD
│   └── seed.ts                 → Datos iniciales
├── scripts/
│   └── scraper.ts              → Scraper de Viena Muebles
├── .env.local                  → Variables de entorno
└── vercel.json                 → Cron job diario
```
