import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Dimensions, PixelRatio, Platform } from 'react-native';

const DIAGNOSTIC_LOG_FILENAME = 'topobuilder_diagnostic.log';
const DEFAULT_RECIPIENT_EMAIL = 'dserink@gmail.com';

export interface DiagnosticLogState {
  isActive: boolean;
  entryCount: number;
  lastLogTime?: string;
  fileSizeBytes: number;
}

// In-memory buffer of logs
let memoryLogs: string[] = [];
let isLogging = false;
let logListeners: Array<(state: DiagnosticLogState) => void> = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
let cachedFileSizeBytes = 0;

function notifyListeners() {
  const state: DiagnosticLogState = {
    isActive: isLogging,
    entryCount: memoryLogs.length,
    lastLogTime: memoryLogs.length > 0 ? memoryLogs[memoryLogs.length - 1].slice(1, 25) : undefined,
    fileSizeBytes: cachedFileSizeBytes,
  };
  logListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (e) {
      console.warn('[Diagnostics] Listener error:', e);
    }
  });
}

export function subscribeDiagnosticLogging(listener: (state: DiagnosticLogState) => void): () => void {
  logListeners.push(listener);
  listener({
    isActive: isLogging,
    entryCount: memoryLogs.length,
    lastLogTime: memoryLogs.length > 0 ? memoryLogs[memoryLogs.length - 1].slice(1, 25) : undefined,
    fileSizeBytes: cachedFileSizeBytes,
  });
  return () => {
    logListeners = logListeners.filter((l) => l !== listener);
  };
}

export function useDiagnosticLogging(): DiagnosticLogState {
  const [state, setState] = useState<DiagnosticLogState>({
    isActive: isLogging,
    entryCount: memoryLogs.length,
    lastLogTime: memoryLogs.length > 0 ? memoryLogs[memoryLogs.length - 1].slice(1, 25) : undefined,
    fileSizeBytes: cachedFileSizeBytes,
  });

  useEffect(() => {
    return subscribeDiagnosticLogging(setState);
  }, []);

  return state;
}

export function isDiagnosticLoggingActive(): boolean {
  return isLogging;
}

export function getDiagnosticLogFilePath(): string {
  if (Platform.OS === 'web') {
    return DIAGNOSTIC_LOG_FILENAME;
  }
  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return baseDir ? `${baseDir.replace(/\/$/, '')}/${DIAGNOSTIC_LOG_FILENAME}` : DIAGNOSTIC_LOG_FILENAME;
}

async function flushLogsToFile(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      try {
        const fullContent = memoryLogs.join('\n');
        localStorage.setItem(DIAGNOSTIC_LOG_FILENAME, fullContent);
        cachedFileSizeBytes = fullContent.length;
      } catch (e) {
        console.warn('[Diagnostics] Failed writing to localStorage', e);
      }
    }
    notifyListeners();
    return;
  }

  try {
    const fileUri = getDiagnosticLogFilePath();
    const fullContent = memoryLogs.join('\n');
    await FileSystem.writeAsStringAsync(fileUri, fullContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists && typeof info.size === 'number') {
      cachedFileSizeBytes = info.size;
    } else {
      cachedFileSizeBytes = fullContent.length;
    }
  } catch (err) {
    console.warn('[Diagnostics] Failed writing log file:', err);
  }
  notifyListeners();
}

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    void flushLogsToFile();
  }, 1000);
}

/**
 * Log an event if diagnostic logging is active.
 * Format: [ISO_TIMESTAMP] [TAG] Message | { json_data }
 */
export function logDiagnostic(tag: string, message: string, data?: unknown): void {
  if (!isLogging) return;

  const now = new Date();
  const timestamp = now.toISOString();
  let line = `[${timestamp}] [${tag}] ${message}`;

  if (data !== undefined) {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      line += ` | ${serialized}`;
    } catch {
      line += ` | [Unserializable data]`;
    }
  }

  // Also print to console for adb logcat / metro terminal inspection
  console.log(`[DIAGNOSTIC] ${line}`);

  memoryLogs.push(line);
  cachedFileSizeBytes += line.length + 1;
  scheduleFlush();
  notifyListeners();
}

/**
 * Gather device specifications without native modules
 */
