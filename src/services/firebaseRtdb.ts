import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, update, onValue, Database, push, get, serverTimestamp } from 'firebase/database';
import { FirebaseConnectionConfig, OltSiteId, PortRecord, SyncStatus } from '../types/olt';
import { INITIAL_PORT_RECORDS, OLT_SITES } from '../data/oltSites';
import { AuditEntry, AuthenticatedOperator, OperatorProfile } from '../types/auth';
import { normalizeLegacyRecords } from '../utils/legacyRecordAdapter';

const LOCAL_STORAGE_RECORDS_KEY = 'olt_core_manager_records_v2';
const LOCAL_STORAGE_CONFIG_KEY = 'olt_firebase_rtdb_config_v2';
const LOCAL_STORAGE_PENDING_QUEUE_KEY = 'olt_pending_sync_queue_v2';

let appInstance: FirebaseApp | null = null;
let dbInstance: Database | null = null;
let activeListeners: Record<string, () => void> = {};

function getDatabaseInstance(): Database {
  if (!dbInstance) {
    const result = initFirebaseApp();
    if (!result.success || !dbInstance) {
      throw new Error(result.error || 'Firebase Realtime Database is not configured.');
    }
  }
  return dbInstance;
}

function getLegacySiteName(siteId: OltSiteId): string {
  const site = OLT_SITES.find((item) => item.id === siteId);
  if (!site) throw new Error(`Unknown OLT site: ${siteId}`);
  return site.name;
}

const AUDITED_FIELDS: Array<[string, keyof PortRecord]> = [
  ['Board', 'boardNumber'],
  ['Port', 'portNumber'],
  ['Core ID', 'coreId'],
  ['Location', 'locationName'],
  ['Coordinates', 'coordinates'],
  ['Status', 'status'],
  ['PON type', 'ponType'],
  ['Split ratio', 'splitRatio'],
  ['TX power', 'opticalPowerTxDbm'],
  ['RX power', 'opticalPowerRxDbm'],
  ['Circuit ID', 'customerCircuitId'],
  ['Cable tag', 'cableTag'],
  ['Technician', 'technicianName'],
  ['Notes', 'notes'],
];

function getAuditedValue(record: PortRecord, field: keyof PortRecord): unknown {
  if (field === 'coordinates') {
    return { lat: record.coordinates.lat, lng: record.coordinates.lng };
  }
  return record[field];
}

function formatAuditedValue(value: unknown): string {
  const formatted = value === undefined || value === null || value === ''
    ? '—'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
  return formatted.length > 120 ? `${formatted.slice(0, 117)}...` : formatted;
}

function describeAuditDetails(action: AuditEntry['action'], record: PortRecord, previous?: PortRecord): string {
  const changes = AUDITED_FIELDS.flatMap(([label, field]) => {
    const newValue = getAuditedValue(record, field);
    if (action === 'UPDATE' && previous) {
      const oldValue = getAuditedValue(previous, field);
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return [];
      return [`${label}: ${formatAuditedValue(oldValue)} → ${formatAuditedValue(newValue)}`];
    }
    return [`${label}: ${formatAuditedValue(action === 'DELETE' ? getAuditedValue(record, field) : newValue)}`];
  });

  if (action === 'UPDATE' && !changes.length) return 'Saved without changes to tracked fields.';
  return `${action === 'CREATE' ? 'Initial values' : action === 'UPDATE' ? 'Changed fields' : 'Previous values'}: ${changes.join('; ')}`;
}

function createAuditEntry(
  action: AuditEntry['action'],
  record: PortRecord,
  actor: AuthenticatedOperator,
  previous?: PortRecord
): AuditEntry {
  const id = push(ref(getDatabaseInstance(), 'activityLogs')).key;
  if (!id) throw new Error('Could not generate an audit log ID.');
  const siteName = getLegacySiteName(record.siteId);
  return {
    id,
    actorUid: actor.uid,
    actorEmail: actor.email || '',
    actorName: actor.name,
    action,
    siteId: record.siteId,
    siteName,
    recordId: record.id,
    summary: `${action === 'CREATE' ? 'Created' : action === 'UPDATE' ? 'Updated' : 'Deleted'} board ${record.boardNumber}, port ${record.portNumber} (${record.coreId}) at ${record.locationName}`,
    details: describeAuditDetails(action, record, previous),
    timestamp: serverTimestamp(),
  };
}

/**
 * Retrieves Firebase RTDB connection config from localStorage or environment variables
 */
