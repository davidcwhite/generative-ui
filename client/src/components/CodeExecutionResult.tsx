import { useState } from 'react';

export interface CodeExecutionResultProps {
  success: boolean;
  output?: string;
  error?: string;
  logs: string[];
  executionTime: number;
  results?: Array<{
    type: string;
    data: unknown;
  }>;
  code?: string;
  language?: 'python' | 'javascript';
}

export function CodeExecutionResult({
  success,
  output,
  error,
  logs,
  executionTime,
  results,
  code,
  language = 'python',
}: CodeExecutionResultProps) {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`px-4 py-2 border-b flex items-center justify-between ${
        success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2">
          {success ? (
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className={`text-sm font-medium ${success ? 'text-emerald-700' : 'text-red-700'}`}>
            {success ? 'Execution Successful' : 'Execution Failed'}
          </span>
          <span className="text-xs text-stone-500">
            ({executionTime}ms)
          </span>
        </div>
        
        {code && (
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs text-stone-600 hover:text-stone-800 font-medium"
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        )}
      </div>

      {/* Code Section (collapsible) */}
      {showCode && code && (
        <div className="border-b border-stone-200">
          <div className="px-3 py-1.5 bg-stone-100 border-b border-stone-200 flex items-center gap-2">
            <span className="text-xs font-medium text-stone-500 uppercase">
              {language}
            </span>
          </div>
          <pre className="p-3 bg-stone-50 text-sm text-stone-800 overflow-x-auto font-mono whitespace-pre-wrap">
            {code}
          </pre>
        </div>
      )}

      {/* Output Section */}
      <div className="p-4 space-y-3">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <pre className="text-sm text-red-700 font-mono whitespace-pre-wrap break-all">
                {error}
              </pre>
            </div>
          </div>
        )}

        {/* Standard output */}
        {output && (
          <div className="bg-stone-900 rounded-md p-3 overflow-x-auto">
            <pre className="text-sm text-stone-100 font-mono whitespace-pre-wrap">
              {output}
            </pre>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && !output && (
          <div className="bg-stone-900 rounded-md p-3 overflow-x-auto">
            <div className="text-xs text-stone-400 mb-2 font-medium">Output:</div>
            <pre className="text-sm text-stone-100 font-mono whitespace-pre-wrap">
              {logs.join('\n')}
            </pre>
          </div>
        )}

        {/* Rich results (images, charts, etc.) */}
        {results && results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, i) => (
              <div key={i} className="border border-stone-200 rounded-md overflow-hidden">
                {result.type === 'png' && typeof result.data === 'string' && (
                  <img 
                    src={`data:image/png;base64,${result.data}`} 
                    alt="Execution result"
                    className="max-w-full h-auto"
                  />
                )}
                {result.type === 'svg' && typeof result.data === 'string' && (
                  <div 
                    dangerouslySetInnerHTML={{ __html: result.data }}
                    className="p-2 bg-white"
                  />
                )}
                {result.type === 'html' && typeof result.data === 'string' && (
                  <div 
                    dangerouslySetInnerHTML={{ __html: result.data }}
                    className="p-2 bg-white"
                  />
                )}
                {result.type === 'text' && typeof result.data === 'string' && (
                  <pre className="p-3 text-sm font-mono whitespace-pre-wrap bg-stone-50">
                    {result.data}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty success state */}
        {success && !output && !error && logs.length === 0 && (!results || results.length === 0) && (
          <div className="text-sm text-stone-500 italic">
            Code executed successfully (no output)
          </div>
        )}
      </div>
    </div>
  );
}
