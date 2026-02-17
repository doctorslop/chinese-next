import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { getDatabase, getEntryCount, ensureInitialized } from '@/lib/db';
import { search } from '@/lib/search';

export const metadata: Metadata = {
  title: 'System Debug - Chinese Dictionary',
};

export const dynamic = 'force-dynamic';

interface Check {
  name: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
}

function fileCheck(label: string, filePath: string): Check {
  try {
    const stat = fs.statSync(filePath);
    const sizeKB = Math.round(stat.size / 1024);
    const sizeLabel = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    return { name: label, status: 'ok', detail: `Present (${sizeLabel})` };
  } catch {
    return { name: label, status: 'error', detail: 'File not found' };
  }
}

function runChecks(): { checks: Check[]; dbMetrics: Record<string, string | number> } {
  const checks: Check[] = [];
  const dbMetrics: Record<string, string | number> = {};
  const cwd = process.cwd();

  // 1. Database file
  const dbPath = path.join(cwd, 'dictionary.db');
  checks.push(fileCheck('Database file', dbPath));

  // 2. CC-CEDICT data file
  checks.push(fileCheck('CC-CEDICT data', path.join(cwd, 'data', 'cedict_ts.u8')));

  // 3. Frequency data file
  checks.push(fileCheck('Frequency data', path.join(cwd, 'data', 'zh_cn_freq.txt')));

  // 4. HSK data files
  const hskLevels = ['1', '2', '3', '4', '5', '6', '7-9'];
  let hskPresent = 0;
  for (const level of hskLevels) {
    const p = path.join(cwd, 'public', 'data', `hsk${level}.json`);
    if (fs.existsSync(p)) hskPresent++;
  }
  checks.push({
    name: 'HSK data files',
    status: hskPresent === hskLevels.length ? 'ok' : hskPresent > 0 ? 'warn' : 'error',
    detail: `${hskPresent}/${hskLevels.length} levels present`,
  });

  // 5. Database initialization
  try {
    ensureInitialized();
    checks.push({ name: 'Database init', status: 'ok', detail: 'Schema initialized' });
  } catch (e) {
    checks.push({ name: 'Database init', status: 'error', detail: String(e) });
  }

  // 6. Entry count
  try {
    const count = getEntryCount();
    dbMetrics['Total entries'] = count.toLocaleString('en-US');
    checks.push({
      name: 'Dictionary entries',
      status: count > 100000 ? 'ok' : count > 0 ? 'warn' : 'error',
      detail: `${count.toLocaleString('en-US')} entries loaded`,
    });
  } catch (e) {
    checks.push({ name: 'Dictionary entries', status: 'error', detail: String(e) });
  }

  // 7. FTS5 index
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as c FROM entries_fts').get() as { c: number } | undefined;
    const ftsCount = row?.c ?? 0;
    dbMetrics['FTS index rows'] = ftsCount.toLocaleString('en-US');
    checks.push({
      name: 'FTS5 search index',
      status: ftsCount > 0 ? 'ok' : 'error',
      detail: `${ftsCount.toLocaleString('en-US')} indexed rows`,
    });
  } catch (e) {
    checks.push({ name: 'FTS5 search index', status: 'error', detail: String(e) });
  }

  // 8. Frequency data populated
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as c FROM entries WHERE frequency > 0').get() as { c: number } | undefined;
    const freqCount = row?.c ?? 0;
    dbMetrics['Entries with frequency'] = freqCount.toLocaleString('en-US');
    checks.push({
      name: 'Frequency data',
      status: freqCount > 0 ? 'ok' : 'warn',
      detail: freqCount > 0 ? `${freqCount.toLocaleString('en-US')} entries have frequency data` : 'No frequency data — run import with zh_cn_freq.txt',
    });
  } catch (e) {
    checks.push({ name: 'Frequency data', status: 'error', detail: String(e) });
  }

  // 9. Sample search test
  try {
    const start = performance.now();
    const { results } = search('你好', 5);
    const elapsed = Math.round(performance.now() - start);
    checks.push({
      name: 'Search: Chinese (你好)',
      status: results.length > 0 ? 'ok' : 'warn',
      detail: `${results.length} results in ${elapsed}ms`,
    });
  } catch (e) {
    checks.push({ name: 'Search: Chinese (你好)', status: 'error', detail: String(e) });
  }

  try {
    const start = performance.now();
    const { results } = search('hello', 5);
    const elapsed = Math.round(performance.now() - start);
    checks.push({
      name: 'Search: English (hello)',
      status: results.length > 0 ? 'ok' : 'warn',
      detail: `${results.length} results in ${elapsed}ms`,
    });
  } catch (e) {
    checks.push({ name: 'Search: English (hello)', status: 'error', detail: String(e) });
  }

  try {
    const start = performance.now();
    const { results } = search('ni3 hao3', 5);
    const elapsed = Math.round(performance.now() - start);
    checks.push({
      name: 'Search: Pinyin (ni3 hao3)',
      status: results.length > 0 ? 'ok' : 'warn',
      detail: `${results.length} results in ${elapsed}ms`,
    });
  } catch (e) {
    checks.push({ name: 'Search: Pinyin (ni3 hao3)', status: 'error', detail: String(e) });
  }

  // 10. Database tables/indexes
  try {
    const db = getDatabase();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name").all() as { name: string }[];
    const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").all() as { name: string }[];
    dbMetrics['Tables'] = tables.map(t => t.name).join(', ');
    dbMetrics['Indexes'] = indexes.map(i => i.name).join(', ');
    dbMetrics['Triggers'] = triggers.map(t => t.name).join(', ');
    checks.push({
      name: 'Schema objects',
      status: tables.length >= 2 && indexes.length >= 4 ? 'ok' : 'warn',
      detail: `${tables.length} tables, ${indexes.length} indexes, ${triggers.length} triggers`,
    });
  } catch (e) {
    checks.push({ name: 'Schema objects', status: 'error', detail: String(e) });
  }

  // 11. Database size
  try {
    const db = getDatabase();
    const pageCountRows = db.pragma('page_count') as Record<string, number>[];
    const pageSizeRows = db.pragma('page_size') as Record<string, number>[];
    const pc = pageCountRows?.[0] ? Object.values(pageCountRows[0])[0] : 0;
    const ps = pageSizeRows?.[0] ? Object.values(pageSizeRows[0])[0] : 0;
    if (pc && ps) {
      const sizeMB = ((pc * ps) / (1024 * 1024)).toFixed(1);
      dbMetrics['Database size'] = `${sizeMB} MB`;
    }
  } catch {
    // non-critical
  }

  // 12. Node/runtime info
  dbMetrics['Node.js'] = process.version;
  dbMetrics['Platform'] = `${process.platform} ${process.arch}`;
  dbMetrics['Working directory'] = cwd;

  return { checks, dbMetrics };
}