export function getFirebaseConfig(): FirebaseConnectionConfig {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to parse stored Firebase config:', e);
  }

  // Fallback to Vite env variables if provided
  const envUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || '';
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
  const envAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '';

  return {
    databaseURL: envUrl,
    projectId: envProjectId,
    apiKey: envApiKey,
    authDomain: envAuthDomain || undefined,
  };
}

/**
 * Saves and re-initializes Firebase configuration
 */
export function saveFirebaseConfig(config: FirebaseConnectionConfig): boolean {
  try {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
    // Reset existing instances
    cleanupFirebaseListeners();
    appInstance = null;
    dbInstance = null;
    initFirebaseApp();
    return true;
  } catch (e) {
    console.error('Failed to save Firebase config:', e);
    return false;
  }
}

/**
 * Initializes the Firebase Realtime Database application instance
 */
export function initFirebaseApp(): { success: boolean; isConfigured: boolean; error?: string } {
  const config = getFirebaseConfig();

  if (!config.databaseURL || !config.databaseURL.trim().startsWith('https://')) {
    return { success: false, isConfigured: false, error: 'Database URL not configured or invalid' };
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      appInstance = existingApps[0];
    } else {
      appInstance = initializeApp({
        databaseURL: config.databaseURL.trim(),
        projectId: config.projectId?.trim() || 'olt-core-manager',
        apiKey: config.apiKey?.trim() || 'dummy-key',
      });
    }

    dbInstance = getDatabase(appInstance, config.databaseURL.trim());
    return { success: true, isConfigured: true };
  } catch (err: any) {
    console.warn('Firebase init error (operating in local offline mode):', err?.message);
    dbInstance = null;
    return { success: false, isConfigured: true, error: err?.message };
  }
}

/**
 * Reads the offline cache, which starts empty until Firebase records are loaded.
 */
export function getLocalRecords(): PortRecord[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading local records:', err);
  }

  return [];
}

/**
 * Persists records array into browser local storage
 */
export function saveLocalRecords(records: PortRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to persist local records:', e);
  }
}

/**
 * Subscribes to real-time records for a specific OLT site
 * Automatically falls back to local storage and updates when remote RTDB changes
 */
export function subscribeToSiteRecords(
  siteId: OltSiteId,
  onRecordsChanged: (records: PortRecord[]) => void
): () => void {
  onRecordsChanged(getLocalRecords().filter((r) => r.siteId === siteId));

  const siteName = getLegacySiteName(siteId);
  const recordsRef = ref(getDatabaseInstance(), `olts/${siteName}/configs`);
  const unsubscribe = onValue(
    recordsRef,
    (snapshot) => {
      const remoteList = normalizeLegacyRecords(siteId, snapshot.val());
      const otherSites = getLocalRecords().filter((record) => record.siteId !== siteId);
      saveLocalRecords([...otherSites, ...remoteList]);
      onRecordsChanged(remoteList);
    },
    (error) => {
      console.error(`Firebase records subscription failed for ${siteName}:`, error);
    }
  );
  activeListeners[siteId] = unsubscribe;
  return () => {
    unsubscribe();
    delete activeListeners[siteId];
  };
}

/**
 * Saves or updates a port record both locally and in Firebase RTDB
 */
export async function persistPortRecord(
  record: PortRecord,
  actor: AuthenticatedOperator
): Promise<{ success: boolean; id: string }> {
  const database = getDatabaseInstance();
  const siteName = getLegacySiteName(record.siteId);
  const all = getLocalRecords();
  const existingIdx = all.findIndex((r) => r.id === record.id);
  const action: AuditEntry['action'] = existingIdx >= 0 ? 'UPDATE' : 'CREATE';

  let updatedList: PortRecord[];
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = record;
  } else {
    updatedList = [record, ...all];
  }

  const basePath = `olts/${siteName}/configs/${record.id}`;
  const audit = createAuditEntry(action, record, actor, existingIdx >= 0 ? all[existingIdx] : undefined);
  const auditPath = `activityLogs/${audit.id}`;
  const legacyRecord = {
    board: String(record.boardNumber),
    port: String(record.portNumber),
    coreId: record.coreId,
    locationName: record.locationName,
    coordinates: `${record.coordinates.lat}, ${record.coordinates.lng}`,
    lastUpdate: record.lastUpdated,
    technicianName: actor.name,
    status: record.status,
    ponType: record.ponType,
    splitRatio: record.splitRatio,
    opticalPowerTxDbm: record.opticalPowerTxDbm ?? null,
    opticalPowerRxDbm: record.opticalPowerRxDbm ?? null,
    customerCircuitId: record.customerCircuitId ?? null,
    cableTag: record.cableTag ?? null,
    notes: record.notes ?? null,
  };
  const rootUpdates: Record<string, unknown> = { [auditPath]: audit };
  Object.entries(legacyRecord).forEach(([key, value]) => {
    rootUpdates[`${basePath}/${key}`] = value;
  });
  await update(ref(database), rootUpdates);
  saveLocalRecords(updatedList);

  return { success: true, id: record.id };
}

