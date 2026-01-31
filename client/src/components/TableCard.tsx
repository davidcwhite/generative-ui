import React from 'react';

interface TableCardProps {
  title: string;
  columns: string[];
  rows: Record<string, string | number | null>[];
}

export function TableCard({ title, columns, rows }: TableCardProps) {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{title}</h3>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={styles.th}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col) => (
                  <td key={col} style={styles.td}>
                    {row[col] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div style={styles.empty}>No data available</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '12px',
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  title: {
    margin: 0,
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 600,
    background: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
  },
  tableWrapper: {
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '350px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    background: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
};
