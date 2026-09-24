import React, { useMemo, useState } from 'react';
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  Store,
  X,
  Loader2,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  AlertTriangle
} from 'lucide-react';
import {
  useLojas,
  useSalvarLoja,
  useExcluirLoja,
  useResetarLoja
} from '../hooks/useAuditData';
import { LojaInputSchema } from '../../shared/schemas';
import { REDES_PDV, STATUS_LOJA } from '../../shared/constants';
import { Loja } from '../../shared/types';
import { inputClass } from '../components/ChecklistControls';

const card = 'bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm';

interface FormState {
  id?: string;
  rede: string;
  nome: string;
  endereco: string;
  estacaoMetro: string;
  cnpj: string;
}

const formVazio = (): FormState => ({
  rede: REDES_PDV[0],
  nome: '',
  endereco: '',
  estacaoMetro: '',
  cnpj: ''
});

function formatarCnpjInput(valor: string) {
  const digits = valor.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

const EditorLoja: React.FC<{
  inicial: FormState;
  onFechar: () => void;
}> = ({ inicial, onFechar }) => {
  const [form, setForm] = useState<FormState>(inicial);
  const [redePersonalizada, setRedePersonalizada] = useState<boolean>(
    !REDES_PDV.includes(inicial.rede as any) && inicial.rede !== ''
  );
  const [erros, setErros] = useState<string[]>([]);
  const salvar = useSalvarLoja();
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...dados } = form;
    const validacao = LojaInputSchema.safeParse({
      ...dados,
      estacaoMetro: dados.estacaoMetro.trim() || null,
      cnpj: dados.cnpj.trim() || null
    });

    if (!validacao.success) {
      setErros([...new Set(validacao.error.issues.map((i) => i.message))]);
      return;
    }
    setErros([]);
    try {
      await salvar.mutateAsync({ id, dados: validacao.data });
      onFechar();
    } catch (err) {
      setErros([err instanceof Error ? err.message : 'Não foi possível salvar a loja']);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={enviar}
        className="bg-white dark:bg-[#131B2B] w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-xl border border-slate-200/80 dark:border-slate-800"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Store className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              {form.id ? 'Editar Loja' : 'Nova Loja'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Rede */}
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 font-medium mb-1.5">
              Rede / Franquia
            </label>
            {!redePersonalizada ? (
              <div className="space-y-2">
                <select
                  value={form.rede}
                  onChange={(e) => {
                    if (e.target.value === '__OUTRA__') {
                      setRedePersonalizada(true);
                      set('rede', '');
                    } else {
                      set('rede', e.target.value);
                    }
                  }}
                  className={inputClass}
                >
                  {REDES_PDV.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="__OUTRA__">+ Outra Rede...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da nova rede"
                  value={form.rede}
                  onChange={(e) => set('rede', e.target.value)}
                  className={inputClass}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setRedePersonalizada(false);
                    set('rede', REDES_PDV[0]);
                  }}
                  className="px-3 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Nome da Loja */}
          <label className="block">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
              Nome da Loja
            </span>
            <input
              type="text"
              placeholder="Ex: Monster Dog - Estação Sé"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              className={inputClass}
            />
          </label>

          {/* Estação de Metrô / Trem (Opcional) */}
          <label className="block">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
              Estação de Metrô / Trem <span className="text-slate-400 font-normal">(opcional)</span>
            </span>
            <input
              type="text"
              placeholder="Ex: Sé, Paulista, Tatuapé"
              value={form.estacaoMetro}
              onChange={(e) => set('estacaoMetro', e.target.value)}
              className={inputClass}
            />
          </label>

          {/* Endereço Completo */}
          <label className="block">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
              Endereço Completo
            </span>
            <input
              type="text"
              placeholder="Ex: Mezanino da Estação de Metrô Sé, Linha 1-Azul, São Paulo - SP"
              value={form.endereco}
              onChange={(e) => set('endereco', e.target.value)}
              className={inputClass}
            />
          </label>

          {/* CNPJ */}
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                CNPJ <span className="text-slate-400 font-normal">(14 dígitos, opcional)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Deixe em branco se não informado
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              value={form.cnpj}
              onChange={(e) => set('cnpj', formatarCnpjInput(e.target.value))}
              className={`${inputClass} font-mono`}
            />
          </label>
        </div>

        {erros.length > 0 && (
          <ul className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-3 list-disc pl-6 space-y-0.5">
            {erros.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onFechar}
            className="flex-1 h-11 rounded-full border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvar.isPending}
            className="flex-1 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition"
          >
            {salvar.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {form.id ? 'Salvar Alterações' : 'Cadastrar Loja'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const GestaoLojas: React.FC<{
  onSelectAuditLoja?: (lojaId: string) => void;
}> = ({ onSelectAuditLoja }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedRede, setSelectedRede] = useState<string>('TODAS');
  const [busca, setBusca] = useState<string>('');
  const [editando, setEditando] = useState<FormState | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const { data: lojas = [], isLoading, isError, refetch } = useLojas({
    status: selectedStatus,
    rede: selectedRede,
    search: busca
  });

  const excluir = useExcluirLoja();
  const resetar = useResetarLoja();

  const redesDisponiveis = useMemo(() => {
    const redes = new Set<string>(REDES_PDV);
    lojas.forEach((l) => redes.add(l.rede));
    return Array.from(redes);
  }, [lojas]);

  const abrirEdicao = (l: Loja) => {
    setEditando({
      id: l.id,
      rede: l.rede,
      nome: l.nome,
      endereco: l.endereco,
      estacaoMetro: l.estacaoMetro || '',
      cnpj: l.cnpj.startsWith('99') ? '' : l.cnpjFormatado || l.cnpj
    });
  };

  const confirmarExclusao = async (l: Loja) => {
    const isAuditada = l.status !== STATUS_LOJA.PENDENTE;
    const msg = isAuditada
      ? `ATENÇÃO: A loja "${l.nome}" já foi auditada!\n\nExcluir esta loja apagará definitivamente o registro da auditoria e suas fotos vinculadas.\n\nDeseja realmente excluir?`
      : `Deseja realmente excluir a loja "${l.nome}"?`;

    if (!window.confirm(msg)) return;

    try {
      await excluir.mutateAsync(l.id);
      setAviso({ tipo: 'sucesso', texto: `Loja "${l.nome}" excluída com sucesso.` });
      refetch();
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Não foi possível excluir a loja'
      });
    }
  };

  const handleResetarAuditoria = async (l: Loja) => {
    if (
      !window.confirm(
        `Resetar auditoria de "${l.nome}"?\n\nOs dados e fotos da auditoria serão removidos e a loja voltará para status PENDENTE.`
      )
    ) {
      return;
    }

    try {
      await resetar.mutateAsync(l.id);
      setAviso({ tipo: 'sucesso', texto: `Auditoria de "${l.nome}" resetada para PENDENTE com sucesso!` });
      refetch();
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Não foi possível resetar a auditoria'
      });
    }
  };

  return (
    <div className="space-y-4 font-roboto">
      {/* Top Banner / Ações */}
      <div className={`${card} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Gestão de Lojas (PDVs)</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cadastre novas lojas, altere informações ou remova pontos da base de pesquisa.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditando(formVazio())}
          className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full flex items-center justify-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Nova Loja
        </button>
      </div>

      {/* Alertas */}
      {aviso && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 border ${
            aviso.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
          }`}
        >
          <span>{aviso.texto}</span>
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Fechar aviso"
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className={`${card} overflow-hidden`}>
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F19]/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex items-center flex-1 w-full md:max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Buscar por Loja, Estação, CNPJ ou Endereço..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
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
              {redesDisponiveis.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
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

        {/* Tabela de Gerenciamento de Lojas */}
        <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0B0F19] text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5 min-w-[220px]">Loja / Localização</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Rede</th>
                <th className="px-4 py-3.5 whitespace-nowrap">CNPJ</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Auditoria</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#131B2B]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Carregando lojas...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-rose-500">
                    Não foi possível carregar as lojas.
                  </td>
                </tr>
              ) : lojas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
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
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100 min-w-[220px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 break-words">
                          {loja.nome}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-start gap-1 mt-0.5 break-words">
                          <MapPin className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                          <span>{loja.endereco}</span>
                        </div>
                        {loja.estacaoMetro && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                            Estação: {loja.estacaoMetro}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
                          {loja.rede}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {loja.cnpjFormatado}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">{badgeStatus}</td>

                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">
                        {isAuditada ? (
                          <div>
                            <span className="font-semibold">{loja.pesquisadorNome || 'Pesquisador'}</span>
                            <div className="text-slate-400 text-[10px]">
                              {loja.auditadaEm
                                ? new Date(loja.auditadaEm).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não auditada</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAuditada && onSelectAuditLoja && (
                            <button
                              type="button"
                              onClick={() => onSelectAuditLoja(loja.id)}
                              className="h-8 px-2.5 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/50 font-semibold text-[11px] flex items-center gap-1 transition"
                              title="Ver auditoria e fotos"
                            >
                              <Eye className="w-3 h-3" /> Ver
                            </button>
                          )}

                          {isAuditada && (
                            <button
                              type="button"
                              onClick={() => handleResetarAuditoria(loja)}
                              disabled={resetar.isPending}
                              className="h-8 w-8 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-center transition"
                              title="Resetar auditoria para Pendente"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => abrirEdicao(loja)}
                            className="h-8 px-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                            title="Editar dados da loja"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => confirmarExclusao(loja)}
                            disabled={excluir.isPending}
                            className="h-8 px-2.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 text-xs font-semibold flex items-center gap-1 transition"
                            title="Excluir loja"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editando && <EditorLoja inicial={editando} onFechar={() => setEditando(null)} />}
    </div>
  );
};
