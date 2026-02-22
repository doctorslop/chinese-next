import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { getDatabase, getEntryCount, getExampleSentenceCount, ensureInitialized } from '@/lib/db';
import { search } from '@/lib/search';

export const metadata: Metadata = {
  title: 'System Debug - Chinese Dictionary',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Check {
  name: string;
  status: 'ok' | 'warn' | 'error';
  detail: string;
}

interface SearchBenchmark {
  query: string;
  type: string;
  results: number;
  timeMs: number;
}

function fileCheck(label: string, filePath: string): Check & { sizeBytes?: number } {
  try {
    const stat = fs.statSync(filePath);
    const sizeKB = Math.round(stat.size / 1024);
    const sizeLabel = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    return { name: label, status: 'ok', detail: `Present (${sizeLabel})`, sizeBytes: stat.size };
  } catch {
    return { name: label, status: 'error', detail: 'File not found' };
  }
}

function runChecks() {
  const checks: Check[] = [];
  const metrics: Record<string, string | number> = {};
  const benchmarks: SearchBenchmark[] = [];
  const cwd = process.cwd();

  // Database file
  const dbPath = path.join(cwd, 'dictionary.db');
  const dbCheck = fileCheck('Database file', dbPath);
  checks.push(dbCheck);
  if (dbCheck.sizeBytes) {
    metrics['Database size'] = `${(dbCheck.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // CC-CEDICT data file
  checks.push(fileCheck('CC-CEDICT data', path.join(cwd, 'data', 'cedict_ts.u8')));

  // Frequency data
  checks.push(fileCheck('Frequency data', path.join(cwd, 'data', 'zh_cn_freq.txt')));

  // Example sentences data
  checks.push(fileCheck('Example sentences data', path.join(cwd, 'data', 'example_sentences.tsv')));

  // HSK data files
  const hskLevels = ['1', '2', '3', '4', '5', '6', '7-9'];
  let hskPresent = 0;
  for (const level of hskLevels) {
    if (fs.existsSync(path.join(cwd, 'public', 'data', `hsk${level}.json`))) hskPresent++;
  }
  checks.push({
    name: 'HSK data files',
    status: hskPresent === hskLevels.length ? 'ok' : hskPresent > 0 ? 'warn' : 'error',
    detail: `${hskPresent}/${hskLevels.length} levels present`,
  });

  // Database initialization
  try {
    ensureInitialized();
    checks.push({ name: 'Database init', status: 'ok', detail: 'Schema initialized' });
  } catch (e) {
    checks.push({ name: 'Database init', status: 'error', detail: String(e) });
    return { checks, metrics, benchmarks, distribution: [] };
  }

  // Entry count
  const entryCount = getEntryCount();
  metrics['Total entries'] = entryCount.toLocaleString('en-US');
  checks.push({
    name: 'Dictionary entries',
    status: entryCount > 100000 ? 'ok' : entryCount > 0 ? 'warn' : 'error',
    detail: `${entryCount.toLocaleString('en-US')} entries loaded`,
  });

  // Example sentences count
  const exampleCount = getExampleSentenceCount();
  metrics['Example sentences'] = exampleCount.toLocaleString('en-US');
  checks.push({
    name: 'Example sentences',
    status: exampleCount > 50000 ? 'ok' : exampleCount > 0 ? 'warn' : 'error',
    detail: `${exampleCount.toLocaleString('en-US')} sentences loaded`,
  });

  // FTS5 index
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as c FROM entries_fts').get() as { c: number } | undefined;
    const ftsCount = row?.c ?? 0;
    metrics['FTS index rows'] = ftsCount.toLocaleString('en-US');
    checks.push({
      name: 'FTS5 search index',
      status: ftsCount > 0 ? 'ok' : 'error',
      detail: `${ftsCount.toLocaleString('en-US')} indexed rows`,
    });
  } catch (e) {
    checks.push({ name: 'FTS5 search index', status: 'error', detail: String(e) });
  }

  // Frequency data populated
  const db = getDatabase();
  try {
    const row = db.prepare('SELECT COUNT(*) as c FROM entries WHERE frequency > 0').get() as { c: number } | undefined;
    const freqCount = row?.c ?? 0;
    metrics['Entries with frequency'] = freqCount.toLocaleString('en-US');
    const pct = entryCount > 0 ? Math.round((freqCount / entryCount) * 100) : 0;
    checks.push({
      name: 'Frequency data',
      status: freqCount > 0 ? 'ok' : 'warn',
      detail: `${freqCount.toLocaleString('en-US')} entries (${pct}%)`,
    });
  } catch (e) {
    checks.push({ name: 'Frequency data', status: 'error', detail: String(e) });
  }

  // Frequency distribution
  type DistRow = { bucket: string; count: number };
  let distribution: { label: string; count: number; color: string }[] = [];
  try {
    const veryCommon = (db.prepare("SELECT COUNT(*) as count FROM entries WHERE frequency >= 100000").get() as DistRow)?.count ?? 0;
    const common = (db.prepare("SELECT COUNT(*) as count FROM entries WHERE frequency >= 10000 AND frequency < 100000").get() as DistRow)?.count ?? 0;
    const moderate = (db.prepare("SELECT COUNT(*) as count FROM entries WHERE frequency >= 1000 AND frequency < 10000").get() as DistRow)?.count ?? 0;
    const uncommon = (db.prepare("SELECT COUNT(*) as count FROM entries WHERE frequency > 0 AND frequency < 1000").get() as DistRow)?.count ?? 0;
    const noFreq = (db.prepare("SELECT COUNT(*) as count FROM entries WHERE frequency = 0").get() as DistRow)?.count ?? 0;

    distribution = [
      { label: 'Very Common (100k+)', count: veryCommon, color: '#15803d' },
      { label: 'Common (10k-100k)', count: common, color: '#2563eb' },
      { label: 'Moderate (1k-10k)', count: moderate, color: '#d97706' },
      { label: 'Uncommon (<1k)', count: uncommon, color: '#94a3b8' },
      { label: 'No frequency data', count: noFreq, color: '#e2e8f0' },
    ];
  } catch {
    // non-critical
  }

  // Entry length distribution
  type LenRow = { len: number; count: number };
  let lengthDist: { len: number; count: number }[] = [];
  try {
    lengthDist = db.prepare(`
      SELECT LENGTH(simplified) as len, COUNT(*) as count
      FROM entries
      GROUP BY len
      ORDER BY len
      LIMIT 10
    `).all() as LenRow[];
  } catch {
    // non-critical
  }

  // Schema objects
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name").all() as { name: string }[];
    metrics['Tables'] = tables.map(t => t.name).join(', ');
    metrics['Indexes'] = `${indexes.length} total`;
    checks.push({
      name: 'Schema objects',
      status: tables.length >= 2 ? 'ok' : 'warn',
      detail: `${tables.length} tables, ${indexes.length} indexes`,
    });
  } catch (e) {
    checks.push({ name: 'Schema objects', status: 'error', detail: String(e) });
  }

  // Search benchmarks
  const benchmarkQueries: [string, string][] = [
    ['你好', 'Chinese'],
    ['hello', 'English'],
    ['ni3 hao3', 'Pinyin'],
    ['学习', 'Chinese (2-char)'],
    ['*中国*', 'Wildcard'],
    ['"thank you"', 'Exact phrase'],
  ];

  for (const [query, type] of benchmarkQueries) {
    try {
      const start = performance.now();
      const { results } = search(query, 5);
      const elapsed = Math.round((performance.now() - start) * 10) / 10;
      benchmarks.push({ query, type, results: results.length, timeMs: elapsed });
      checks.push({
        name: `Search: ${type}`,
        status: results.length > 0 ? 'ok' : 'warn',
        detail: `${results.length} results in ${elapsed}ms`,
      });
    } catch (e) {
      checks.push({ name: `Search: ${type}`, status: 'error', detail: String(e) });
      benchmarks.push({ query, type, results: 0, timeMs: 0 });
    }
  }

  // Runtime info
  metrics['Node.js'] = process.version;
  metrics['Platform'] = `${process.platform} ${process.arch}`;
  metrics['Working directory'] = cwd;

  return { checks, metrics, benchmarks, distribution, lengthDist };
}

function statusIcon(status: 'ok' | 'warn' | 'error'): string {
  switch (status) {
    case 'ok': return '\u2705';
    case 'warn': return '\u26A0\uFE0F';
    case 'error': return '\u274C';
  }
}

export default function DebugPage() {
  const { checks, metrics, benchmarks, distribution, lengthDist } = runChecks();

  const okCount = checks.filter(c => c.status === 'ok').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const errorCount = checks.filter(c => c.status === 'error').length;
  const overallStatus = errorCount > 0 ? 'error' : warnCount > 0 ? 'warn' : 'ok';

  const maxDistCount = Math.max(...(distribution?.map(d => d.count) ?? [1]));
  const maxLenCount = Math.max(...(lengthDist?.map(d => d.count) ?? [1]));
  const maxBenchTime = Math.max(...benchmarks.map(b => b.timeMs), 1);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">System Status</h1>
        <p className="page-description">Health checks, performance benchmarks, and data diagnostics</p>
      </div>

      {/* Status banner */}
      <div className={`debug-banner debug-banner-${overallStatus}`}>
        <span className="debug-banner-icon">{statusIcon(overallStatus)}</span>
        <div className="debug-banner-text">
          <strong>
            {overallStatus === 'ok' && 'All systems operational'}
            {overallStatus === 'warn' && `${warnCount} warning${warnCount > 1 ? 's' : ''} detected`}
            {overallStatus === 'error' && `${errorCount} error${errorCount > 1 ? 's' : ''} detected`}
          </strong>
          <span>{okCount} passed, {warnCount} warnings, {errorCount} errors</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="debug-stats-row">
        <div className="debug-stat-card">
          <span className="debug-stat-value">{metrics['Total entries'] || '0'}</span>
          <span className="debug-stat-label">Dictionary Entries</span>
        </div>
        <div className="debug-stat-card">
          <span className="debug-stat-value">{metrics['Example sentences'] || '0'}</span>
          <span className="debug-stat-label">Example Sentences</span>
        </div>
        <div className="debug-stat-card">
          <span className="debug-stat-value">{metrics['Entries with frequency'] || '0'}</span>
          <span className="debug-stat-label">With Frequency Data</span>
        </div>
        <div className="debug-stat-card">
          <span className="debug-stat-value">{metrics['Database size'] || '?'}</span>
          <span className="debug-stat-label">Database Size</span>
        </div>
      </div>

      {/* Health checks */}
      <div className="debug-section">
        <h2>Health Checks</h2>
        <div className="debug-checks">
          {checks.map((check, i) => (
            <div key={i} className={`debug-check debug-check-${check.status}`}>
              <span className="debug-check-icon">{statusIcon(check.status)}</span>
              <span className="debug-check-name">{check.name}</span>
              <span className="debug-check-detail">{check.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search benchmarks */}
      {benchmarks.length > 0 && (
        <div className="debug-section">
          <h2>Search Performance</h2>
          <div className="debug-bench-grid">
            {benchmarks.map((b, i) => (
              <div key={i} className="debug-bench-row">
                <div className="debug-bench-info">
                  <code className="debug-bench-query">{b.query}</code>
                  <span className="debug-bench-type">{b.type}</span>
                </div>
                <div className="debug-bench-bar-wrap">
                  <div
                    className="debug-bench-bar"
                    style={{ width: `${Math.max((b.timeMs / maxBenchTime) * 100, 4)}%` }}
                  />
                </div>
                <span className="debug-bench-time">{b.timeMs}ms</span>
                <span className="debug-bench-count">{b.results} results</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequency distribution */}
      {distribution && distribution.length > 0 && (
        <div className="debug-section">
          <h2>Frequency Distribution</h2>
          <div className="debug-dist">
            {distribution.map((d, i) => (
              <div key={i} className="debug-dist-row">
                <span className="debug-dist-label">{d.label}</span>
                <div className="debug-dist-bar-wrap">
                  <div
                    className="debug-dist-bar"
                    style={{ width: `${Math.max((d.count / maxDistCount) * 100, 2)}%`, backgroundColor: d.color }}
                  />
                </div>
                <span className="debug-dist-count">{d.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry length distribution */}
      {lengthDist && lengthDist.length > 0 && (
        <div className="debug-section">
          <h2>Entry Length Distribution</h2>
          <p className="debug-section-desc">Number of characters per dictionary entry</p>
          <div className="debug-dist">
            {lengthDist.map((d, i) => (
              <div key={i} className="debug-dist-row">
                <span className="debug-dist-label">{d.len} char{d.len !== 1 ? 's' : ''}</span>
                <div className="debug-dist-bar-wrap">
                  <div
                    className="debug-dist-bar"
                    style={{ width: `${Math.max((d.count / maxLenCount) * 100, 2)}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>
                <span className="debug-dist-count">{d.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System info */}
      <div className="debug-section">
        <h2>System Info</h2>
        <div className="debug-info-grid">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="debug-info-row">
              <span className="debug-info-key">{key}</span>
              <span className="debug-info-value">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="debug-footer">
        Generated at {new Date().toISOString()}
      </p>
    </div>
  );
}
