export interface TerminalOutputProps {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  command?: string;
}

export function TerminalOutput({
  success,
  output,
  error,
  exitCode,
  command,
}: TerminalOutputProps) {
  return (
    <div className="bg-stone-900 rounded-lg overflow-hidden shadow-sm font-mono text-sm">
      {/* Terminal Header */}
      <div className="px-4 py-2 bg-stone-800 flex items-center justify-between border-b border-stone-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-stone-400 text-xs ml-2">Terminal</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            success ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
          }`}>
            exit: {exitCode}
          </span>
        </div>
      </div>

      {/* Command (if provided) */}
      {command && (
        <div className="px-4 py-2 border-b border-stone-800">
          <span className="text-emerald-400">$</span>
          <span className="text-stone-300 ml-2">{command}</span>
        </div>
      )}

      {/* Output */}
      <div className="p-4 overflow-x-auto">
        {output && (
          <pre className="text-stone-100 whitespace-pre-wrap break-all">
            {output}
          </pre>
        )}
        
        {error && (
          <pre className="text-red-400 whitespace-pre-wrap break-all mt-2">
            {error}
          </pre>
        )}

        {!output && !error && (
          <span className="text-stone-500 italic">
            (no output)
          </span>
        )}
      </div>
    </div>
  );
}