function statusIcon(status: 'ok' | 'warn' | 'error'): string {
  switch (status) {
    case 'ok': return '\u2705';
    case 'warn': return '\u26A0\uFE0F';
    case 'error': return '\u274C';
  }
}

export default function DebugPage() {
  const { checks, dbMetrics } = runChecks();

  const okCount = checks.filter(c => c.status === 'ok').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const errorCount = checks.filter(c => c.status === 'error').length;
  const overallStatus = errorCount > 0 ? 'error' : warnCount > 0 ? 'warn' : 'ok';

  return (
    <div className="content-page">
      <h1>System Status</h1>

      <div className="debug-summary" data-status={overallStatus}>
        <span className="debug-summary-icon">{statusIcon(overallStatus)}</span>
        <span className="debug-summary-text">
          {overallStatus === 'ok' && 'All systems operational'}
          {overallStatus === 'warn' && `${warnCount} warning${warnCount > 1 ? 's' : ''} detected`}
          {overallStatus === 'error' && `${errorCount} error${errorCount > 1 ? 's' : ''} detected`}
        </span>
        <span className="debug-summary-counts">
          {okCount} passed · {warnCount} warnings · {errorCount} errors
        </span>
      </div>

      <h2>Health Checks</h2>
      <table className="debug-table">
        <thead>
          <tr>
            <th></th>
            <th>Component</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check, i) => (
            <tr key={i} data-status={check.status}>
              <td className="debug-icon">{statusIcon(check.status)}</td>
              <td className="debug-name">{check.name}</td>
              <td className="debug-detail">{check.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>System Metrics</h2>
      <table className="debug-table">
        <tbody>
          {Object.entries(dbMetrics).map(([key, value]) => (
            <tr key={key}>
              <td className="debug-metric-key">{key}</td>
              <td className="debug-metric-value">{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="debug-footer">
        Generated at {new Date().toISOString()} · No secrets or credentials are exposed on this page.
      </p>
    </div>
  );
}
