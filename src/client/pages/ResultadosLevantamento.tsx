import React, { useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { useResultados } from '../hooks/useAuditData';
import { Contagem, PESOS_NOTA, ResultadosLevantamento as Resultados } from '../../shared/analytics';

const card = 'bg-white dark:bg-[#131B2B] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-sm';
const subtitulo = 'text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2';

const pct = (qtd: number, total: number) => (total > 0 ? Math.round((qtd / total) * 100) : 0);

/** Pergunta do guia (§13) que a seção responde */
const Pergunta: React.FC<{ n: number; titulo: string; resposta?: React.ReactNode; children: React.ReactNode }> = ({
  n,
  titulo,
  resposta,
  children
}) => (
  <section className={`${card} space-y-4`}>
    <div>
      <div className="flex items-start gap-2.5">
        <span className="h-6 w-6 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
          {n}
        </span>
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50">{titulo}</h3>
      </div>
      {resposta && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 ml-8">{resposta}</p>}
    </div>
    {children}
  </section>
);

/** Barras horizontais de uma série: contagem de lojas por opção do guia */
const BarList: React.FC<{ titulo: string; itens: Contagem; total: number }> = ({ titulo, itens, total }) => {
  const max = Math.max(1, ...itens.map((i) => i.qtd));
  return (
    <div>
      <div className={subtitulo}>{titulo}</div>
      <ul className="space-y-1.5">
        {itens.map((i) => (
          <li
            key={i.rotulo}
            className="grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[minmax(0,13rem)_1fr_auto] items-center gap-2 text-xs"
            title={`${i.rotulo}: ${i.qtd} de ${total} lojas (${pct(i.qtd, total)}%)`}
          >
            <span className="truncate text-slate-700 dark:text-slate-300">{i.rotulo}</span>
            <span className="h-2 bg-slate-100 dark:bg-[#0B0F19] rounded-full overflow-hidden">
              <span
                className="block h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                style={{ width: `${(i.qtd / max) * 100}%` }}
              />
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400 tabular-nums text-right min-w-[3.5rem]">
              {i.qtd} <span className="text-slate-400 dark:text-slate-500">({pct(i.qtd, total)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Numero: React.FC<{ valor: React.ReactNode; rotulo: string }> = ({ valor, rotulo }) => (
  <div className="bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-3">
    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">{valor}</div>
    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{rotulo}</div>
  </div>
);

const NomeLoja: React.FC<{ nome: string; rede: string; onClick: () => void }> = ({ nome, rede, onClick }) => (
  <button type="button" onClick={onClick} className="text-left min-w-0 group">
    <span className="block font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 break-words">
      {nome}
    </span>
    <span className="block text-[11px] text-slate-500 dark:text-slate-400">{rede}</span>
  </button>
);

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium">
    {children}
  </span>
);

const Conteudo: React.FC<{ r: Resultados; onSelectLoja: (id: string) => void }> = ({ r, onSelectLoja }) => {
  const [verTodoRanking, setVerTodoRanking] = useState(false);
  const g = r.geladeiras;
  const comNota = r.ranking.filter((l) => l.nota !== null);
  const comOportunidades = [...r.ranking]
    .filter((l) => l.oportunidades.length > 0)
    .sort((a, b) => b.oportunidades.length - a.oportunidades.length || (a.nota ?? 101) - (b.nota ?? 101));
  const rankingVisivel = verTodoRanking ? comNota : comNota.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Numero valor={`${r.lojasVisitadas}/${r.totalLojas}`} rotulo="lojas visitadas" />
        <Numero valor={r.lojasAbertas} rotulo="abertas e avaliadas" />
        <Numero valor={r.lojasInoperantes} rotulo="fechadas / em reforma / outro" />
        <Numero valor={g.comGeladeira} rotulo="com geladeira de bebidas" />
      </div>

      <Pergunta
        n={1}
        titulo="Como estão as geladeiras?"
        resposta={`${g.comGeladeira} de ${r.lojasAbertas} lojas abertas têm geladeira de bebidas; ${g.semGeladeira} não têm.`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BarList titulo="Aparenta pertencer a" itens={g.porPosse} total={g.comGeladeira} />
          <BarList titulo="Identificação visual" itens={g.porMarcaVisual} total={g.comGeladeira} />
          <BarList titulo="Abastecimento" itens={g.porAbastecimento} total={g.comGeladeira} />
          <BarList titulo="Visibilidade das marcas" itens={g.porVisibilidade} total={g.comGeladeira} />
          <BarList titulo="Organização" itens={g.porOrganizacao} total={g.comGeladeira} />
        </div>
      </Pergunta>

      <Pergunta n={2} titulo="Quais marcas estão presentes?">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BarList titulo="Marcas Coca-Cola (lojas abertas)" itens={r.marcas.cocaCola} total={r.lojasAbertas} />
          <div>
            <div className={subtitulo}>Categorias nas geladeiras</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] text-slate-500 dark:text-slate-400">
                  <th className="py-1.5 pr-2 font-semibold">Categoria</th>
                  <th className="py-1.5 pr-2 font-semibold text-right">Presente</th>
                  <th className="py-1.5 font-semibold text-right">Com concorrente</th>
                </tr>
              </thead>
              <tbody>
                {r.marcas.categorias.map((c) => (
                  <tr key={c.categoria} className="border-t border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    <td className="py-1.5 pr-2 font-medium">{c.categoria}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums">
                      {c.tem} <span className="text-slate-400">({pct(c.tem, g.comGeladeira)}%)</span>
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {c.comConcorrente} <span className="text-slate-400">({pct(c.comConcorrente, c.tem)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Pergunta>

      <Pergunta
        n={3}
        titulo="Existem produtos concorrentes dentro das geladeiras FEMSA?"
        resposta={`${r.concorrenciaFemsa.comConcorrentes} de ${r.concorrenciaFemsa.geladeirasFemsa} geladeiras que aparentam ser da Coca-Cola/FEMSA têm concorrentes misturados.`}
      >
        {r.concorrenciaFemsa.lojas.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {r.concorrenciaFemsa.lojas.map((l) => (
              <li key={l.lojaId} className="py-2 grid grid-cols-1 sm:grid-cols-[minmax(0,16rem)_1fr] gap-1 sm:gap-3">
                <NomeLoja nome={l.nome} rede={l.rede} onClick={() => onSelectLoja(l.lojaId)} />
                <span className="text-slate-600 dark:text-slate-300 break-words">{l.detalhes || 'Sem detalhes registrados'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500 italic">Nenhuma geladeira FEMSA com concorrentes até agora.</p>
        )}
      </Pergunta>

      <Pergunta
        n={4}
        titulo="Onde Monster está presente e como está exposta?"
        resposta={`Monster aparece em ${r.monster.presente} de ${r.lojasAbertas} lojas abertas: ${r.monster.naGeladeira} dentro de geladeira e ${r.monster.foraDaGeladeira} fora. ${r.monster.ausente} lojas não têm Monster.`}
      >
        {r.monster.lojas.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {[...r.monster.lojas]
              .sort((x, y) => Number(x.naGeladeira) - Number(y.naGeladeira))
              .map((l) => (
                <li key={l.lojaId} className="py-2 grid grid-cols-1 sm:grid-cols-[minmax(0,16rem)_1fr] gap-1.5 sm:gap-3">
                  <NomeLoja nome={l.nome} rede={l.rede} onClick={() => onSelectLoja(l.lojaId)} />
                  <div className="flex flex-wrap gap-1.5 content-start">
                    <Chip>{l.naGeladeira ? 'Dentro da geladeira' : 'Fora da geladeira'}</Chip>
                    {l.posseGeladeira && <Chip>Geladeira: {l.posseGeladeira}</Chip>}
                    {l.visibilidade && <Chip>{l.visibilidade}</Chip>}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Pergunta>

      <Pergunta
        n={5}
        titulo="Quais lojas apresentam melhor exposição?"
        resposta={`Ranking das ${comNota.length} lojas com geladeira avaliada, pela nota de exposição (0 a 100).`}
      >
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200 flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Nota provisória, a validar com o cliente.</strong> Organização (até {PESOS_NOTA.organizacao.Organizada}) +
            abastecimento (até {PESOS_NOTA.abastecimento.Cheia}) + visibilidade das marcas (até{' '}
            {PESOS_NOTA.visibilidade['Produtos facilmente identificáveis']}) + sem concorrentes misturados (
            {PESOS_NOTA.semConcorrentes}).
          </span>
        </div>
        <ol className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {rankingVisivel.map((l, i) => (
            <li key={l.lojaId} className="py-2 grid grid-cols-[1.5rem_minmax(0,1fr)_6.5rem] sm:grid-cols-[1.5rem_minmax(0,1fr)_12rem] gap-2 items-start">
              <span className="font-mono text-slate-500 pt-0.5">{i + 1}</span>
              <div className="min-w-0">
                <NomeLoja nome={l.nome} rede={l.rede} onClick={() => onSelectLoja(l.lojaId)} />
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {[l.organizacao, l.abastecimento, l.visibilidade].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1" title={`Nota ${l.nota} de 100`}>
                <span className="flex-1 h-2 bg-slate-100 dark:bg-[#0B0F19] rounded-full overflow-hidden">
                  <span className="block h-full bg-blue-600 dark:bg-blue-500 rounded-full" style={{ width: `${l.nota}%` }} />
                </span>
                <span className="font-mono font-bold tabular-nums w-7 text-right text-slate-900 dark:text-slate-100">{l.nota}</span>
              </div>
            </li>
          ))}
        </ol>
        {comNota.length > 10 && (
          <button
            type="button"
            onClick={() => setVerTodoRanking((v) => !v)}
            className="text-xs font-semibold text-blue-700 dark:text-blue-300 underline"
          >
            {verTodoRanking ? 'Mostrar só as 10 melhores' : `Ver ranking completo (${comNota.length} lojas)`}
          </button>
        )}
      </Pergunta>

      <Pergunta
        n={6}
        titulo="Quais lojas apresentam oportunidades de melhoria?"
        resposta={`${comOportunidades.length} de ${r.lojasAbertas} lojas abertas têm ao menos uma oportunidade. As com mais pontos aparecem primeiro.`}
      >
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {comOportunidades.map((l) => (
            <li key={l.lojaId} className="py-2 grid grid-cols-1 sm:grid-cols-[minmax(0,16rem)_1fr] gap-1.5 sm:gap-3">
              <NomeLoja nome={l.nome} rede={l.rede} onClick={() => onSelectLoja(l.lojaId)} />
              <div className="flex flex-wrap gap-1.5 content-start">
                {l.oportunidades.map((o) => (
                  <Chip key={o}>{o}</Chip>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Pergunta>

      <Pergunta
        n={7}
        titulo='Quais lojas possuem espaço para o Display "Coca-Cola Vai Até Você"?'
        resposta={`${r.display.length} lojas com potencial alto ou médio, ordenadas por potencial e espaço disponível.`}
      >
        {r.display.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {r.display.map((l) => (
              <li key={l.lojaId} className="py-2 grid grid-cols-1 sm:grid-cols-[minmax(0,16rem)_1fr] gap-1.5 sm:gap-3">
                <NomeLoja nome={l.nome} rede={l.rede} onClick={() => onSelectLoja(l.lojaId)} />
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1.5">
                    <Chip>Potencial {l.potencial.toLowerCase()}</Chip>
                    {l.espacoDisponivel && <Chip>Espaço {l.espacoDisponivel.toLowerCase()}</Chip>}
                    {l.boaVisibilidade !== null && <Chip>{l.boaVisibilidade ? 'Boa visibilidade' : 'Pouca visibilidade'}</Chip>}
                  </div>
                  {(l.local || l.descricao) && (
                    <p className="text-slate-600 dark:text-slate-400 break-words">
                      {[l.local, l.descricao].filter(Boolean).join(' — ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500 italic">Nenhuma loja com potencial alto ou médio até agora.</p>
        )}
      </Pergunta>
    </div>
  );
};

export const ResultadosLevantamento: React.FC<{ onSelectLoja: (id: string) => void }> = ({ onSelectLoja }) => {
  const { data, isLoading, isError } = useResultados();

  if (isLoading) {
    return (
      <div className={`${card} flex items-center justify-center gap-2 text-xs text-slate-500 py-10`}>
        <Loader2 className="w-4 h-4 animate-spin" /> Consolidando resultados...
      </div>
    );
  }
  if (isError || !data) {
    return <div className={`${card} text-xs text-rose-600 py-10 text-center`}>Não foi possível carregar os resultados.</div>;
  }
  if (data.lojasAbertas === 0) {
    return (
      <div className={`${card} text-xs text-slate-500 py-10 text-center`}>
        Os resultados aparecem assim que a primeira loja aberta for auditada.
      </div>
    );
  }
  return <Conteudo r={data} onSelectLoja={onSelectLoja} />;
};
