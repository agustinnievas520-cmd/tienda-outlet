process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const puppeteer = require('puppeteer-core');

(async () => {
  const exe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: exe,
    args: ['--no-sandbox','--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  // Test multiple URL formats for different products
  const tests = [
    { query: 'televisor noblex 55', url: 'https://listado.mercadolibre.com.ar/televisor-noblex-55' },
    { query: 'calefon orbis 315', url: 'https://listado.mercadolibre.com.ar/calefon-orbis-315' },
    { query: 'termo outdoors', url: 'https://listado.mercadolibre.com.ar/termo-outdoors' },
  ];

  for (const t of tests) {
    console.log('\n--- Testing:', t.query, '---');
    await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl.slice(0, 100));
    const imgs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .filter(i => (i.src||'').includes('mlstatic.com'))
        .slice(0,3)
        .map(i => ({ src: (i.src||'').slice(0,100), cl: (i.className||'').slice(0,40) }));
    });
    console.log('ML images found:', imgs.length);
    if (imgs.length) console.log('First:', imgs[0]);
  }
  await browser.close();
})().catch(e => console.error('ERR:', e.message));
