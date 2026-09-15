import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';

const execAsync = promisify(exec);

export class TerminalService {
  async run(command: string, cwd: string, timeoutMs = 120000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const { stdout, stderr } = await execAsync(command, {
      cwd: path.resolve(cwd),
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024
    });
    return { stdout, stderr, exitCode: 0 };
  }
}
