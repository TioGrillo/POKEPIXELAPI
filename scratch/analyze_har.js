const fs = require('fs');
const path = require('path');
const desktop = path.join(require('os').homedir(), 'Desktop');
const files = ['ALLZAO.har', 'POKEPIXEL.har'];

const apiEndpoints = new Set();
const apiExamples = {};

for (const file of files) {
    const harPath = path.join(desktop, file);
    if (fs.existsSync(harPath)) {
        try {
            const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
            if (har.log && har.log.entries) {
                for (const entry of har.log.entries) {
                    const url = entry.request.url;
                    if (url.includes('pokepixel') && url.includes('/api/')) {
                        const parsed = new URL(url);
                        const method = entry.request.method;
                        const key = `${method} ${parsed.pathname}`;
                        apiEndpoints.add(key);
                        if (!apiExamples[key]) {
                            apiExamples[key] = {
                                url: url,
                                postData: entry.request.postData?.text,
                                response: entry.response.content?.text
                            };
                        }
                    }
                }
            }
        } catch(e) {}
    }
}

console.log('Endpoints found:');
const sorted = [...apiEndpoints].sort();
for (const ep of sorted) {
    console.log(ep);
}

// Check some interesting ones
const interesting = ['sell', 'buy', 'evolve', 'depot', 'market', 'daily'];
console.log('\nDetails for interesting endpoints:');
for (const ep of sorted) {
    if (interesting.some(i => ep.includes(i))) {
        console.log(`\n--- ${ep} ---`);
        console.log('PostData:', apiExamples[ep].postData?.substring(0, 100));
        console.log('Response:', apiExamples[ep].response?.substring(0, 100));
    }
}
