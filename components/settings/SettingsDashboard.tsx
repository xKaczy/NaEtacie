'use client';

import React, { useState } from 'react';
import { User, Bell, Sliders } from 'lucide-react';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { NotificationsView } from '@/components/notifications/NotificationsView';
import { AppSettingsContent } from './AppSettingsContent';
import { cn, triggerHaptic } from '@/lib/utils';

export function SettingsDashboard() {
  const [subTab, setSubTab] = useState<'profile' | 'app' | 'notifications'>('profile');

  const handleSubTabChange = (tab: 'profile' | 'app' | 'notifications') => {
    triggerHaptic(10);
    setSubTab(tab);
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Tab Selectors */}
      <div className="sticky top-12 md:top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60 py-3 px-4">
        <div className="max-w-md mx-auto flex bg-accent/40 p-1 rounded-xl border border-border/40 gap-1">
          <button
            onClick={() => handleSubTabChange('profile')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer',
              subTab === 'profile'
                ? 'bg-card text-primary shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profil</span>
          </button>
          <button
            onClick={() => handleSubTabChange('app')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer',
              subTab === 'app'
                ? 'bg-card text-primary shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Aplikacja & Mapa</span>
          </button>
          <button
            onClick={() => handleSubTabChange('notifications')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer',
              subTab === 'notifications'
                ? 'bg-card text-primary shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerty</span>
          </button>
        </div>
      </div>

      {/* Render Sub Views */}
      <div className="mt-4">
        {subTab === 'profile' && <ProfileSettings />}
        {subTab === 'app' && <AppSettingsContent />}
        {subTab === 'notifications' && <NotificationsView />}
      </div>
    </div>
  );
}
