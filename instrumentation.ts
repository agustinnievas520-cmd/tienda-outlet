async function sincronizarStock() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/sincronizar-stock`);
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data:"));
      for (const line of lines) {
        const msg = line.replace("data: ", "");
        if (msg.includes("🟢") || msg.includes("🔴") || msg.includes("🎉") || msg.includes("❌")) {
          console.log("[STOCK]", msg);
        }
      }
    }
    console.log("[STOCK] Sincronización completada.");
  } catch (err) {
    console.error("[STOCK] Error:", err);
  }
}

export async function register() {
  // Sincronización automática desactivada — usar /api/admin/sincronizar-stock manualmente
}
