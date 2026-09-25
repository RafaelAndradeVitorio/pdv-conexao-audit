export interface RealStoreInput {
  num: number;
  rede: 'Monster Dog' | 'Ponto Alpha' | 'Better Pão de Queijo';
  nome: string;
  cnpjRaw: string;
  cnpjFormatado: string;
  endereco: string;
  estacaoMetro: string;
}

export interface RealResearcherInput {
  id: string;
  nome: string;
  telefone: string;
  lojasNums: number[];
}

export const REAL_RESEARCHERS: RealResearcherInput[] = [
  {
    id: 'pesq-giovani',
    nome: 'Giovani',
    telefone: '11 96586-2700',
    lojasNums: [27, 28, 35, 51, 52, 58]
  },
  {
    id: 'pesq-marina',
    nome: 'Marina Chaves',
    telefone: '11 94812-3274',
    lojasNums: [24, 36, 42, 44]
  },
  {
    id: 'pesq-nicole',
    nome: 'Nicole Moreno',
    telefone: '11 98279-1519',
    lojasNums: [13, 26, 29, 43, 45, 50, 59]
  },
  {
    id: 'pesq-janaina',
    nome: 'Janaína Veidz',
    telefone: '11 94510-5616',
    lojasNums: [6, 30, 46, 47]
  },
  {
    id: 'pesq-maria-elisa',
    nome: 'Maria Elisa',
    telefone: '11 96022-5697',
    lojasNums: [5, 8, 9, 31, 32, 33, 41]
  },
  {
    id: 'pesq-abel',
    nome: 'Abel',
    telefone: '21 97440-6520',
    lojasNums: [4, 20, 23, 25, 53, 54, 55, 56, 57]
  },
  {
    id: 'pesq-alex',
    nome: 'Alex Gustavo',
    telefone: '11 99848-2019',
    lojasNums: [1, 12, 17, 34, 37]
  },
  {
    id: 'pesq-giovanna',
    nome: 'Giovanna Marangoni',
    telefone: '11 95360-0627',
    lojasNums: [3, 10, 18, 19, 21, 38, 39, 40, 48, 49]
  },
  {
    id: 'pesq-rayane',
    nome: 'Rayane Tauhyl',
    telefone: '11 99987-9337',
    lojasNums: [2, 14, 15, 16, 11, 7, 22]
  }
];

