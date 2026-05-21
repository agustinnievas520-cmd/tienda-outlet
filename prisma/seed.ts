import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Verificar si ya existe configuración para no duplicar
  const existente = await prisma.configuracion.findFirst();

  if (!existente) {
    const config = await prisma.configuracion.create({
      data: {
        margen_ganancia: 1.35,
        cuotas: 12,
        interes_cuota: 0.038,
        whatsapp_numero: "5491100000000",
      },
    });
    console.log("✅ Configuración inicial creada:", config);
  } else {
    console.log("ℹ️  La configuración ya existe, no se insertó duplicado.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
