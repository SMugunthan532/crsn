/**
 * util/FileManager.java equivalent
 * Handles writing and reading persistent transaction logs (transactions.log)
 */
import { AuditLogEntry } from '../../types';

export class FileManager {
  private static readonly STORAGE_KEY = 'crsn_transactions_log';
  private static logs: AuditLogEntry[] = [];

  public static initialize(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
  }

  public static logTransaction(
    actionType: AuditLogEntry['actionType'],
    actorId: string,
    actorName: string,
    details: string
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      logId: `LOG-${Date.now().toString().slice(-6)}`,
      actionType,
      actorId,
      actorName,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > 500) {
      this.logs.pop();
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch {
      // ignore storage quota errors in sandbox
    }

    return entry;
  }

  public static getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  /**
   * Generates formatted raw text file representation identical to Java's transactions.log
   */
  public static getRawLogText(): string {
    const header = `========================================================================================\n` +
      ` COMMUNITY RESOURCE SHARING NETWORK (CRSN) - MASTER TRANSACTION AUDIT LOG\n` +
      ` Generated on: ${new Date().toISOString()}\n` +
      ` Total Audit Entries: ${this.logs.length}\n` +
      `========================================================================================\n` +
      `[TIMESTAMP]           [LOG ID]     [ACTION]         [USER / ACTOR]          [DETAILS]\n` +
      `----------------------------------------------------------------------------------------\n`;

    const lines = this.logs.map(log => {
      const ts = log.timestamp.padEnd(21);
      const id = log.logId.padEnd(12);
      const act = log.actionType.padEnd(16);
      const actor = `${log.actorName} (${log.actorId})`.padEnd(24);
      return `${ts}${id}${act}${actor}${log.details}`;
    });

    return header + lines.join('\n') + `\n\n[EOF - END OF TRANSACTION AUDIT BUFFER]`;
  }

  public static clearLogs(): void {
    this.logs = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