export const REAL_STORES: RealStoreInput[] = [
  // Grupo Giovani
  {
    num: 27,
    rede: 'Monster Dog',
    nome: 'Monster Dog Santo Andre Leste',
    cnpjRaw: '66307142000104',
    cnpjFormatado: '66.307.142/0001-04',
    endereco: 'AV Industrial SETOR T. SANTO ANDRE OESTE SUBSL AREA 2 CEP 09.080-510 Bairro Campestre Santo André-SP',
    estacaoMetro: 'Santo André'
  },
  {
    num: 28,
    rede: 'Monster Dog',
    nome: 'Monster Dog São Mateus',
    cnpjRaw: '47125252000100',
    cnpjFormatado: '47.125.252/0001-00',
    endereco: 'Av. Adélia Chohfi, 100 - Jardim Vera Cruz (Zona Leste) - Terminal São Mateus - São Paulo - SP - CEP 08320-390',
    estacaoMetro: 'São Mateus'
  },
  {
    num: 35,
    rede: 'Monster Dog',
    nome: 'Monster Dog Vila Prudente',
    cnpjRaw: '43230318000171',
    cnpjFormatado: '43.230.318/0001-71',
    endereco: 'Avenida Professor Luiz Ignácio Anhaia Mello, 1359 - Box EC003B, Vila Prudente, São Paulo - SP, CEP 03155-000',
    estacaoMetro: 'Vila Prudente'
  },
  {
    num: 51,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Santo Andre',
    cnpjRaw: '68356151000110',
    cnpjFormatado: '68.356.151/0001-10',
    endereco: 'AV Industrial SETOR T. SANTO ANDRE OESTESUBSL AREA 2 CEP 09.080-510 Bairro Campestre Santo André-SP',
    estacaoMetro: 'Santo André'
  },
  {
    num: 52,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Tamanduateí',
    cnpjRaw: '99000000000052',
    cnpjFormatado: 'Não informado',
    endereco: 'Av. Presidente Wilson, 4801 - Vila Independência - Estação Tamanduateí, Linha 2-Verde - São Paulo - SP - CEP 04220-001',
    estacaoMetro: 'Tamanduateí'
  },
  {
    num: 58,
    rede: 'Better Pão de Queijo',
    nome: 'Better Tamanduateí',
    cnpjRaw: '49494183000219',
    cnpjFormatado: '49.494.183/0002-19',
    endereco: 'Av. Presidente Wilson, 4801 - Vila Independência - Estação Tamanduateí, Linha 2-Verde - São Paulo - SP - CEP 04220-001',
    estacaoMetro: 'Tamanduateí'
  },

  // Grupo Marina Chaves
  {
    num: 24,
    rede: 'Monster Dog',
    nome: 'Monster Dog Raposo',
    cnpjRaw: '40248649000140',
    cnpjFormatado: '40.248.649/0001-40',
    endereco: 'Av. Marechal Fiuza de castro 265 Jd dos pinheiros são Paulo SP. CEP 05596-000',
    estacaoMetro: 'Raposo Tavares'
  },
  {
    num: 36,
    rede: 'Monster Dog',
    nome: 'Monster Dog Vila Sonia',
    cnpjRaw: '49981081000490',
    cnpjFormatado: '49.981.081/0004-90',
    endereco: 'Av. Prof Francisco Morato (sem numero) - Vila Sônia, São Paulo- SP Box Mall 0060 Luc 21',
    estacaoMetro: 'Vila Sônia'
  },
  {
    num: 42,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Guarulhos',
    cnpjRaw: '63975347000170',
    cnpjFormatado: '63.975.347/0001-70',
    endereco: 'Rua Joaquina de Jesus, 789 - Quiosque C-03, Parque Santo Agostinho, Guarulhos - SP, CEP 07140-233',
    estacaoMetro: 'Guarulhos'
  },
  {
    num: 44,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Oscar Freire',
    cnpjRaw: '47640177000116',
    cnpjFormatado: '47.640.177/0001-16',
    endereco: 'Rua Oscar Freire, 1247 - Estação de Metrô Oscar Freire - São Paulo - SP',
    estacaoMetro: 'Oscar Freire'
  },

  // Grupo Nicole Moreno
  {
    num: 13,
    rede: 'Monster Dog',
    nome: 'Monster Dog Grajaú',
    cnpjRaw: '47611412000474',
    cnpjFormatado: '47.611.412/0004-74',
    endereco: 'Rua Giovanni Bononcini, 77 - Quiosque QPC 03, Bloqueio - Parque Brasil - São Paulo - SP - CEP 04843-989',
    estacaoMetro: 'Grajaú'
  },
  {
    num: 26,
    rede: 'Monster Dog',
    nome: 'Monster Dog Santo Amaro Terminal',
    cnpjRaw: '51882352000159',
    cnpjFormatado: '51.882.352/0001-59',
    endereco: 'Av. Padre José Maria, 430 - Santo Amaro - São Paulo - SP - CEP 04753-060',
    estacaoMetro: 'Santo Amaro'
  },
  {
    num: 29,
    rede: 'Monster Dog',
    nome: 'Monster Dog Shopping Mais',
    cnpjRaw: '39471958001040',
    cnpjFormatado: '39.471.958/0010-40',
    endereco: 'Rua Amaro Bueno, 229 São Paulo - SP 04752-005',
    estacaoMetro: 'Santo Amaro / Mais Shopping'
  },
  {
    num: 43,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Grajaú',
    cnpjRaw: '47611412000474b',
    cnpjFormatado: '47.611.412/0004-74 (QPC 03)',
    endereco: 'Rua Giovanni Bononcini, 77 - Quiosque QPC 03, Bloqueio - Parque Brasil - São Paulo - SP - CEP 04843-989',
    estacaoMetro: 'Grajaú'
  },
  {
    num: 45,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Vila Olimpia',
    cnpjRaw: '43315116000122',
    cnpjFormatado: '43.315.116/0001-22',
    endereco: 'Rua Beira Rio, 23 - Vila Olímpia - São Paulo - SP - CEP 04548-050',
    estacaoMetro: 'Vila Olímpia'
  },
  {
    num: 50,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Mais Shopping',
    cnpjRaw: '49981081000228b',
    cnpjFormatado: '49.981.081/0002-28 (Mais Shopping)',
    endereco: 'Rua Amaro Bueno, 229 São Paulo - SP 04752-005',
    estacaoMetro: 'Santo Amaro / Mais Shopping'
  },
  {
    num: 59,
    rede: 'Better Pão de Queijo',
    nome: 'Better Santo Amaro',
    cnpjRaw: '52683867000192',
    cnpjFormatado: '52.683.867/0001-92',
    endereco: 'Av. Guido Caloi, 2221 - Estação Santo Amaro, Linha 5-Lilás - São Paulo - SP',
    estacaoMetro: 'Santo Amaro'
  },

  // Grupo Janaína Veidz
  {
    num: 6,
    rede: 'Monster Dog',
    nome: 'Monster Dog Cachoeirinha 3',
    cnpjRaw: '08235504000445',
    cnpjFormatado: '08.235.504/0004-45',
    endereco: 'Av. Inajar de Souza, s/n - Terminal Vila Nova Cachoeirinha - São Paulo - SP',
    estacaoMetro: 'Vila Nova Cachoeirinha'
  },
  {
    num: 30,
    rede: 'Monster Dog',
    nome: 'Monster Dog Taipas',
    cnpjRaw: '35258926000166',
    cnpjFormatado: '35.258.926/0001-66',
    endereco: 'Av. Elísio Teixeira Leite, 7098 - Estacionamento do Mercado Extra - Sítio Morro Grande (Taipas) - São Paulo - SP',
    estacaoMetro: 'Taipas'
  },
  {
    num: 46,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Loggi',
    cnpjRaw: '53116988000115',
    cnpjFormatado: '53.116.988/0001-15',
    endereco: 'Rua Antônio Cândido Machado, 3100 - Bloco 3300 Lote Sítio dos Cristais, Empresarial Paineira (Jordanésia), Cajamar - SP, CEP 07776-037',
    estacaoMetro: 'Cajamar'
  },
  {
    num: 47,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Fedex',
    cnpjRaw: '51670352000195',
    cnpjFormatado: '51.670.352/0001-95',
    endereco: 'Av. Dr. Antonio João Abdalla, 260 - Vila Nova, Cajamar - SP, 07750-620',
    estacaoMetro: 'Cajamar'
  },

  // Grupo Maria Elisa
  {
    num: 5,
    rede: 'Monster Dog',
    nome: 'Monster Dog Belem',
    cnpjRaw: '52321499000132',
    cnpjFormatado: '52.321.499/0001-32',
    endereco: 'Rua Brig Morais, 31 - Loja 02, Belenzinho, São Paulo - SP, CEP 03302-010',
    estacaoMetro: 'Belém'
  },
  {
    num: 8,
    rede: 'Monster Dog',
    nome: 'Monster Dog Carrão Norte',
    cnpjRaw: '49981081000309',
    cnpjFormatado: '49.981.081/0003-09',
    endereco: 'Rua Salvador de lima. 12 loja p01',
    estacaoMetro: 'Carrão'
  },
  {
    num: 9,
    rede: 'Monster Dog',
    nome: 'Monster Dog Carrão Sul',
    cnpjRaw: '49981081000902',
    cnpjFormatado: '49.981.081/0009-02',
    endereco: 'Rua Melo Freire, 3560 - Boxes B33, B34, B35 e B36 - Tatuapé - São Paulo - SP - CEP 03314-030',
    estacaoMetro: 'Carrão'
  },
  {
    num: 31,
    rede: 'Monster Dog',
    nome: 'Monster Dog Tatuapé B41',
    cnpjRaw: '49981081000228',
    cnpjFormatado: '49.981.081/0002-28',
    endereco: 'Avenida Melo Peixoto, S/N - Loja B41 Term Unitah, Tatuapé, São Paulo - SP, CEP 03070-000',
    estacaoMetro: 'Tatuapé'
  },
  {
    num: 32,
    rede: 'Monster Dog',
    nome: 'Monster Dog Tatuapé Boulevard',
    cnpjRaw: '42628716000188',
    cnpjFormatado: '42.628.716/0001-88',
    endereco: 'Rua Catigua, 0 Box 29 e 30 Terminal de ônibus Shopping Boulevard Tatuapé- CEP 03065030 - Sao Paulo - SP',
    estacaoMetro: 'Tatuapé'
  },
  {
    num: 33,
    rede: 'Monster Dog',
    nome: 'Monster Dog Tatuapé Sul B85',
    cnpjRaw: '50545213000177',
    cnpjFormatado: '50.545.213/0001-77',
    endereco: 'Rua Melo Freitas, s/n - Tatuapé - São Paulo - SP - CEP 03070-000',
    estacaoMetro: 'Tatuapé'
  },
  {
    num: 41,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Brás',
    cnpjRaw: '39471058000159',
    cnpjFormatado: '39.471.058/0001-59',
    endereco: 'Rua Domingos Paiva, S/N - Loja EP09 Metrô, Brás, São Paulo - SP, CEP 03043-070',
    estacaoMetro: 'Brás'
  },

  // Grupo Abel
  {
    num: 4,
    rede: 'Monster Dog',
    nome: 'Monster Dog - BRÁS',
    cnpjRaw: '49981081000813',
    cnpjFormatado: '49.981.081/0008-13',
    endereco: 'Rua José Pinheiro Borges, S/N - Box EC 008 Shopping Itaq, Vila Campanela, São Paulo - SP, CEP 08220-900',
    estacaoMetro: 'Brás'
  },
  {
    num: 20,
    rede: 'Monster Dog',
    nome: 'Monster Dog Luz',
    cnpjRaw: '14485447000536',
    cnpjFormatado: '14.485.447/0005-36',
    endereco: 'Estação LUZ - Rua brigadeiro Tobias 731 Cep 01032-001 São Paulo',
    estacaoMetro: 'Luz'
  },
  {
    num: 23,
    rede: 'Monster Dog',
    nome: 'Monster Dog Pq Dom Pedro',
    cnpjRaw: '35488385000162',
    cnpjFormatado: '35.488.385/0001-62',
    endereco: 'Parque Dom Pedro II, 55 - CEP: 01022-050',
    estacaoMetro: 'Parque Dom Pedro II'
  },
  {
    num: 25,
    rede: 'Monster Dog',
    nome: 'Monster Dog Republica',
    cnpjRaw: '53026040000179',
    cnpjFormatado: '53.026.040/0001-79',
    endereco: 'Metrô República - Praça da República',
    estacaoMetro: 'República'
  },
  {
    num: 53,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Luz',
    cnpjRaw: '99000000000053',
    cnpjFormatado: 'Não informado',
    endereco: 'RUA BRIGADEIRO TOBIAS N: 731 CEP:01032-001 São Paulo',
    estacaoMetro: 'Luz'
  },
  {
    num: 54,
    rede: 'Better Pão de Queijo',
    nome: 'Better Linha Amarela Luz',
    cnpjRaw: '14485447000293',
    cnpjFormatado: '14.485.447/0002-93',
    endereco: 'RUA BRIGADEIRO TOBIAS N: 731 CEP:01032-001 São Paulo Estação da Luz/ linha amarela (Better 1)',
    estacaoMetro: 'Luz'
  },
  {
    num: 55,
    rede: 'Better Pão de Queijo',
    nome: 'Better Linha Azul Luz 01',
    cnpjRaw: '45683389000317',
    cnpjFormatado: '45.683.389/0003-17',
    endereco: 'RUA BRIGADEIRO TOBIAS N: 731 CEP:01032-001 São Paulo',
    estacaoMetro: 'Luz'
  },
  {
    num: 56,
    rede: 'Better Pão de Queijo',
    nome: 'Better Linha Azul Luz 02',
    cnpjRaw: '45683389000589',
    cnpjFormatado: '45.683.389/0005-89',
    endereco: 'RUA BRIGADEIRO TOBIAS N: 731 CEP:01032-001 São Paulo',
    estacaoMetro: 'Luz'
  },
  {
    num: 57,
    rede: 'Better Pão de Queijo',
    nome: 'Better Linha Azul - 03 Antiga Marata',
    cnpjRaw: '45683389000155',
    cnpjFormatado: '45.683.389/0001-55',
    endereco: 'RUA BRIGADEIRO TOBIAS N: 731 CEP:01032-001 São Paulo',
    estacaoMetro: 'Luz'
  },

  // Grupo Alex Gustavo
  {
    num: 1,
    rede: 'Monster Dog',
    nome: 'Monster Dog Aeroporto',
    cnpjRaw: '39471058001554',
    cnpjFormatado: '39.471.058/0015-54',
    endereco: 'Aeroporto de São Paulo/Congonhas Av. Whasington Luís SN CEP 04627-006',
    estacaoMetro: 'Congonhas'
  },
  {
    num: 12,
    rede: 'Monster Dog',
    nome: 'Monster Dog Extra Jabaquara',
    cnpjRaw: '37309646000165',
    cnpjFormatado: '37.309.646/0001-65',
    endereco: 'Avenida Engenheiro Armando de Arruda Pereira, 2022 - Quiosque 0002 Estacionamento, Jabaquara, São Paulo - SP, CEP 04308-001',
    estacaoMetro: 'Jabaquara'
  },
  {
    num: 17,
    rede: 'Monster Dog',
    nome: 'Monster Dog Jabaquara 1',
    cnpjRaw: '41792930000102',
    cnpjFormatado: '41.792.930/0001-02',
    endereco: 'Rua Nelson Fernandes, 75 - Jabaquara - São Paulo - SP',
    estacaoMetro: 'Jabaquara'
  },
  {
    num: 34,
    rede: 'Monster Dog',
    nome: 'Monster Dog Tucuruvi 1 - L50',
    cnpjRaw: '60598294000127',
    cnpjFormatado: '60.598.294/0001-27',
    endereco: 'Av doutor Antônio maria laet 566 loja 50 1 piso parada inglesa',
    estacaoMetro: 'Parada Inglesa'
  },
  {
    num: 37,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha AACD',
    cnpjRaw: '47865018000110',
    cnpjFormatado: '47.865.018/0001-10',
    endereco: 'Rua Pedro de Toledo, 1601, Vila Clementino, São Paulo - SP, CEP 04039-034',
    estacaoMetro: 'AACD-Servidores'
  },

  // Grupo Giovanna Marangoni
  {
    num: 3,
    rede: 'Monster Dog',
    nome: 'Monster Dog - Barra Funda - Corredor - EC 15',
    cnpjRaw: '39471058001392',
    cnpjFormatado: '39.471.058/0013-92',
    endereco: 'Avenida Mário de Andrade, S/N - Box EC 15, Barra Funda, São Paulo - SP, CEP 01156-001',
    estacaoMetro: 'Palmeiras-Barra Funda'
  },
  {
    num: 10,
    rede: 'Monster Dog',
    nome: 'Monster Dog Barra Funda Rodoviaria',
    cnpjRaw: '39471058001635',
    cnpjFormatado: '39.471.058/0016-35',
    endereco: 'Rua Doutor Bento Teobaldo Ferraz, 119 - Box EC 05 e EC 07 B, Várzea da Barra Funda, São Paulo - SP, CEP 01140-070',
    estacaoMetro: 'Palmeiras-Barra Funda'
  },
  {
    num: 18,
    rede: 'Monster Dog',
    nome: 'Monster Dog Lapa',
    cnpjRaw: '48498308000135',
    cnpjFormatado: '48.498.308/0001-35',
    endereco: 'R Guaicurus, 1482 - Agua Branca, São Paulo - SP CEP: 05033-002 - TERMINAL DE ÔNIBUS LAPA',
    estacaoMetro: 'Lapa'
  },
  {
    num: 19,
    rede: 'Monster Dog',
    nome: 'Moonster Dog Lapa Teleperformance',
    cnpjRaw: '57185751000147',
    cnpjFormatado: '57.185.751/0001-47',
    endereco: 'Rua Werner von Siemens, 111 - Condomínio eBusiness - Lapa - São Paulo - SP',
    estacaoMetro: 'Lapa'
  },
  {
    num: 21,
    rede: 'Monster Dog',
    nome: 'Monster Dog M. EBPARK',
    cnpjRaw: '47611412000636',
    cnpjFormatado: '47.611.412/0006-36',
    endereco: 'Rua Werner von Siemens, 111 - Condomínio eBusiness - Lapa - São Paulo - SP',
    estacaoMetro: 'Lapa'
  },
  {
    num: 38,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Barra Funda Bc 01 e 05',
    cnpjRaw: '39471058000230',
    cnpjFormatado: '39.471.058/0002-30',
    endereco: 'Avenida Mário de Andrade, S/N - Box BC 01 e 05, Barra Funda, São Paulo - SP, CEP 01156-001',
    estacaoMetro: 'Palmeiras-Barra Funda'
  },
  {
    num: 39,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Barra Funda Bc 08',
    cnpjRaw: '39471058000744',
    cnpjFormatado: '39.471.058/0007-44',
    endereco: 'Avenida Mário de Andrade, S/N - Box BC 08, Barra Funda, São Paulo - SP, CEP 01156-001',
    estacaoMetro: 'Palmeiras-Barra Funda'
  },
  {
    num: 40,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Barra Funda Pizza',
    cnpjRaw: '39471058001201',
    cnpjFormatado: '39.471.058/0012-01',
    endereco: 'Avenida Mário de Andrade, S/N - Box EC 31/32, Barra Funda, São Paulo - SP, CEP 01156-001',
    estacaoMetro: 'Palmeiras-Barra Funda'
  },
  {
    num: 48,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha Teleperformance',
    cnpjRaw: '57185751000147b',
    cnpjFormatado: '57.185.751/0001-47 (Teleperformance)',
    endereco: 'Rua Werner von Siemens, 111 - Condomínio eBusiness - Lapa - São Paulo - SP',
    estacaoMetro: 'Lapa'
  },
  {
    num: 49,
    rede: 'Ponto Alpha',
    nome: 'Ponto Alpha EbPark',
    cnpjRaw: '57185751000147c',
    cnpjFormatado: '57.185.751/0001-47 (EbPark)',
    endereco: 'Rua Werner von Siemens, 111 - Condomínio eBusiness - Lapa - São Paulo - SP',
    estacaoMetro: 'Lapa'
  },

  // Grupo Rayane Tauhyl
  {
    num: 2,
    rede: 'Monster Dog',
    nome: 'Monster Dog Artur Alvim Terminal',
    cnpjRaw: '49755410000131',
    cnpjFormatado: '49.755.410/0001-31',
    endereco: 'Rua Boipeva, s/n - Cidade Antônio E Carvalho - Terminal de ônibus/Metrô Artur Alvim - São Paulo - SP',
    estacaoMetro: 'Artur Alvim'
  },
  {
    num: 14,
    rede: 'Monster Dog',
    nome: 'Monster Dog Itaquera 19',
    cnpjRaw: '59718514000120',
    cnpjFormatado: '59.718.514/0001-20',
    endereco: 'Av José Pinheiro Borges s/n quiosque 19 - Vila campanela',
    estacaoMetro: 'Corinthians-Itaquera'
  },
  {
    num: 15,
    rede: 'Monster Dog',
    nome: 'Monster Dog Itaquera 50',
    cnpjRaw: '34914604000165',
    cnpjFormatado: '34.914.604/0001-65',
    endereco: 'Av José Pinheiro Borges 43/50 Vila Campanella',
    estacaoMetro: 'Corinthians-Itaquera'
  },
  {
    num: 16,
    rede: 'Monster Dog',
    nome: 'Monster Dog Itaquera 74',
    cnpjRaw: '20662874000111',
    cnpjFormatado: '20.662.874/0001-11',
    endereco: 'Av José Pinheiro Borges s/n quiosque 74 - Vila campanela',
    estacaoMetro: 'Corinthians-Itaquera'
  },
  {
    num: 11,
    rede: 'Monster Dog',
    nome: 'Monster Dog Diadema',
    cnpjRaw: '47611412000121',
    cnpjFormatado: '47.611.412/0001-21',
    endereco: 'Rua José Pinheiro Borges, S/N - Box 9/10, Vila Campanela, São Paulo - SP, CEP 08220-900',
    estacaoMetro: 'Diadema'
  },
  {
    num: 7,
    rede: 'Monster Dog',
    nome: 'Monster Dog Carapicuiba',
    cnpjRaw: '56021128000196',
    cnpjFormatado: '56.021.128/0001-96',
    endereco: 'Av. Gov. Mario Covas, 351 - Jardim Pignatary, Carapicuíba - SP, 06310-240',
    estacaoMetro: 'Carapicuíba'
  },
  {
    num: 22,
    rede: 'Monster Dog',
    nome: 'Monster Dog Mogi',
    cnpjRaw: '52321499000213',
    cnpjFormatado: '52.321.499/0002-13',
    endereco: 'Praça Sacadura Cabral, 09 Mogi das cruzes -SP Cep 08710-450',
    estacaoMetro: 'Mogi das Cruzes'
  }
];
