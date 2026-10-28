#!/usr/bin/env node
/**
 * Free replacement for managed snapshots: full MSSQL backups + a tarball of the SeaweedFS volume,
 * written to ./backups/<timestamp>/ on the host.
 *
 *   npm run backup                     # back up everything
 *   npm run backup -- --keep 7         # also prune all but the newest 7 backups
 *   npm run restore -- 20261029-101500 # restore one backup (stops core/geo/trip while restoring)
 */
const { spawnSync } = require('node:child_process');
const { existsSync, mkdirSync, readdirSync, renameSync, rmSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..', '..');
const BACKUPS = join(ROOT, 'backups');
const MSSQL_DROP = join(BACKUPS, 'mssql');
const DATABASES = ['tripblogger', 'tripblogger_geo', 'tripblogger_trips'];
const SEAWEED_VOLUME = 'tripblogger_seaweedfs_data';
const APPS = ['core', 'geo', 'trip'];

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
  if (res.status !== 0) throw new Error(`${cmd} ${args.slice(0, 4).join(' ')} … exited with ${res.status}`);
}

function compose(...args) {
  run('docker', ['compose', '--env-file', '.env.compose', ...args]);
}

function sqlcmd(query) {
  compose(
    'exec', '-T', 'mssql', 'bash', '-c',
    `/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -Q "${query}"`,
  );
}

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function backup(keep) {
  const id = stamp();
  const dir = join(BACKUPS, id);
  mkdirSync(dir, { recursive: true });
  mkdirSync(MSSQL_DROP, { recursive: true });

  for (const db of DATABASES) {
    console.log(`MSSQL: ${db}`);
    sqlcmd(`BACKUP DATABASE [${db}] TO DISK = N'/var/opt/mssql/backup/${db}.bak' WITH INIT, COMPRESSION, CHECKSUM`);
    renameSync(join(MSSQL_DROP, `${db}.bak`), join(dir, `${db}.bak`));
  }

  console.log('SeaweedFS volume');
  run('docker', [
    'run', '--rm', '-v', `${SEAWEED_VOLUME}:/data:ro`, '-v', `${dir}:/backup`,
    'alpine:3', 'tar', 'czf', '/backup/seaweedfs.tgz', '-C', '/data', '.',
  ]);

  console.log(`Backup written to backups/${id}`);
  if (keep) prune(keep);
}

function prune(keep) {
  const ids = listBackups();
  for (const id of ids.slice(0, Math.max(0, ids.length - keep))) {
    rmSync(join(BACKUPS, id), { recursive: true, force: true });
    console.log(`Pruned backups/${id}`);
  }
}

function listBackups() {
  if (!existsSync(BACKUPS)) return [];
  return readdirSync(BACKUPS).filter((n) => /^\d{8}-\d{6}$/.test(n)).sort();
}

function restore(id) {
  const dir = join(BACKUPS, id);
  if (!id || !existsSync(dir)) {
    throw new Error(`Unknown backup "${id}". Available: ${listBackups().join(', ') || '(none)'}`);
  }
  console.log('Stopping apps');
  compose('stop', ...APPS);
  try {
    mkdirSync(MSSQL_DROP, { recursive: true });
    for (const db of DATABASES) {
      const bak = join(dir, `${db}.bak`);
      if (!existsSync(bak)) continue;
      console.log(`MSSQL: ${db}`);
      renameSync(bak, join(MSSQL_DROP, `${db}.bak`));
      try {
        sqlcmd(
          `IF DB_ID('${db}') IS NOT NULL ALTER DATABASE [${db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; ` +
            `RESTORE DATABASE [${db}] FROM DISK = N'/var/opt/mssql/backup/${db}.bak' WITH REPLACE, CHECKSUM; ` +
            `ALTER DATABASE [${db}] SET MULTI_USER;`,
        );
      } finally {
        renameSync(join(MSSQL_DROP, `${db}.bak`), bak);
      }
    }

    if (existsSync(join(dir, 'seaweedfs.tgz'))) {
      console.log('SeaweedFS volume');
      compose('stop', 'seaweedfs');
      run('docker', [
        'run', '--rm', '-v', `${SEAWEED_VOLUME}:/data`, '-v', `${dir}:/backup:ro`,
        'alpine:3', 'sh', '-c', 'rm -rf /data/* && tar xzf /backup/seaweedfs.tgz -C /data',
      ]);
      compose('start', 'seaweedfs');
    }
  } finally {
    console.log('Starting apps');
    compose('start', ...APPS);
  }
  console.log(`Restored backups/${id}`);
}

const [, , cmd, ...rest] = process.argv;
try {
  if (cmd === 'restore') restore(rest[0]);
  else {
    const i = rest.indexOf('--keep');
    backup(i >= 0 ? Number(rest[i + 1]) : 0);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
