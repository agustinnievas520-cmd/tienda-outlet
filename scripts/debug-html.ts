import puppeteer from "puppeteer-core";

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const browser = await puppeteer.launch({
    headless: true, executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
  await page.setViewport({ width: 1280, height: 800 });

  // Probar URL de página 2 directamente
  await page.goto("https://vienamuebles.com/product-category/muebles/page/2/", {
    waitUntil: "networkidle2", timeout: 30000,
  });

  const r = await page.evaluate(() => {
    const items = document.querySelectorAll("li.product");
    const nombres: string[] = [];
    items.forEach(i => {
      const n = i.querySelector("h3")?.textContent?.trim();
      if (n) nombres.push(n);
    });
    const contador = document.querySelector(".woocommerce-result-count")?.textContent?.trim() || "";
    return { total: items.length, contador, nombres: nombres.slice(0, 3) };
  });

  console.log("Página 2 de Muebles:", JSON.stringify(r, null, 2));

  // Ver cuántas páginas tiene (total / 12)
  const total = 353;
  const porPagina = 12;
  const paginas = Math.ceil(total / porPagina);
  console.log(`\nTotal Muebles: ${total} productos → ${paginas} páginas de ${porPagina}`);

  await browser.close();
}
main().catch(console.error);
