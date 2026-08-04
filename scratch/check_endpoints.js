// just use global fetch
async function test() {
  const url = 'https://pokepixel.nietore.com/play/js/main.js?v=20260723-pokecentro-tooltip-fix-1';
  const res = await fetch(url);
  const text = await res.text();
  const matches = text.match(/.{0,40}wild-monsters.{0,40}/gi) || [];
  console.log('WILD MONSTERS:', matches.join('\n'));
  const hMatches = text.match(/.{0,40}hunts\/prepare.{0,40}/gi) || [];
  console.log('HUNTS PREPARE:', hMatches.join('\n'));
}
test();
test();
