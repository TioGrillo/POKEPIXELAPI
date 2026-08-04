const fs = require('fs');

// Simple JS implementation of nickGenerator to test logic directly
const MALE_NAMES = ['Lord', 'Duke', 'Jesse', 'Evander', 'Ester', 'Soren', 'Flash', 'Kaelum', 'Benoit', 'Pike', 'Warden', 'Mathias', 'Alejandra', 'Beatrice', 'Kaelan', 'Hannah', 'Wisteria', 'Tariq', 'Ace'];
const MALE_PREFIXES = ['Lord', 'King', 'Sir'];
const MALE_SUFFIXES = ['King', 'Lord', 'Boss', 'Fatal', 'Spartan', 'Rebel', 'Mistress'];

function generateNick(
  gender = 'male',
  options = {}
) {
  const { usePrefix = false, prefix = '', avoidNumbers = false } = options;

  let baseName = MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)];

  let chosenPrefix = '';
  if (usePrefix) {
    if (prefix && prefix.trim().length > 0) {
      chosenPrefix = prefix.trim().replace(/\s+/g, '');
    } else {
      chosenPrefix = MALE_PREFIXES[Math.floor(Math.random() * MALE_PREFIXES.length)];
    }
  }

  let chosenSuffix = '';
  if (Math.random() > 0.6) {
    chosenSuffix = MALE_SUFFIXES[Math.floor(Math.random() * MALE_SUFFIXES.length)];
  }

  let finalNick = `${chosenPrefix}${baseName}${chosenSuffix}`;

  if (finalNick.length > 14 && chosenSuffix) {
    finalNick = `${chosenPrefix}${baseName}`;
  }

  if (!avoidNumbers) {
    const num = Math.floor(Math.random() * 99) + 1;
    finalNick = `${finalNick}${num}`;
  }

  if (finalNick.length > 16) {
    finalNick = finalNick.substring(0, 16);
  }

  return finalNick;
}

console.log('--- TEST 1: usePrefix=true, prefix="PK", avoidNumbers=true ---');
for (let i = 0; i < 5; i++) console.log(generateNick('male', { usePrefix: true, prefix: 'PK', avoidNumbers: true }));

console.log('\n--- TEST 2: usePrefix=false, prefix="PK", avoidNumbers=false ---');
for (let i = 0; i < 5; i++) console.log(generateNick('male', { usePrefix: false, prefix: 'PK', avoidNumbers: false }));

console.log('\n--- TEST 3: usePrefix=true, prefix="PK", avoidNumbers=false ---');
for (let i = 0; i < 5; i++) console.log(generateNick('male', { usePrefix: true, prefix: 'PK', avoidNumbers: false }));

console.log('\n--- TEST 4: usePrefix=false, prefix="PK", avoidNumbers=true ---');
for (let i = 0; i < 5; i++) console.log(generateNick('male', { usePrefix: false, prefix: 'PK', avoidNumbers: true }));
