import urllib.request, zlib, json, time, os, shutil
from concurrent.futures import ThreadPoolExecutor

TSE_ZIP_URL = 'https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip'

UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

STATE_OFFSETS = {
    'AC': (257851288, 122789),
    'AL': (257974144, 520709),
    'AM': (257163965, 687256),
    'AP': (259076883, 96251),
    'BA': (259173201, 14596568),
    'CE': (417329422, 3080493),
    'DF': (420409982, 255551),
    'ES': (420665600, 1089960),
    'GO': (276322198, 5502464),
    'MA': (281824729, 2907797),
    'MG': (366074107, 49243115),
    'MS': (415317289, 697636),
    'MT': (416014992, 1314363),
    'PA': (273769836, 2552295),
    'PB': (421755627, 1856309),
    'PE': (423612003, 4611285),
    'PI': (428223355, 1650174),
    'PR': (429873596, 12433935),
    'RJ': (442307598, 10557225),
    'RN': (452864890, 1027628),
    'RO': (453892585, 462806),
    'RR': (454355458, 117843),
    'RS': (284732593, 14968073),
    'SC': (251980318, 5183580),
    'SE': (258494920, 581896),
    'SP': (299700733, 65524346),
    'TO': (365225146, 848894),
}

def fetch_range(url, start, length):
    end = start + length - 1
    req = urllib.request.Request(url, headers={'Range': f'bytes={start}-{end}', 'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))

def process_state_csv(item):
    uf, (offset, csize) = item
    t0 = time.time()
    raw = fetch_range(TSE_ZIP_URL, offset, csize + 200)
    fn_len = int.from_bytes(raw[26:28], 'little')
    extra_len = int.from_bytes(raw[28:30], 'little')
    data_start = 30 + fn_len + extra_len
    compressed = raw[data_start:data_start + csize]
    text = zlib.decompress(compressed, -zlib.MAX_WBITS).decode('latin1')
    
    mun_data = {}
    for line in text.splitlines()[1:]:
        row = line.split(';')
        if len(row) < 48: continue
        cargo = row[16].replace('"', '')
        if cargo not in ('3', '5'): continue
        cd_mun = row[13].replace('"', '').lstrip('0') or '0'
        nm = row[21].replace('"', '')
        sg = row[35].replace('"', '')
        nr = row[19].replace('"', '')
        v = int(row[47].replace('"', '') or 0)
        
        if cd_mun not in mun_data:
            mun_data[cd_mun] = {'gov': {}, 'sen': {}}
            
        ckey = (nr, nm, sg)
        if cargo == '3':
            mun_data[cd_mun]['gov'][ckey] = mun_data[cd_mun]['gov'].get(ckey, 0) + v
        elif cargo == '5':
            mun_data[cd_mun]['sen'][ckey] = mun_data[cd_mun]['sen'].get(ckey, 0) + v
            
    print(f"[{uf}] processado em {time.time()-t0:.2f}s ({len(mun_data)} municípios)")
    return uf, mun_data

def run():
    print("=" * 70)
    print("REVISÃO INTEGRAL DOS DADOS OFICIAIS DO TSE: PRESIDENTE, GOVERNADOR E SENADO")
    print("MUNICIPAL E ESTADUAL PARA TODO O BRASIL")
    print("=" * 70)
    t_global = time.time()

    # 1. Processar dados estaduais da API do TSE (Eleição 6257 e 6259)
    print("\n1. Baixando eleitorados e apurações oficiais por UF da API do TSE...")
    with ThreadPoolExecutor(max_workers=10) as ex:
        f_fed = {u: ex.submit(fetch_json, f'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/{u.lower()}/{u.lower()}-c0001-e006257-u.json') for u in UFS}
        f_gov = {u: ex.submit(fetch_json, f'https://resultados.tse.jus.br/oficial/ele2026/6259/dados/{u.lower()}/{u.lower()}-c0003-e006259-u.json') for u in UFS if u != 'DF'}
        f_sen = {u: ex.submit(fetch_json, f'https://resultados.tse.jus.br/oficial/ele2026/6259/dados/{u.lower()}/{u.lower()}-c0005-e006259-u.json') for u in UFS}

    res_fed = {u: f.result() for u, f in f_fed.items()}
    res_gov = {u: f.result() for u, f in f_gov.items()}
    res_sen = {u: f.result() for u, f in f_sen.items()}
    print(f"   Dados estaduais oficiais obtidos com sucesso para todas as 27 UFs!")

    # Atualizar data/estados.json
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    estados_path = os.path.join(base_dir, 'data', 'estados.json')
    with open(estados_path, 'r', encoding='utf-8') as f:
        estados_list = json.load(f)

    for est in estados_list:
        uf = est['uf']
        fed_item = res_fed.get(uf)
        gov_item = res_gov.get(uf)
        sen_item = res_sen.get(uf)

        if fed_item:
            e_fed = fed_item['e']
            est['cargos']['Presidente']['total_aptos'] = int(e_fed['te'])
            est['cargos']['Presidente']['comparecimento'] = int(e_fed['c'])
            est['cargos']['Presidente']['votos'] = int(e_fed['a'])
            est['cargos']['Presidente']['taxa_abstencao'] = float(e_fed['pa'].replace(',', '.'))

        if gov_item:
            e_gov = gov_item['e']
            est['cargos']['Governador']['total_aptos'] = int(e_gov['te'])
            est['cargos']['Governador']['comparecimento'] = int(e_gov['c'])
            est['cargos']['Governador']['votos'] = int(e_gov['a'])
            est['cargos']['Governador']['taxa_abstencao'] = float(e_gov['pa'].replace(',', '.'))

        if sen_item:
            e_sen = sen_item['e']
            est['cargos']['Senador']['total_aptos'] = int(e_sen['te'])
            est['cargos']['Senador']['comparecimento'] = int(e_sen['c'])
            est['cargos']['Senador']['votos'] = int(e_sen['a'])
            est['cargos']['Senador']['taxa_abstencao'] = float(e_sen['pa'].replace(',', '.'))

    with open(estados_path, 'w', encoding='utf-8') as f:
        json.dump(estados_list, f, ensure_ascii=False, indent=2)
    pub_estados_path = os.path.join(base_dir, 'public', 'data', 'estados.json')
    shutil.copy2(estados_path, pub_estados_path)
    print("   estados.json atualizado com números oficiais de eleitorado por cargo!")

    # 2. Processar Governador e Senador para todos os municípios via CSVs dos 27 estados
    print("\n2. Baixando e processando votos municipais de Governador e Senador para todos os 27 estados...")
    all_mun_cargos = {} # (uf, cd_mun) -> {'gov': {...}, 'sen': {...}}
    
    with ThreadPoolExecutor(max_workers=5) as ex:
        results = list(ex.map(process_state_csv, STATE_OFFSETS.items()))

    for uf, mun_dict in results:
        for cd_mun, cdata in mun_dict.items():
            all_mun_cargos[(uf, cd_mun)] = cdata

    print(f"\n   Total de registros municipais de Governador/Senado coletados: {len(all_mun_cargos)}")

    # 3. Atualizar data/municipios_index.json
    print("\n3. Enriquecendo municipios_index.json com Governador e Senador...")
    idx_path = os.path.join(base_dir, 'data', 'municipios_index.json')
    with open(idx_path, 'r', encoding='utf-8') as f:
        mindex = json.load(f)

    updated_count = 0
    for m in mindex:
        uf = m['uf']
        cd_tse = str(m.get('cd_tse', '')).lstrip('0')
        mkey = (uf, cd_tse)
        abst_m = m.get('abstencao', 0)

        if mkey in all_mun_cargos:
            updated_count += 1
            cdata = all_mun_cargos[mkey]
            
            # --- GOVERNADOR ---
            gov_cands = sorted(cdata['gov'].items(), key=lambda x: x[1], reverse=True)
            if gov_cands:
                gov_tot_val = sum(v for _, v in gov_cands)
                m['gov_cand_1o'] = gov_cands[0][0][1].title() if gov_cands[0][0][1].isupper() else gov_cands[0][0][1]
                m['gov_partido_1o'] = gov_cands[0][0][2]
                m['gov_numero_1o'] = gov_cands[0][0][0]
                m['gov_votos_1o'] = gov_cands[0][1]

                if len(gov_cands) > 1:
                    m['gov_cand_2o'] = gov_cands[1][0][1].title() if gov_cands[1][0][1].isupper() else gov_cands[1][0][1]
                    m['gov_partido_2o'] = gov_cands[1][0][2]
                    m['gov_numero_2o'] = gov_cands[1][0][0]
                    m['gov_votos_2o'] = gov_cands[1][1]
                else:
                    m['gov_cand_2o'] = ""
                    m['gov_partido_2o'] = ""
                    m['gov_numero_2o'] = ""
                    m['gov_votos_2o'] = 0

                if len(gov_cands) > 2:
                    m['gov_cand_3o'] = gov_cands[2][0][1].title() if gov_cands[2][0][1].isupper() else gov_cands[2][0][1]
                    m['gov_partido_3o'] = gov_cands[2][0][2]
                    m['gov_numero_3o'] = gov_cands[2][0][0]
                    m['gov_votos_3o'] = gov_cands[2][1]
                else:
                    m['gov_cand_3o'] = ""
                    m['gov_partido_3o'] = ""
                    m['gov_numero_3o'] = ""
                    m['gov_votos_3o'] = 0

                m['gov_total_validos'] = gov_tot_val
                m['gov_outros_votos'] = max(0, gov_tot_val - (m['gov_votos_1o'] + m['gov_votos_2o'] + m['gov_votos_3o']))

                # Posição da abstenção para Governador
                pos_gov = 1
                for _, v in gov_cands:
                    if abst_m < v:
                        pos_gov += 1
                    else:
                        break
                m['pos_gov'] = pos_gov

                # Status de 2º Turno de Governador
                tot_sim_gov = gov_tot_val + abst_m
                metade_gov = tot_sim_gov / 2.0
                v1_gov = m['gov_votos_1o']

                if pos_gov == 1:
                    m['status_gov'] = 'forcou_e_iria_2t' if abst_m <= metade_gov else 'eleito_1t'
                    m['iria_2t_gov'] = 1 if abst_m <= metade_gov else 0
                elif pos_gov == 2:
                    if v1_gov <= metade_gov:
                        m['status_gov'] = 'forcou_e_iria_2t'
                        m['iria_2t_gov'] = 1
                    else:
                        m['status_gov'] = 'nao_alterou'
                        m['iria_2t_gov'] = 0
                else:
                    if v1_gov <= metade_gov:
                        m['status_gov'] = 'forcou_2t_entre_dois'
                        m['iria_2t_gov'] = 0
                    else:
                        m['status_gov'] = 'nao_alterou'
                        m['iria_2t_gov'] = 0

            # --- SENADOR ---
            sen_cands = sorted(cdata['sen'].items(), key=lambda x: x[1], reverse=True)
            if sen_cands:
                sen_tot_val = sum(v for _, v in sen_cands)
                m['sen_cand_1o'] = sen_cands[0][0][1].title() if sen_cands[0][0][1].isupper() else sen_cands[0][0][1]
                m['sen_partido_1o'] = sen_cands[0][0][2]
                m['sen_numero_1o'] = sen_cands[0][0][0]
                m['sen_votos_1o'] = sen_cands[0][1]

                if len(sen_cands) > 1:
                    m['sen_cand_2o'] = sen_cands[1][0][1].title() if sen_cands[1][0][1].isupper() else sen_cands[1][0][1]
                    m['sen_partido_2o'] = sen_cands[1][0][2]
                    m['sen_numero_2o'] = sen_cands[1][0][0]
                    m['sen_votos_2o'] = sen_cands[1][1]
                else:
                    m['sen_cand_2o'] = ""
                    m['sen_partido_2o'] = ""
                    m['sen_numero_2o'] = ""
                    m['sen_votos_2o'] = 0

                if len(sen_cands) > 2:
                    m['sen_cand_3o'] = sen_cands[2][0][1].title() if sen_cands[2][0][1].isupper() else sen_cands[2][0][1]
                    m['sen_partido_3o'] = sen_cands[2][0][2]
                    m['sen_numero_3o'] = sen_cands[2][0][0]
                    m['sen_votos_3o'] = sen_cands[2][1]
                else:
                    m['sen_cand_3o'] = ""
                    m['sen_partido_3o'] = ""
                    m['sen_numero_3o'] = ""
                    m['sen_votos_3o'] = 0

                m['sen_total_validos'] = sen_tot_val
                m['sen_outros_votos'] = max(0, sen_tot_val - (m['sen_votos_1o'] + m['sen_votos_2o'] + m['sen_votos_3o']))

                # Posição da abstenção para Senador
                pos_sen = 1
                for _, v in sen_cands:
                    if abst_m < v:
                        pos_sen += 1
                    else:
                        break
                m['pos_sen'] = pos_sen
                m['eleito_sen'] = 1 if pos_sen in (1, 2) else 0

    print(f"   Municípios atualizados com Governador e Senador: {updated_count} de {len(mindex)}")

    with open(idx_path, 'w', encoding='utf-8') as f:
        json.dump(mindex, f, ensure_ascii=False)
    pub_idx_path = os.path.join(base_dir, 'public', 'data', 'municipios_index.json')
    shutil.copy2(idx_path, pub_idx_path)

    # 4. Atualizar GeoJSON
    print("\n4. Atualizando propriedades do GeoJSON...")
    geo_path = os.path.join(base_dir, 'data', 'municipios_geo.json')
    with open(geo_path, 'r', encoding='utf-8') as f:
        geo_data = json.load(f)

    mindex_by_id = {m['id']: m for m in mindex}
    for feat in geo_data.get('features', []):
        fid = feat.get('id') or feat.get('properties', {}).get('id')
        if fid in mindex_by_id:
            m_info = mindex_by_id[fid]
            props = feat.get('properties', {})
            for k in ['pos_gov', 'status_gov', 'iria_2t_gov', 'pos_sen', 'eleito_sen',
                      'gov_cand_1o', 'gov_partido_1o', 'gov_votos_1o', 'gov_cand_2o', 'gov_partido_2o', 'gov_votos_2o', 'gov_total_validos', 'gov_outros_votos',
                      'sen_cand_1o', 'sen_partido_1o', 'sen_votos_1o', 'sen_cand_2o', 'sen_partido_2o', 'sen_votos_2o', 'sen_total_validos', 'sen_outros_votos']:
                if k in m_info:
                    props[k] = m_info[k]
            feat['properties'] = props

    with open(geo_path, 'w', encoding='utf-8') as f:
        json.dump(geo_data, f, ensure_ascii=False)

    geo_js_path = os.path.join(base_dir, 'data', 'municipios_geo.js')
    with open(geo_js_path, 'w', encoding='utf-8') as f:
        f.write("window.MUNICIPIOS_GEO = " + json.dumps(geo_data, ensure_ascii=False) + ";\n")

    pub_geo_path = os.path.join(base_dir, 'public', 'data', 'municipios_geo.json')
    shutil.copy2(geo_path, pub_geo_path)
    pub_geo_js = os.path.join(base_dir, 'public', 'data', 'municipios_geo.js')
    shutil.copy2(geo_js_path, pub_geo_js)

    # Verificação de Ilha Solteira (SP)
    ilha = [m for m in mindex if m.get('id') == 3520442][0]
    print("\n" + "=" * 70)
    print("VERIFICAÇÃO DE ILHA SOLTEIRA (SP):")
    print(f" - Aptos: {ilha['aptos']:,} | Abstenção: {ilha['abstencao']:,} ({ilha['taxa']}%)")
    print(" [PRESIDENTE]")
    print(f"   1º: {ilha['cand_1o']} ({ilha['partido_1o']}) - {ilha['votos_1o']:,}")
    print(f"   2º: {ilha['cand_2o']} ({ilha['partido_2o']}) - {ilha['votos_2o']:,}")
    print(f"   Posição Abstenção: {ilha['pos_pres']}º Lugar | Iria a 2ºT: {'SIM' if ilha['iria_2t_pres'] else 'NÃO'}")
    print(" [GOVERNADOR]")
    print(f"   1º: {ilha['gov_cand_1o']} ({ilha['gov_partido_1o']}) - {ilha['gov_votos_1o']:,}")
    print(f"   2º: {ilha['gov_cand_2o']} ({ilha['gov_partido_2o']}) - {ilha['gov_votos_2o']:,}")
    print(f"   Total Válidos: {ilha['gov_total_validos']:,} | Outros: {ilha['gov_outros_votos']:,}")
    print(f"   Posição Abstenção: {ilha['pos_gov']}º Lugar | Status: {ilha['status_gov']}")
    print(" [SENADOR]")
    print(f"   1º: {ilha['sen_cand_1o']} ({ilha['sen_partido_1o']}) - {ilha['sen_votos_1o']:,}")
    print(f"   2º: {ilha['sen_cand_2o']} ({ilha['sen_partido_2o']}) - {ilha['sen_votos_2o']:,}")
    print(f"   3º: {ilha['sen_cand_3o']} ({ilha['sen_partido_3o']}) - {ilha['sen_votos_3o']:,}")
    print(f"   Total Válidos: {ilha['sen_total_validos']:,}")
    print(f"   Posição Abstenção: {ilha['pos_sen']}º Lugar | Eleita: {'SIM' if ilha['eleito_sen'] else 'NÃO'}")
    print(f"Tempo total de execução: {time.time()-t_global:.2f}s")
    print("=" * 70)

if __name__ == '__main__':
    run()
