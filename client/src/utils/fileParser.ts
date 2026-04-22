import * as XLSX from 'xlsx';

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: Record<string, string | number | boolean | null>[];
  rowCount: number;
}

export interface ParsedFile {
  fileName: string;
  sheets: ParsedSheet[];
  totalRows: number;
  parseTime: number;
}

/**
 * Parse a spreadsheet file (xlsx, xls, csv) and return structured data
 */
export async function parseSpreadsheet(file: File): Promise<ParsedFile> {
  const startTime = performance.now();
  
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  const sheets: ParsedSheet[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null, // Default value for empty cells
      raw: false,   // Convert all values to strings first for consistency
    });

    if (jsonData.length === 0) continue;

    // Extract headers from first row keys
    const headers = Object.keys(jsonData[0] || {});
    
    // Convert rows to consistent format
    const rows = jsonData.map(row => {
      const cleanRow: Record<string, string | number | boolean | null> = {};
      for (const header of headers) {
        const value = row[header];
        if (value === null || value === undefined || value === '') {
          cleanRow[header] = null;
        } else if (typeof value === 'number') {
          cleanRow[header] = value;
        } else if (typeof value === 'boolean') {
          cleanRow[header] = value;
        } else {
          // Try to parse numbers from strings
          const stringVal = String(value);
          const numVal = parseFloat(stringVal.replace(/[,$]/g, ''));
          if (!isNaN(numVal) && stringVal.match(/^[\d,.$-]+$/)) {
            cleanRow[header] = numVal;
          } else {
            cleanRow[header] = stringVal;
          }
        }
      }
      return cleanRow;
    });

    totalRows += rows.length;
    
    sheets.push({
      name: sheetName,
      headers,
      rows,
      rowCount: rows.length,
    });
  }

  const parseTime = performance.now() - startTime;

  return {
    fileName: file.name,
    sheets,
    totalRows,
    parseTime,
  };
}

/**
 * Parse a JSON file
 */
export async function parseJSON(file: File): Promise<ParsedFile> {
  const startTime = performance.now();
  
  const text = await file.text();
  const data = JSON.parse(text);
  
  // Handle array of objects
  let rows: Record<string, string | number | boolean | null>[] = [];
  let headers: string[] = [];
  
  if (Array.isArray(data)) {
    rows = data.map(item => {
      if (typeof item === 'object' && item !== null) {
        const cleanRow: Record<string, string | number | boolean | null> = {};
        for (const [key, value] of Object.entries(item)) {
          if (value === null || value === undefined) {
            cleanRow[key] = null;
          } else if (typeof value === 'object') {
            cleanRow[key] = JSON.stringify(value);
          } else {
            cleanRow[key] = value as string | number | boolean;
          }
        }
        return cleanRow;
      }
      return { value: String(item) };
    });
    if (rows.length > 0) {
      headers = Object.keys(rows[0]);
    }
  } else if (typeof data === 'object' && data !== null) {
    // Single object - convert to single row
    const cleanRow: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        cleanRow[key] = null;
      } else if (typeof value === 'object') {
        cleanRow[key] = JSON.stringify(value);
      } else {
        cleanRow[key] = value as string | number | boolean;
      }
    }
    rows = [cleanRow];
    headers = Object.keys(cleanRow);
  }

  const parseTime = performance.now() - startTime;

  return {
    fileName: file.name,
    sheets: [{
      name: 'data',
      headers,
      rows,
      rowCount: rows.length,
    }],
    totalRows: rows.length,
    parseTime,
  };
}

/**
 * Parse a CSV file using SheetJS
 */
export async function parseCSV(file: File): Promise<ParsedFile> {
  const startTime = performance.now();
  
  const text = await file.text();
  const workbook = XLSX.read(text, { type: 'string' });
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw: false,
  });

  const headers = jsonData.length > 0 ? Object.keys(jsonData[0] || {}) : [];
  const rows = jsonData.map(row => {
    const cleanRow: Record<string, string | number | boolean | null> = {};
    for (const header of headers) {
      const value = row[header];
      if (value === null || value === undefined || value === '') {
        cleanRow[header] = null;
      } else {
        const stringVal = String(value);
        const numVal = parseFloat(stringVal.replace(/[,$]/g, ''));
        if (!isNaN(numVal) && stringVal.match(/^[\d,.$-]+$/)) {
          cleanRow[header] = numVal;
        } else {
          cleanRow[header] = stringVal;
        }
      }
    }
    return cleanRow;
  });

  const parseTime = performance.now() - startTime;

  return {
    fileName: file.name,
    sheets: [{
      name: 'data',
      headers,
      rows,
      rowCount: rows.length,
    }],
    totalRows: rows.length,
    parseTime,
  };
}

/**
 * Parse any supported file type
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'xlsx':
    case 'xls':
      return parseSpreadsheet(file);
    case 'csv':
      return parseCSV(file);
    case 'json':
      return parseJSON(file);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
