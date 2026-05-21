import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Verificar API key
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const proyectoDir = path.join(process.cwd());

    // Ejecutar scraper en background y devolver respuesta inmediata
    // El cron de Vercel solo espera confirmación, no el resultado completo
    execAsync(
      `npx ts-node --project tsconfig.scripts.json scripts/scraper.ts`,
      {
        cwd: proyectoDir,
        timeout: 300000, // 5 minutos máximo
      }
    ).catch((err) => {
      console.error("Error en scraper en background:", err.message);
    });

    return NextResponse.json({
      mensaje: "Sincronización iniciada en background",
      inicio: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error al iniciar sincronización:", error);
    return NextResponse.json(
      { error: "Error al iniciar sincronización" },
      { status: 500 }
    );
  }
}

// Soporte para GET (permite cron jobs de Vercel que hacen GET)
export async function GET(request: NextRequest) {
  return POST(request);
}
