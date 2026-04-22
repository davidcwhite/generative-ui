import type { ArtifactRecord } from '../agent/types.js';
import {
  closeSandbox,
  executeCode,
  getOrCreateSandbox,
  getSandboxInfo,
  isE2BConfigured,
  listSandboxFiles,
  runTerminalCommand,
  writeSandboxFile,
} from '../sandbox/e2b-client.js';
import { readArtifactSandboxFile } from '../artifacts/service.js';
import type { RuntimeAdapter } from './types.js';

export class E2bRuntimeAdapter implements RuntimeAdapter {
  isConfigured(): boolean {
    return isE2BConfigured();
  }

  getSessionInfo(runId: string) {
    return getSandboxInfo(runId);
  }

  async ensureSession(runId: string) {
    await getOrCreateSandbox(runId);
    return getSandboxInfo(runId);
  }

  async materializeArtifacts(runId: string, artifacts: ArtifactRecord[]): Promise<string[]> {
    await this.ensureSession(runId);
    const writtenPaths: string[] = [];

    for (const artifact of artifacts) {
      for (const sandboxFile of artifact.metadataJson.sandboxFiles) {
        const content = readArtifactSandboxFile(sandboxFile.storagePath);
        const sandboxPath = `/home/user/${sandboxFile.relativePath}`;
        const ok = await writeSandboxFile(runId, sandboxPath, content);
        if (ok) {
          writtenPaths.push(sandboxPath);
        }
      }
    }

    return writtenPaths;
  }

  async executeCode(runId: string, code: string, language: 'python' | 'javascript' = 'python') {
    return executeCode(runId, code, language);
  }

  async runTerminal(runId: string, command: string) {
    return runTerminalCommand(runId, command);
  }

  async listFiles(runId: string, path = '/home/user') {
    return listSandboxFiles(runId, path);
  }

  async disposeSession(runId: string) {
    return closeSandbox(runId);
  }
}

export const e2bRuntime = new E2bRuntimeAdapter();
