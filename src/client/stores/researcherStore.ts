import { create } from 'zustand';

interface AppState {
  pesquisadorId: string;
  pesquisadorNome: string;
  activeTab: 'researcher' | 'coordinator';
  setPesquisador: (id: string, nome: string) => void;
  setActiveTab: (tab: 'researcher' | 'coordinator') => void;
}

export const useAppStore = create<AppState>((set) => ({
  pesquisadorId: localStorage.getItem('pdv_active_pesquisador_id') || '',
  pesquisadorNome: localStorage.getItem('pdv_active_pesquisador_nome') || '',
  activeTab: (localStorage.getItem('pdv_active_tab') as 'researcher' | 'coordinator') || 'researcher',
  
  setPesquisador: (id: string, nome: string) => {
    localStorage.setItem('pdv_active_pesquisador_id', id);
    localStorage.setItem('pdv_active_pesquisador_nome', nome);
    set({ pesquisadorId: id, pesquisadorNome: nome });
  },

  setActiveTab: (tab: 'researcher' | 'coordinator') => {
    localStorage.setItem('pdv_active_tab', tab);
    set({ activeTab: tab });
  }
}));
