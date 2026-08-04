async function getDropmailToken() {
  const r = await fetch("https://dropmail.me/en/");
  const text = await r.text();
  console.log("Matches:", text.match(/af_[a-zA-Z0-9]+/g));
  
  // Try to find the JS file that generates it
  const jsMatches = text.match(/src="([^"]+\.js)"/g);
  console.log("JS files:", jsMatches);
}

getDropmailToken();
