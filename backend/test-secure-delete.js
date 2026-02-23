/**
 * Test suite for secureDelete utility
 *
 * Verifies:
 *  1. File is fully removed after secure delete
 *  2. Return value reports correct passes and byte count
 *  3. Throws on non-existent file
 *  4. Handles zero-byte files gracefully
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { secureDelete } = require("./secureDelete");

const tmpDir = path.join(__dirname, "__test_tmp__");

function setup() {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function teardown() {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

// ── Test 1: Normal file is securely deleted ──
function testNormalFile() {
  console.log("\nTest 1: Secure delete of a normal file");
  const filePath = path.join(tmpDir, "secret.txt");
  const content = crypto.randomBytes(1024); // 1 KB of random data
  fs.writeFileSync(filePath, content);

  const result = secureDelete(filePath);

  assert(!fs.existsSync(filePath), "File no longer exists on disk");
  assert(result.success === true, "Result reports success");
  assert(result.passes === 3, "Default 3 passes performed");
  assert(result.bytesOverwritten === 1024, "Correct byte count (1024)");
}

// ── Test 2: Custom pass count ──
function testCustomPasses() {
  console.log("\nTest 2: Secure delete with custom pass count (5)");
  const filePath = path.join(tmpDir, "secret2.bin");
  fs.writeFileSync(filePath, Buffer.alloc(512, 0xab));

  const result = secureDelete(filePath, 5);

  assert(!fs.existsSync(filePath), "File no longer exists on disk");
  assert(result.passes === 5, "5 passes performed");
  assert(result.bytesOverwritten === 512, "Correct byte count (512)");
}

// ── Test 3: Zero-byte file ──
function testEmptyFile() {
  console.log("\nTest 3: Secure delete of a zero-byte file");
  const filePath = path.join(tmpDir, "empty.txt");
  fs.writeFileSync(filePath, "");

  const result = secureDelete(filePath);

  assert(!fs.existsSync(filePath), "File no longer exists on disk");
  assert(result.success === true, "Result reports success");
  assert(result.passes === 0, "0 passes for empty file");
  assert(result.bytesOverwritten === 0, "0 bytes overwritten");
}

// ── Test 4: Non-existent file throws ──
function testNonExistent() {
  console.log("\nTest 4: Throws on non-existent file");
  let threw = false;
  try {
    secureDelete(path.join(tmpDir, "does_not_exist.txt"));
  } catch (err) {
    threw = true;
  }
  assert(threw, "Error thrown for missing file");
}

// ── Run all tests ──
console.log("━━━ secureDelete() Test Suite ━━━");
setup();

try {
  testNormalFile();
  testCustomPasses();
  testEmptyFile();
  testNonExistent();
} finally {
  teardown();
}

console.log(`\n━━━ Results: ${passed} passed, ${failed} failed ━━━`);
process.exit(failed > 0 ? 1 : 0);
