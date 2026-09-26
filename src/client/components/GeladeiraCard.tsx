import React from 'react';
import { CheckCircle2, ChevronDown, Refrigerator, Trash2 } from 'lucide-react';
import {
  ABASTECIMENTO_GELADEIRA,
  CATEGORIAS_BEBIDA,
  CategoriaBebida,
  MARCAS_COCA_COLA,
  MARCAS_POR_CATEGORIA,
  MARCA_VISUAL_GELADEIRA,
  ORGANIZACAO_GELADEIRA,
  POSSE_GELADEIRA,
  VISIBILIDADE_MARCAS,
  fotosDaGeladeira
} from '../../shared/constants';
import { GeladeiraInput, MapaBebidaItem, pendenciasGeladeira } from '../../shared/schemas';
import { OpcoesChips, SimNaoToggle, inputClass } from './ChecklistControls';
import { PhotoCaptureGrid, PhotoState } from './PhotoCaptureGrid';

type Opcao<T extends readonly string[]> = T[number] | null;

/** Respostas de uma geladeira como ficam no formulário (e no rascunho) */
export interface GeladeiraForm {
  identificacao: string;
  marcaVisual: Opcao<typeof MARCA_VISUAL_GELADEIRA>;
  posse: Opcao<typeof POSSE_GELADEIRA>;
  monsterPresente: boolean | null;
  mapaBebidas: MapaBebidaItem[];
  organizacao: Opcao<typeof ORGANIZACAO_GELADEIRA>;
  abastecimento: Opcao<typeof ABASTECIMENTO_GELADEIRA>;
  visibilidade: Opcao<typeof VISIBILIDADE_MARCAS>;
  concorrentesMisturados: boolean | null;
  concorrentesDetalhes: string;
}

// Nada vem pré-preenchido: o guia pede para não inventar informação (§12)
export const geladeiraInicial = (): GeladeiraForm => ({
  identificacao: '',
  marcaVisual: null,
  posse: null,
  monsterPresente: null,
  mapaBebidas: CATEGORIAS_BEBIDA.map((categoria) => ({ categoria, tem: null, marcas: '', concorrentes: null })),
  organizacao: null,
  abastecimento: null,
  visibilidade: null,
  concorrentesMisturados: null,
  concorrentesDetalhes: ''
});

/** Formato enviado ao servidor (limpa o que não se aplica às respostas) */
export const geladeiraParaPayload = (g: GeladeiraForm): GeladeiraInput => ({
  identificacao: g.identificacao.trim() || null,
  marcaVisual: g.marcaVisual,
  posse: g.posse,
  monsterPresente: g.monsterPresente,
  mapaBebidas: g.mapaBebidas.map((m) => ({
    ...m,
    marcas: m.tem ? m.marcas?.trim() || null : null,
    concorrentes: m.tem ? m.concorrentes : null
  })),
  organizacao: g.organizacao,
  abastecimento: g.abastecimento,
  visibilidade: g.visibilidade,
  concorrentesMisturados: g.concorrentesMisturados,
  concorrentesDetalhes: g.concorrentesMisturados ? g.concorrentesDetalhes.trim() || null : null
});

/** Quantas respostas e fotos ainda faltam nesta geladeira */
export function contarPendencias(g: GeladeiraForm, numero: number, photos: Record<string, PhotoState>): number {
  const fotosFaltando = fotosDaGeladeira(numero, g.concorrentesMisturados).filter((t) => !photos[t]?.previewUrl);
  return pendenciasGeladeira(geladeiraParaPayload(g)).length + fotosFaltando.length;
}

const marcasSelecionadas = (item?: MapaBebidaItem) =>
  (item?.marcas || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

interface Props {
  numero: number;
  geladeira: GeladeiraForm;
  aberta: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<GeladeiraForm>) => void;
  /** Ausente quando é a única geladeira (não dá para remover) */
  onRemove?: () => void;
  photos: Record<string, PhotoState>;
  onPhotoCaptured: (tipo: string, data: { size: number; previewUrl: string }) => void;
  onPhotoReset: (tipo: string) => void;
}

