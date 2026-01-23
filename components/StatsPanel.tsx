'use client';

import { useState } from 'react';

interface DebugInfo {
  sql: string;
  params: (string | number)[];
  parseTime: number;
  queryTime: number;
  totalTime: number;
  tokenCount: number;
  tokens: Array<{
    term: string;
    field: string | null;
    exclude: boolean;
    wildcard: boolean;
    phrase: boolean;
  }>;
}

interface StatsPanelProps {
  debugInfo: DebugInfo;
  resultCount: number;
  page: number;
}

export function StatsPanel({ debugInfo, resultCount, page }: StatsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="stats-panel">
      <button
        className="stats-toggle"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        {expanded ? '▼' : '▶'} Debug Info ({debugInfo.totalTime.toFixed(1)}ms)
      </button>

      {expanded && (
        <div className="stats-content">
          <div className="stats-section">
            <h4>Timing</h4>
            <table className="stats-table">
              <tbody>
                <tr>
                  <td>Parse:</td>
                  <td>{debugInfo.parseTime.toFixed(2)}ms</td>
                </tr>
                <tr>
                  <td>Query:</td>
                  <td>{debugInfo.queryTime.toFixed(2)}ms</td>
                </tr>
                <tr>
                  <td>Total:</td>
                  <td>{debugInfo.totalTime.toFixed(2)}ms</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="stats-section">
            <h4>Results</h4>
            <p>{resultCount} results on page {page}</p>
          </div>

          <div className="stats-section">
            <h4>Tokens ({debugInfo.tokenCount})</h4>
            <pre className="stats-pre">
              {JSON.stringify(debugInfo.tokens, null, 2)}
            </pre>
          </div>

          <div className="stats-section">
            <h4>SQL</h4>
            <pre className="stats-pre">{debugInfo.sql.trim()}</pre>
          </div>

          <div className="stats-section">
            <h4>Parameters</h4>
            <pre className="stats-pre">
              {JSON.stringify(debugInfo.params, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