export function getDeviceDiagnosticsSummary(): Record<string, unknown> {
  const windowDims = Dimensions.get('window');
  const screenDims = Dimensions.get('screen');

  // Extract android constants if available
  const platformConstants: Record<string, unknown> = {};
  if (Platform.OS === 'android' && Platform.constants) {
    const pc = Platform.constants as Record<string, unknown>;
    platformConstants.Brand = pc.Brand ?? pc.brand;
    platformConstants.Model = pc.Model ?? pc.model;
    platformConstants.Manufacturer = pc.Manufacturer ?? pc.manufacturer;
    platformConstants.Fingerprint = pc.Fingerprint ?? pc.fingerprint;
    platformConstants.Release = pc.Release ?? pc.release;
    platformConstants.Version = pc.Version ?? pc.version;
    platformConstants.uiMode = pc.uiMode;
  }

  return {
    timestamp: new Date().toISOString(),
    localTime: new Date().toString(),
    platform: {
      OS: Platform.OS,
      Version: Platform.Version,
      isPad: 'isPad' in Platform ? (Platform as { isPad?: boolean }).isPad : false,
      isTV: Platform.isTV,
      constants: platformConstants,
    },
    display: {
      window: windowDims,
      screen: screenDims,
      pixelRatio: PixelRatio.get(),
      fontScale: PixelRatio.getFontScale(),
    },
    environment: {
      reactVersion: React.version,
      expoVersion: Constants.expoVersion,
      nativeAppVersion: Constants.nativeAppVersion,
      nativeBuildVersion: Constants.nativeBuildVersion,
      appOwnership: Constants.appOwnership,
      executionEnvironment: Constants.executionEnvironment,
    },
  };
}

/**
 * Starts diagnostic logging session and records initial device diagnostics.
 */
export async function startDiagnosticLogging(): Promise<void> {
  isLogging = true;
  const startTimestamp = new Date().toISOString();

  // Clear or append? If previous logs exist, add a session separator
  if (memoryLogs.length > 0) {
    memoryLogs.push(`\n${'='.repeat(60)}\n[${startTimestamp}] === NEW LOGGING SESSION STARTED ===\n${'='.repeat(60)}`);
  } else {
    memoryLogs.push(`${'='.repeat(60)}\n[${startTimestamp}] === TOPOBUILDER DIAGNOSTIC LOG ===\n${'='.repeat(60)}`);
  }

  // Capture and write device diagnostics
  const diagnostics = getDeviceDiagnosticsSummary();
  memoryLogs.push(`[${startTimestamp}] [DEVICE_INFO] ${JSON.stringify(diagnostics, null, 2)}`);

  console.log('[DIAGNOSTIC] === Diagnostic logging started ===');
  console.log('[DIAGNOSTIC] Device summary:', diagnostics);

  await flushLogsToFile();
  notifyListeners();
}

/**
 * Stops diagnostic logging session.
 */
export async function stopDiagnosticLogging(): Promise<void> {
  if (!isLogging) return;

  const stopTimestamp = new Date().toISOString();
  const line = `[${stopTimestamp}] [SESSION] === Diagnostic logging stopped by user ===`;
  memoryLogs.push(line);
  console.log(`[DIAGNOSTIC] ${line}`);

  isLogging = false;
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  await flushLogsToFile();
  notifyListeners();
}

/**
 * Reads the full log content as string.
 */
export async function getDiagnosticLogContent(): Promise<string> {
  if (memoryLogs.length > 0) {
    return memoryLogs.join('\n');
  }

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(DIAGNOSTIC_LOG_FILENAME) ?? '';
    }
    return '';
  }

  try {
    const fileUri = getDiagnosticLogFilePath();
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return content;
    }
  } catch (err) {
    console.warn('[Diagnostics] Failed reading log file:', err);
  }
  return '';
}

/**
 * Clears all in-memory logs and deletes the log file.
 */
export async function clearDiagnosticLogs(): Promise<void> {
  memoryLogs = [];
  cachedFileSizeBytes = 0;

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DIAGNOSTIC_LOG_FILENAME);
    }
  } else {
    try {
      const fileUri = getDiagnosticLogFilePath();
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (err) {
      console.warn('[Diagnostics] Failed deleting log file:', err);
    }
  }

  notifyListeners();
}

/**
 * Share or export the log file.
 * Opens the system share drawer on native (iOS/Android) where the user can pick Gmail/Email,
 * or triggers a browser download on web.
 */
export async function shareDiagnosticLog(): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure all logs are flushed to file
    await flushLogsToFile();

    const fullContent = await getDiagnosticLogContent();
    if (!fullContent || fullContent.trim().length === 0) {
      return { success: false, error: 'No diagnostic logs recorded yet.' };
    }

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const blob = new Blob([fullContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = DIAGNOSTIC_LOG_FILENAME;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return { success: true };
      }
      return { success: false, error: 'Web document environment unavailable.' };
    }

    const fileUri = getDiagnosticLogFilePath();
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Sharing is not supported on this device.' };
    }

    await Sharing.shareAsync(fileUri, {
      dialogTitle: 'Diagnostic Log',
      mimeType: 'text/plain',
      UTI: 'public.plain-text',
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Diagnostics] Share failed:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Gets the recipient email (internal use only, not printed in UI).
 */
export function getDiagnosticRecipientEmail(): string {
  return DEFAULT_RECIPIENT_EMAIL;
}
