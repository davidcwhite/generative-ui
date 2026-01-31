import React from 'react';

interface Action {
  id: string;
  label: string;
}

interface ApprovalCardProps {
  summary: string;
  risk: 'low' | 'medium' | 'high';
  actions: Action[];
  onAction: (actionId: string) => void;
  onCancel: () => void;
}

export function ApprovalCard({ summary, risk, actions, onAction, onCancel }: ApprovalCardProps) {
  const riskColors = {
    low: { bg: '#e8f5e9', border: '#a5d6a7', text: '#2e7d32', badge: '#4caf50' },
    medium: { bg: '#fff3e0', border: '#ffcc80', text: '#e65100', badge: '#ff9800' },
    high: { bg: '#ffebee', border: '#ef9a9a', text: '#c62828', badge: '#f44336' },
  };

  const colors = riskColors[risk];

  return (
    <div style={{ ...styles.container, background: colors.bg, borderColor: colors.border }}>
      <div style={styles.header}>
        <span style={styles.title}>Confirmation Required</span>
        <span style={{ ...styles.badge, background: colors.badge }}>
          {risk.toUpperCase()} RISK
        </span>
      </div>
      <p style={{ ...styles.summary, color: colors.text }}>{summary}</p>
      <div style={styles.actions}>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            style={styles.actionButton}
          >
            {action.label}
          </button>
        ))}
        <button onClick={onCancel} style={styles.cancelButton}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '12px',
    padding: '16px',
    border: '1px solid',
    borderRadius: '8px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
  },
  badge: {
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#fff',
    borderRadius: '4px',
  },
  summary: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: 600,
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: 600,
    background: '#fff',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
