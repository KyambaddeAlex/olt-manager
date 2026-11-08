import React, { useState, useEffect, useCallback } from 'react';
import { OltSite, PortRecord, OltSiteId } from './types/olt';
import { OLT_SITES } from './data/oltSites';
import {
  getLocalRecords,
  persistPortRecord,
  removePortRecord,
  getSyncStatus,
  subscribeToSiteRecords,
} from './services/firebaseRtdb';
import { observeFirebaseAuth, signOutFirebase } from './services/firebaseAuth';
import { BrandedLoadingScreen } from './components/BrandedLoadingScreen';
import { AccessCodeLogin } from './components/AccessCodeLogin';
import { NavigationBar } from './components/NavigationBar';
import { OltDashboard } from './components/OltDashboard';
import { SiteDetailsView } from './components/SiteDetailsView';
import { FirebaseSettingsModal } from './components/FirebaseSettingsModal';
import { AdminUsersModal } from './components/AdminUsersModal';
import { AuthenticatedOperator } from './types/auth';

type AppViewState = 'BOOTING' | 'LOCKED' | 'DASHBOARD' | 'SITE_DETAILS';

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialSiteParam = searchParams.get('site');
  const [viewState, setViewState] = useState<AppViewState>('BOOTING');
  const [operator, setOperator] = useState<AuthenticatedOperator | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [hasBooted, setHasBooted] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const isAdmin = operator?.role === 'admin';

  const [selectedSite, setSelectedSite] = useState<OltSite | null>(() => {
    if (initialSiteParam) {
      const match = OLT_SITES.find(
        (s) => s.id === initialSiteParam.toLowerCase() || s.code.toLowerCase() === initialSiteParam.toLowerCase()
      );
      if (match) return match;
    }
    return null;
  });

  const [allRecords, setAllRecords] = useState<PortRecord[]>(() => getLocalRecords());
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    return observeFirebaseAuth(
      (signedInOperator) => {
        setOperator(signedInOperator);
        setIsAuthenticated(Boolean(signedInOperator));
        setAuthError('');
        setIsAuthReady(true);
      },
      (error) => {
        setAuthError(error.message);
        setIsAuthenticated(false);
        setIsAuthReady(true);
      }
    );
  }, []);

  useEffect(() => {
    if (!hasBooted || !isAuthReady) return;
    setViewState(isAuthenticated ? (selectedSite ? 'SITE_DETAILS' : 'DASHBOARD') : 'LOCKED');
  }, [hasBooted, isAuthReady, isAuthenticated, selectedSite]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = OLT_SITES.map((site) =>
      subscribeToSiteRecords(site.id, () => setAllRecords(getLocalRecords()))
    );
    return () => unsubscribe.forEach((stop) => stop());
  }, [isAuthenticated]);

  // Check sync status on load and intervals
  const refreshSyncStatus = useCallback(() => {
    const status = getSyncStatus();
    setIsFirebaseConnected(status.isFirebaseActive && status.isConnected);
    setAllRecords(getLocalRecords());
  }, []);

  useEffect(() => {
    refreshSyncStatus();
    const interval = setInterval(refreshSyncStatus, 15000);
    return () => clearInterval(interval);
  }, [refreshSyncStatus]);

  // Handle Boot sequence completion
  const handleBootComplete = useCallback(() => setHasBooted(true), []);

  // Handle Login
  const handleLoginSuccess = (op: AuthenticatedOperator) => {
    setOperator(op);
    setIsAuthenticated(true);
    setAuthError('');
    setAuthNotice('');
    if (selectedSite) {
      setViewState('SITE_DETAILS');
    } else {
      setViewState('DASHBOARD');
    }
  };

  // Handle Lock / Logout
  const handleLockLogout = async () => {
    try {
      await signOutFirebase();
      setViewState('LOCKED');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign out of Firebase.');
    }
  };

  // Select Site to view details
  const handleSelectSite = (site: OltSite) => {
    setSelectedSite(site);
    setViewState('SITE_DETAILS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate back to Dashboard
  const handleNavigateDashboard = () => {
    setSelectedSite(null);
    setViewState('DASHBOARD');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save Port Record
  const handleSaveRecord = async (record: PortRecord) => {
    if (!isAuthenticated || !operator) throw new Error('Sign in with a verified account before changing port records.');
    await persistPortRecord(record, operator);
    setAllRecords(getLocalRecords());
  };

  // Delete Port Record
  const handleDeleteRecord = async (recordId: string) => {
    if (!isAuthenticated || !operator) throw new Error('Sign in with a verified account before deleting port records.');
    if (!selectedSite) return;
    await removePortRecord(selectedSite.id, recordId, operator);
    setAllRecords(getLocalRecords());
  };

  // Filter records for selected site
  const currentSiteRecords = selectedSite
    ? allRecords.filter((r) => r.siteId === selectedSite.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans selection:bg-cyan-500 selection:text-black flex flex-col justify-between">
      {/* 1. Loading Screen */}
      {viewState === 'BOOTING' && (
        <BrandedLoadingScreen onComplete={handleBootComplete} />
      )}
      {isAdminPanelOpen && isAdmin && (
        <AdminUsersModal onClose={() => setIsAdminPanelOpen(false)} />
      )}

      {/* 2. Access Code Login Screen */}
      {viewState === 'LOCKED' && (
        <AccessCodeLogin
          onLoginSuccess={handleLoginSuccess}
          initialError={authError}
          notice={authNotice}
          onRegistrationComplete={setAuthNotice}
        />
      )}

      {/* 3. Main Authenticated Application Area */}
      {(viewState === 'DASHBOARD' || viewState === 'SITE_DETAILS') && (
        <>
          {authError && (
            <div role="alert" className="bg-rose-950 text-rose-200 border-b border-rose-500/40 px-4 py-2 text-sm text-center">
              {authError}
            </div>
          )}
          {/* Top Sticky Navigation */}
          <NavigationBar
            currentSite={selectedSite}
            onNavigateDashboard={handleNavigateDashboard}
            onLockLogout={handleLockLogout}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isFirebaseConnected={isFirebaseConnected}
            operator={operator ?? { name: 'Field Operator', role: 'operator' }}
            totalRecordsCount={allRecords.length}
            isAdmin={Boolean(isAdmin)}
            onOpenAdmin={() => setIsAdminPanelOpen(true)}
          />

          {/* Main Views */}
          <main className="flex-1 pb-12">
            {viewState === 'DASHBOARD' && (
              <OltDashboard
                sites={OLT_SITES}
                allRecords={allRecords}
                onSelectSite={handleSelectSite}
              />
            )}

            {viewState === 'SITE_DETAILS' && selectedSite && (
              <SiteDetailsView
                site={selectedSite}
                records={currentSiteRecords}
                onNavigateBack={handleNavigateDashboard}
                onSaveRecord={handleSaveRecord}
                onDeleteRecord={handleDeleteRecord}
                operatorName={operator?.name ?? 'Field Operator'}
                canEdit={isAuthenticated}
              />
            )}
          </main>

          {/* Telecom Operational Footer */}
          <footer className="border-t border-slate-900 bg-slate-950/90 py-4 px-6 text-center text-[11px] font-mono text-slate-400">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-semibold">OLT Core Manager</span>
                <span>•</span>
                <span>17 Regional Hubs (Kisugu, Kitintale, Raxio, Hoima, Mbarara...)</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>ITU-T G.984 / TIA-598-C</span>
                <span>•</span>
                <span className="text-cyan-400 font-mono">
                  {isFirebaseConnected ? 'Firebase RTDB Sync: Active' : 'Local Storage Mode'}
                </span>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Firebase & Storage Settings Modal */}
      {isSettingsOpen && (
        <FirebaseSettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onConfigChanged={refreshSyncStatus}
        />
      )}
    </div>
  );
}
