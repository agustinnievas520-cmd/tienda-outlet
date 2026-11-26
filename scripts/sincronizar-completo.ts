// Sincronización completa con el proveedor desde la compu (sin el límite de
// tiempo de Vercel): productos nuevos, precios, stock, bajas y el código de
// artículo de TODOS los productos.
//   npx ts-node --project tsconfig.scripts.json scripts/sincronizar-completo.ts
import * as fs from "fs";
import * as path from "path";
fs.readFileSync(path.join(__dirname, "../.env.local"), "utf-8").split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k?.trim() && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^"(.*)"$/, "$1");
});

(async () => {
  const { sincronizar, GRUPOS } = await import("../lib/sincronizar");
  const { prisma } = await import("../lib/prisma");
  for (const g of GRUPOS) {
    const t = Date.now();
    const r = await sincronizar(g, { maxFichas: Infinity });
    console.log(
      `${r.categorias.join(", ")}\n  leídos ${r.leidos} · nuevos ${r.nuevos} · precios ${r.precios} · mostrados ${r.mostrados} · ocultados ${r.ocultados} · códigos ${r.codigos} · sin código ${r.sinCodigo} · ${Math.round((Date.now() - t) / 1000)}s` +
        (r.errores.length ? `\n  errores: ${r.errores.slice(0, 5).join(" | ")}` : "")
    );
  }
  const visibles = await prisma.producto.count({ where: { disponible: true } });
  const conCodigo = await prisma.producto.count({ where: { disponible: true, codigo: { not: null } } });
  console.log(`\nVisibles: ${visibles} · con código: ${conCodigo}`);
  await prisma.$disconnect();
})();
