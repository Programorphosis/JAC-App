#!/usr/bin/env node
/**
 * Ejecuta el seed: usa dist/prisma/seed-dev.js si existe (Docker/prod),
 * si no usa ts-node (desarrollo local sin build previo).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const compiledPath = path.join(root, 'dist', 'prisma', 'seed-dev.js');

if (fs.existsSync(compiledPath)) {
  const r = spawnSync('node', [compiledPath], { stdio: 'inherit', cwd: root });
  process.exit(r.status ?? 0);
} else {
  const r = spawnSync(
    'npx',
    ['ts-node', '-r', 'dotenv/config', '-r', 'tsconfig-paths/register', 'prisma/seed-dev.ts'],
    { stdio: 'inherit', cwd: root }
  );
  process.exit(r.status ?? 0);
}
