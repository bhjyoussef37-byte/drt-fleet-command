import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const candidates = [
  'python',
  'python3',
  'C:\\Users\\ELECTRO-HM\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
  'C:\\Program Files\\Python312\\python.exe',
  'C:\\Program Files\\Python311\\python.exe',
];

function findPython() {
  for (const candidate of candidates) {
    if (candidate.includes('\\') && !existsSync(candidate)) continue;
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (result.status === 0) return candidate;
  }
  return null;
}

const python = findPython();
if (!python) {
  console.error('Python 3 was not found. Install Python 3.11+ and add it to PATH.');
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node scripts/run-python.mjs <script.py> [args...]');
  process.exit(1);
}

const result = spawnSync(python, args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
