import { useState } from 'react';
import { FileUploader, type UploadedFile } from './FileUploader';
import { DataPreviewCard } from './DataPreviewCard';

interface FilesViewProps {
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onFilesParsed: (files: UploadedFile[]) => void;
  onFileDelete?: (fileId: string) => void;
}

export function FilesView({ uploadedFiles, onFilesChange, onFilesParsed, onFileDelete }: FilesViewProps) {
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(true);
  const readyFiles = uploadedFiles.filter(f => f.status === 'ready');

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDeleteFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
    onFilesChange(updatedFiles);
    onFileDelete?.(fileId);
    if (expandedFileId === fileId) {
      setExpandedFileId(null);
    }
  };

  const toggleFileExpand = (fileId: string) => {
    setExpandedFileId(prev => prev === fileId ? null : fileId);
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="px-4 md:px-6 pt-4 pb-4 border-b border-[#E5E5E3] bg-[#FAFAF8]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between h-10">
          <h1 className="text-lg font-semibold text-[#1A1A1A]">
            My Files
          </h1>
          <div className="flex items-center gap-3">
            {readyFiles.length > 0 && (
              <span className="text-sm text-stone-500">
                {readyFiles.length} file{readyFiles.length !== 1 ? 's' : ''} ready
              </span>
            )}
            {uploadedFiles.length > 0 && (
              <button
                onClick={() => setShowUploader(!showUploader)}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Files
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Upload Section - Collapsible when files exist */}
        {(showUploader || uploadedFiles.length === 0) && (
          <section className={uploadedFiles.length > 0 ? 'pb-4 border-b border-stone-200' : ''}>
            {uploadedFiles.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">
                  Upload Files
                </h2>
                <button
                  onClick={() => setShowUploader(false)}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  Hide
                </button>
              </div>
            )}
            <FileUploader 
              onFilesChange={onFilesChange} 
              onFilesParsed={onFilesParsed}
            />
            <p className="text-xs text-stone-500 mt-2">
              Supported formats: .xlsx, .xls, .csv, .json (max 50MB)
            </p>
          </section>
        )}

        {/* Files List with Inline Preview */}
        {uploadedFiles.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
              Your Data ({uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''})
            </h2>
            
            <div className="space-y-4">
              {uploadedFiles.map((file) => {
                const isExpanded = expandedFileId === file.id;
                const hasData = file.status === 'ready' && file.parsedData && file.parsedData.sheets[0];
                const sheet = hasData ? file.parsedData!.sheets[0] : null;

                return (
                  <div 
                    key={file.id} 
                    className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm"
                  >
                    {/* File Header Row */}
                    <div 
                      className={`p-4 flex items-center gap-4 ${hasData ? 'cursor-pointer hover:bg-stone-50' : ''} transition-colors`}
                      onClick={() => hasData && toggleFileExpand(file.id)}
                    >
                      {/* Expand/Collapse Icon (only for ready files) */}
                      {hasData && (
                        <button 
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFileExpand(file.id);
                          }}
                        >
                          <svg 
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}

                      {/* File Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        file.status === 'error' ? 'bg-red-100' :
                        file.status === 'ready' ? 'bg-emerald-100' :
                        file.status === 'processing' ? 'bg-blue-100' :
                        'bg-stone-100'
                      }`}>
                        {file.status === 'processing' ? (
                          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : file.status === 'error' ? (
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : file.status === 'ready' ? (
                          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-stone-800 truncate">
                            {file.name}
                          </h3>
                          {file.status === 'ready' && (
                            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                              Ready
                            </span>
                          )}
                          {file.status === 'processing' && (
                            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                              Processing
                            </span>
                          )}
                          {file.status === 'error' && (
                            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              Error
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                          <span>{formatFileSize(file.size)}</span>
                          {file.parsedData && (
                            <>
                              <span className="text-stone-300">•</span>
                              <span className="text-emerald-600 font-medium">
                                {file.parsedData.totalRows.toLocaleString()} rows
                              </span>
                              <span className="text-stone-300">•</span>
                              <span>{file.parsedData.sheets[0]?.headers.length || 0} columns</span>
                              {file.parsedData.sheets.length > 1 && (
                                <>
                                  <span className="text-stone-300">•</span>
                                  <span>{file.parsedData.sheets.length} sheets</span>
                                </>
                              )}
                            </>
                          )}
                          {file.error && (
                            <>
                              <span className="text-stone-300">•</span>
                              <span className="text-red-500">{file.error}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {hasData && !isExpanded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFileExpand(file.id);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            View Data
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Inline Data Preview - Collapsed (first 5 rows) */}
                    {hasData && !isExpanded && sheet && (
                      <div className="border-t border-stone-100 bg-stone-50/50">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-stone-100">
                                {sheet.headers.slice(0, 6).map((header) => (
                                  <th 
                                    key={header} 
                                    className="px-3 py-2 text-left font-semibold text-stone-600 whitespace-nowrap"
                                  >
                                    {header}
                                  </th>
                                ))}
                                {sheet.headers.length > 6 && (
                                  <th className="px-3 py-2 text-left font-semibold text-stone-400 whitespace-nowrap">
                                    +{sheet.headers.length - 6} more
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {sheet.rows.slice(0, 3).map((row, idx) => (
                                <tr key={idx} className="border-t border-stone-100">
                                  {sheet.headers.slice(0, 6).map((header) => (
                                    <td 
                                      key={header} 
                                      className="px-3 py-2 text-stone-600 whitespace-nowrap max-w-[150px] truncate"
                                    >
                                      {row[header] ?? '-'}
                                    </td>
                                  ))}
                                  {sheet.headers.length > 6 && (
                                    <td className="px-3 py-2 text-stone-400">...</td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {sheet.rows.length > 3 && (
                          <button
                            onClick={() => toggleFileExpand(file.id)}
                            className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors border-t border-stone-100"
                          >
                            View all {sheet.rows.length.toLocaleString()} rows →
                          </button>
                        )}
                      </div>
                    )}

                    {/* Expanded Data Preview */}
                    {isExpanded && hasData && sheet && (
                      <div className="border-t border-stone-200">
                        <DataPreviewCard
                          title={`${file.name} - ${sheet.name}`}
                          columns={sheet.headers}
                          rows={sheet.rows}
                          maxHeight={450}
                          defaultPageSize={25}
                          showSearch={true}
                          showFilters={true}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty State */}
        {uploadedFiles.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto w-12 h-12 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-stone-800">No files uploaded</h3>
            <p className="mt-1 text-sm text-stone-500">
              Upload spreadsheets to view and analyze them
            </p>
          </div>
        )}

        {/* Help Section */}
        {readyFiles.length > 0 && (
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Tips for working with your data
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Click a file</strong> to expand and see the full data with search and filters</li>
              <li>• <strong>In Chat</strong>, ask questions like "Analyze the allocations data" or "Show me BMW deals"</li>
              <li>• <strong>Column filters</strong> let you quickly narrow down to specific values</li>
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