export const GeladeiraCard: React.FC<Props> = ({
  numero,
  geladeira: g,
  aberta,
  onToggle,
  onChange,
  onRemove,
  photos,
  onPhotoCaptured,
  onPhotoReset
}) => {
  const pendencias = contarPendencias(g, numero, photos);
  const resumo = g.identificacao.trim() || g.posse || null;

  const setMapa = (categoria: CategoriaBebida, patch: Partial<MapaBebidaItem>) =>
    onChange({ mapaBebidas: g.mapaBebidas.map((m) => (m.categoria === categoria ? { ...m, ...patch } : m)) });

  const toggleMarcaNoMapa = (categoria: CategoriaBebida, marca: string) => {
    const item = g.mapaBebidas.find((m) => m.categoria === categoria);
    const atuais = marcasSelecionadas(item);
    const novas = atuais.includes(marca) ? atuais.filter((m) => m !== marca) : [...atuais, marca];
    const patch: Partial<MapaBebidaItem> = { marcas: novas.join(', ') };

    // Se selecionou concorrente conhecido e campo concorrentes estiver nulo, sugere true
    const eConcorrente = !MARCAS_COCA_COLA.includes(marca as (typeof MARCAS_COCA_COLA)[number]);
    if (eConcorrente && novas.includes(marca) && (item?.concorrentes === null || item?.concorrentes === undefined)) {
      patch.concorrentes = true;
    }
    setMapa(categoria, patch);
  };

  return (
    <div
      data-geladeira={numero}
      className={`rounded-3xl border transition-all ${
        aberta
          ? 'border-blue-300 dark:border-blue-800 bg-white dark:bg-[#131B2B] shadow-sm'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B0F19]/60'
      }`}
    >
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={aberta}
          className="flex-1 min-w-0 flex items-center gap-2.5 p-3.5 text-left touch-manipulation"
        >
          <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Refrigerator className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Geladeira {numero}</div>
            {resumo && <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{resumo}</div>}
          </div>
          {pendencias === 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Completa
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
              {pendencias} {pendencias === 1 ? 'pendência' : 'pendências'}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${aberta ? 'rotate-180' : ''}`} />
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title={`Remover a Geladeira ${numero}`}
            aria-label={`Remover a Geladeira ${numero}`}
            className="h-9 w-9 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 touch-manipulation shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {aberta && (
        <div className="px-3.5 sm:px-4 pb-4 space-y-3.5 border-t border-slate-100 dark:border-slate-800 pt-3.5">
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
              Como identificar esta geladeira? (opcional)
            </label>
            <input
              type="text"
              value={g.identificacao}
              onChange={(e) => onChange({ identificacao: e.target.value })}
              placeholder="Ex: Vertical Coca ao lado do caixa, horizontal no fundo..."
              className={inputClass}
            />
          </div>

          <OpcoesChips
            pergunta="A geladeira possui identificação visual de alguma marca?"
            opcoes={MARCA_VISUAL_GELADEIRA}
            value={g.marcaVisual}
            onChange={(v) => onChange({ marcaVisual: v })}
          />
          <OpcoesChips
            pergunta="A geladeira aparenta pertencer a:"
            opcoes={POSSE_GELADEIRA}
            value={g.posse}
            onChange={(v) => onChange({ posse: v })}
          />
          <SimNaoToggle
            pergunta="Tem Monster nesta geladeira?"
            value={g.monsterPresente}
            onChange={(v) => onChange({ monsterPresente: v })}
          />

          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Mapa de bebidas desta geladeira</div>
            {g.mapaBebidas.map((item) => (
              <div
                key={item.categoria}
                data-categoria={item.categoria}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F19]/60 space-y-2"
              >
                <SimNaoToggle pergunta={item.categoria} value={item.tem} onChange={(v) => setMapa(item.categoria, { tem: v })} />
                {item.tem && (
                  <div className="pt-1.5 space-y-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Marcas presentes em {item.categoria} (toque para marcar):
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(MARCAS_POR_CATEGORIA[item.categoria] || []).map((marca) => {
                          const selecionada = marcasSelecionadas(item).includes(marca);
                          return (
                            <button
                              key={marca}
                              type="button"
                              aria-pressed={selecionada}
                              onClick={() => toggleMarcaNoMapa(item.categoria, marca)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all touch-manipulation flex items-center gap-1 ${
                                selecionada
                                  ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                                  : 'bg-white dark:bg-[#131B2B] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300'
                              }`}
                            >
                              <span>{marca}</span>
                              <span className="text-[10px] font-bold">{selecionada ? '✓' : '+'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <SimNaoToggle
                      pergunta="Tem concorrentes?"
                      value={item.concorrentes ?? null}
                      onChange={(v) => setMapa(item.categoria, { concorrentes: v })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <OpcoesChips
            pergunta="Organização"
            opcoes={ORGANIZACAO_GELADEIRA}
            value={g.organizacao}
            onChange={(v) => onChange({ organizacao: v })}
          />
          <OpcoesChips
            pergunta="Abastecimento"
            opcoes={ABASTECIMENTO_GELADEIRA}
            value={g.abastecimento}
            onChange={(v) => onChange({ abastecimento: v })}
          />
          <OpcoesChips
            pergunta="Visibilidade das marcas"
            opcoes={VISIBILIDADE_MARCAS}
            value={g.visibilidade}
            onChange={(v) => onChange({ visibilidade: v })}
          />
          <SimNaoToggle
            pergunta="Produtos concorrentes misturados?"
            value={g.concorrentesMisturados}
            onChange={(v) => onChange({ concorrentesMisturados: v })}
          />
          {g.concorrentesMisturados && (
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                Quais marcas estão misturadas e onde estão posicionadas?
              </label>
              <input
                type="text"
                value={g.concorrentesDetalhes}
                onChange={(e) => onChange({ concorrentesDetalhes: e.target.value })}
                placeholder="Ex: Pepsi e Guaraná Antarctica na 2ª prateleira..."
                className={inputClass}
              />
            </div>
          )}

          <div className="pt-1">
            <PhotoCaptureGrid
              isInoperante={false}
              tipos={fotosDaGeladeira(numero, g.concorrentesMisturados)}
              photos={photos}
              onPhotoCaptured={onPhotoCaptured}
              onPhotoReset={onPhotoReset}
              titulo={`Fotos da Geladeira ${numero}`}
              orientacao="Fotografe esta geladeira antes de passar para a próxima. Não fotografe clientes de forma identificável."
            />
          </div>
        </div>
      )}
    </div>
  );
};
