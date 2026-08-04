const fs = require('fs');

async function test() {
    const res = await fetch('https://pokepixel.nietore.com/play/');
    const html = await res.text();
    const scripts = html.match(/src="([^"]+\.js)"/g);
    console.log("Scripts found:", scripts);
    
    if (scripts && scripts.length > 0) {
        for (const s of scripts) {
            let url = s.match(/"([^"]+)"/)[1];
            if (!url.startsWith('http')) {
                url = "https://pokepixel.nietore.com" + url;
            }
            console.log("Fetching", url);
            const js = await (await fetch(url)).text();
            
            // Search for endpoints in the JS
            const endpoints = js.match(/\/api\/v1\/[^"'\s`]+/g);
            if (endpoints) {
                console.log("Found API endpoints in", url);
                const unique = [...new Set(endpoints)];
                for (const e of unique) {
                    if (e.includes("shop") || e.includes("store") || e.includes("npc") || e.includes("item") || e.includes("buy")) {
                        console.log("MATCH:", e);
                    }
                }
            }
        }
    }
}
test();
