# Secure File Encryption Tool (OS Project – Phase 1)

## Project Overview
This project is a **Secure File Encryption Tool** built using **Node.js and Express** to demonstrate how an **Operating System ensures secure data handling** through encryption, file system access control, and memory-level processing.

The project focuses on **Phase 1**:
- Secure file encryption
- Private key generation
- OS-level file protection

Decryption is intentionally excluded and planned for **Phase 2**.

---

## Objectives
- Understand how OS handles secure I/O
- Encrypt data without storing plaintext on disk
- Apply OS-level file permissions
- Demonstrate access control using cryptographic keys

---

## OS Principles Applied

| OS Concept | How It Is Applied |
|----------|------------------|
| Secure I/O | Raw binary data read directly from request stream |
| Process Isolation | Encryption runs inside a backend Node.js process |
| Memory Protection | Plain data exists only in RAM, never written to disk |
| File System Security | Encrypted files stored with restricted permissions |
| Access Control | Private key required for future decryption |
| Least Privilege | Only encrypted files are persisted |

---

## Project Structure
os_project/
├── backend/
│ ├── server.js
│ └── encrypted/
└── frontend/ (optional, Phase 1 testing done via Postman)

## Technologies Used
- **Node.js**
- **Express.js**
- **Crypto (AES-256-CBC)**
- **Postman** (for testing)
- **File System (fs)**

## Encryption Approach (Phase 1)
- AES-256 encryption using Node.js `crypto` module
- Unique private key and IV generated per file
- Encryption happens **entirely in memory**
- Only encrypted output is written to disk
- Each encrypted file is uniquely named to prevent overwrite
