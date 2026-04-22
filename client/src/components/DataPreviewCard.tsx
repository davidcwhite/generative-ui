import { useState, useMemo, useCallback } from 'react';

interface DataPreviewCardProps {
  title: string;
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  maxHeight?: number;
  defaultPageSize?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  compact?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string | null;
  direction: SortDirection;
}

export function DataPreviewCard({
  title,
  columns,
  rows,
  maxHeight = 500,
  defaultPageSize = 25,
  showSearch = true,
  showFilters = true,
  compact = false,
}: DataPreviewCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilterDropdown, setShowFilterDropdown] = useState<string | null>(null);

  // Get unique values for filterable columns (columns with <= 20 unique values)
  const filterableColumns = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const col of columns) {
      const uniqueValues = new Set<string>();
      for (const row of rows) {
        const val = row[col];
        if (val !== null && val !== undefined) {
          uniqueValues.add(String(val));
        }
        if (uniqueValues.size > 20) break; // Too many unique values
      }
      if (uniqueValues.size > 0 && uniqueValues.size <= 20) {
        result[col] = Array.from(uniqueValues).sort();
      }
    }
    return result;
  }, [columns, rows]);

  // Filter rows by search term and column filters
  const filteredRows = useMemo(() => {
    let result = rows;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row =>
        columns.some(col => {
          const val = row[col];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
        })
      );
    }

    // Apply column filters
    for (const [col, filterValue] of Object.entries(columnFilters)) {
      if (filterValue) {
        result = result.filter(row => String(row[col] ?? '') === filterValue);
      }
    }

    return result;
  }, [rows, columns, searchTerm, columnFilters]);

  // Sort filtered rows
  const sortedRows = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return filteredRows;
    }

    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortConfig.column!];
      const bVal = b[sortConfig.column!];

      // Handle nulls
      if (aVal === null || aVal === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bVal === null || bVal === undefined) return sortConfig.direction === 'asc' ? 1 : -1;

      // Compare based on type
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortConfig]);

  // Paginate
  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  // Reset to page 1 when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleColumnFilterChange = useCallback((column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
    setCurrentPage(1);
    setShowFilterDropdown(null);
  }, []);

  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setColumnFilters({});
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = searchTerm || Object.values(columnFilters).some(v => v);

  // Format cell value for display
  const formatCellValue = (value: string | number | boolean | null): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      // Format large numbers with commas
      if (Math.abs(value) >= 1000) {
        return value.toLocaleString();
      }
      return String(value);
    }
    return String(value);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} bg-stone-100 border-b border-stone-200`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className={`m-0 font-semibold text-stone-700 ${compact ? 'text-xs' : 'text-sm'}`}>
              {title}
            </h3>
            <span className={`text-stone-500 ${compact ? 'text-xs' : 'text-xs'}`}>
              {sortedRows.length === rows.length
                ? `${rows.length} rows`
                : `${sortedRows.length} of ${rows.length} rows`}
            </span>
          </div>

          {/* Search */}
          {showSearch && !compact && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-48"
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-2 py-1.5 text-xs text-stone-600 hover:text-stone-800 hover:bg-stone-200 rounded transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active column filters display */}
        {showFilters && Object.entries(columnFilters).filter(([, v]) => v).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(columnFilters)
              .filter(([, v]) => v)
              .map(([col, value]) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
                >
                  {col}: {value}
                  <button
                    onClick={() => handleColumnFilterChange(col, '')}
                    className="hover:text-blue-900"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className={`${compact ? 'px-2 py-2' : 'px-3 py-2.5'} text-left text-xs font-semibold text-stone-600 bg-stone-50 border-b border-stone-200 whitespace-nowrap sticky top-0 z-10`}
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSort(col)}
                      className="flex items-center gap-1 hover:text-stone-900 transition-colors"
                    >
                      {col}
                      {sortConfig.column === col && (
                        <svg
                          className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                    
                    {/* Column filter dropdown */}
                    {showFilters && !compact && filterableColumns[col] && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFilterDropdown(showFilterDropdown === col ? null : col);
                          }}
                          className={`p-0.5 rounded hover:bg-stone-200 transition-colors ${columnFilters[col] ? 'text-blue-600' : 'text-stone-400'}`}
                          title={`Filter by ${col}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                        </button>
                        
                        {showFilterDropdown === col && (
                          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-stone-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                            <button
                              onClick={() => handleColumnFilterChange(col, '')}
                              className={`w-full px-3 py-2 text-left text-xs hover:bg-stone-50 ${!columnFilters[col] ? 'font-semibold text-blue-600' : 'text-stone-600'}`}
                            >
                              All
                            </button>
                            {filterableColumns[col].map((value) => (
                              <button
                                key={value}
                                onClick={() => handleColumnFilterChange(col, value)}
                                className={`w-full px-3 py-2 text-left text-xs hover:bg-stone-50 ${columnFilters[col] === value ? 'font-semibold text-blue-600' : 'text-stone-600'}`}
                              >
                                {value}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-stone-100 hover:bg-stone-50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2.5'} text-stone-600 ${compact ? 'text-xs' : ''}`}
                  >
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {paginatedRows.length === 0 && (
        <div className="py-8 text-center text-stone-400 italic text-sm">
          {hasActiveFilters ? 'No matching rows found' : 'No data available'}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} bg-stone-50 border-t border-stone-200 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-xs border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
