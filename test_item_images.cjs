const items = ['capsule_basic', 'capsule_ultra', 'potion_super', 'fire_tail', 'essence_of_fire', '310', '311', 'earth_ball', 'great_ball'];

async function testItemUrls() {
  for (const item of items) {
    const urls = [
      `https://pokepixel.nietore.com/assets/imported/items/${item}.png`,
      `https://pokepixel.nietore.com/assets/imported/items/${item}.webp`,
      `https://pokepixel.nietore.com/assets/items/${item}.png`,
      `https://pokepixel.nietore.com/img/items/${item}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.replace(/_/g, '-')}.png`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          console.log(`[OK ${res.status}] ${url}`);
        }
      } catch(e) {}
    }
  }
}

testItemUrls();
