import urllib.request
import json
import os
import shutil
from concurrent.futures import ThreadPoolExecutor

UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    print("=" * 70)
    print("CALIBRANDO DIVERGÊNCIA ESTADUAL OFICIAL DO TSE (PRESIDENTE, GOV, SENADO)")
    print("PARA TODOS OS 27 ESTADOS")
    print("=" * 70)

    # 1. Fetch official state election results from TSE API
    print("1. Baixando dados oficiais das 27 UFs...")
    with ThreadPoolExecutor(max_workers=10) as ex:
        f_fed = {u: ex.submit(fetch_json, f'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/{u.lower()}/{u.lower()}-c0001-e006257-u.json') for u in UFS}
        f_gov = {u: ex.submit(fetch_json, f'https://resultados.tse.jus.br/oficial/ele2026/6259/dados/{u.lower()}/{u.lower()}-c0003-e006259-u.json') for u in UFS}
        f_sen = {u: ex.submit(fetch_json, f'https://resultados.tse.jus.br/oficial/ele2026/6259/dados/{u.lower()}/{u.lower()}-c0005-e006259-u.json') for u in UFS}

    res_fed = {u: f.result() for u, f in f_fed.items()}
    res_gov = {u: f.result() for u, f in f_gov.items()}
    res_sen = {u: f.result() for u, f in f_sen.items()}
    print("   Dados oficiais baixados com sucesso!")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    estados_json_path = os.path.join(base_dir, 'data', 'estados.json')
    with open(estados_json_path, 'r', encoding='utf-8') as f:
        estados_list = json.load(f)

    # 2. Atualizar estados.json
    for est in estados_list:
        uf = est['uf']
        fed = res_fed.get(uf)
        gov = res_gov.get(uf)
        sen = res_sen.get(uf)

        # PRESIDENTE (Pleito 6257)
        if fed:
            e = fed['e']
            aptos_pres = int(e['te'])
            comp_pres = int(e['c'])
            abst_pres = int(e['a'])
            taxa_pres = float(e['pa'].replace(',', '.'))

            cg_p = est['cargos']['Presidente']
            cg_p['total_aptos'] = aptos_pres
            cg_p['comparecimento'] = comp_pres
            cg_p['votos'] = abst_pres
            cg_p['abstencao'] = abst_pres
            cg_p['taxa_abstencao'] = taxa_pres

            # Atualizar candidato Abstenção no ranking
            valid_sum = sum(c['votos'] for c in cg_p.get('ranking', []) if not c['is_abstencao'])
            tot_sim = valid_sum + abst_pres
            for c in cg_p.get('ranking', []):
                if c['is_abstencao']:
                    c['votos'] = abst_pres
                    c['votos_simulados'] = abst_pres
                    c['percentual_simulado'] = round((abst_pres / tot_sim) * 100, 2) if tot_sim > 0 else taxa_pres
                else:
                    c['percentual_simulado'] = round((c['votos'] / tot_sim) * 100, 2) if tot_sim > 0 else 0

        # GOVERNADOR (Pleito 6259)
        if gov:
            e = gov['e']
            aptos_gov = int(e['te'])
            comp_gov = int(e['c'])
            abst_gov = int(e['a'])
            taxa_gov = float(e['pa'].replace(',', '.'))

            cg_g = est['cargos'].get('Governador')
            if cg_g:
                cg_g['total_aptos'] = aptos_gov
                cg_g['comparecimento'] = comp_gov
                cg_g['votos'] = abst_gov
                cg_g['abstencao'] = abst_gov
                cg_g['taxa_abstencao'] = taxa_gov

                valid_sum = sum(c['votos'] for c in cg_g.get('ranking', []) if not c['is_abstencao'])
                tot_sim = valid_sum + abst_gov
                for c in cg_g.get('ranking', []):
                    if c['is_abstencao']:
                        c['votos'] = abst_gov
                        c['votos_simulados'] = abst_gov
                        c['percentual_simulado'] = round((abst_gov / tot_sim) * 100, 2) if tot_sim > 0 else taxa_gov
                    else:
                        c['percentual_simulado'] = round((c['votos'] / tot_sim) * 100, 2) if tot_sim > 0 else 0

        # SENADOR (Pleito 6259)
        if sen:
            e = sen['e']
            aptos_sen = int(e['te'])
            comp_sen = int(e['c'])
            abst_sen = int(e['a'])
            taxa_sen = float(e['pa'].replace(',', '.'))

            cg_s = est['cargos']['Senador']
            cg_s['total_aptos'] = aptos_sen
            cg_s['comparecimento'] = comp_sen
            cg_s['votos'] = abst_sen
            cg_s['abstencao'] = abst_sen
            cg_s['taxa_abstencao'] = taxa_sen

            valid_sum = sum(c['votos'] for c in cg_s.get('ranking', []) if not c['is_abstencao'])
            tot_sim = valid_sum + abst_sen
            for c in cg_s.get('ranking', []):
                if c['is_abstencao']:
                    c['votos'] = abst_sen
                    c['votos_simulados'] = abst_sen
                    c['percentual_simulado'] = round((abst_sen / tot_sim) * 100, 2) if tot_sim > 0 else taxa_sen
                else:
                    c['percentual_simulado'] = round((c['votos'] / tot_sim) * 100, 2) if tot_sim > 0 else 0

    # Gravar data/estados.json e public/data/estados.json
    with open(estados_json_path, 'w', encoding='utf-8') as f:
        json.dump(estados_list, f, ensure_ascii=False, indent=2)
    pub_estados_json_path = os.path.join(base_dir, 'public', 'data', 'estados.json')
    shutil.copy2(estados_json_path, pub_estados_json_path)
    print("2. estados.json atualizado com rankings e abstenções específicas de cada cargo!")

    # 3. Atualizar brasil.json e data.js
    brasil_json_path = os.path.join(base_dir, 'public', 'data', 'brasil.json')
    with open(brasil_json_path, 'r', encoding='utf-8') as f:
        brasil_data = json.load(f)

    # Atualizar analise_governadores_1t com a abstenção oficial de cada estado
    if 'analise_governadores_1t' in brasil_data and 'governadores' in brasil_data['analise_governadores_1t']:
        for g in brasil_data['analise_governadores_1t']['governadores']:
            uf = g['uf']
            gov = res_gov.get(uf)
            if gov:
                abst_gov = int(gov['e']['a'])
                taxa_gov = float(gov['e']['pa'].replace(',', '.'))
                g['abstencao'] = abst_gov
                g['taxa_abstencao'] = taxa_gov
                tot_val = g.get('validos_oficiais', 0)
                if tot_val > 0:
                    pct_com_abst = round((g['votos'] / (tot_val + abst_gov)) * 100, 2)
                    g['pct_com_abstencao'] = pct_com_abst
                    g['diferenca_50'] = round(pct_com_abst - 50.0, 2)
                    g['detalhes'] = f"Oficialmente obteve {g['pct_oficial']}% dos válidos. Com {abst_gov:,} ausentes, seu percentual despenca para {pct_com_abst}%, ficando {'abaixo' if pct_com_abst < 50 else 'acima'} da linha dos 50%."

    with open(brasil_json_path, 'w', encoding='utf-8') as f:
        json.dump(brasil_data, f, ensure_ascii=False, indent=2)
    print("3. brasil.json atualizado com abstenções reais de Governador em cada estado!")

    # 4. Atualizar data.js (tanto em data/ quanto em public/data/)
    data_js_path = os.path.join(base_dir, 'public', 'data', 'data.js')
    with open(data_js_path, 'r', encoding='utf-8') as f:
        raw_js = f.read()

    # Extrair e remontar window.ELECTION_DATA
    js_prefix = "window.ELECTION_DATA = "
    js_suffix = ";\nwindow.ELEICOES_DATA = window.ELECTION_DATA;\n"
    
    # Carregar municipios de data.js atual para preservar
    raw_json_str = raw_js.split('window.ELEICOES_DATA')[0].replace(js_prefix, '').strip().rstrip(';')
    full_election_data = json.loads(raw_json_str)
    
    full_election_data['brasil'] = brasil_data
    full_election_data['estados'] = estados_list

    new_js_content = f"{js_prefix}{json.dumps(full_election_data, ensure_ascii=False)}{js_suffix}"
    with open(data_js_path, 'w', encoding='utf-8') as f:
        f.write(new_js_content)
    data_dir_data_js = os.path.join(base_dir, 'data', 'data.js')
    shutil.copy2(data_js_path, data_dir_data_js)
    print("4. data.js sincronizado com novos estados e brasil.json!")

    # 5. Atualizar estados_geo.js e estados_geo.json
    geo_js_path = os.path.join(base_dir, 'public', 'data', 'estados_geo.js')
    with open(geo_js_path, 'r', encoding='utf-8') as f:
        geo_raw = f.read()
    geo_json_str = geo_raw.replace('window.ESTADOS_GEO = ', '').strip().rstrip(';')
    geo_data = json.loads(geo_json_str)

    for feat in geo_data.get('features', []):
        p = feat.get('properties', {})
        uf = p.get('uf')
        fed = res_fed.get(uf)
        gov = res_gov.get(uf)
        sen = res_sen.get(uf)

        if fed:
            p['abstencao_pres'] = int(fed['e']['a'])
            p['taxa_pres'] = float(fed['e']['pa'].replace(',', '.'))
            p['aptos_pres'] = int(fed['e']['te'])
            # manter campos padrão compatíveis com Presidente
            p['abstencao'] = int(fed['e']['a'])
            p['abstencoes'] = int(fed['e']['a'])
            p['taxa'] = float(fed['e']['pa'].replace(',', '.'))
            p['aptos'] = int(fed['e']['te'])

        if gov:
            p['abstencao_gov'] = int(gov['e']['a'])
            p['taxa_gov'] = float(gov['e']['pa'].replace(',', '.'))
            p['aptos_gov'] = int(gov['e']['te'])

        if sen:
            p['abstencao_sen'] = int(sen['e']['a'])
            p['taxa_sen'] = float(sen['e']['pa'].replace(',', '.'))
            p['aptos_sen'] = int(sen['e']['te'])

    new_geo_js = f"window.ESTADOS_GEO = {json.dumps(geo_data, ensure_ascii=False)};\n"
    with open(geo_js_path, 'w', encoding='utf-8') as f:
        f.write(new_geo_js)
    data_geo_js_path = os.path.join(base_dir, 'data', 'estados_geo.js')
    shutil.copy2(geo_js_path, data_geo_js_path)

    geo_json_path = os.path.join(base_dir, 'data', 'estados_geo.json')
    if os.path.exists(geo_json_path):
        with open(geo_json_path, 'w', encoding='utf-8') as f:
            json.dump(geo_data, f, ensure_ascii=False)
        pub_geo_json_path = os.path.join(base_dir, 'public', 'data', 'estados_geo.json')
        shutil.copy2(geo_json_path, pub_geo_json_path)
    print("5. estados_geo.js e estados_geo.json enriquecidos com abstenções e taxas por cargo!")

    # 6. Teste de Sanidade em SP
    sp_est = next(x for x in estados_list if x['uf'] == 'SP')
    print("\n" + "=" * 70)
    print("SANIDADE: SÃO PAULO")
    print("Presidente:", sp_est['cargos']['Presidente']['votos'], f"({sp_est['cargos']['Presidente']['taxa_abstencao']}%)")
    print("Governador: ", sp_est['cargos']['Governador']['votos'], f"({sp_est['cargos']['Governador']['taxa_abstencao']}%)")
    print("Senador:    ", sp_est['cargos']['Senador']['votos'], f"({sp_est['cargos']['Senador']['taxa_abstencao']}%)")
    
    cand_gov_sp = next(c for c in sp_est['cargos']['Governador']['ranking'] if c['is_abstencao'])
    cand_sen_sp = next(c for c in sp_est['cargos']['Senador']['ranking'] if c['is_abstencao'])
    print("Ranking Gov Abstenção Votos:", cand_gov_sp['votos'], f"({cand_gov_sp['percentual_simulado']}%)")
    print("Ranking Sen Abstenção Votos:", cand_sen_sp['votos'], f"({cand_sen_sp['percentual_simulado']}%)")
    print("=" * 70)

if __name__ == '__main__':
    main()
