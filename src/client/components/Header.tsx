import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/researcherStore';
import { Wifi, WifiOff, User, BarChart3, Smartphone, Building2 } from 'lucide-react';

export const Header: React.FC = () => {
  const { pesquisadorNome, activeTab, setActiveTab } = useAppStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    // Android Material 3 Top App Bar (Paleta Coesa e Agradável)
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#131B2B]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 transition-colors">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        
        {/* Android App Title & Brand Icon */}
        <div className="flex items-center space-x-2.5">
          <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-1.5 font-roboto">
              PDV Conexão <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/50 dark:border-blue-700/50 uppercase tracking-wider">RMSP</span>
            </h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-normal">Cliente Oculto • 57 Lojas</p>
          </div>
        </div>

        {/* Status Online/Offline + Pesquisador + Segmented Buttons */}
        <div className="flex items-center gap-2">
          {/* M3 Assist Chip: Status de Conexão */}
          <div
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 animate-pulse'
            }`}
            title={isOnline ? 'Conectado à Internet' : 'Sem conexão - Modo Offline'}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Nome do Pesquisador Ativo */}
          {pesquisadorNome && activeTab === 'researcher' && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 font-medium">
              <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="truncate max-w-[130px]">{pesquisadorNome}</span>
            </div>
          )}

          {/* Android M3 Segmented Buttons Pill Switch */}
          <div className="bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-full border border-slate-200 dark:border-slate-800 flex items-center shadow-inner">
            <button
              onClick={() => setActiveTab('researcher')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all touch-manipulation ${
                activeTab === 'researcher'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pesquisador</span>
            </button>
            <button
              onClick={() => setActiveTab('coordinator')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all touch-manipulation ${
                activeTab === 'coordinator'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Coordenador</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
