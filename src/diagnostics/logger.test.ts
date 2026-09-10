import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  clearDiagnosticLogs,
  getDeviceDiagnosticsSummary,
  getDiagnosticLogContent,
  isDiagnosticLoggingActive,
  logDiagnostic,
  shareDiagnosticLog,
  startDiagnosticLogging,
  stopDiagnosticLogging,
  subscribeDiagnosticLogging,
} from './logger';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  EncodingType: {
    UTF8: 'utf8',
  },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('mock log content'),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 123 }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('Diagnostic Logger', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearDiagnosticLogs();
    if (isDiagnosticLoggingActive()) {
      await stopDiagnosticLogging();
    }
  });

  it('starts inactive and can be toggled on and off', async () => {
    expect(isDiagnosticLoggingActive()).toBe(false);

    let lastState: any = null;
    const unsubscribe = subscribeDiagnosticLogging((state) => {
      lastState = state;
    });

    await startDiagnosticLogging();
    expect(isDiagnosticLoggingActive()).toBe(true);
    expect(lastState?.isActive).toBe(true);

    logDiagnostic('TEST', 'Test message', { foo: 'bar' });
    expect(lastState?.entryCount).toBeGreaterThan(0);

    await stopDiagnosticLogging();
    expect(isDiagnosticLoggingActive()).toBe(false);
    expect(lastState?.isActive).toBe(false);

    unsubscribe();
  });

  it('gathers device diagnostics summary', () => {
    const summary = getDeviceDiagnosticsSummary();
    expect(summary).toBeDefined();
    expect(summary.platform).toBeDefined();
    expect(summary.display).toBeDefined();
    expect(summary.environment).toBeDefined();
  });

  it('formats log entries with tags and data', async () => {
    await startDiagnosticLogging();
    logDiagnostic('RENDER', 'Component rendered', { count: 1 });

    const content = await getDiagnosticLogContent();
    expect(content).toContain('[RENDER] Component rendered | {"count":1}');
    expect(content).toContain('=== TOPOBUILDER DIAGNOSTIC LOG ===');
  });

  it('shares diagnostic log through expo-sharing', async () => {
    await startDiagnosticLogging();
    logDiagnostic('ACTION', 'User clicked button');

    const result = await shareDiagnosticLog();
    expect(result.success).toBe(true);
    expect(Sharing.shareAsync).toHaveBeenCalled();
  });

  it('handles clearing logs', async () => {
    await startDiagnosticLogging();
    logDiagnostic('TEST', 'Message to be cleared');
    await clearDiagnosticLogs();

    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });
});
