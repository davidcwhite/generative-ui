// Export Panel - Export options with audit trail and provenance
import { useState } from 'react';

interface BriefSection {
  title: string;
  content: string;
  dataPoints?: Record<string, string | number>[];
}

interface Provenance {
  sources: string[];
  timestamp: string;
  queryContext: string;
}

interface MandateBrief {
  issuerId: string;
  issuerName: string;
  generatedAt: string;
  sections: BriefSection[];
  provenance: Provenance;
}

interface ExportPanelProps {
  brief: MandateBrief;
  exportFormats: string[];
  onExport?: (format: string) => void;
}

export function ExportPanel({ brief, exportFormats, onExport }: ExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  const handleExport = (format: string) => {
    setSelectedFormat(format);
    setExported(true);
    onExport?.(format);
  };

  const formatIcons: Record<string, JSX.Element> = {
    pdf: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    ),
    pptx: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    xlsx: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 4a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5zm0 2h10v8H5V6z" clipRule="evenodd" />
        <path d="M7 8h2v2H7V8zm4 0h2v2h-2V8zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z" />
      </svg>
    ),
    email: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
      </svg>
    ),
  };

  const formatLabels: Record<string, string> = {
    pdf: 'PDF Report',
    pptx: 'PowerPoint',
    xlsx: 'Excel Data',
    email: 'Email Draft',
  };

  return (
    <div className="mt-3 bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <h3 className="font-semibold">Mandate Brief Ready</h3>
        <p className="text-amber-100 text-xs mt-0.5">{brief.issuerName}</p>
      </div>

      {/* Sections Preview */}
      <div className="px-4 py-3 border-b border-stone-200">
        <h4 className="text-xs font-semibold text-stone-500 mb-2">Included Sections</h4>
        <div className="flex flex-wrap gap-2">
          {brief.sections.map((section, index) => (
            <span
              key={index}
              className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded"
            >
              {section.title}
            </span>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="px-4 py-3 border-b border-stone-200">
        <h4 className="text-xs font-semibold text-stone-500 mb-2">Export Format</h4>
        <div className="grid grid-cols-4 gap-2">
          {exportFormats.map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={exported}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                selectedFormat === format
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : exported
                    ? 'bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-white border-stone-200 text-stone-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {formatIcons[format] || formatIcons.pdf}
              <span className="text-xs mt-1 font-medium">{formatLabels[format] || format}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Export Confirmation */}
      {exported && selectedFormat && (
        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">
              {formatLabels[selectedFormat]} ready for download
            </span>
          </div>
          <p className="text-xs text-emerald-600 mt-1">
            In production, this would open a download dialog or send an email draft.
          </p>
        </div>
      )}

      {/* Provenance / Audit Trail */}
      <div className="px-4 py-3 bg-stone-50">
        <h4 className="text-xs font-semibold text-stone-500 mb-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Data Provenance
        </h4>
        <div className="text-xs text-stone-600 space-y-1">
          <div>
            <span className="text-stone-400">Generated:</span>{' '}
            {new Date(brief.generatedAt).toLocaleString()}
          </div>
          <div>
            <span className="text-stone-400">Data Sources:</span>{' '}
            {brief.provenance.sources.join(', ')}
          </div>
          <div>
            <span className="text-stone-400">Query:</span>{' '}
            {brief.provenance.queryContext}
          </div>
        </div>
      </div>
    </div>
  );
}
