import React from 'react';
import { useAppStore } from './stores/researcherStore';
import { Header } from './components/Header';
import { ResearcherFlow } from './pages/ResearcherFlow';
import { CoordinatorDashboard } from './pages/CoordinatorDashboard';

export const App: React.FC = () => {
  const { activeTab } = useAppStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden w-full">
      <Header />

      <main className="flex-1 pb-10 w-full overflow-x-hidden">
        {activeTab === 'researcher' ? (
          <ResearcherFlow />
        ) : (
          <CoordinatorDashboard />
        )}
      </main>

      <footer className="border-t border-slate-900 py-3 px-4 text-center text-[11px] text-slate-500 break-words">
        PDV Conexão • Operação de Auditoria de Campo (Cliente Oculto RMSP) • 57 Lojas
      </footer>
    </div>
  );
};
