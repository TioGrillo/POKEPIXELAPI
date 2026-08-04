const fs = require('fs');

const itemsToTest = [
  'pot_of_lava', 'sandbag', 'snowball', 'strange_pheromone', 'straw', 'revive', 
  'max_revive', 'minor_revive', 'cocoon_stone', 'shadow_stone', 'crystal_stone', 
  'heart_stone', 'fire_stone', 'water_stone', 'leaf_stone', 'thunder_stone',
  'moon_stone', 'sun_stone', 'dusk_stone', 'dawn_stone', 'shiny_stone'
];

async function testItemUrls() {
  for (const item of itemsToTest) {
    const urls = [
      `https://pokepixel.nietore.com/assets/imported/items/${item}.png`,
      `https://pokepixel.nietore.com/assets/items/${item}.png`,
      `https://pokepixel.nietore.com/img/items/${item}.png`,
      `https://pokepixel.nietore.com/assets/imported/items/${item.replace(/_/g, '-')}.png`,
      `https://pokepixel.nietore.com/assets/items/${item.replace(/_/g, '-')}.png`
    ];

    let found = false;
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          console.log(`[OK ${res.status}] ${item} => ${url}`);
          found = true;
          break;
        }
      } catch(e) {}
    }
    if (!found) {
      console.log(`[MISSING] ${item}`);
    }
  }
}

testItemUrls();
