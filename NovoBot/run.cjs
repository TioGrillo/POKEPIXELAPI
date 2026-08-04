const fs = require('fs');
const axios = require('axios');
let tempCode = fs.readFileSync('temp_engine.js', 'utf8');
const engineModule = {};
const m = new module.constructor();
m.paths = module.paths;
m._compile(tempCode, 'temp_engine.js');

const { PokePixelEngine } = m.exports;

(async () => {
    try {
        const login = await axios.post('https://pokepixel.nietore.com/api/v1/auth/login', {
            login: 'damdam5',
            password: 'Vd522431'
        }, { validateStatus: () => true });

        const token = login.data.token || login.data.access_token;
        if (!token) throw new Error('No token ' + JSON.stringify(login.data));

        const engine = new PokePixelEngine(
            'damdam5', 'Vd522431', token,
            '65183cd4-66f3-49a1-91a2-2c2eb9d614c7',
            { shiny: true, common: true, rare: true, epic: true, legendary: true, mythic: true },
            () => {},
            (msg) => {
                const time = new Date().toLocaleTimeString();
                console.log(`[damdam5] [${time}] ${msg}`);
            },
            () => console.log('Auth Error!'),
            false, [], 50, 0
        );

        engine.start();

        setTimeout(() => {
            engine.stop();
            process.exit(0);
        }, 15000);
    } catch(e) { console.error(e); }
})();
