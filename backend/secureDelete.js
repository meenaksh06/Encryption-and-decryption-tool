const fs = require("fs");
const crypto = require("crypto");

/**
 * Securely deletes a file by overwriting its contents multiple times
 * before unlinking, preventing OS-level recovery of data from disk blocks.
 *
 * Overwrite pattern (3 passes by default):
 *   Pass 1: random bytes   — disrupts original bit patterns
 *   Pass 2: all zeros       — ensures no residual magnetic signature
 *   Pass 3: random bytes   — final randomization before unlink
 *
 * Each pass is followed by fsync to force the OS to flush data to the
 * physical storage medium, defeating write-back caching.
 *
 * @param {string} filePath  — absolute path to the file to securely delete
 * @param {number} passes    — number of overwrite passes (default 3)
 * @returns {{ success: boolean, passes: number, bytesOverwritten: number }}
 */
function secureDelete(filePath, passes = 3) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fd = fs.openSync(filePath, "r+");
  const { size } = fs.fstatSync(fd);

  if (size === 0) {
    // Nothing to overwrite, just unlink
    fs.closeSync(fd);
    fs.unlinkSync(filePath);
    return { success: true, passes: 0, bytesOverwritten: 0 };
  }

  for (let pass = 1; pass <= passes; pass++) {
    let overwriteBuffer;

    if (pass % 2 === 0) {
      // Even passes: zero-fill
      overwriteBuffer = Buffer.alloc(size, 0x00);
    } else {
      // Odd passes: cryptographically random bytes
      overwriteBuffer = crypto.randomBytes(size);
    }

    // Write at the very beginning of the file
    fs.writeSync(fd, overwriteBuffer, 0, size, 0);

    // Force the OS to flush to the physical storage device
    fs.fsyncSync(fd);
  }

  fs.closeSync(fd);

  // Finally remove the directory entry
  fs.unlinkSync(filePath);

  return {
    success: true,
    passes,
    bytesOverwritten: size,
  };
}

module.exports = { secureDelete };
