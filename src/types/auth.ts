export interface AuthenticatedOperator {
  uid: string;
  name: string;
  email: string | null;
  role: 'admin' | 'operator';
}

export interface OperatorProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface AuditEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  siteId: string;
  siteName: string;
  recordId: string;
  summary: string;
  timestamp: number | string | object;
}
