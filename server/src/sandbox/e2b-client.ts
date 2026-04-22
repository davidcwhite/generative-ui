// E2B Sandbox Client for code execution and terminal access
import { Sandbox } from '@e2b/code-interpreter';
import { getUploadedFiles } from '../data/userFiles.js';

// Store active sandboxes by session ID
const activeSandboxes: Map<string, Sandbox> = new Map();

// Track which files have been synced to each sandbox
const syncedFiles: Map<string, Set<string>> = new Map();

export interface SandboxInfo {
  sandboxId: string;
  sessionId: string;
  createdAt: number;
  language: 'python' | 'javascript';
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  logs: string[];
  executionTime: number;
  results?: Array<{
    type: string;
    data: unknown;
  }>;
}

export interface TerminalResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

/**
 * Create or get existing sandbox for a session
 */
export async function getOrCreateSandbox(sessionId: string): Promise<Sandbox> {
  // Check for existing sandbox
  let sandbox = activeSandboxes.get(sessionId);
  
  if (sandbox) {
    return sandbox;
  }
  
  // Create new sandbox
  console.log(`Creating new E2B sandbox for session: ${sessionId}`);
  sandbox = await Sandbox.create({
    timeoutMs: 5 * 60 * 1000, // 5 minute timeout
  });
  
  activeSandboxes.set(sessionId, sandbox);
  console.log(`Sandbox created: ${sandbox.sandboxId}`);
  
  return sandbox;
}

/**
 * Execute Python or JavaScript code in sandbox
 */
export async function executeCode(
  sessionId: string,
  code: string,
  language: 'python' | 'javascript' = 'python'
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    const sandbox = await getOrCreateSandbox(sessionId);
    
    // Execute code
    const execution = await sandbox.runCode(code, {
      language,
      onStdout: (output) => {
        logs.push(output.line);
      },
      onStderr: (output) => {
        logs.push(`[stderr] ${output.line}`);
      },
    });
    
    const executionTime = Date.now() - startTime;
    
    // Check for errors
    if (execution.error) {
      return {
        success: false,
        error: `${execution.error.name}: ${execution.error.value}`,
        logs,
        executionTime,
      };
    }
    
    // Process results - E2B Result has text, html, png, svg, etc.
    const results = execution.results?.map(r => ({
      type: r.text ? 'text' : r.html ? 'html' : r.png ? 'png' : r.svg ? 'svg' : 'unknown',
      data: r.text || r.html || r.png || r.svg || null,
    })) || [];
    
    // Get text output
    let output = execution.text || '';
    if (logs.length > 0) {
      output = logs.join('\n') + (output ? '\n' + output : '');
    }
    
    return {
      success: true,
      output,
      logs,
      executionTime,
      results,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      logs,
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Run a terminal command in sandbox
 */
export async function runTerminalCommand(
  sessionId: string,
  command: string
): Promise<TerminalResult> {
  try {
    const sandbox = await getOrCreateSandbox(sessionId);
    
    const result = await sandbox.commands.run(command, {
      timeoutMs: 30000, // 30 second timeout for commands
    });
    
    return {
      success: result.exitCode === 0,
      output: result.stdout || '',
      error: result.stderr || undefined,
      exitCode: result.exitCode,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: (error as Error).message,
      exitCode: 1,
    };
  }
}

/**
 * Write a file to the sandbox
 */
export async function writeSandboxFile(
  sessionId: string,
  path: string,
  content: string
): Promise<boolean> {
  try {
    const sandbox = await getOrCreateSandbox(sessionId);
    await sandbox.files.write(path, content);
    return true;
  } catch (error) {
    console.error('Failed to write file to sandbox:', error);
    return false;
  }
}

/**
 * Read a file from the sandbox
 */
export async function readSandboxFile(
  sessionId: string,
  path: string
): Promise<string | null> {
  try {
    const sandbox = await getOrCreateSandbox(sessionId);
    const content = await sandbox.files.read(path);
    return content;
  } catch (error) {
    console.error('Failed to read file from sandbox:', error);
    return null;
  }
}

/**
 * List files in sandbox directory
 */
export async function listSandboxFiles(
  sessionId: string,
  path: string = '/home/user'
): Promise<string[]> {
  try {
    const sandbox = await getOrCreateSandbox(sessionId);
    const files = await sandbox.files.list(path);
    return files.map(f => f.name);
  } catch (error) {
    console.error('Failed to list sandbox files:', error);
    return [];
  }
}

/**
 * Convert parsed sheet data to CSV string
 */
function sheetToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escapeCsvField = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.map(escapeCsvField).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCsvField(row[h])).join(','));
  }
  return lines.join('\n');
}

/**
 * Sync all uploaded files into the sandbox.
 * Only syncs files that haven't been written to this sandbox yet.
 */
export async function syncFilesToSandbox(sessionId: string): Promise<string[]> {
  const uploadedFiles = getUploadedFiles();
  if (uploadedFiles.length === 0) return [];

  if (!syncedFiles.has(sessionId)) {
    syncedFiles.set(sessionId, new Set());
  }
  const alreadySynced = syncedFiles.get(sessionId)!;

  const newlySynced: string[] = [];

  for (const file of uploadedFiles) {
    if (alreadySynced.has(file.fileId)) continue;

    for (const sheet of file.sheets) {
      const csvContent = sheetToCsv(sheet.headers, sheet.rows);
      // Use original filename but ensure .csv extension
      const baseName = file.fileName.replace(/\.[^.]+$/, '');
      const suffix = file.sheets.length > 1 ? `_${sheet.name}` : '';
      const sandboxPath = `/home/user/${baseName}${suffix}.csv`;

      const ok = await writeSandboxFile(sessionId, sandboxPath, csvContent);
      if (ok) {
        console.log(`Synced ${sandboxPath} (${sheet.rowCount} rows) to sandbox ${sessionId}`);
        newlySynced.push(sandboxPath);
      }
    }

    alreadySynced.add(file.fileId);
  }

  return newlySynced;
}

/**
 * Get list of file IDs synced to a sandbox
 */
export function getSyncedFileIds(sessionId: string): string[] {
  return Array.from(syncedFiles.get(sessionId) || []);
}

/**
 * Close a sandbox session
 */
export async function closeSandbox(sessionId: string): Promise<boolean> {
  const sandbox = activeSandboxes.get(sessionId);
  if (!sandbox) return false;
  
  try {
    await sandbox.kill();
    activeSandboxes.delete(sessionId);
    syncedFiles.delete(sessionId);
    console.log(`Sandbox closed for session: ${sessionId}`);
    return true;
  } catch (error) {
    console.error('Failed to close sandbox:', error);
    return false;
  }
}

/**
 * Get sandbox info
 */
export function getSandboxInfo(sessionId: string): SandboxInfo | null {
  const sandbox = activeSandboxes.get(sessionId);
  if (!sandbox) return null;
  
  return {
    sandboxId: sandbox.sandboxId,
    sessionId,
    createdAt: Date.now(), // We don't track creation time currently
    language: 'python',
  };
}

/**
 * Check if E2B API key is configured
 */
export function isE2BConfigured(): boolean {
  return !!process.env.E2B_API_KEY;
}
