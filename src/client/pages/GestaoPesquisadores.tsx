import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, UserPlus, Users, X, Loader2 } from 'lucide-react';
import {
  useExcluirPesquisador,
  useLojas,
  usePesquisadoresAdmin,
  useSalvarPesquisador
} from '../hooks/useAuditData';
import { PesquisadorInputSchema } from '../../shared/schemas';
import { REDES_PDV, STATUS_LOJA } from '../../shared/constants';
import { Loja, PesquisadorAdmin } from '../../shared/types';
import { inputClass } from '../components/ChecklistControls';

const card = 'bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm';

interface FormState {
  id?: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  todasLojas: boolean;
  lojaIds: string[];
}

const formVazio = (): FormState => ({ nome: '', telefone: '', ativo: true, todasLojas: true, lojaIds: [] });

const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Lista de lojas com busca, agrupada por rede, com "marcar todas" por rede */
const SeletorLojas: React.FC<{
  lojas: Loja[];
  selecionadas: string[];
  onChange: (ids: string[]) => void;
}> = ({ lojas, selecionadas, onChange }) => {
  const [busca, setBusca] = useState('');
  const marcadas = new Set(selecionadas);

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim());
    return termo
      ? lojas.filter((l) => semAcento(`${l.nome} ${l.estacaoMetro || ''} ${l.endereco}`).includes(termo))
      : lojas;
  }, [lojas, busca]);

  const alternar = (ids: string[], marcar: boolean) => {
    const novo = new Set(marcadas);
    ids.forEach((id) => (marcar ? novo.add(id) : novo.delete(id)));
    onChange([...novo]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar loja ou estação..."
          className={`${inputClass} pl-10`}
        />
      </div>
      <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
        {REDES_PDV.map((rede) => {
          const daRede = visiveis.filter((l) => l.rede === rede);
          if (daRede.length === 0) return null;
          const todasMarcadas = daRede.every((l) => marcadas.has(l.id));
          return (
            <div key={rede}>
              <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-[#0B0F19] text-xs font-bold text-slate-700 dark:text-slate-200 sticky top-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={todasMarcadas}
                  onChange={(e) => alternar(daRede.map((l) => l.id), e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                {rede}
                <span className="font-normal text-slate-500">({daRede.filter((l) => marcadas.has(l.id)).length}/{daRede.length})</span>
              </label>
              {daRede.map((l) => (
                <label key={l.id} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={marcadas.has(l.id)}
                    onChange={(e) => alternar([l.id], e.target.checked)}
                    className="w-4 h-4 accent-blue-600 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate">{l.nome}</span>
                  {l.status !== STATUS_LOJA.PENDENTE && (
                    <span className="text-[10px] text-slate-500 shrink-0">já auditada</span>
                  )}
                </label>
              ))}
            </div>
          );
        })}
        {visiveis.length === 0 && <p className="p-3 text-xs text-slate-500">Nenhuma loja encontrada.</p>}
      </div>
    </div>
  );
};

const EditorPesquisador: React.FC<{
  inicial: FormState;
  lojas: Loja[];
  onFechar: () => void;
}> = ({ inicial, lojas, onFechar }) => {
  const [form, setForm] = useState<FormState>(inicial);
  const [erros, setErros] = useState<string[]>([]);
  const salvar = useSalvarPesquisador();
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...dados } = form;
    const validacao = PesquisadorInputSchema.safeParse(dados);
    if (!validacao.success) {
      setErros([...new Set(validacao.error.issues.map((i) => i.message))]);
      return;
    }
    setErros([]);
    try {
      await salvar.mutateAsync({ id, dados: validacao.data });
      onFechar();
    } catch (err) {
      setErros([err instanceof Error ? err.message : 'Não foi possível salvar']);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <form
        onSubmit={enviar}
        className="bg-white dark:bg-[#131B2B] w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
            {form.id ? 'Editar pesquisador' : 'Novo pesquisador'}
          </h3>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">Nome</span>
            <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} className={inputClass} autoFocus />
          </label>
          <label className="block">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">Telefone (com DDD)</span>
            <input
              type="tel"
              inputMode="tel"
              value={form.telefone}
              onChange={(e) => set('telefone', e.target.value)}
              placeholder="(11) 90000-0000"
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={(e) => set('ativo', e.target.checked)} className="w-4 h-4 accent-blue-600" />
            Ativo (aparece na lista do app de campo)
          </label>
        </div>

        <fieldset className="space-y-2.5">
          <legend className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1.5">Lojas que pode pesquisar</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              [true, 'Todas as lojas'],
              [false, 'Lojas específicas']
            ].map(([valor, rotulo]) => (
              <button
                key={String(valor)}
                type="button"
                aria-pressed={form.todasLojas === valor}
                onClick={() => set('todasLojas', valor as boolean)}
                className={`p-3 text-xs font-semibold rounded-2xl border transition ${
                  form.todasLojas === valor
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {rotulo as string}
              </button>
            ))}
          </div>
          {!form.todasLojas && (
            <>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {form.lojaIds.length} de {lojas.length} lojas selecionadas
              </p>
              <SeletorLojas lojas={lojas} selecionadas={form.lojaIds} onChange={(ids) => set('lojaIds', ids)} />
            </>
          )}
        </fieldset>

        {erros.length > 0 && (
          <ul className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-3 list-disc pl-6 space-y-0.5">
            {erros.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onFechar} className="flex-1 h-11 rounded-full border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvar.isPending}
            className="flex-1 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvar.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
};

export const GestaoPesquisadores: React.FC = () => {
  const { data: pesquisadores, isLoading, isError } = usePesquisadoresAdmin();
  const { data: lojas = [] } = useLojas();
  const excluir = useExcluirPesquisador();
  const [editando, setEditando] = useState<FormState | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const nomeLojas = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome])), [lojas]);

  const abrirEdicao = (p: PesquisadorAdmin) =>
    setEditando({ id: p.id, nome: p.nome, telefone: p.telefone, ativo: p.ativo, todasLojas: p.todasLojas, lojaIds: p.lojaIds });

  const confirmarExclusao = async (p: PesquisadorAdmin) => {
    const msg =
      p.totalAuditorias > 0
        ? `${p.nome} tem ${p.totalAuditorias} auditoria(s). Para manter o histórico, o cadastro será DESATIVADO (some do app de campo), não apagado. Continuar?`
        : `Excluir ${p.nome} definitivamente?`;
    if (!window.confirm(msg)) return;
    try {
      const r = await excluir.mutateAsync(p.id);
      setAviso(r.resultado === 'desativado' ? `${p.nome} foi desativado.` : `${p.nome} foi excluído.`);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'Não foi possível excluir');
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Pesquisadores</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cadastre a equipe e defina em quais lojas cada pessoa pode pesquisar.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditando(formVazio())}
          className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo pesquisador
        </button>
      </div>

      {aviso && (
        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200 flex justify-between gap-3">
          <span>{aviso}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className={`${card} overflow-hidden`}>
        {isLoading ? (
          <p className="p-6 text-xs text-slate-500 text-center">Carregando equipe...</p>
        ) : isError || !pesquisadores ? (
          <p className="p-6 text-xs text-rose-600 text-center">Não foi possível carregar os pesquisadores.</p>
        ) : pesquisadores.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <UserPlus className="w-6 h-6 mx-auto text-slate-400" />
            <p>Nenhum pesquisador cadastrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {pesquisadores.map((p) => (
              <li key={p.id} className={`p-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 ${p.ativo ? '' : 'opacity-60'}`}>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.nome}</span>
                    {!p.ativo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {p.telefone} · {p.totalAuditorias} auditoria{p.totalAuditorias === 1 ? '' : 's'}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    {p.todasLojas ? (
                      'Pode pesquisar em todas as lojas'
                    ) : (
                      <span title={p.lojaIds.map((id) => nomeLojas.get(id) || id).join('\n')}>
                        {p.lojaIds.length} loja{p.lojaIds.length === 1 ? '' : 's'}:{' '}
                        {p.lojaIds
                          .slice(0, 3)
                          .map((id) => nomeLojas.get(id) || id)
                          .join(', ')}
                        {p.lojaIds.length > 3 && ` e mais ${p.lojaIds.length - 3}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEdicao(p)}
                    className="h-9 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmarExclusao(p)}
                    disabled={excluir.isPending}
                    className="h-9 px-3.5 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && <EditorPesquisador inicial={editando} lojas={lojas} onFechar={() => setEditando(null)} />}
    </div>
  );
};
