import { useState, useCallback, useRef } from 'react';
import { parseFile, type ParsedFile } from '../utils/fileParser';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error?: string;
  parsedData?: ParsedFile;
}

interface FileUploaderProps {
  onFilesChange: (files: UploadedFile[]) => void;
  onFilesParsed?: (files: UploadedFile[]) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
}

// Check if File System Access API is available (Chrome/Edge)
const supportsDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export function FileUploader({ 
  onFilesChange,
  onFilesParsed,
  acceptedTypes = ['.xlsx', '.xls', '.csv', '.json'],
  maxFileSize = 50 * 1024 * 1024 // 50MB default
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileId = () => `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const isAcceptedType = (filename: string): boolean => {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return acceptedTypes.includes(ext);
  };

  // Parse a single file and update its status
  const parseUploadedFile = useCallback(async (uploadedFile: UploadedFile): Promise<UploadedFile> => {
    try {
      const parsedData = await parseFile(uploadedFile.file);
      console.log(`Parsed ${uploadedFile.name}:`, {
        sheets: parsedData.sheets.length,
        totalRows: parsedData.totalRows,
        parseTime: `${parsedData.parseTime.toFixed(2)}ms`,
        headers: parsedData.sheets[0]?.headers,
        sampleRow: parsedData.sheets[0]?.rows[0],
      });
      return {
        ...uploadedFile,
        status: 'ready',
        parsedData,
      };
    } catch (err) {
      console.error(`Failed to parse ${uploadedFile.name}:`, err);
      return {
        ...uploadedFile,
        status: 'error',
        error: `Parse error: ${(err as Error).message}`,
      };
    }
  }, []);

  const processFiles = useCallback(async (fileList: File[]) => {
    const newFiles: UploadedFile[] = [];

    for (const file of fileList) {
      if (!isAcceptedType(file.name)) {
        newFiles.push({
          id: generateFileId(),
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          status: 'error',
          error: `Unsupported file type. Accepted: ${acceptedTypes.join(', ')}`,
        });
        continue;
      }

      if (file.size > maxFileSize) {
        newFiles.push({
          id: generateFileId(),
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          status: 'error',
          error: `File too large. Max size: ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        });
        continue;
      }

      newFiles.push({
        id: generateFileId(),
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        status: 'processing', // Changed to processing immediately
      });
    }

    // Add files to state immediately (showing processing state)
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);

    // Parse files that are in processing state
    const filesToParse = newFiles.filter(f => f.status === 'processing');
    if (filesToParse.length > 0) {
      const parsedFiles = await Promise.all(filesToParse.map(parseUploadedFile));
      
      // Update files with parsed results
      setFiles(prevFiles => {
        const updated = prevFiles.map(f => {
          const parsed = parsedFiles.find(p => p.id === f.id);
          return parsed || f;
        });
        onFilesChange(updated);
        onFilesParsed?.(updated.filter(f => f.status === 'ready'));
        return updated;
      });
    }
  }, [files, onFilesChange, onFilesParsed, acceptedTypes, maxFileSize, parseUploadedFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles: File[] = [];
    
    // Handle both files and directories
    const items = Array.from(e.dataTransfer.items);
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          if (entry.isDirectory) {
            // Recursively read directory
            const dirFiles = await readDirectory(entry as FileSystemDirectoryEntry);
            droppedFiles.push(...dirFiles);
          } else {
            const file = item.getAsFile();
            if (file) droppedFiles.push(file);
          }
        } else {
          const file = item.getAsFile();
          if (file) droppedFiles.push(file);
        }
      }
    }

    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  // Recursively read files from a directory
  const readDirectory = async (dirEntry: FileSystemDirectoryEntry): Promise<File[]> => {
    const files: File[] = [];
    const reader = dirEntry.createReader();
    
    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    const getFile = (fileEntry: FileSystemFileEntry): Promise<File> => {
      return new Promise((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
    };

    let entries = await readEntries();
    while (entries.length > 0) {
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await getFile(entry as FileSystemFileEntry);
          files.push(file);
        } else if (entry.isDirectory) {
          const subFiles = await readDirectory(entry as FileSystemDirectoryEntry);
          files.push(...subFiles);
        }
      }
      entries = await readEntries();
    }

    return files;
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleFolderPicker = useCallback(async () => {
    if (!supportsDirectoryPicker) return;

    try {
      // @ts-expect-error - showDirectoryPicker is not in TypeScript types yet
      const dirHandle = await window.showDirectoryPicker();
      const files: File[] = [];

      async function processHandle(handle: FileSystemHandle, path: string = '') {
        if (handle.kind === 'file') {
          const fileHandle = handle as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          files.push(file);
        } else if (handle.kind === 'directory') {
          const dirHandle = handle as FileSystemDirectoryHandle;
          // @ts-expect-error - values() iterator
          for await (const entry of dirHandle.values()) {
            await processHandle(entry, `${path}/${handle.name}`);
          }
        }
      }

      for await (const entry of dirHandle.values()) {
        await processHandle(entry);
      }

      if (files.length > 0) {
        processFiles(files);
      }
    } catch (err) {
      // User cancelled or API not supported
      if ((err as Error).name !== 'AbortError') {
        console.error('Folder picker error:', err);
      }
    }
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  }, [files, onFilesChange]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-6 border-2 border-dashed rounded-lg m-4 transition-colors ${
          isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-stone-300 hover:border-stone-400'
        }`}
      >
        <div className="text-center">
          {/* Upload Icon */}
          <svg 
            className="mx-auto h-12 w-12 text-stone-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          
          <p className="mt-2 text-sm text-stone-600">
            <span className="font-medium">Drop files here</span> or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              browse
            </button>
          </p>
          
          <p className="mt-1 text-xs text-stone-500">
            {acceptedTypes.join(', ')} up to {Math.round(maxFileSize / 1024 / 1024)}MB
          </p>

          {supportsDirectoryPicker && (
            <button
              type="button"
              onClick={handleFolderPicker}
              className="mt-3 px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
            >
              Select Folder
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="border-t border-stone-200">
          <div className="px-4 py-2 bg-stone-50 border-b border-stone-200">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Uploaded Files ({files.length})
            </span>
          </div>
          <ul className="divide-y divide-stone-100">
            {files.map((file) => (
              <li key={file.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* File Type Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ${
                    file.status === 'error' ? 'bg-red-100' :
                    file.status === 'ready' ? 'bg-emerald-100' :
                    'bg-stone-100'
                  }`}>
                    {file.status === 'error' ? (
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : file.status === 'ready' ? (
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : file.status === 'processing' ? (
                      <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{file.name}</p>
                    <p className="text-xs text-stone-500">
                      {formatFileSize(file.size)}
                      {file.parsedData && (
                        <span className="text-emerald-600 ml-2">
                          {file.parsedData.totalRows} rows
                          {file.parsedData.sheets.length > 1 && ` • ${file.parsedData.sheets.length} sheets`}
                        </span>
                      )}
                      {file.error && (
                        <span className="text-red-500 ml-2">{file.error}</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="flex-shrink-0 p-1 text-stone-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
