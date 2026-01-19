const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local not found at " + envPath);
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

let privateKeyRaw = null;

for (const line of lines) {
    if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
        // Simple parser: assumes key is everything after the first = and handles quotes if present
        let val = line.substring('FIREBASE_PRIVATE_KEY='.length);
        val = val.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        privateKeyRaw = val;
        break;
    }
}

if (!privateKeyRaw) {
    console.error("❌ FIREBASE_PRIVATE_KEY not found in .env.local");
    process.exit(1);
}

console.log("Found FIREBASE_PRIVATE_KEY. Checking format...");

// Apply the same logic as server.ts
const processedKey = privateKeyRaw.replace(/\\n/g, "\n");

console.log(`Length raw: ${privateKeyRaw.length}`);
console.log(`Length processed: ${processedKey.length}`);

if (!processedKey.includes("BEGIN PRIVATE KEY")) {
    console.error("❌ Key does not contain 'BEGIN PRIVATE KEY'");
} else {
    console.log("✅ Key contains 'BEGIN PRIVATE KEY'");
}

if (!processedKey.includes("\n")) {
    console.error("❌ Key does not contain actual newlines after replacement. It looks like a single long line.");
    console.log("Suggestion: Make sure the file uses literal '\\n' characters (backslash + n) if it is a single line string, OR uses actual newlines if quoted.");
} else {
    console.log(`✅ Key contains ${processedKey.split('\n').length} lines.`);
}

try {
    // Attempt dummy cert creation check (we can't really fully validate without firebase-admin, but we can check basics)
    // Actually, asking the USER to visually inspect is better if this passes basic checks.
    // Let's just output the first and last line "safe" representation
    const lines = processedKey.split('\n').filter(l => l.trim().length > 0);
    console.log(`First line: ${lines[0]}`);
    console.log(`Last line:  ${lines[lines.length - 1]}`);
} catch (e) {
    console.error("Error during check", e);
}
