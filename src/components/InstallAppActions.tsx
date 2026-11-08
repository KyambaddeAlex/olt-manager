import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallAppActions: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);

    window.addEventListener('beforeinstallprompt', handleInstallAvailable);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (Capacitor.isNativePlatform()) return null;

  const handleInstall = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch (error) {
      console.error('Could not open the app installation prompt:', error);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-2">
      {installPrompt && (
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-slate-900 px-3 py-2 text-xs font-semibold text-cyan-200 shadow-lg hover:bg-slate-800"
        >
          <Smartphone className="h-4 w-4" />
          Install app
        </button>
      )}
      <a
        href={`${import.meta.env.BASE_URL}downloads/OLT-Core-Manager.apk`}
        download="OLT-Core-Manager.apk"
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg hover:border-cyan-400/50 hover:text-cyan-200"
        aria-label="Download OLT Core Manager for Android"
      >
        <Download className="h-4 w-4" />
        Android app
      </a>
    </div>
  );
};
