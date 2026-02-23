// secureDelete.js — overwrites a file's contents before removing it
// this prevents the OS from leaving recoverable data blocks on disk
// which is a real concern on HDDs and even some SSDs without TRIM

const fs = require("fs");
const crypto = require("crypto");

// wipes a file by overwriting it multiple times, then unlinking it
// the default 3-pass pattern is: random bytes → all zeros → random bytes
// each pass is flushed with fsync so the OS actually writes to the storage
// device instead of just caching it in memory
function secureDelete(filePath, passes = 3) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // open the file for reading and writing — we need "r+" because
  // we want to overwrite in place, not truncate and recreate
  const fd = fs.openSync(filePath, "r+");
  const { size } = fs.fstatSync(fd);

  // nothing to overwrite for empty files, just remove it
  if (size === 0) {
    fs.closeSync(fd);
    fs.unlinkSync(filePath);
    return { success: true, passes: 0, bytesOverwritten: 0 };
  }

  for (let pass = 1; pass <= passes; pass++) {
    let overwriteBuffer;

    if (pass % 2 === 0) {
      // even passes: zero-fill — this clears any magnetic residue patterns
      overwriteBuffer = Buffer.alloc(size, 0x00);
    } else {
      // odd passes: random noise — makes it impossible to recover the original bits
      overwriteBuffer = crypto.randomBytes(size);
    }

    // write at offset 0 to completely cover the file's disk blocks
    fs.writeSync(fd, overwriteBuffer, 0, size, 0);

    // force the kernel to flush the write buffer to the actual storage device
    // without this, the data might just sit in the page cache and never
    // actually hit the disk before we unlink
    fs.fsyncSync(fd);
  }

  fs.closeSync(fd);

  // finally remove the directory entry — at this point the underlying
  // disk blocks contain nothing but garbage data
  fs.unlinkSync(filePath);

  return {
    success: true,
    passes,
    bytesOverwritten: size,
  };
}

module.exports = { secureDelete };
