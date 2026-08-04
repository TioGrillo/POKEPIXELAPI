const { ProxyAgent, fetch } = require("undici");

async function test() {
  const url = "http://francisbet23:06francisbet@166.0.102.155:5394";
  console.log("Testing with proxy:", url);
  const agent = new ProxyAgent(url);
  try {
    const res = await fetch("https://poke.idleworld.online/", {
      dispatcher: agent,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    console.log("Success! Status:", res.status);
  } catch (e) {
    console.error("Error:", e.message, e.cause);
  }
}

test();
