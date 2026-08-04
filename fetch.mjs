import fs from 'fs';
async function run() {
  const res = await fetch('https://pokepixel.nietore.com/play/');
  const html = await res.text();
  const scriptRegex = /<script type="module" crossorigin src="(.*?)">/g;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    console.log('Script:', match[1]);
    const jsRes = await fetch('https://pokepixel.nietore.com/play' + match[1]);
    const jsText = await jsRes.text();
    fs.writeFileSync('pokepixel_main.js', jsText);
    console.log('Saved to pokepixel_main.js');
  }
}
run().catch(console.error);
