interface TableCardProps {
  title: string;
  columns: string[];
  rows: Record<string, string | number | null>[];
}

export function TableCard({ title, columns, rows }: TableCardProps) {
  return (
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      <h3 className="m-0 px-4 py-3 text-sm font-semibold bg-stone-100 border-b border-stone-200 text-stone-700">
        {title}
      </h3>
      <div className="overflow-x-auto overflow-y-auto max-h-[350px]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2.5 text-left text-xs font-semibold text-stone-600 bg-stone-50 border-b border-stone-200 whitespace-nowrap sticky top-0 z-10"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-stone-100 hover:bg-stone-50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2.5 text-stone-600"
                  >
                    {row[col] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="py-6 text-center text-stone-400 italic text-sm">
          No data available
        </div>
      )}
    </div>
  );
}
