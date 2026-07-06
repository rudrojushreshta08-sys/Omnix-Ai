import * as path from 'path';

export interface CommandAudit {
  allowed: boolean;
  command: string;
  reason?: string;
  sanitizedCommand?: string;
}

export class SecurityEngine {
  // Whitelisted base commands
  private static readonly ALLOWED_BINARIES = new Set(['git', 'npm', 'node', 'echo', 'npx']);

  // Whitelisted full commands or patterns
  private static readonly ALLOWED_COMMAND_PATTERNS = [
    /^git\s+status$/,
    /^git\s+log\s+-n\s+\d+$/,
    /^git\s+diff$/,
    /^npm\s+run\s+build$/,
    /^npm\s+-v$/,
    /^node\s+-v$/,
    /^echo\s+[a-zA-Z0-9\s_.,!?-]+$/
  ];

  // Dangerous shell metacharacters and injection patterns
  private static readonly DANGEROUS_PATTERNS = [
    /[|&;`<>]/,           // Pipes, chaining, redirection, backticks
    /\$\(.*\)/,           // Subshell execution $(...)
    /\\/,                 // Backslashes (often used for escaping in linux, but we check specifically)
    /\.\.\//,             // Path traversal (Unix style)
    /\.\.\\/,             // Path traversal (Windows style)
    /(^| )(rm|del|format|mkfs|sh|bash|powershell|pwsh|cmd|curl|wget|fetch|ssh|sftp|ftp)( |$)/i, // Dangerous binaries
    /(^| )(iex|Invoke-Expression|Start-Process|cmd.exe|powershell.exe)( |$)/i // PowerShell/Windows specifics
  ];

  /**
   * Sanitizes generic string inputs to remove dangerous sequences.
   */
  public static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    // Strip control characters, keep safe punctuation and alphanumeric
    return input.replace(/[^\w\s-.,!?@#%*()\[\]]/g, '').trim();
  }

  /**
   * Validates if a command is safe to execute under the sandbox guidelines.
   */
  public static validateCommand(rawCommand: string): CommandAudit {
    const trimmed = rawCommand.trim();

    if (!trimmed) {
      return { allowed: false, command: trimmed, reason: 'Command is empty' };
    }

    // 1. Check for dangerous characters/operators (Injection defense)
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          allowed: false,
          command: trimmed,
          reason: `Command contains forbidden operators or dangerous keywords matching pattern: ${pattern.toString()}`
        };
      }
    }

    // 2. Extract base binary
    const parts = trimmed.split(/\s+/);
    const baseBinary = parts[0].toLowerCase();

    if (!this.ALLOWED_BINARIES.has(baseBinary)) {
      return {
        allowed: false,
        command: trimmed,
        reason: `Binary '${baseBinary}' is not in the sandbox whitelist. Allowed: [${Array.from(this.ALLOWED_BINARIES).join(', ')}]`
      };
    }

    // 3. Match against whitelisted patterns
    let matchesPattern = false;
    for (const regex of this.ALLOWED_COMMAND_PATTERNS) {
      if (regex.test(trimmed)) {
        matchesPattern = true;
        break;
      }
    }

    // Special allowance: check if it's npm run build or other project-specific scripts
    // (We also want to allow echo with clean text)
    if (!matchesPattern) {
      if (baseBinary === 'echo') {
        // Echo is allowed if it passes the sanitization and doesn't contain variables
        const echoContent = parts.slice(1).join(' ');
        if (echoContent.includes('$') || echoContent.includes('%')) {
          return { allowed: false, command: trimmed, reason: 'Variables are not allowed in echo' };
        }
        matchesPattern = true;
      } else if (baseBinary === 'npm' && parts[1] === 'run' && (parts[2] === 'build' || parts[2] === 'start')) {
        matchesPattern = true;
      } else {
        return {
          allowed: false,
          command: trimmed,
          reason: `Command '${trimmed}' does not match any safe pattern whitelists.`
        };
      }
    }

    // Path check: make sure no absolute paths outside the workspace are referenced
    // (For this project, we reject absolute path windows roots like C:\Windows etc.)
    const matchesWindowsPath = /([a-zA-Z]:\\Windows|[a-zA-Z]:\\System32)/i.test(trimmed);
    if (matchesWindowsPath) {
      return {
        allowed: false,
        command: trimmed,
        reason: 'Access to system directories is blocked.'
      };
    }

    return {
      allowed: true,
      command: trimmed,
      sanitizedCommand: trimmed
    };
  }

  /**
   * Helper to perform basic JSON shape validation for tools.
   */
  public static validatePayload(data: any, schema: Record<string, string>): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }

    for (const [key, type] of Object.entries(schema)) {
      if (!(key in data)) {
        return { valid: false, error: `Missing required field: ${key}` };
      }
      if (typeof data[key] !== type) {
        return { valid: false, error: `Field '${key}' must be of type '${type}', got '${typeof data[key]}'` };
      }
    }

    return { valid: true };
  }
}
