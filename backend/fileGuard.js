// fileGuard.js — file type whitelisting by extension AND magic bytes
// Both checks must pass before a file is accepted for encryption.
//
// Why two checks?
//   Extension alone can be spoofed (e.g. rename malware.exe → report.txt).
//   Magic bytes alone can be forged, but only by someone who understands the
//   format — pairing both makes a meaningful hurdle without a heavy dep tree.

// ── Allowed extensions ────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([
  ".txt", ".csv", ".json", ".xml",
  ".pdf",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
  ".mp4", ".mov", ".avi", ".mkv", ".webm",
  ".mp3", ".wav", ".ogg", ".flac",
  ".zip", ".tar", ".gz", ".7z",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".odt", ".ods", ".odp",
  ".md",
]);

// ── Magic byte signatures ─────────────────────────────────────────────────────
// Each entry: { label, check(buf) → bool }
// We match against the first 12 bytes of the file body.
const MAGIC_SIGNATURES = [
  // PDF
  { label: "pdf",  check: b => b.slice(0,4).toString("ascii") === "%PDF" },
  // PNG
  { label: "png",  check: b => b[0]===0x89 && b[1]===0x50 && b[2]===0x4E && b[3]===0x47 },
  // JPEG
  { label: "jpg",  check: b => b[0]===0xFF && b[1]===0xD8 && b[2]===0xFF },
  // GIF
  { label: "gif",  check: b => b.slice(0,4).toString("ascii").startsWith("GIF8") },
  // WEBP  (RIFF....WEBP)
  { label: "webp", check: b => b.slice(0,4).toString("ascii")==="RIFF" && b.slice(8,12).toString("ascii")==="WEBP" },
  // ZIP / DOCX / XLSX / PPTX / OD* / JAR — all ZIP-based
  { label: "zip",  check: b => b[0]===0x50 && b[1]===0x4B && b[2]===0x03 && b[3]===0x04 },
  // GZIP
  { label: "gz",   check: b => b[0]===0x1F && b[1]===0x8B },
  // 7-Zip
  { label: "7z",   check: b => b[0]===0x37 && b[1]===0x7A && b[2]===0xBC && b[3]===0xAF },
  // TAR (ustar magic at offset 257 — we skip that deep scan here; rely on extension for tar)
  // MP4 — "ftyp" box sits at offset 4
  { label: "mp4",  check: b => b.slice(4,8).toString("ascii") === "ftyp" },
  // RIFF-based (AVI, WAV)
  { label: "riff", check: b => b.slice(0,4).toString("ascii") === "RIFF" },
  // ID3 / MP3
  { label: "mp3",  check: b => b[0]===0x49 && b[1]===0x44 && b[2]===0x33 },
  // OGG
  { label: "ogg",  check: b => b.slice(0,4).toString("ascii") === "OggS" },
  // FLAC
  { label: "flac", check: b => b.slice(0,4).toString("ascii") === "fLaC" },
  // MKV / WEBM (EBML header)
  { label: "mkv",  check: b => b[0]===0x1A && b[1]===0x45 && b[2]===0xDF && b[3]===0xA3 },
  // Plain text / CSV / JSON / MD / XML heuristic:
  // if every byte in the first 512 chars is a printable ASCII or common whitespace, treat as text
  {
    label: "text",
    check: b => {
      const sample = b.slice(0, Math.min(b.length, 512));
      return sample.every(byte =>
        (byte >= 0x09 && byte <= 0x0D) || // tab, LF, VT, FF, CR
        (byte >= 0x20 && byte <= 0x7E) || // printable ASCII
        byte >= 0x80                       // non-ASCII (UTF-8 multi-byte)
      );
    },
  },
];

// ── Explicitly blocked signatures (executable / dangerous) ────────────────────
const BLOCKED_MAGIC = [
  // Windows PE (EXE / DLL / SYS)
  { label: "PE executable", check: b => b[0]===0x4D && b[1]===0x5A },
  // ELF (Linux binary)
  { label: "ELF binary",    check: b => b[0]===0x7F && b[1]===0x45 && b[2]===0x4C && b[3]===0x46 },
  // Mach-O (macOS binary) — 32-bit and 64-bit variants
  { label: "Mach-O binary", check: b => (b[0]===0xCE||b[0]===0xCF) && b[1]===0xFA && b[2]===0xED && b[3]===0xFE },
  { label: "Mach-O binary", check: b => b[0]===0xFE && b[1]===0xED && b[2]===0xFA && (b[3]===0xCE||b[3]===0xCF) },
];

/**
 * isExtensionAllowed(filename)
 * Returns true if the file extension is on the whitelist.
 */
function isExtensionAllowed(filename) {
  const ext = require("path").extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * isMagicBytesAllowed(buffer)
 * Returns { allowed: bool, reason: string }
 *
 * Rejects if:
 *   1. A blocked signature (executable) matches, OR
 *   2. No allowed signature matches at all
 */
function isMagicBytesAllowed(buffer) {
  // Fast path — need at least 4 bytes to do anything meaningful
  if (!buffer || buffer.length < 4) {
    return { allowed: false, reason: "file too small to inspect" };
  }

  // Check blocked first — executables are always rejected
  for (const sig of BLOCKED_MAGIC) {
    if (sig.check(buffer)) {
      return { allowed: false, reason: `blocked file type: ${sig.label}` };
    }
  }

  // Check allowed signatures
  for (const sig of MAGIC_SIGNATURES) {
    if (sig.check(buffer)) {
      return { allowed: true, reason: sig.label };
    }
  }

  return { allowed: false, reason: "unrecognised file format" };
}

module.exports = { isExtensionAllowed, isMagicBytesAllowed };
