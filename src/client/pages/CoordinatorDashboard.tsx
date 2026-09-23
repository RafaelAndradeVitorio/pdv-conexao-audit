import React, { useState } from 'react';
import { useDashboard, useLojas } from '../hooks/useAuditData';
import {
  FileSpreadsheet,
  FolderArchive,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Users,
  RefreshCw,
  HardDrive,
  ExternalLink,
  Eye,
  LogOut
} from 'lucide-react';
import { REDES_PDV, STATUS_LOJA } from '../../shared/constants';
import { AuditDetailModal } from '../components/AuditDetailModal';
import { ResultadosLevantamento } from './ResultadosLevantamento';
import { GestaoPesquisadores } from './GestaoPesquisadores';
import { fetchCoord } from '../utils/coordApi';

export const CoordinatorDashboard: React.FC<{ onSair?: () => void }> = ({ onSair }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedRede, setSelectedRede] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLojaId, setSelectedLojaId] = useState<string | null>(null);
  const [aba, setAba] = useState<'acompanhamento' | 'resultados' | 'pesquisadores'>('acompanhamento');

  const { data: dashboard, refetch: refetchDash } = useDashboard();
  const { data: lojas, isLoading: isLoadingLojas, refetch: refetchLojas } = useLojas({
    status: selectedStatus,
    rede: selectedRede,
    search: searchTerm
  });

  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const handleRefresh = () => {
    refetchDash();
    refetchLojas();
  };

  const handleDownloadCsv = () => {
    window.open('/api/export/csv', '_blank');
  };

  const handleDownloadZip = () => {
    window.open('/api/export/zip', '_blank');
  };

  const handleSyncDrive = async () => {
    try {
      setIsSyncingDrive(true);
      const res = await fetchCoord('/api/drive/sync', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Sincronização com o Google Drive iniciada!');
      refetchDash();
      refetchLojas();
    } catch (err: any) {
      alert(`Erro ao sincronizar com Google Drive: ${err.message || 'Falha de conexão'}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const total = dashboard?.totalLojas || 57;
  const concluidas = (dashboard?.totalConcluidas || 0) + (dashboard?.totalInoperantes || 0);
  const percentual = dashboard?.percentualConcluido || Math.round((concluidas / total) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 font-roboto">
      {/* Header do Painel com Ações de Exportação (Paleta Coesa e Agradável) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Monitoramento em Tempo Real
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            Painel do Coordenador de Campo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            57 PDVs da Região Metropolitana de São Paulo • 10 Pesquisadores Ativos
          </p>
        </div>

        {/* Botões de Ação e Exportação */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleRefresh}
            className="h-10 w-10 sm:h-11 sm:w-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center transition shadow-sm shrink-0"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex-1 sm:flex-initial h-10 sm:h-11 flex items-center justify-center gap-2 px-3.5 sm:px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-full shadow-sm transition touch-manipulation whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span><span className="hidden sm:inline">Exportar </span>Relatório CSV</span>
          </button>

          <button
            onClick={handleDownloadZip}
            className="flex-1 sm:flex-initial h-10 sm:h-11 flex items-center justify-center gap-2 px-3.5 sm:px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-full shadow-sm transition touch-manipulation whitespace-nowrap"
          >
            <FolderArchive className="w-4 h-4 shrink-0" />
            <span><span className="hidden sm:inline">Download </span>ZIP Fotos</span>
          </button>

          <button
            type="button"
            onClick={handleSyncDrive}
            disabled={isSyncingDrive}
            className="flex-1 sm:flex-initial h-10 sm:h-11 flex items-center justify-center gap-2 px-3.5 sm:px-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-semibold rounded-full shadow-sm transition touch-manipulation whitespace-nowrap disabled:opacity-50"
            title="Sincronizar fotos pendentes com o Google Drive"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>{isSyncingDrive ? 'Sincronizando...' : 'Sincronizar Drive'}</span>
          </button>

          <a
            href="https://drive.google.com/drive/folders/11ax5g10dzEhEql3fGS3i-uxwz6vduKvj"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex-1 sm:flex-initial h-10 sm:h-11 flex items-center justify-center gap-2 px-3.5 sm:px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-full shadow-sm transition touch-manipulation whitespace-nowrap"
            title="Abrir pasta de fotos organizadas no Google Drive"
          >
            <HardDrive className="w-4 h-4 shrink-0" />
            <span>Abrir Drive</span>
            <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
          </a>

          {onSair && (
            <button
              type="button"
              onClick={onSair}
              className="h-10 sm:h-11 px-3.5 sm:px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-full transition flex items-center gap-1.5 whitespace-nowrap"
              title="Encerrar a sessão do coordenador neste aparelho"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" /> Sair
            </button>
          )}
        </div>
      </div>

      {/* Abas: acompanhamento da operação x resultados do levantamento (Guia §13) */}
      <div role="tablist" className="inline-flex p-1 bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-full">
        {(
          [
            ['acompanhamento', 'Acompanhamento'],
            ['resultados', 'Resultados'],
            ['pesquisadores', 'Pesquisadores']
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`h-9 px-4 sm:px-5 rounded-full text-xs font-semibold transition ${
              aba === id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'resultados' ? (
        <ResultadosLevantamento onSelectLoja={setSelectedLojaId} />
      ) : aba === 'pesquisadores' ? (
        <GestaoPesquisadores />
      ) : (
      <>
      {/* 1. Barra de Progresso e Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card Progresso Geral */}
        <div className="md:col-span-2 bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Progresso Geral da Operação
              </span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">{percentual}%</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{concluidas}</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">de {total} lojas visitadas</span>
            </div>

            {/* M3 Linear Progress Indicator */}
            <div className="w-full bg-slate-100 dark:bg-[#0B0F19] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(percentual, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-semibold">Operantes</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {dashboard?.totalConcluidas || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-semibold">Inoperantes</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                {dashboard?.totalInoperantes || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-semibold">Pendentes</span>
              <span className="text-base font-bold text-slate-600 dark:text-slate-300">
                {dashboard?.totalPendentes ?? (total - concluidas)}
              </span>
            </div>
          </div>
        </div>

        {/* Card Desempenho por Rede */}
        <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-3">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Por Rede</span>
          </div>

          <div className="space-y-3">
            {REDES_PDV.map((rede) => {
              const dados = dashboard?.porRede?.[rede] || { total: 0, concluidas: 0, inoperantes: 0, pendentes: 0 };
              const visitadas = dados.concluidas + dados.inoperantes;
              const perc = dados.total > 0 ? Math.round((visitadas / dados.total) * 100) : 0;

              return (
                <div key={rede} className="text-xs">
                  <div className="flex justify-between text-slate-800 dark:text-slate-200 font-medium mb-1">
                    <span>{rede}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      {visitadas}/{dados.total} ({perc}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#0B0F19] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${perc}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Produtividade dos Pesquisadores */}
        <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-3">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Equipe em Campo</span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {dashboard?.porPesquisador && Object.keys(dashboard.porPesquisador).length > 0 ? (
              Object.entries(dashboard.porPesquisador).map(([nome, qtd]) => (
                <div
                  key={nome}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800"
                >
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-[130px] font-medium">{nome}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 font-mono font-bold text-[11px]">
                    {qtd} audits
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Aguardando primeiros envios dos pesquisadores...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Tabela de Monitoramento com Filtros */}
      <div className="bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F19]/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex items-center flex-1 w-full md:max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Buscar por Loja, Estação, CNPJ ou Pesquisador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 bg-white dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 focus:border-blue-600 rounded-full pl-10 pr-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none shadow-sm transition"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            {/* Filtro Rede */}
            <select
              value={selectedRede}
              onChange={(e) => setSelectedRede(e.target.value)}
              className="w-full sm:w-auto h-11 bg-white dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-full px-4 text-xs text-slate-800 dark:text-slate-200 font-medium shadow-sm outline-none cursor-pointer"
            >
              <option value="TODAS">Todas as Redes</option>
              {REDES_PDV.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Filtro Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto h-11 bg-white dark:bg-[#0B0F19] border border-slate-300 dark:border-slate-700 rounded-full px-4 text-xs text-slate-800 dark:text-slate-200 font-medium shadow-sm outline-none cursor-pointer"
            >
              <option value="TODOS">Todos os Status</option>
              <option value={STATUS_LOJA.PENDENTE}>Pendente</option>
              <option value={STATUS_LOJA.CONCLUIDA}>Concluída (Aberta)</option>
              <option value={STATUS_LOJA.FINALIZADA_INOPERANTE}>Finalizada Inoperante</option>
            </select>
          </div>
        </div>

        {/* Dica de Ação para o Usuário */}
        <div className="px-4 sm:px-5 py-2.5 bg-blue-50/60 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center justify-between text-[11px] text-blue-900 dark:text-blue-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="leading-tight">
              <strong>Dica de Auditoria:</strong> Clique na linha de qualquer loja concluída para abrir o relatório completo com o preview comprimido das fotos.
            </span>
          </div>
        </div>

        {/* Tabela de Lojas */}
        <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0B0F19] text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5 min-w-[200px]">Loja / Estação</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Rede</th>
                <th className="px-4 py-3.5 whitespace-nowrap">CNPJ</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Auditada Por</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Horário</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Ação / Fotos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#131B2B]">
              {isLoadingLojas ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Carregando dados das 57 lojas...
                  </td>
                </tr>
              ) : !lojas || lojas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma loja encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                lojas.map((loja) => {
                  const isAuditada = loja.status !== STATUS_LOJA.PENDENTE;
                  let badgeStatus = null;
                  if (loja.status === STATUS_LOJA.CONCLUIDA) {
                    badgeStatus = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluída
                      </span>
                    );
                  } else if (loja.status === STATUS_LOJA.FINALIZADA_INOPERANTE) {
                    badgeStatus = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200/80 dark:border-amber-800/40">
                        <XCircle className="w-3.5 h-3.5" /> Inoperante
                      </span>
                    );
                  } else {
                    badgeStatus = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <Clock className="w-3.5 h-3.5" /> Pendente
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={loja.id}
                      onClick={() => {
                        if (isAuditada) {
                          setSelectedLojaId(loja.id);
                        }
                      }}
                      className={`transition ${
                        isAuditada
                          ? 'cursor-pointer hover:bg-blue-50/70 dark:hover:bg-blue-950/30 group'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40 opacity-75'
                      }`}
                      title={isAuditada ? 'Clique para ver as fotos e informações preenchidas' : 'Auditoria ainda pendente'}
                    >
                      <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100 min-w-[200px]">
                        <div className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition break-words">
                          {loja.nome}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal break-words">
                          {loja.estacaoMetro ? `Estação ${loja.estacaoMetro}` : loja.endereco}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{loja.rede}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {loja.cnpjFormatado}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{badgeStatus}</td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        {loja.pesquisadorNome || '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {loja.auditadaEm
                          ? new Date(loja.auditadaEm).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isAuditada ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLojaId(loja.id);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/50 font-semibold text-[11px] group-hover:bg-blue-600 group-hover:text-white transition shadow-2xs"
                          >
                            <Eye className="w-3 h-3" /> Ver Fotos
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Aguardando</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      </>
      )}

      {/* Modal de Detalhes da Auditoria com Previews Comprimidos */}
      <AuditDetailModal
        lojaId={selectedLojaId}
        onClose={() => setSelectedLojaId(null)}
      />
    </div>
  );
};
