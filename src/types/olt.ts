export type OltSiteId =
  | 'kisugu'
  | 'kitintale'
  | 'kiruddu'
  | 'lubowa'
  | 'dundu'
  | 'namirembe'
  | 'kiwatule'
  | 'kimbeja1'
  | 'kalinabiri'
  | 'nalukolongo'
  | 'imperial'
  | 'bmk_wampewo'
  | 'raxio'
  | 'magwa'
  | 'hoima'
  | 'mbarara'
  | 'kimbeja2';

export interface OltSite {
  id: OltSiteId;
  name: string;
  code: string;
  region: 'Kampala Metro' | 'Entebbe Corridor' | 'Central East' | 'Western Region' | 'Eastern Region';
  description: string;
  baseCoordinates: {
    lat: number;
    lng: number;
  };
  totalBoards: number; // 8 boards (1 to 8)
  portsPerBoard: number; // 16 ports (0 to 15)
  totalPorts: number; // 128 ports total
  status: 'ONLINE' | 'STANDBY' | 'MAINTENANCE';
  rackModel: string;
  ipSubnet: string;
  upstreamBackbone: string;
}

export type PortStatus = 'ACTIVE' | 'SPARE' | 'RESERVED' | 'FAULT' | 'TESTING';
export type PonStandard = 'GPON' | 'XGS-PON' | 'COMBO-PON' | 'EPON';

export interface PortRecordHistoryEntry {
  timestamp: string;
  action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGE' | 'MEASUREMENT_LOGGED';
  operator: string;
  details: string;
}

export interface PortRecord {
  id: string; // unique ID or `${siteId}_b${board}_p${port}`
  siteId: OltSiteId;
  boardNumber: number; // 1 to 8
  portNumber: number; // 0 to 15
  coreId: string; // e.g. "Core 12", "C-24"
  coreNumber?: number; // 1 to 144
  locationName: string; // e.g. "FAT-04 / Kansanga Market Junction"
  coordinates: {
    lat: number;
    lng: number;
    accuracyMeters?: number;
    source?: 'GPS' | 'MANUAL' | 'DEFAULT';
  };
  status: PortStatus;
  ponType: PonStandard;
  splitRatio: string; // e.g. "1:32", "1:64", "1:16", "None"
  opticalPowerTxDbm?: number; // e.g. +3.5 dBm
  opticalPowerRxDbm?: number; // e.g. -19.4 dBm
  customerCircuitId?: string; // e.g. "GPON-KIS-4029"
  cableTag?: string; // e.g. "OFC-48F-KIS-FAT04"
  technicianName?: string; // e.g. "Eng. Alex K."
  notes?: string;
  lastUpdated: string; // ISO string
  history?: PortRecordHistoryEntry[];
}

export interface OltValidationErrors {
  boardNumber?: string;
  portNumber?: string;
  coreId?: string;
  locationName?: string;
  lat?: string;
  lng?: string;
  opticalPowerRxDbm?: string;
  opticalPowerTxDbm?: string;
  general?: string;
}

export interface SiteStatistics {
  totalConfigured: number;
  totalActive: number;
  totalSpare: number;
  totalFault: number;
  totalReserved: number;
  utilizationPercent: number;
  avgRxPowerDbm?: number;
}

export interface FirebaseConnectionConfig {
  databaseURL: string;
  projectId?: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface SyncStatus {
  isConnected: boolean;
  isFirebaseActive: boolean;
  isSyncing: boolean;
  lastSyncTime?: string;
  pendingQueueCount: number;
  error?: string | null;
}
