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
  const riskStyles = {
    low: {
      badge: 'bg-emerald-500',
      text: 'text-emerald-700',
    },
    medium: {
      badge: 'bg-amber-500',
      text: 'text-amber-700',
    },
    high: {
      badge: 'bg-rose-500',
      text: 'text-rose-700',
    },
  };

  const styles = riskStyles[risk];

  return (
    <div className="mt-3 p-4 bg-stone-50 border border-stone-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-stone-700">
          Confirmation Required
        </span>
        <span className={`px-2 py-1 text-[10px] font-bold text-white rounded ${styles.badge}`}>
          {risk.toUpperCase()} RISK
        </span>
      </div>
      <p className={`m-0 mb-4 text-sm leading-relaxed ${styles.text}`}>
        {summary}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className="px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {action.label}
          </button>
        ))}
        <button
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-semibold bg-white text-stone-600 border border-stone-300 rounded-md hover:bg-stone-50 hover:border-stone-400 focus:ring-2 focus:ring-offset-2 focus:ring-stone-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
