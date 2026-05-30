import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolsDir, '..');
const frontendRoot = path.join(repoRoot, 'frontend');
const phpLintRequired = /^(1|true|yes)$/i.test(process.env.RTBO_REQUIRE_PHP_LINT || '');
const warnings = [];

function run(label, command, args, options = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    stdio: 'inherit',
    shell: false,
    env: process.env
  });

  if (result.error) {
    console.error(`${label} failed to start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${label} failed with exit code ${result.status}.`);
    process.exit(result.status || 1);
  }
}

function commandExists(command) {
  const result = spawnSync('command', ['-v', command], {
    shell: true,
    stdio: 'ignore'
  });
  return result.status === 0;
}

function executableExists(command) {
  if (!command) return false;
  if (!path.isAbsolute(command)) return commandExists(command);

  try {
    return fs.existsSync(command) && fs.statSync(command).isFile();
  } catch {
    return false;
  }
}

function mampPhpCandidates() {
  const mampPhpRoot = '/Applications/MAMP/bin/php';
  if (!fs.existsSync(mampPhpRoot)) return [];

  return fs.readdirSync(mampPhpRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^php\d/i.test(entry.name))
    .map(entry => path.join(mampPhpRoot, entry.name, 'bin', 'php'))
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
}

function resolvePhpCommand() {
  const candidates = [
    process.env.RTBO_PHP_BIN,
    ...mampPhpCandidates(),
    'php'
  ].filter(Boolean);

  return candidates.find(executableExists) || '';
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function maybeInstallFrontendDependencies() {
  if (fs.existsSync(path.join(frontendRoot, 'node_modules'))) return;
  run('Install frontend dependencies', 'npm', ['ci'], { cwd: frontendRoot });
}

function lintPhpIfAvailable() {
  const phpCommand = resolvePhpCommand();
  if (!phpCommand) {
    const message = 'PHP is not installed on this machine, so PHP syntax lint was skipped. Install PHP, install MAMP, or run with RTBO_REQUIRE_PHP_LINT=true in a PHP-enabled environment to make this mandatory.';
    if (phpLintRequired) {
      console.error(message);
      process.exit(1);
    }
    warnings.push(message);
    return;
  }

  const phpFiles = walkFiles(path.join(repoRoot, 'api'))
    .filter(filePath => filePath.endsWith('.php'))
    .map(filePath => path.relative(repoRoot, filePath));

  phpFiles.forEach(filePath => {
    run(`PHP syntax lint: ${filePath}`, phpCommand, ['-l', filePath]);
  });
}

run('Source integrity audit', 'node', ['tools/audit-rtbo-source-integrity.mjs']);
run('RefZone test bank audit', 'node', ['tools/audit-refzone-test-banks.mjs']);
run('Notification and email rules audit', 'node', ['tools/audit-rtbo-notification-rules.mjs']);
maybeInstallFrontendDependencies();
run('React production build', 'npm', ['run', 'build'], { cwd: frontendRoot });
run('Mandatory frontend audit', 'npm', ['run', 'audit'], { cwd: frontendRoot });
run('Frontend production dependency audit', 'npm', ['audit', '--omit=dev'], { cwd: frontendRoot });
lintPhpIfAvailable();

if (warnings.length) {
  console.warn('\nWarnings:');
  warnings.forEach(warning => console.warn(`- ${warning}`));
}

console.log('\nRTBO production audits completed.');
