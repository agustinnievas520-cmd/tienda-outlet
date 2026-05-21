import sqlite3
import psycopg2
from datetime import datetime, timezone

SQLITE_PATH = r"c:\Users\Usuario\TIENDA OUTLET\prisma\dev.db"
NEON_URL = "postgresql://neondb_owner:npg_oN87nBelKJXD@ep-old-block-acyjzdwf-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

def ts(val):
    if val is None:
        return datetime.now(timezone.utc)
    if isinstance(val, (int, float)):
        return datetime.fromtimestamp(val / 1000, tz=timezone.utc)
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except:
        return datetime.now(timezone.utc)

def get_cols(conn, table):
    return [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]

def to_dict(cols, row):
    return dict(zip(cols, row))

print("Conectando a SQLite...")
sqlite = sqlite3.connect(SQLITE_PATH)

print("Conectando a Neon...")
pg = psycopg2.connect(NEON_URL)
cur = pg.cursor()

# ── Configuracion ──────────────────────────────────────────
print("\nMigrando Configuracion...")
cols = get_cols(sqlite, "Configuracion")
print("  Columnas:", cols)
rows = [to_dict(cols, r) for r in sqlite.execute("SELECT * FROM Configuracion").fetchall()]
for d in rows:
    cur.execute("""
        INSERT INTO "Configuracion" (id, margen_ganancia, margen_financiado, cuotas, interes_cuota, whatsapp_numero, whatsapp_numero_2)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            whatsapp_numero = EXCLUDED.whatsapp_numero,
            whatsapp_numero_2 = EXCLUDED.whatsapp_numero_2
    """, (d["id"], d["margen_ganancia"], d["margen_financiado"], d["cuotas"],
          d["interes_cuota"], d["whatsapp_numero"], d.get("whatsapp_numero_2", "")))
pg.commit()
print(f"  {len(rows)} filas migradas")

# ── Producto ───────────────────────────────────────────────
print("\nMigrando Productos...")
cols = get_cols(sqlite, "Producto")
print("  Columnas:", cols)
rows = [to_dict(cols, r) for r in sqlite.execute("SELECT * FROM Producto").fetchall()]
ok = 0
for d in rows:
    try:
        cur.execute("""
            INSERT INTO "Producto" (id, nombre, categoria, precio_costo, imagen_url, disponible, url_origen, descripcion, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (url_origen) DO NOTHING
        """, (
            d["id"], d["nombre"], d["categoria"], d["precio_costo"],
            d["imagen_url"], bool(d["disponible"]), d["url_origen"],
            d.get("descripcion"),
            ts(d["createdAt"]), ts(d["updatedAt"])
        ))
        ok += 1
        if ok % 100 == 0:
            pg.commit()
            print(f"  {ok}/{len(rows)}...")
    except Exception as e:
        pg.rollback()
        print(f"  Error producto {d.get('id')}: {e}")

pg.commit()
print(f"  {ok}/{len(rows)} productos migrados")

# ── LogSincronizacion ──────────────────────────────────────
print("\nMigrando Logs...")
cols = get_cols(sqlite, "LogSincronizacion")
rows = [to_dict(cols, r) for r in sqlite.execute("SELECT * FROM LogSincronizacion").fetchall()]
for d in rows:
    try:
        cur.execute("""
            INSERT INTO "LogSincronizacion" (id, fecha, productos_nuevos, productos_actualizados, errores)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (d["id"], ts(d["fecha"]), d["productos_nuevos"], d["productos_actualizados"], d.get("errores")))
    except Exception as e:
        pg.rollback()
        print(f"  Error log: {e}")

pg.commit()
print(f"  {len(rows)} logs migrados")
print("\n✅ Migracion completada!")
sqlite.close()
pg.close()
