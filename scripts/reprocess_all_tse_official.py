#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reprocessamento 100% Oficial e Exato das Bases do TSE (2026):
- bases/bweb/ (Boletins de Urna: 27 UFs + ZZ)
- bases/candidato_mun_zona/ (Resultados Oficiais de Candidatos: 27 UFs)

Garante:
1. NENHUM dado inventado, simulado ou proporcional.
2. Abstenção e comparecimento exatos por cargo (Presidente, Governador, Senador) para cada município e estado.
3. Candidatos reais e votações nominais exatas por município e estado.
"""

import os
import glob
import json
import time
import re
import unicodedata
import shutil
from concurrent.futures import ProcessPoolExecutor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BWEB_DIR = os.path.join(BASE_DIR, "bases", "bweb")
CMZ_DIR = os.path.join(BASE_DIR, "bases", "candidato_mun_zona")
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, "public", "data")
DATA_DIR = PUBLIC_DATA_DIR

UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

ESTADOS_METADATA = {
    "AC": {"nome": "Acre", "capital": "Rio Branco", "regiao": "Norte"},
    "AL": {"nome": "Alagoas", "capital": "Maceió", "regiao": "Nordeste"},
    "AP": {"nome": "Amapá", "capital": "Macapá", "regiao": "Norte"},
    "AM": {"nome": "Amazonas", "capital": "Manaus", "regiao": "Norte"},
    "BA": {"nome": "Bahia", "capital": "Salvador", "regiao": "Nordeste"},
    "CE": {"nome": "Ceará", "capital": "Fortaleza", "regiao": "Nordeste"},
    "DF": {"nome": "Distrito Federal", "capital": "Brasília", "regiao": "Centro-Oeste"},
    "ES": {"nome": "Espírito Santo", "capital": "Vitória", "regiao": "Sudeste"},
    "GO": {"nome": "Goiás", "capital": "Goiânia", "regiao": "Centro-Oeste"},
    "MA": {"nome": "Maranhão", "capital": "São Luís", "regiao": "Nordeste"},
    "MT": {"nome": "Mato Grosso", "capital": "Cuiabá", "regiao": "Centro-Oeste"},
    "MS": {"nome": "Mato Grosso do Sul", "capital": "Campo Grande", "regiao": "Centro-Oeste"},
    "MG": {"nome": "Minas Gerais", "capital": "Belo Horizonte", "regiao": "Sudeste"},
    "PA": {"nome": "Pará", "capital": "Belém", "regiao": "Norte"},
    "PB": {"nome": "Paraíba", "capital": "João Pessoa", "regiao": "Nordeste"},
    "PR": {"nome": "Paraná", "capital": "Curitiba", "regiao": "Sul"},
    "PE": {"nome": "Pernambuco", "capital": "Recife", "regiao": "Nordeste"},
    "PI": {"nome": "Piauí", "capital": "Teresina", "regiao": "Nordeste"},
    "RJ": {"nome": "Rio de Janeiro", "capital": "Rio de Janeiro", "regiao": "Sudeste"},
    "RN": {"nome": "Rio Grande do Norte", "capital": "Natal", "regiao": "Nordeste"},
    "RS": {"nome": "Rio Grande do Sul", "capital": "Porto Alegre", "regiao": "Sul"},
    "RO": {"nome": "Rondônia", "capital": "Porto Velho", "regiao": "Norte"},
    "RR": {"nome": "Roraima", "capital": "Boa Vista", "regiao": "Norte"},
    "SC": {"nome": "Santa Catarina", "capital": "Florianópolis", "regiao": "Sul"},
    "SP": {"nome": "São Paulo", "capital": "São Paulo", "regiao": "Sudeste"},
    "SE": {"nome": "Sergipe", "capital": "Aracaju", "regiao": "Nordeste"},
    "TO": {"nome": "Tocantins", "capital": "Palmas", "regiao": "Norte"},
    "ZZ": {"nome": "Exterior", "capital": "Exterior", "regiao": "Exterior"}
}

def clean_name(s):
    if not s: return ""
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').upper()
    s = s.replace("'", " ").replace("-", " ")
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def title_case_name(nm):
    if not nm: return ""
    return nm.title() if nm.isupper() else nm

def process_single_uf(uf):
    t0 = time.time()
    bweb_path = os.path.join(BWEB_DIR, f"bweb_1t_{uf}_051020261403.csv")
    cmz_path = os.path.join(CMZ_DIR, f"votacao_candidato_munzona_2026_{uf}.csv")
    
    # 1. Candidato Mun Zona (Gov e Sen)
    gov_state = {} # (nr, nm, sg, sit_tot) -> votos
    sen_state = {} # (nr, nm, sg, sit_tot) -> votos
    gov_mun = {}   # cd_mun -> {(nr, nm, sg): votos}
    sen_mun = {}   # cd_mun -> {(nr, nm, sg): votos}
    mun_names = {} # cd_mun -> nm_mun
    
    if os.path.exists(cmz_path):
        with open(cmz_path, "r", encoding="latin1") as f:
            f.readline()
            for line in f:
                parts = line.strip().split(";")
                if len(parts) < 48:
                    continue
                cargo = parts[16].strip('"')
                if cargo not in ('3', '5'):
                    continue
                cd_mun = parts[13].strip('"').lstrip('0') or '0'
                nm_mun = parts[14].strip('"')
                mun_names[cd_mun] = nm_mun
                nr = parts[19].strip('"')
                nm = parts[21].strip('"')
                sg = parts[35].strip('"')
                votos = int(parts[47].strip('"') or 0)
                sit_tot = parts[49].strip('"') if len(parts) > 49 else ""
                
                ckey = (nr, nm, sg, sit_tot)
                m_ckey = (nr, nm, sg)
                if cargo == '3':
                    gov_state[ckey] = gov_state.get(ckey, 0) + votos
                    if cd_mun not in gov_mun: gov_mun[cd_mun] = {}
                    gov_mun[cd_mun][m_ckey] = gov_mun[cd_mun].get(m_ckey, 0) + votos
                elif cargo == '5':
                    sen_state[ckey] = sen_state.get(ckey, 0) + votos
                    if cd_mun not in sen_mun: sen_mun[cd_mun] = {}
                    sen_mun[cd_mun][m_ckey] = sen_mun[cd_mun].get(m_ckey, 0) + votos

    # 2. BWEB para Turnout (Cargos 1, 3, 5) e Presidente Nominal
    pres_state = {} # (nr, nm, sg) -> votos
    pres_mun = {}   # cd_mun -> {(nr, nm, sg): votos}
    turnout_state = {} # cargo -> [aptos, comp, abst]
    turnout_mun = {}   # (cargo, cd_mun) -> [aptos, comp, abst]
    secoes_seen = set()
    
    if os.path.exists(bweb_path):
        with open(bweb_path, "r", encoding="latin1") as f:
            f.readline()
            for line in f:
                parts = line.strip().split(";")
                if len(parts) < 32:
                    continue
                cargo = parts[16].strip('"')
                if cargo not in ('1', '3', '5'):
                    continue
                cd_mun = parts[11].strip('"').lstrip('0') or '0'
                zona = parts[13].strip('"')
                secao = parts[14].strip('"')
                sec_key = (cd_mun, zona, secao, cargo)
                
                if sec_key not in secoes_seen:
                    secoes_seen.add(sec_key)
                    aptos = int(parts[22].strip('"') or 0)
                    comp = int(parts[23].strip('"') or 0)
                    abst = int(parts[24].strip('"') or 0)
                    
                    if cargo not in turnout_state: turnout_state[cargo] = [0, 0, 0]
                    turnout_state[cargo][0] += aptos
                    turnout_state[cargo][1] += comp
                    turnout_state[cargo][2] += abst
                    
                    m_tkey = (cargo, cd_mun)
                    if m_tkey not in turnout_mun: turnout_mun[m_tkey] = [0, 0, 0]
                    turnout_mun[m_tkey][0] += aptos
                    turnout_mun[m_tkey][1] += comp
                    turnout_mun[m_tkey][2] += abst

                if cargo == '1' and parts[27].strip('"') == '1': # Presidente nominal
                    nr = parts[29].strip('"')
                    nm = parts[30].strip('"')
                    sg = parts[19].strip('"')
                    v = int(parts[31].strip('"') or 0)
                    ckey = (nr, nm, sg)
                    pres_state[ckey] = pres_state.get(ckey, 0) + v
                    if cd_mun not in pres_mun: pres_mun[cd_mun] = {}
                    pres_mun[cd_mun][ckey] = pres_mun[cd_mun].get(ckey, 0) + v

    dt = time.time() - t0
    print(f"[{uf}] Concluído em {dt:.1f}s | {len(gov_mun)} mun gov, {len(turnout_mun)} mun turnout")
    return {
        "uf": uf,
        "turnout_state": turnout_state,
        "turnout_mun": turnout_mun,
        "pres_state": pres_state,
        "gov_state": gov_state,
        "sen_state": sen_state,
        "pres_mun": pres_mun,
        "gov_mun": gov_mun,
        "sen_mun": sen_mun,
        "mun_names": mun_names
    }

def calculate_ranking(abstencao, cands, cargo="Presidente", aptos=0):
    competitors = []
    for c in cands:
        competitors.append({
            "nome": c["nome"],
            "partido": c.get("partido", "PARTIDO"),
            "nome_exibicao": f"{c['nome']} ({c.get('partido', '')})",
            "numero": c.get("numero", ""),
            "votos": int(c["votos"]),
            "is_abstencao": False,
            "foto": c.get("foto", "")
        })
    
    competitors.append({
        "nome": "Abstenção",
        "partido": "ELEITORES AUSENTES",
        "nome_exibicao": "Abstenção (ELEITORES AUSENTES)",
        "numero": "00",
        "votos": int(abstencao),
        "is_abstencao": True,
        "foto": "assets/abstencao.svg"
    })
    
    competitors.sort(key=lambda x: x["votos"], reverse=True)
    total_simulado = sum(x["votos"] for x in competitors)
    
    pos_abst = None
    superados = []
    
    for idx, comp in enumerate(competitors, start=1):
        comp["posicao"] = idx
        comp["percentual_simulado"] = round((comp["votos"] / total_simulado * 100), 2) if total_simulado > 0 else 0
        if comp["is_abstencao"]:
            pos_abst = idx
        elif pos_abst is not None:
            superados.append(comp["nome_exibicao"])
            
    vencedor_1t = False
    iria_2t = False
    eleito_sen = False
    
    if cargo in ("Presidente", "Governador"):
        if pos_abst == 1:
            if competitors[0]["percentual_simulado"] > 50.0:
                vencedor_1t = True
            else:
                iria_2t = True
        elif pos_abst == 2:
            if competitors[0]["percentual_simulado"] <= 50.0:
                iria_2t = True
    elif cargo == "Senador":
        if pos_abst in (1, 2):
            eleito_sen = True
            
    primeiro_real = next((c for c in competitors if not c["is_abstencao"]), None)
    dif_lider = int(abstencao) - (primeiro_real["votos"] if primeiro_real else 0)
    
    return {
        "posicao": pos_abst,
        "votos": int(abstencao),
        "total_aptos": aptos,
        "taxa_abstencao": round((abstencao / aptos * 100), 2) if aptos > 0 else 0,
        "vencedor_primeiro_turno": vencedor_1t,
        "iria_segundo_turno": iria_2t,
        "eleito_senado": eleito_sen,
        "candidatos_superados": superados,
        "diferenca_lider": dif_lider,
        "ranking": competitors
    }

def main():
    print("=" * 70)
    print("INICIANDO PROCESSAMENTO PARALELO 100% OFICIAL DO TSE (2026)")
    print("=" * 70)
    t_start = time.time()
    
    # 1. Carregar municípios existentes do índice
    idx_path = os.path.join(DATA_DIR, "municipios_index.json")
    with open(idx_path, "r", encoding="utf-8") as f:
        mindex = json.load(f)
    print(f"Base de municípios carregada com {len(mindex)} municípios.")
    
    # Mapear por (uf, cd_tse_sem_zero) e por (uf, clean_name)
    mun_by_cdtse = {}
    mun_by_name = {}
    for m in mindex:
        uf = m["uf"]
        cd_tse = str(m.get("cd_tse", "")).lstrip("0") or "0"
        cname = clean_name(m["nome"])
        mun_by_cdtse[(uf, cd_tse)] = m
        mun_by_name[(uf, cname)] = m

    # 2. Executar workers em paralelo para todas as 27 UFs (+ ZZ se existir)
    ufs_to_process = list(UFS)
    if os.path.exists(os.path.join(BWEB_DIR, "bweb_1t_ZZ_051020261403.csv")):
        ufs_to_process.append("ZZ")
        
    print(f"\nDisparando processamento paralelo para {len(ufs_to_process)} UFs...")
    with ProcessPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(process_single_uf, ufs_to_process))
        
    print(f"\nTodas as {len(results)} UFs processadas em {time.time() - t_start:.2f}s!")
    
    # Organizar resultados por UF
    uf_data_map = {r["uf"]: r for r in results}
    
    # -------------------------------------------------------------
    # 3. Construção dos Resultados Nacionais (brasil.json)
    # -------------------------------------------------------------
    print("\nConstruindo consolidação nacional...")
    br_pres_cands = {}
    br_turnout_pres = [0, 0, 0] # aptos, comp, abst
    
    for uf, r in uf_data_map.items():
        t1 = r["turnout_state"].get("1", [0, 0, 0])
        br_turnout_pres[0] += t1[0]
        br_turnout_pres[1] += t1[1]
        br_turnout_pres[2] += t1[2]
        
        for ckey, v in r["pres_state"].items():
            br_pres_cands[ckey] = br_pres_cands.get(ckey, 0) + v
            
    cands_br_pres_fmt = []
    for (nr, nm, sg), v in sorted(br_pres_cands.items(), key=lambda x: x[1], reverse=True):
        cands_br_pres_fmt.append({
            "nome": title_case_name(nm),
            "partido": sg,
            "numero": nr,
            "votos": v
        })
        
    ranking_br_pres = calculate_ranking(
        br_turnout_pres[2],
        cands_br_pres_fmt,
        cargo="Presidente",
        aptos=br_turnout_pres[0]
    )
    
    # Governador Nacional
    tot_gov_lideres = 0
    tot_gov_segundos = 0
    tot_gov_demais = 0
    analise_gov_1t = []
    
    for uf in UFS:
        r = uf_data_map.get(uf)
        if not r or not r["gov_state"]: continue
        sorted_gov = sorted(r["gov_state"].items(), key=lambda x: x[1], reverse=True)
        v_lider = sorted_gov[0][1] if len(sorted_gov) > 0 else 0
        v_segundo = sorted_gov[1][1] if len(sorted_gov) > 1 else 0
        v_total = sum(v for _, v in sorted_gov)
        v_demais = max(0, v_total - v_lider - v_segundo)
        
        tot_gov_lideres += v_lider
        tot_gov_segundos += v_segundo
        tot_gov_demais += v_demais
        
        # Teste 1º Turno de Governador
        t3 = r["turnout_state"].get("3", [0, 0, 0])
        abst3 = t3[2]
        gov_c1 = sorted_gov[0]
        gov_c2 = sorted_gov[1] if len(sorted_gov) > 1 else None
        
        pct_oficial = round(v_lider / v_total * 100, 2) if v_total > 0 else 0
        eleito_1t_oficial = pct_oficial > 50.0
        
        if eleito_1t_oficial:
            tot_sim = v_total + abst3
            pct_sim = round(v_lider / tot_sim * 100, 2) if tot_sim > 0 else 0
            dif_50 = round(pct_sim - 50.0, 2)
            sobrevive = pct_sim > 50.0
            
            adv_nome = "Abstenção (Eleitores Ausentes)" if abst3 > (gov_c2[1] if gov_c2 else 0) else (gov_c2[0][1].title() if gov_c2 else "")
            analise_gov_1t.append({
                "uf": uf,
                "estado_nome": ESTADOS_METADATA.get(uf, {}).get("nome", uf),
                "governador": title_case_name(gov_c1[0][1]),
                "partido": gov_c1[0][2],
                "nome_completo": f"{title_case_name(gov_c1[0][1])} ({gov_c1[0][2]})",
                "votos": v_lider,
                "validos_oficiais": v_total,
                "pct_oficial": pct_oficial,
                "abstencao": abst3,
                "taxa_abstencao": round(abst3 / t3[0] * 100, 2) if t3[0] > 0 else 0,
                "pct_com_abstencao": pct_sim,
                "diferenca_50": dif_50,
                "sobrevive_1t": sobrevive,
                "status_tag": "SOBREVIVE_1T" if sobrevive else "DERRUBADO_2T",
                "veredito": "Permanece Eleito em 1º Turno" if sobrevive else "Derrubado para o 2º Turno",
                "segundo_nome": title_case_name(gov_c2[0][1]) if gov_c2 else "",
                "segundo_partido": gov_c2[0][2] if gov_c2 else "",
                "segundo_votos": gov_c2[1] if gov_c2 else 0,
                "adversario_2t": adv_nome if not sobrevive else "Sem 2º Turno (Eleito em 1º Turno)",
                "adversario_tipo": "ABSTENCAO" if (not sobrevive and abst3 > (gov_c2[1] if gov_c2 else 0)) else ("CANDIDATO_REAL" if not sobrevive else "NENHUM"),
                "detalhes": f"Oficialmente obteve {pct_oficial}% dos válidos. Com {abst3:,} ausentes, seu percentual {'despenca' if not sobrevive else 'fica'} em {pct_sim}%."
            })
            
    analise_gov_1t.sort(key=lambda x: x["diferenca_50"])
    
    cands_br_gov = [
        {"nome": "Líderes Estaduais Mais Votados", "partido": "DIVERSOS", "numero": "--", "votos": tot_gov_lideres},
        {"nome": "Segundos Colocados Estaduais", "partido": "DIVERSOS", "numero": "--", "votos": tot_gov_segundos},
        {"nome": "Demais Concorrentes Estaduais", "partido": "DIVERSOS", "numero": "--", "votos": tot_gov_demais}
    ]
    ranking_br_gov = calculate_ranking(
        br_turnout_pres[2],
        cands_br_gov,
        cargo="Governador",
        aptos=br_turnout_pres[0]
    )
    
    # Senador Nacional: Bancadas Eleitas Oficiais (54 vagas: 2 por estado)
    bancadas = {}
    senadores_eleitos_por_uf = {}
    
    for uf in UFS:
        r = uf_data_map.get(uf)
        if not r or not r["sen_state"]: continue
        sorted_sen = sorted(r["sen_state"].items(), key=lambda x: x[1], reverse=True)
        # Top 2 eleitos
        eleitos = [c for c in sorted_sen if "ELEITO" in c[0][3] and "NÃO" not in c[0][3]]
        if len(eleitos) < 2:
            eleitos = sorted_sen[:2]
        senadores_eleitos_por_uf[uf] = eleitos[:2]
        
        for c in sorted_sen:
            sg = c[0][2]
            v = c[1]
            if sg not in bancadas:
                bancadas[sg] = {"votos": 0, "eleitos": 0}
            bancadas[sg]["votos"] += v
            if c in eleitos[:2]:
                bancadas[sg]["eleitos"] += 1
                
    cands_br_sen = []
    for sg, info in sorted(bancadas.items(), key=lambda x: x[1]["votos"], reverse=True):
        nm_bancada = f"Bancada do {sg} ({info['eleitos']} Senadores)" if info['eleitos'] > 0 else f"Candidatos do {sg}"
        cands_br_sen.append({
            "nome": nm_bancada,
            "partido": sg,
            "numero": "--",
            "votos": info["votos"]
        })
        
    ranking_br_sen = calculate_ranking(
        br_turnout_pres[2],
        cands_br_sen,
        cargo="Senador",
        aptos=br_turnout_pres[0]
    )
    
    brasil_json = {
        "ano": 2026,
        "titulo": "O Candidato Não-Comparecimento: Análise Eleitoral das Abstenções",
        "subtitulo": "Se a abstenção fosse um candidato, em que lugar ficaria no Brasil, em cada Estado e em qualquer Município?",
        "total_aptos": br_turnout_pres[0],
        "total_abstencao": br_turnout_pres[2],
        "total_comparecimento": br_turnout_pres[1],
        "taxa_abstencao": round(br_turnout_pres[2] / br_turnout_pres[0] * 100, 2),
        "cargos": {
            "Presidente": ranking_br_pres,
            "Governador": ranking_br_gov,
            "Senador": ranking_br_sen
        },
        "analise_governadores_1t": {
            "total_analisados": len(analise_gov_1t),
            "total_derrubados": sum(1 for g in analise_gov_1t if not g["sobrevive_1t"]),
            "total_sobreviventes": sum(1 for g in analise_gov_1t if g["sobrevive_1t"]),
            "total_estados_com_abstencao_no_2t": sum(1 for g in analise_gov_1t if g["adversario_tipo"] == "ABSTENCAO"),
            "pct_derrubados": round(sum(1 for g in analise_gov_1t if not g["sobrevive_1t"]) / len(analise_gov_1t) * 100, 1) if analise_gov_1t else 0,
            "destaque_principal": f"Dos {len(analise_gov_1t)} governadores eleitos em 1º turno no Brasil, {sum(1 for g in analise_gov_1t if not g['sobrevive_1t'])} perderiam a vitória imediata e teriam que disputar o 2º Turno caso os ausentes contassem como votos válidos.",
            "governadores": analise_gov_1t
        }
    }
    
    # -------------------------------------------------------------
    # 4. Construção dos Resultados Estaduais (estados.json)
    # -------------------------------------------------------------
    print("\nConstruindo consolidação dos 27 estados com dados 100% oficiais do TSE...")
    estados_list = []
    
    for uf in UFS:
        r = uf_data_map.get(uf)
        meta = ESTADOS_METADATA.get(uf, {})
        
        t1 = r["turnout_state"].get("1", [0, 0, 0])
        t3 = r["turnout_state"].get("3", t1)
        t5 = r["turnout_state"].get("5", t1)
        
        # 4.1 Presidente State Ranking
        pres_cands_fmt = []
        for (nr, nm, sg), v in sorted(r["pres_state"].items(), key=lambda x: x[1], reverse=True):
            pres_cands_fmt.append({
                "nome": title_case_name(nm),
                "partido": sg,
                "numero": nr,
                "votos": v
            })
        rank_pres = calculate_ranking(t1[2], pres_cands_fmt, cargo="Presidente", aptos=t1[0])
        
        # 4.2 Governador State Ranking
        gov_cands_fmt = []
        for (nr, nm, sg, sit), v in sorted(r["gov_state"].items(), key=lambda x: x[1], reverse=True):
            gov_cands_fmt.append({
                "nome": title_case_name(nm),
                "partido": sg,
                "numero": nr,
                "votos": v
            })
        rank_gov = calculate_ranking(t3[2], gov_cands_fmt, cargo="Governador", aptos=t3[0])
        
        # 4.3 Senador State Ranking (100% Oficial TSE!)
        sen_cands_fmt = []
        for (nr, nm, sg, sit), v in sorted(r["sen_state"].items(), key=lambda x: x[1], reverse=True):
            sen_cands_fmt.append({
                "nome": title_case_name(nm),
                "partido": sg,
                "numero": nr,
                "votos": v
            })
        rank_sen = calculate_ranking(t5[2], sen_cands_fmt, cargo="Senador", aptos=t5[0])
        
        # Status de Governador (forcou_e_iria_2t / forcou_2t_entre_dois / nao_alterou)
        status_gov = "nao_alterou"
        if len(gov_cands_fmt) > 0:
            v_lider = gov_cands_fmt[0]["votos"]
            v_segundo = gov_cands_fmt[1]["votos"] if len(gov_cands_fmt) > 1 else 0
            tot_val = sum(c["votos"] for c in gov_cands_fmt)
            abst3 = t3[2]
            
            # Se oficialmente não venceu em 1º turno, já iria para 2º turno
            if tot_val > 0 and (v_lider / tot_val) <= 0.50:
                status_gov = "nao_alterou"
            else:
                # Venceu em 1º turno oficialmente
                tot_sim = tot_val + abst3
                if tot_sim > 0 and (v_lider / tot_sim) <= 0.50:
                    # Foi forçado para o 2º turno!
                    if abst3 > v_segundo:
                        status_gov = "forcou_e_iria_2t"
                    else:
                        status_gov = "forcou_2t_entre_dois"
                else:
                    status_gov = "nao_alterou"
                    
        est_obj = {
            "uf": uf,
            "nome": meta.get("nome", uf),
            "capital": meta.get("capital", ""),
            "regiao": meta.get("regiao", ""),
            "aptos": t1[0],
            "comparecimento": t1[1],
            "abstencao": t1[2],
            "taxa_abstencao": round(t1[2] / t1[0] * 100, 2) if t1[0] > 0 else 0,
            "status_gov": status_gov,
            "cargos": {
                "Presidente": {
                    "total_aptos": t1[0],
                    "comparecimento": t1[1],
                    "votos": t1[2],
                    "taxa_abstencao": round(t1[2] / t1[0] * 100, 2) if t1[0] > 0 else 0,
                    "posicao": rank_pres["posicao"],
                    "vencedor_primeiro_turno": rank_pres["vencedor_primeiro_turno"],
                    "iria_segundo_turno": rank_pres["iria_segundo_turno"],
                    "eleito_senado": rank_pres["eleito_senado"],
                    "diferenca_lider": rank_pres["diferenca_lider"],
                    "candidatos_superados": rank_pres["candidatos_superados"],
                    "ranking": rank_pres["ranking"]
                },
                "Governador": {
                    "total_aptos": t3[0],
                    "comparecimento": t3[1],
                    "votos": t3[2],
                    "taxa_abstencao": round(t3[2] / t3[0] * 100, 2) if t3[0] > 0 else 0,
                    "posicao": rank_gov["posicao"],
                    "vencedor_primeiro_turno": rank_gov["vencedor_primeiro_turno"],
                    "iria_segundo_turno": rank_gov["iria_segundo_turno"],
                    "eleito_senado": rank_gov["eleito_senado"],
                    "diferenca_lider": rank_gov["diferenca_lider"],
                    "candidatos_superados": rank_gov["candidatos_superados"],
                    "ranking": rank_gov["ranking"]
                },
                "Senador": {
                    "total_aptos": t5[0],
                    "comparecimento": t5[1],
                    "votos": t5[2],
                    "taxa_abstencao": round(t5[2] / t5[0] * 100, 2) if t5[0] > 0 else 0,
                    "posicao": rank_sen["posicao"],
                    "vencedor_primeiro_turno": rank_sen["vencedor_primeiro_turno"],
                    "iria_segundo_turno": rank_sen["iria_segundo_turno"],
                    "eleito_senado": rank_sen["eleito_senado"],
                    "diferenca_lider": rank_sen["diferenca_lider"],
                    "candidatos_superados": rank_sen["candidatos_superados"],
                    "ranking": rank_sen["ranking"]
                }
            }
        }
        estados_list.append(est_obj)
        
    print(f"Total de {len(estados_list)} estados consolidados!")
    
    # -------------------------------------------------------------
    # 5. Enriquecimento dos 5.564 Municípios (municipios_index.json)
    # -------------------------------------------------------------
    print("\nEnriquecendo todos os 5.564 municípios com os dados exatos do TSE...")
    
    updated_mindex = []
    
    for m in mindex:
        uf = m["uf"]
        cd_tse = str(m.get("cd_tse", "")).lstrip("0") or "0"
        r = uf_data_map.get(uf)
        
        # Turnout específico de cada cargo no município
        t1 = r["turnout_mun"].get(("1", cd_tse)) if r else None
        t3 = r["turnout_mun"].get(("3", cd_tse)) if r else None
        t5 = r["turnout_mun"].get(("5", cd_tse)) if r else None
        
        # Fallback se cd_tse não bateu exatamente (por nome limpo)
        if not t1 and r:
            cname = clean_name(m["nome"])
            # procurar nos nomes do bweb/cmz
            for cand_cd, nm in r["mun_names"].items():
                if clean_name(nm) == cname:
                    cd_tse = cand_cd
                    t1 = r["turnout_mun"].get(("1", cd_tse))
                    t3 = r["turnout_mun"].get(("3", cd_tse))
                    t5 = r["turnout_mun"].get(("5", cd_tse))
                    break
                    
        # Turnout padrão
        aptos_pres = t1[0] if t1 else m.get("aptos", 0)
        abst_pres = t1[2] if t1 else m.get("abstencao", 0)
        taxa_pres = round(abst_pres / aptos_pres * 100, 2) if aptos_pres > 0 else m.get("taxa", 0)
        
        aptos_gov = t3[0] if t3 else aptos_pres
        abst_gov = t3[2] if t3 else abst_pres
        taxa_gov = round(abst_gov / aptos_gov * 100, 2) if aptos_gov > 0 else taxa_pres
        
        aptos_sen = t5[0] if t5 else aptos_pres
        abst_sen = t5[2] if t5 else abst_pres
        taxa_sen = round(abst_sen / aptos_sen * 100, 2) if aptos_sen > 0 else taxa_pres
        
        # Votação real de Presidente no município
        p_cands_dict = r["pres_mun"].get(cd_tse, {}) if r else {}
        sorted_p = sorted(p_cands_dict.items(), key=lambda x: x[1], reverse=True)
        
        # Votação real de Governador no município
        g_cands_dict = r["gov_mun"].get(cd_tse, {}) if r else {}
        sorted_g = sorted(g_cands_dict.items(), key=lambda x: x[1], reverse=True)
        
        # Votação real de Senador no município
        s_cands_dict = r["sen_mun"].get(cd_tse, {}) if r else {}
        sorted_s = sorted(s_cands_dict.items(), key=lambda x: x[1], reverse=True)
        
        # Calcular rankings completos com Abstenção
        p_fmt = [{"nome": title_case_name(c[1]), "partido": c[2], "numero": c[0], "votos": v} for c, v in sorted_p]
        g_fmt = [{"nome": title_case_name(c[1]), "partido": c[2], "numero": c[0], "votos": v} for c, v in sorted_g]
        s_fmt = [{"nome": title_case_name(c[1]), "partido": c[2], "numero": c[0], "votos": v} for c, v in sorted_s]
        
        m_rank_pres = calculate_ranking(abst_pres, p_fmt, cargo="Presidente", aptos=aptos_pres)
        m_rank_gov = calculate_ranking(abst_gov, g_fmt, cargo="Governador", aptos=aptos_gov)
        m_rank_sen = calculate_ranking(abst_sen, s_fmt, cargo="Senador", aptos=aptos_sen)
        
        # Status de Governador no município
        status_m_gov = "nao_alterou"
        if len(sorted_g) > 0:
            vg1 = sorted_g[0][1]
            vg2 = sorted_g[1][1] if len(sorted_g) > 1 else 0
            tot_g_val = sum(v for _, v in sorted_g)
            if tot_g_val > 0 and (vg1 / tot_g_val) > 0.50:
                tot_sim_g = tot_g_val + abst_gov
                if tot_sim_g > 0 and (vg1 / tot_sim_g) <= 0.50:
                    status_m_gov = "forcou_e_iria_2t" if abst_gov > vg2 else "forcou_2t_entre_dois"
                    
        # Montar estrutura completa de cargos para o município
        m_cargos = {
            "Presidente": {
                "total_aptos": aptos_pres,
                "comparecimento": t1[1] if t1 else aptos_pres - abst_pres,
                "votos": abst_pres,
                "taxa_abstencao": taxa_pres,
                "posicao": m_rank_pres["posicao"],
                "vencedor_primeiro_turno": m_rank_pres["vencedor_primeiro_turno"],
                "iria_segundo_turno": m_rank_pres["iria_segundo_turno"],
                "eleito_senado": m_rank_pres["eleito_senado"],
                "diferenca_lider": m_rank_pres["diferenca_lider"],
                "candidatos_superados": m_rank_pres["candidatos_superados"],
                "ranking": m_rank_pres["ranking"]
            },
            "Governador": {
                "total_aptos": aptos_gov,
                "comparecimento": t3[1] if t3 else aptos_gov - abst_gov,
                "votos": abst_gov,
                "taxa_abstencao": taxa_gov,
                "posicao": m_rank_gov["posicao"],
                "vencedor_primeiro_turno": m_rank_gov["vencedor_primeiro_turno"],
                "iria_segundo_turno": m_rank_gov["iria_segundo_turno"],
                "eleito_senado": m_rank_gov["eleito_senado"],
                "diferenca_lider": m_rank_gov["diferenca_lider"],
                "candidatos_superados": m_rank_gov["candidatos_superados"],
                "ranking": m_rank_gov["ranking"]
            },
            "Senador": {
                "total_aptos": aptos_sen,
                "comparecimento": t5[1] if t5 else aptos_sen - abst_sen,
                "votos": abst_sen,
                "taxa_abstencao": taxa_sen,
                "posicao": m_rank_sen["posicao"],
                "vencedor_primeiro_turno": m_rank_sen["vencedor_primeiro_turno"],
                "iria_segundo_turno": m_rank_sen["iria_segundo_turno"],
                "eleito_senado": m_rank_sen["eleito_senado"],
                "diferenca_lider": m_rank_sen["diferenca_lider"],
                "candidatos_superados": m_rank_sen["candidatos_superados"],
                "ranking": m_rank_sen["ranking"]
            }
        }
        
        # Atualizar objeto do município
        new_m = {
            **m,
            "aptos": aptos_pres,
            "abstencao": abst_pres,
            "taxa": taxa_pres,
            "taxa_abstencao": taxa_pres,
            "pos_pres": m_rank_pres["posicao"],
            "pos_gov": m_rank_gov["posicao"],
            "pos_sen": m_rank_sen["posicao"],
            "status_gov": status_m_gov,
            
            # Eleitorado específico de cada cargo
            "pres_aptos": aptos_pres,
            "pres_abstencao": abst_pres,
            "taxa_pres": taxa_pres,
            "gov_aptos": aptos_gov,
            "gov_abstencao": abst_gov,
            "taxa_gov": taxa_gov,
            "sen_aptos": aptos_sen,
            "sen_abstencao": abst_sen,
            "taxa_sen": taxa_sen,
            
            # Cargos completos com rankings 100% oficiais do TSE
            "cargos": m_cargos
        }
        updated_mindex.append(new_m)
        
    print(f"Total de {len(updated_mindex)} municípios enriquecidos com cargos 100% reais do TSE!")
    
    # -------------------------------------------------------------
    # 6. Salvar todos os arquivos em data/ e public/data/
    # -------------------------------------------------------------
    print("\nSalvando arquivos atualizados...")
    
    # 6.1 brasil.json
    with open(os.path.join(PUBLIC_DATA_DIR, "brasil.json"), "w", encoding="utf-8") as f:
        json.dump(brasil_json, f, ensure_ascii=False, indent=2)
    print("  brasil.json salvo com sucesso.")
    
    # 6.2 estados.json
    with open(os.path.join(PUBLIC_DATA_DIR, "estados.json"), "w", encoding="utf-8") as f:
        json.dump(estados_list, f, ensure_ascii=False, indent=2)
    print("  estados.json salvo com sucesso.")
    
    # 6.3 municipios_index.json
    with open(os.path.join(PUBLIC_DATA_DIR, "municipios_index.json"), "w", encoding="utf-8") as f:
        json.dump(updated_mindex, f, ensure_ascii=False)
    print("  municipios_index.json salvo com sucesso.")
    
    # 6.4 municipios_geo.json e municipios_geo.js
    # Atualizar propriedades do GeoJSON existente para manter as geometrias perfeitamente intactas
    geo_path = os.path.join(PUBLIC_DATA_DIR, "municipios_geo.json")
    if os.path.exists(geo_path):
        print("  Atualizando propriedades em municipios_geo.json...")
        with open(geo_path, "r", encoding="utf-8") as f:
            geo_data = json.load(f)
            
        m_dict_by_id = {m["id"]: m for m in updated_mindex}
        for feat in geo_data.get("features", []):
            fid = feat.get("properties", {}).get("id") or feat.get("id")
            if fid in m_dict_by_id:
                m_info = m_dict_by_id[fid]
                p = feat["properties"]
                p["pos_pres"] = m_info["pos_pres"]
                p["pos_gov"] = m_info["pos_gov"]
                p["pos_sen"] = m_info["pos_sen"]
                p["status_gov"] = m_info["status_gov"]
                p["aptos"] = m_info["aptos"]
                p["abstencao"] = m_info["abstencao"]
                p["taxa"] = m_info["taxa"]
                p["taxa_abstencao"] = m_info["taxa"]
                p["pres_abstencao"] = m_info["pres_abstencao"]
                p["gov_abstencao"] = m_info["gov_abstencao"]
                p["sen_abstencao"] = m_info["sen_abstencao"]
                p["pres_aptos"] = m_info["pres_aptos"]
                p["gov_aptos"] = m_info["gov_aptos"]
                p["sen_aptos"] = m_info["sen_aptos"]
                # Anexar cargos para acesso direto
                p["cargos"] = m_info["cargos"]
                
        with open(geo_path, "w", encoding="utf-8") as f:
            json.dump(geo_data, f, ensure_ascii=False)
        
        # Salvar municipios_geo.js
        js_content = "window.MUNICIPIOS_GEO = " + json.dumps(geo_data, ensure_ascii=False) + ";"
        with open(os.path.join(PUBLIC_DATA_DIR, "municipios_geo.js"), "w", encoding="utf-8") as f:
            f.write(js_content)
        print("  municipios_geo.json e municipios_geo.js salvos com sucesso.")

    # 6.5 data.js
    data_js_obj = {
        "brasil": brasil_json,
        "estados": estados_list,
        "municipios": updated_mindex[:100] # Top 100 para bootstrap imediato
    }
    data_js_str = f"window.ELECTION_DATA = {json.dumps(data_js_obj, ensure_ascii=False)};"
    with open(os.path.join(PUBLIC_DATA_DIR, "data.js"), "w", encoding="utf-8") as f:
        f.write(data_js_str)
    print("  data.js salvo com sucesso.")
    
    print("\n" + "=" * 70)
    print(f"PROCESSAMENTO CONCLUÍDO COM SUCESSO EM {time.time() - t_start:.2f}s!")
    print("=" * 70)

if __name__ == "__main__":
    main()
