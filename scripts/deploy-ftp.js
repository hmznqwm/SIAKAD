/**
 * Skrip Deploy FTP Otomatis untuk SIAKAD ke InfinityFree
 * Host: ftpupload.net (Port 21)
 * User: if0_42681856
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FTP_HOST = process.env.FTP_HOST || 'ftpupload.net';
const FTP_USER = process.env.FTP_USER || '';
const FTP_PASS = process.env.FTP_PASS || '';
const REMOTE_ROOT = process.env.FTP_REMOTE_ROOT || '/htdocs';
const LOCAL_ROOT = path.join(__dirname, '..');

// Daftar file/folder penting yang diunggah saat deployment
const DEPLOY_FILES = [
  '.htaccess',
  'includes/config.php',
  'assets/js/core/script/auth.js',
  'index.php',
  'api.php'
];

console.log('==================================================');
console.log(' SIAKAD FTP Deployer - InfinityFree');
console.log('==================================================');

function ensureRemoteDir(remoteDirPath) {
  // Buat direktori remote via curl FTP jika belum ada
  const parts = remoteDirPath.split('/').filter(Boolean);
  let currentPath = REMOTE_ROOT;
  for (const part of parts) {
    currentPath += '/' + part;
    try {
      const createCmd = `curl.exe -s -u "${FTP_USER}:${FTP_PASS}" -X "MKD ${currentPath}" "ftp://${FTP_HOST}:21/"`;
      execSync(createCmd, { stdio: 'ignore' });
    } catch (e) {
      // Abaikan jika direktori sudah ada
    }
  }
}

function uploadFile(relPath) {
  const localPath = path.join(LOCAL_ROOT, relPath);
  if (!fs.existsSync(localPath)) {
    console.error(`[SKIP] File lokal tidak ditemukan: ${relPath}`);
    return false;
  }

  const remotePath = `${REMOTE_ROOT}/${relPath.replace(/\\/g, '/')}`;
  const parentDir = path.dirname(relPath.replace(/\\/g, '/'));
  if (parentDir !== '.') {
    ensureRemoteDir(parentDir);
  }

  console.log(`[UPLOADING] ${relPath} -> ${remotePath} ...`);
  const cmd = `curl.exe -s --show-error -u "${FTP_USER}:${FTP_PASS}" -T "${localPath}" "ftp://${FTP_HOST}:21${remotePath}"`;
  
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`[SUCCESS]   ${relPath} terunggah!`);
    return true;
  } catch (err) {
    console.error(`[FAILED]    Gagal mengunggah ${relPath}:`, err.message);
    return false;
  }
}

let successCount = 0;
for (const file of DEPLOY_FILES) {
  if (uploadFile(file)) {
    successCount++;
  }
}

console.log('==================================================');
console.log(`Deployment Selesai: ${successCount}/${DEPLOY_FILES.length} file terunggah.`);
console.log('==================================================');