/**
 * Deletes a port record by ID
 */
export async function removePortRecord(
  siteId: OltSiteId,
  recordId: string,
  actor: AuthenticatedOperator
): Promise<boolean> {
  const database = getDatabaseInstance();
  const existing = getLocalRecords().find((record) => record.siteId === siteId && record.id === recordId);
  if (!existing) throw new Error('The record no longer exists. Refresh the site and try again.');
  const siteName = getLegacySiteName(siteId);
  const audit = createAuditEntry('DELETE', existing, actor);
  const all = getLocalRecords();
  const filtered = all.filter((r) => r.id !== recordId);
  await update(ref(database), {
    [`olts/${siteName}/configs/${recordId}`]: null,
    [`activityLogs/${audit.id}`]: audit,
  });
  saveLocalRecords(filtered);
  return true;
}

export async function ensureOperatorProfile(
  profile: Pick<OperatorProfile, 'uid' | 'email' | 'displayName'>,
  updateLastSeen = true
): Promise<void> {
  const database = getDatabaseInstance();
  const profileRef = ref(database, `users/${profile.uid}`);
  const snapshot = await get(profileRef);
  const existing = snapshot.exists() ? snapshot.val() as OperatorProfile : null;
  if (existing && !updateLastSeen) return;
  const now = new Date().toISOString();
  await update(profileRef, existing
    ? { email: profile.email, displayName: profile.displayName, lastSeenAt: now }
    : { ...profile, createdAt: now, lastSeenAt: now });
}

export function subscribeToOperatorProfiles(
  onChange: (profiles: OperatorProfile[]) => void,
  onError: (error: Error) => void
): () => void {
  const profilesRef = ref(getDatabaseInstance(), 'users');
  return onValue(
    profilesRef,
    (snapshot) => {
      const profiles = snapshot.exists()
        ? Object.entries(snapshot.val() as Record<string, Omit<OperatorProfile, 'uid'>>)
            .map(([uid, profile]) => ({ uid, ...profile }))
        : [];
      onChange(profiles.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    },
    onError
  );
}

export function subscribeToAuditEntries(
  onChange: (entries: AuditEntry[]) => void,
  onError: (error: Error) => void
): () => void {
  const logsRef = ref(getDatabaseInstance(), 'activityLogs');
  return onValue(
    logsRef,
    (snapshot) => {
      const entries = snapshot.exists()
        ? Object.entries(snapshot.val() as Record<string, Omit<AuditEntry, 'id'>>)
            .map(([id, entry]) => ({ id, ...entry }))
        : [];
      onChange(entries.sort((a, b) => timestampMillis(b.timestamp) - timestampMillis(a.timestamp)));
    },
    onError
  );
}

function timestampMillis(timestamp: AuditEntry['timestamp']): number {
  if (typeof timestamp === 'number') return timestamp;
  if (typeof timestamp === 'string') return Date.parse(timestamp) || 0;
  return 0;
}

/**
 * Resets local database to the default initial seed records
 */
export function resetToSeedData(): void {
  saveLocalRecords(INITIAL_PORT_RECORDS);
}

/**
 * Enqueues failed remote operations for later synchronization
 */
function queuePendingChange(change: any): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PENDING_QUEUE_KEY) || '[]';
    const queue = JSON.parse(raw);
    queue.push({ ...change, timestamp: new Date().toISOString() });
    localStorage.setItem(LOCAL_STORAGE_PENDING_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Queue error:', e);
  }
}

/**
 * Gets current sync status
 */
export function getSyncStatus(): SyncStatus {
  const config = getFirebaseConfig();
  const isConfigured = Boolean(config.databaseURL && config.databaseURL.startsWith('https://'));

  let queueCount = 0;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PENDING_QUEUE_KEY) || '[]';
    queueCount = JSON.parse(raw).length;
  } catch (e) {}

  return {
    isConnected: Boolean(dbInstance),
    isFirebaseActive: isConfigured && Boolean(dbInstance),
    isSyncing: false,
    pendingQueueCount: queueCount,
    lastSyncTime: new Date().toLocaleTimeString(),
  };
}

/**
 * Cleans up listeners
 */
export function cleanupFirebaseListeners(): void {
  Object.values(activeListeners).forEach((cleanup) => cleanup());
  activeListeners = {};
}
