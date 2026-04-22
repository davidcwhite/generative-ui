// User-uploaded file data source management
import { z } from 'zod';
import { registry, createDataSource, type DataSource } from './registry.js';

// Types for uploaded file data
export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string | number | boolean | null>[];
  rowCount: number;
}

export interface UploadedFileData {
  fileId: string;
  fileName: string;
  sheets: ParsedSheet[];
  totalRows: number;
  uploadedAt: number;
}

// Store for uploaded file data (in-memory for now, could be Redis/DB later)
const uploadedFiles: Map<string, UploadedFileData> = new Map();
const registeredSources: Map<string, string> = new Map(); // fileId -> sourceName

/**
 * Register an uploaded file as a queryable data source
 */
export function registerUploadedFile(fileData: UploadedFileData): string {
  // Store the file data
  uploadedFiles.set(fileData.fileId, fileData);
  
  // Create a clean source name from filename
  const baseName = fileData.fileName
    .replace(/\.[^.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .toLowerCase()
    .slice(0, 30); // Limit length
  
  const sourceName = `uploaded_${baseName}`;
  
  // If already registered, unregister first
  if (registeredSources.has(fileData.fileId)) {
    unregisterUploadedFile(fileData.fileId);
  }
  
  // Get the first sheet (primary data)
  const primarySheet = fileData.sheets[0];
  if (!primarySheet || primarySheet.rows.length === 0) {
    throw new Error('No data found in uploaded file');
  }

  // Infer column types from data
  const columnTypes = inferColumnTypes(primarySheet);
  
  // Create filter schema dynamically based on headers
  const filterSchemaShape: Record<string, z.ZodOptional<z.ZodString>> = {};
  for (const header of primarySheet.headers) {
    filterSchemaShape[header] = z.string().optional().describe(`Filter by ${header}`);
  }
  
  // Create the data source
  const dataSource = createDataSource<Record<string, unknown>>({
    name: sourceName,
    description: `Uploaded file: ${fileData.fileName} (${primarySheet.rowCount} rows)`,
    
    filterSchema: z.object(filterSchemaShape),
    
    columns: primarySheet.headers.map(h => ({ key: h, label: h })),
    
    chartAggregations: generateChartAggregations(primarySheet.headers, columnTypes),
    
    query: (filters) => {
      const rows = primarySheet.rows;
      if (!filters || Object.keys(filters).length === 0) {
        return rows as Record<string, unknown>[];
      }
      
      return rows.filter(row => {
        for (const [key, filterValue] of Object.entries(filters)) {
          if (filterValue === undefined || filterValue === null || filterValue === '') continue;
          
          const cellValue = row[key];
          if (cellValue === null || cellValue === undefined) return false;
          
          // Case-insensitive partial match for strings
          const cellStr = String(cellValue).toLowerCase();
          const filterStr = String(filterValue).toLowerCase();
          if (!cellStr.includes(filterStr)) return false;
        }
        return true;
      }) as Record<string, unknown>[];
    },
    
    aggregate: (data, aggregationType) => {
      const parts = aggregationType.split('_');
      const aggType = parts[0]; // 'count' or 'sum'
      const column = parts.slice(1).join('_');
      
      if (aggType === 'count') {
        // Count by unique values in column
        const counts: Record<string, number> = {};
        for (const row of data) {
          const value = String(row[column] || 'Unknown');
          counts[value] = (counts[value] || 0) + 1;
        }
        return Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }
      
      if (aggType === 'sum') {
        // Sum numeric column grouped by first string column
        const groupByCol = primarySheet.headers.find(h => columnTypes[h] === 'string') || primarySheet.headers[0];
        const sums: Record<string, number> = {};
        for (const row of data) {
          const group = String(row[groupByCol] || 'Other');
          const value = Number(row[column]) || 0;
          sums[group] = (sums[group] || 0) + value;
        }
        return Object.entries(sums)
          .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
      }
      
      return [];
    },
    
    getSummary: (data) => {
      const summary: Record<string, string | number> = {
        rows: data.length,
        columns: primarySheet.headers.length,
      };
      
      // Add numeric column summaries
      for (const header of primarySheet.headers) {
        if (columnTypes[header] === 'number') {
          const values = data.map(r => Number(r[header]) || 0);
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = values.length > 0 ? sum / values.length : 0;
          summary[`avg_${header}`] = Math.round(avg * 100) / 100;
        }
      }
      
      return summary;
    },
  });
  
  // Register with the global registry
  registry.register(dataSource);
  registeredSources.set(fileData.fileId, sourceName);
  
  console.log(`Registered data source: ${sourceName} with ${primarySheet.rowCount} rows`);
  
  return sourceName;
}

/**
 * Unregister an uploaded file's data source
 */
export function unregisterUploadedFile(fileId: string): boolean {
  const sourceName = registeredSources.get(fileId);
  if (!sourceName) return false;
  
  registry.unregister(sourceName);
  registeredSources.delete(fileId);
  uploadedFiles.delete(fileId);
  
  console.log(`Unregistered data source: ${sourceName}`);
  return true;
}

/**
 * Get all uploaded files info
 */
export function getUploadedFiles(): UploadedFileData[] {
  return Array.from(uploadedFiles.values());
}

/**
 * Infer column types from data
 */
function inferColumnTypes(sheet: ParsedSheet): Record<string, 'string' | 'number' | 'boolean' | 'mixed'> {
  const types: Record<string, 'string' | 'number' | 'boolean' | 'mixed'> = {};
  
  for (const header of sheet.headers) {
    let hasString = false;
    let hasNumber = false;
    let hasBoolean = false;
    
    // Sample first 100 rows
    const sampleRows = sheet.rows.slice(0, 100);
    for (const row of sampleRows) {
      const value = row[header];
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'boolean') hasBoolean = true;
      else if (typeof value === 'number') hasNumber = true;
      else if (typeof value === 'string') {
        // Check if it's a number-like string
        const num = parseFloat(value.replace(/[,$]/g, ''));
        if (!isNaN(num) && value.match(/^[\d,.$-]+$/)) {
          hasNumber = true;
        } else {
          hasString = true;
        }
      }
    }
    
    if (hasString && (hasNumber || hasBoolean)) types[header] = 'mixed';
    else if (hasString) types[header] = 'string';
    else if (hasNumber) types[header] = 'number';
    else if (hasBoolean) types[header] = 'boolean';
    else types[header] = 'string'; // Default
  }
  
  return types;
}

/**
 * Generate chart aggregations based on column types
 */
function generateChartAggregations(
  headers: string[], 
  columnTypes: Record<string, string>
): DataSource['chartAggregations'] {
  const aggregations: DataSource['chartAggregations'] = [];
  
  // Find string columns for grouping
  const stringColumns = headers.filter(h => columnTypes[h] === 'string' || columnTypes[h] === 'mixed');
  const numberColumns = headers.filter(h => columnTypes[h] === 'number');
  
  // Add count-by aggregations for string columns (up to 3)
  for (const col of stringColumns.slice(0, 3)) {
    aggregations.push({
      key: `count_${col}`,
      label: `Count by ${col}`,
      xKey: 'name',
      yKey: 'count',
      recommendedType: 'bar',
    });
  }
  
  // Add sum aggregations for number columns (up to 2)
  for (const col of numberColumns.slice(0, 2)) {
    aggregations.push({
      key: `sum_${col}`,
      label: `Sum of ${col}`,
      xKey: 'name',
      yKey: 'value',
      recommendedType: 'bar',
    });
  }
  
  return aggregations;
}
