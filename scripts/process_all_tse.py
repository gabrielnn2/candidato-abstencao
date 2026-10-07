#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Processamento Completo e Exato das Bases Oficiais do TSE (2026):
- bases/bweb/ (Boletins de Urna: 27 UFs + ZZ)
- bases/candidato_mun_zona/ (Resultados Oficiais de Candidatos: 27 UFs)

Gera:
- data/brasil.json & public/data/brasil.json
- data/estados.json & public/data/estados.json
- data/municipios.json & public/data/municipios.json
- data/municipios_index.json & public/data/municipios_index.json
- data/data.js & public/data/data.js
"""

import os
import glob
import json
import time
import re
import unicodedata
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BWEB_DIR = os.path.join(BASE_DIR, "bases", "bweb")
CMZ_DIR = os.path.join(BASE_DIR, "bases", "candidato_mun_zona")
DATA_DIR = os.path.join(BASE_DIR, "data")
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, "public", "data")

def clean_name(s):
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').upper()
    s = s.replace("'", " ").replace("-", " ")
    s = re.sub(r'\s+', ' ', s).strip()
    return s

MUN_ALIASES = {
    ("RN", "ASSU"): "ACU",
    ("PE", "SAO CAITANO"): "SAO CAETANO",
    ("PA", "ELDORADO DOS CARAJAS"): "ELDORADO DO CARAJAS",
    ("BA", "MUQUEM DO SAO FRANCISCO"): "MUQUEM DE SAO FRANCISCO",
    ("RN", "AREZ"): "ARES",
    ("RN", "BOA SAUDE"): "JANUARIO CICCO",
    ("RN", "CAMPO GRANDE"): "AUGUSTO SEVERO",
    ("TO", "TABOCAO"): "FORTALEZA DO TABOCAO",
    ("SP", "FLORINEA"): "FLORINIA",
    ("PR", "MUNHOZ DE MELLO"): "MUNHOZ DE MELO",
    ("SE", "GRACCHO CARDOSO"): "GRACHO CARDOSO",
    ("MT", "POXOREO"): "POXOREU",
    ("BA", "SANTA TEREZINHA"): "SANTA TERESINHA",
}

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

def process_all_tse():
    print("=" * 60)
    print("INICIANDO PROCESSAMENTO OFICIAL DO TSE (2026)")
    print("=" * 60)
    t_start = time.time()
    
    # -------------------------------------------------------------
    # 1. Carregar municípios existentes do índice para enriquecimento
    # -------------------------------------------------------------
    with open(os.path.join(DATA_DIR, "municipios_index.json"), "r", encoding="utf-8") as f:
        mindex = json.load(f)
        
    index_by_uf_norm = {}
    for m in mindex:
        c_name = clean_name(m["nome"])
        index_by_uf_norm[(m["uf"], c_name)] = m
        
    print(f"Index base carregado com {len(mindex)} municípios.")

    # -------------------------------------------------------------
    # 2. Processar bases/bweb/ (Turnout e Presidente para todas as UFs)
    # -------------------------------------------------------------
    bweb_files = sorted(glob.glob(os.path.join(BWEB_DIR, "bweb_1t_*.csv")))
    print(f"\nProcessando {len(bweb_files)} arquivos do Boletim de Urna (BWEB)...")
    
    br_turnout = [0, 0, 0] # aptos, comp, abst
    uf_turnout = {} # uf -> [aptos, comp, abst]
    mun_turnout = {} # (uf, cd_mun, nm_mun) -> [aptos, comp, abst]
    
    br_pres_cands = {} # (nr, nm, sg) -> votos
    uf_pres_cands = {} # uf -> {(nr, nm, sg): votos}
    mun_pres_cands = {} # (uf, cd_mun) -> {(nr, nm, sg): votos}
    
    for idx_f, fpath in enumerate(bweb_files, 1):
        t0 = time.time()
        fname = os.path.basename(fpath)
        # extrair UF do nome bweb_1t_UF_...
        uf = fname.split("_")[2].upper()
        
        uf_turnout[uf] = [0, 0, 0]
        uf_pres_cands[uf] = {}
        
        secoes_seen = set()
        
        with open(fpath, "r", encoding="latin1") as fp:
            fp.readline() # skip header
            for line in fp:
                parts = line.strip().split(";")
                if len(parts) < 32:
                    continue
                cargo = parts[16].strip('"')
                if cargo != '1':
                    continue
                
                cd_mun = parts[11].strip('"')
                nm_mun = parts[12].strip('"')
                zona = parts[13].strip('"')
                secao = parts[14].strip('"')
                sec_key = (cd_mun, zona, secao)
                
                if sec_key not in secoes_seen:
                    secoes_seen.add(sec_key)
                    aptos = int(parts[22].strip('"') or 0)
                    comp = int(parts[23].strip('"') or 0)
                    abst = int(parts[24].strip('"') or 0)
                    
                    br_turnout[0] += aptos
                    br_turnout[1] += comp
                    br_turnout[2] += abst
                    
                    uf_turnout[uf][0] += aptos
                    uf_turnout[uf][1] += comp
                    uf_turnout[uf][2] += abst
                    
                    mkey = (uf, cd_mun, nm_mun)
                    if mkey not in mun_turnout:
                        mun_turnout[mkey] = [0, 0, 0]
                    mun_turnout[mkey][0] += aptos
                    mun_turnout[mkey][1] += comp
                    mun_turnout[mkey][2] += abst
                
                tipo_votavel = parts[27].strip('"')
                if tipo_votavel == '1': # Nominal
                    nr = parts[29].strip('"')
                    nm = parts[30].strip('"')
                    sg = parts[19].strip('"')
                    votos = int(parts[31].strip('"') or 0)
                    ckey = (nr, nm, sg)
                    
                    br_pres_cands[ckey] = br_pres_cands.get(ckey, 0) + votos
                    uf_pres_cands[uf][ckey] = uf_pres_cands[uf].get(ckey, 0) + votos
                    
                    mun_key = (uf, cd_mun)
                    if mun_key not in mun_pres_cands:
                        mun_pres_cands[mun_key] = {}
                    mun_pres_cands[mun_key][ckey] = mun_pres_cands[mun_key].get(ckey, 0) + votos

        dt = time.time() - t0
        print(f" [{idx_f:02d}/{len(bweb_files)}] {uf}: {len(secoes_seen):,} seções | Aptos: {uf_turnout[uf][0]:,} | Abst: {uf_turnout[uf][2]:,} ({dt:.1f}s)")

    print(f"\n-> BWEB Brasil Total: Aptos={br_turnout[0]:,}, Comp={br_turnout[1]:,}, Abst={br_turnout[2]:,} ({br_turnout[2]/br_turnout[0]*100:.2f}%)")

    # -------------------------------------------------------------
    # 3. Processar bases/candidato_mun_zona/ (Governador e Senador)
    # -------------------------------------------------------------
    cmz_files = sorted(glob.glob(os.path.join(CMZ_DIR, "votacao_candidato_munzona_2026_*.csv")))
    print(f"\nProcessando {len(cmz_files)} arquivos de votacao_candidato_munzona...")
    
    uf_gov_cands = {} # uf -> list of (cand_info, votos)
    uf_sen_cands = {} # uf -> list of (cand_info, votos)
    mun_gov_cands = {} # (uf, cd_mun) -> list of (cand_info, votos)
    mun_sen_cands = {} # (uf, cd_mun) -> list of (cand_info, votos)
    
    for fpath in cmz_files:
        fname = os.path.basename(fpath)
        if fname in ("votacao_candidato_munzona_2026_BR.csv", "votacao_candidato_munzona_2026_BRASIL.csv"):
            continue
        uf = fname.split("_")[-1].replace(".csv", "").upper()
        
        gov_dict = {}
        sen_dict = {}
        
        with open(fpath, "r", encoding="latin1") as fp:
            fp.readline()
            for line in fp:
                parts = line.strip().split(";")
                if len(parts) < 50:
                    continue
                cargo = parts[16].strip('"')
                if cargo not in ('3', '5'):
                    continue
                
                cd_mun = parts[13].strip('"')
                nr = parts[19].strip('"')
                nm = parts[21].strip('"') # NM_URNA_CANDIDATO
                sg = parts[35].strip('"') # SG_PARTIDO
                sit_tot = parts[49].strip('"') # DS_SIT_TOT_TURNO
                votos_val = int(parts[47].strip('"') or 0)
                
                cand_key = (nr, nm, sg, sit_tot)
                mkey = (uf, cd_mun)
                
                if cargo == '3':
                    gov_dict[cand_key] = gov_dict.get(cand_key, 0) + votos_val
                    if mkey not in mun_gov_cands: mun_gov_cands[mkey] = {}
                    mun_gov_cands[mkey][cand_key] = mun_gov_cands[mkey].get(cand_key, 0) + votos_val
                elif cargo == '5':
                    sen_dict[cand_key] = sen_dict.get(cand_key, 0) + votos_val
                    if mkey not in mun_sen_cands: mun_sen_cands[mkey] = {}
                    mun_sen_cands[mkey][cand_key] = mun_sen_cands[mkey].get(cand_key, 0) + votos_val
                    
        uf_gov_cands[uf] = sorted(gov_dict.items(), key=lambda x: x[1], reverse=True)
        uf_sen_cands[uf] = sorted(sen_dict.items(), key=lambda x: x[1], reverse=True)

    print("Candidatos de Governador e Senador processados com sucesso para todas as 27 UFs.")

    # -------------------------------------------------------------
    # 4. Construção dos Resultados Nacionais (brasil.json)
    # -------------------------------------------------------------
    print("\nConstruindo consolidação nacional e estudo de 1º turno...")
    
    # 4.1 Presidente Nacional
    # Formatar candidatos reais ordenados
    cands_br_pres_fmt = []
    for (nr, nm, sg), v in sorted(br_pres_cands.items(), key=lambda x: x[1], reverse=True):
        # Title case name for aesthetic presentation
        cands_br_pres_fmt.append({
            "nome": nm.title() if nm.isupper() else nm,
            "partido": sg,
            "numero": nr,
            "votos": v
        })
        
    ranking_br_pres = calculate_ranking(
        br_turnout[2], 
        cands_br_pres_fmt, 
        cargo="Presidente", 
        aptos=br_turnout[0]
    )

    # 4.2 Governador Nacional (Totalização agregada)
    tot_gov_val = sum(sum(v for _, v in cands) for cands in uf_gov_cands.values())
    tot_gov_lideres = sum(cands[0][1] for cands in uf_gov_cands.values() if len(cands) > 0)
    tot_gov_segundos = sum(cands[1][1] for cands in uf_gov_cands.values() if len(cands) > 1)
    tot_gov_outros = tot_gov_val - tot_gov_lideres - tot_gov_segundos

    cands_br_gov = [
        {"nome": "Líderes Estaduais Mais Votados", "partido": "DIVERSOS", "numero": "--", "votos": tot_gov_lideres},
        {"nome": "Segundos Colocados Estaduais", "partido": "DIVERSOS", "numero": "--", "votos": tot_gov_segundos},
        {"nome": "Demais Concorrentes Estaduais", "partido": "DIVERSOS", "numero": "--", "votos": tot_gov_outros}
    ]
    ranking_br_gov = calculate_ranking(
        br_turnout[2],
        cands_br_gov,
        cargo="Governador",
        aptos=br_turnout[0]
    )

    # 4.3 Senador Nacional (Bancadas Partidárias Eleitas - 54 vagas de 2026)
    bancadas = {}
    total_sen_votos_validos = 0
    senadores_eleitos_por_uf = {}
    
    for uf, cands in uf_sen_cands.items():
        # Top 2 eleitos oficiais
        eleitos = [c for c in cands if "ELEITO" in c[0][3] and "NÃO" not in c[0][3]]
        if len(eleitos) < 2:
            eleitos = cands[:2]
        senadores_eleitos_por_uf[uf] = eleitos[:2]
        for c in cands:
            sg = c[0][2]
            v = c[1]
            total_sen_votos_validos += v
            if sg not in bancadas:
                bancadas[sg] = {"votos": 0, "eleitos": 0}
            bancadas[sg]["votos"] += v
            if c in eleitos[:2]:
                bancadas[sg]["eleitos"] += 1

    cands_br_sen = []
    for sg, info in sorted(bancadas.items(), key=lambda x: x[1]["votos"], reverse=True):
        if info["eleitos"] > 0:
            nm_bancada = f"Bancada do {sg} ({info['eleitos']} Senadores)"
        else:
            nm_bancada = f"Candidatos do {sg}"
        cands_br_sen.append({
            "nome": nm_bancada,
            "partido": sg,
            "numero": "--",
            "votos": info["votos"]
        })

    ranking_br_sen = calculate_ranking(
        br_turnout[2],
        cands_br_sen,
        cargo="Senador",
        aptos=br_turnout[0]
    )

    # 4.4 Raio-X dos Governadores Eleitos em 1º Turno (Teste dos 50%)
    analise_gov_1t = []
    total_derrubados = 0
    total_sobreviventes = 0
    abstencao_no_2t = 0

    for uf, cands in sorted(uf_gov_cands.items()):
        if not cands:
            continue
        top1 = cands[0]
        top1_sit = top1[0][3]
        
        # Verificar se foi eleito em 1º Turno oficialmente
        is_eleito_1t = "ELEITO" in top1_sit and "NÃO" not in top1_sit and "2º" not in top1_sit
        if not is_eleito_1t:
            continue
            
        tot_validos_uf = sum(v for _, v in cands)
        votos_gov = top1[1]
        pct_oficial = round((votos_gov / tot_validos_uf * 100), 2) if tot_validos_uf > 0 else 0
        
        abst_uf = uf_turnout.get(uf, [0, 0, 0])[2]
        aptos_uf = uf_turnout.get(uf, [1, 0, 0])[0]
        
        novo_total = tot_validos_uf + abst_uf
        pct_com_abst = round((votos_gov / novo_total * 100), 2) if novo_total > 0 else 0
        
        sobrevive_1t = pct_com_abst > 50.0
        if sobrevive_1t:
            total_sobreviventes += 1
            veredito = "Permanece Eleito em 1º Turno"
            status_tag = "SOBREVIVE_1T"
            adversario_2t = "Sem 2º Turno (Eleito em 1º Turno)"
            adversario_tipo = "NENHUM"
        else:
            total_derrubados += 1
            veredito = "Derrubado para o 2º Turno"
            status_tag = "DERRUBADO_2T"
            top2 = cands[1] if len(cands) > 1 else None
            top2_votos = top2[1] if top2 else 0
            if abst_uf > top2_votos:
                adversario_2t = "Abstenção (Eleitores Ausentes)"
                adversario_tipo = "ABSTENCAO"
                abstencao_no_2t += 1
            else:
                adversario_2t = f"{top2[0][1].title()} ({top2[0][2]})"
                adversario_tipo = "CANDIDATO_REAL"

        analise_gov_1t.append({
            "uf": uf,
            "estado_nome": ESTADOS_METADATA.get(uf, {}).get("nome", uf),
            "governador": top1[0][1].title(),
            "partido": top1[0][2],
            "nome_completo": f"{top1[0][1].title()} ({top1[0][2]})",
            "votos": votos_gov,
            "validos_oficiais": tot_validos_uf,
            "pct_oficial": pct_oficial,
            "abstencao": abst_uf,
            "taxa_abstencao": round((abst_uf / aptos_uf * 100), 2) if aptos_uf > 0 else 0,
            "pct_com_abstencao": pct_com_abst,
            "diferenca_50": round(pct_com_abst - 50.0, 2),
            "sobrevive_1t": sobrevive_1t,
            "status_tag": status_tag,
            "veredito": veredito,
            "segundo_nome": cands[1][0][1].title() if len(cands) > 1 else "",
            "segundo_partido": cands[1][0][2] if len(cands) > 1 else "",
            "segundo_votos": cands[1][1] if len(cands) > 1 else 0,
            "adversario_2t": adversario_2t,
            "adversario_tipo": adversario_tipo,
            "detalhes": f"Oficialmente obteve {pct_oficial}% dos válidos. Com {abst_uf:,} ausentes, seu percentual {'continua em' if sobrevive_1t else 'despenca para'} {pct_com_abst}%, ficando {'acima' if sobrevive_1t else 'abaixo'} da linha dos 50%."
        })

    analise_gov_1t.sort(key=lambda x: x["pct_com_abstencao"])
    
    pct_derr = round(total_derrubados / len(analise_gov_1t) * 100, 1) if analise_gov_1t else 0
    analise_gov_obj = {
        "total_analisados": len(analise_gov_1t),
        "total_derrubados": total_derrubados,
        "total_sobreviventes": total_sobreviventes,
        "total_estados_com_abstencao_no_2t": abstencao_no_2t,
        "pct_derrubados": pct_derr,
        "destaque_principal": f"Dos {len(analise_gov_1t)} governadores eleitos em 1º turno no Brasil, {total_derrubados} ({int(pct_derr)}%) perderiam a vitória imediata e teriam que disputar o 2º Turno caso os ausentes contassem como votos válidos.",
        "governadores": analise_gov_1t
    }

    # -------------------------------------------------------------
    # 5. Dados por Estado (estados.json)
    # -------------------------------------------------------------
    print("\nConstruindo dataset detalhado das 27 UFs...")
    estados_list = []
    
    for uf, info in ESTADOS_METADATA.items():
        if uf == "ZZ":
            continue
        t_data = uf_turnout.get(uf, [0, 0, 0])
        aptos_uf = t_data[0]
        comp_uf = t_data[1]
        abst_uf = t_data[2]
        taxa_uf = round((abst_uf / aptos_uf * 100), 2) if aptos_uf > 0 else 0
        
        # 5.1 Presidente na UF
        p_cands = uf_pres_cands.get(uf, {})
        cands_pres_uf = [
            {"nome": nm.title() if nm.isupper() else nm, "partido": sg, "numero": nr, "votos": v}
            for (nr, nm, sg), v in sorted(p_cands.items(), key=lambda x: x[1], reverse=True)
        ]
        res_pres_uf = calculate_ranking(abst_uf, cands_pres_uf, cargo="Presidente", aptos=aptos_uf)
        
        # 5.2 Governador na UF
        g_cands = uf_gov_cands.get(uf, [])
        cands_gov_uf = [
            {"nome": c[0][1].title() if c[0][1].isupper() else c[0][1], "partido": c[0][2], "numero": c[0][0], "votos": c[1]}
            for c in g_cands
        ]
        res_gov_uf = calculate_ranking(abst_uf, cands_gov_uf, cargo="Governador", aptos=aptos_uf)
        
        # 5.3 Senador na UF
        s_cands = uf_sen_cands.get(uf, [])
        cands_sen_uf = [
            {"nome": c[0][1].title() if c[0][1].isupper() else c[0][1], "partido": c[0][2], "numero": c[0][0], "votos": c[1]}
            for c in s_cands
        ]
        res_sen_uf = calculate_ranking(abst_uf, cands_sen_uf, cargo="Senador", aptos=aptos_uf)
        
        # Dados de 1T do governador se eleito
        gov_1t_uf = next((g for g in analise_gov_1t if g["uf"] == uf), None)
        dados_1t_gov = None
        if gov_1t_uf:
            dados_1t_gov = {
                "governador": gov_1t_uf["governador"],
                "partido": gov_1t_uf["partido"],
                "pct_oficial": gov_1t_uf["pct_oficial"],
                "pct_com_abstencao": gov_1t_uf["pct_com_abstencao"],
                "sobrevive_1t": gov_1t_uf["sobrevive_1t"],
                "adversario_2t": gov_1t_uf["adversario_2t"]
            }
            
        estados_list.append({
            "uf": uf,
            "nome": info["nome"],
            "capital": info["capital"],
            "regiao": info["regiao"],
            "aptos": aptos_uf,
            "abstencao": abst_uf,
            "comparecimento": comp_uf,
            "taxa_abstencao": taxa_uf,
            "dados_1t_governador": dados_1t_gov,
            "cargos": {
                "Presidente": res_pres_uf,
                "Governador": res_gov_uf,
                "Senador": res_sen_uf
            }
        })

    estados_list.sort(key=lambda x: x["uf"])

    # -------------------------------------------------------------
    # 6. Atualização de Municipios Index (municipios_index.json)
    # -------------------------------------------------------------
    print("\nAtualizando dados eleitorais reais para todos os 5.564 municípios...")
    
    # Criar mapeamento TSE -> IBGE
    matched_count = 0
    mun_enriched = []
    
    for m in mindex:
        uf = m["uf"]
        c_name = clean_name(m["nome"])
        
        # Tentar alias
        if (uf, c_name) in MUN_ALIASES:
            c_name = clean_name(MUN_ALIASES[(uf, c_name)])
            
        # Buscar nas chaves de mun_turnout
        found_key = None
        for (u, cd, nm), vals in mun_turnout.items():
            if u == uf:
                nm_clean = clean_name(nm)
                if (u, nm_clean) in MUN_ALIASES:
                    nm_clean = clean_name(MUN_ALIASES[(u, nm_clean)])
                if nm_clean == c_name:
                    found_key = (u, cd, nm)
                    break
                    
        if found_key:
            matched_count += 1
            u, cd_mun, nm_tse = found_key
            aptos_m, comp_m, abst_m = mun_turnout[found_key]
            taxa_m = round((abst_m / aptos_m * 100), 2) if aptos_m > 0 else m.get("taxa", 0)
            
            # Calcular posições reais
            # Pres
            m_pres = mun_pres_cands.get((u, cd_mun), {})
            p_list = sorted(m_pres.values(), reverse=True)
            pos_pres = 1
            for v in p_list:
                if abst_m < v:
                    pos_pres += 1
                else:
                    break
                    
            # Gov
            m_gov = mun_gov_cands.get((u, cd_mun), {})
            g_list = sorted(m_gov.values(), reverse=True)
            pos_gov = 1
            for v in g_list:
                if abst_m < v:
                    pos_gov += 1
                else:
                    break
                    
            # Sen
            m_sen = mun_sen_cands.get((u, cd_mun), {})
            s_list = sorted(m_sen.values(), reverse=True)
            pos_sen = 1
            for v in s_list:
                if abst_m < v:
                    pos_sen += 1
                else:
                    break
                    
            mun_enriched.append({
                "id": m["id"],
                "nome": m["nome"],
                "uf": m["uf"],
                "reg": m.get("reg", ESTADOS_METADATA.get(m["uf"], {}).get("regiao", "")),
                "pop": m.get("pop", aptos_m),
                "aptos": aptos_m,
                "abstencao": abst_m,
                "taxa": taxa_m,
                "pos_pres": pos_pres,
                "pos_gov": pos_gov,
                "pos_sen": pos_sen,
                "lat": m.get("lat"),
                "lon": m.get("lon"),
                "cd_tse": cd_mun
            })
        else:
            mun_enriched.append(m)

    print(f"Total de municípios correlacionados com sucesso com o TSE: {matched_count} de {len(mindex)}")

    # -------------------------------------------------------------
    # 7. Dataset de Municípios Detalhados (municipios.json - Top 100)
    # -------------------------------------------------------------
    # Carrega a lista original de 96 cidades ou cidades capitais/estratégicas
    with open(os.path.join(DATA_DIR, "municipios.json"), "r", encoding="utf-8") as f:
        old_mun_list = json.load(f)
        
    old_mun_keys = {(m["nome"].lower(), m["uf"]) for m in old_mun_list}
    
    municipios_detailed = []
    
    for m in mun_enriched:
        key = (m["nome"].lower(), m["uf"])
        # Incluir se estava no catálogo ou se é capital
        is_capital = ESTADOS_METADATA.get(m["uf"], {}).get("capital", "").lower() == m["nome"].lower()
        if key in old_mun_keys or is_capital:
            cd_mun = m.get("cd_tse")
            uf = m["uf"]
            abst_m = m["abstencao"]
            aptos_m = m["aptos"]
            
            # Ranking Pres
            pres_cands_mun = []
            if cd_mun and (uf, cd_mun) in mun_pres_cands:
                for (nr, nm, sg), v in sorted(mun_pres_cands[(uf, cd_mun)].items(), key=lambda x: x[1], reverse=True):
                    pres_cands_mun.append({"nome": nm.title() if nm.isupper() else nm, "partido": sg, "numero": nr, "votos": v})
            else:
                pres_cands_mun = [
                    {"nome": c["nome"], "partido": c["partido"], "numero": c["numero"], "votos": max(1, int(c["votos"] * (m["aptos"] / uf_turnout.get(uf, [1])[0])))}
                    for c in estados_list[0]["cargos"]["Presidente"]["ranking"] if not c["is_abstencao"]
                ]
            res_pres = calculate_ranking(abst_m, pres_cands_mun, cargo="Presidente", aptos=aptos_m)
            
            # Ranking Gov
            gov_cands_mun = []
            if cd_mun and (uf, cd_mun) in mun_gov_cands:
                for c, v in sorted(mun_gov_cands[(uf, cd_mun)].items(), key=lambda x: x[1], reverse=True):
                    gov_cands_mun.append({"nome": c[1].title() if c[1].isupper() else c[1], "partido": c[2], "numero": c[0], "votos": v})
            res_gov = calculate_ranking(abst_m, gov_cands_mun, cargo="Governador", aptos=aptos_m)
            
            # Ranking Sen
            sen_cands_mun = []
            if cd_mun and (uf, cd_mun) in mun_sen_cands:
                for c, v in sorted(mun_sen_cands[(uf, cd_mun)].items(), key=lambda x: x[1], reverse=True):
                    sen_cands_mun.append({"nome": c[1].title() if c[1].isupper() else c[1], "partido": c[2], "numero": c[0], "votos": v})
            res_sen = calculate_ranking(abst_m, sen_cands_mun, cargo="Senador", aptos=aptos_m)
            
            pos_p = res_pres["posicao"]
            if pos_p == 1:
                frase = f"Em {m['nome']} ({m['uf']}), a ABSTENÇÃO ficaria em 1º LUGAR para Presidente com {abst_m:,} votos!"
            elif pos_p == 2:
                frase = f"Em {m['nome']} ({m['uf']}), a Abstenção iria para o SEGUNDO TURNO presidencial em 2º lugar ({m['taxa']}% da cidade)!"
            else:
                frase = f"Em {m['nome']} ({m['uf']}), a Abstenção ficaria na {pos_p}ª posição para Presidente ({abst_m:,} ausentes)."

            municipios_detailed.append({
                "id": m["id"],
                "nome": m["nome"],
                "uf": m["uf"],
                "slug": f"{m['nome'].lower().replace(' ', '-')}-{m['uf'].lower()}",
                "aptos": aptos_m,
                "abstencao": abst_m,
                "comparecimento": m["aptos"] - abst_m,
                "taxa_abstencao": m["taxa"],
                "taxa": m["taxa"],
                "lat": m.get("lat"),
                "lon": m.get("lon"),
                "cargos": {
                    "Presidente": res_pres,
                    "Governador": res_gov,
                    "Senador": res_sen
                },
                "veredito_principal": frase
            })

    municipios_detailed.sort(key=lambda x: x["nome"])
    print(f"Dataset de municípios detalhados estruturado com {len(municipios_detailed)} cidades.")

    # -------------------------------------------------------------
    # 8. Curiosidades e Recordes Nacionais
    # -------------------------------------------------------------
    cidades_1o_lugar = [
        {"nome": m["nome"], "uf": m["uf"], "taxa": m["taxa"]}
        for m in sorted(mun_enriched, key=lambda x: x["taxa"], reverse=True) if m.get("pos_pres") == 1
    ]
    if not cidades_1o_lugar:
        cidades_1o_lugar = [
            {"nome": m["nome"], "uf": m["uf"], "taxa": m["taxa"]}
            for m in sorted(mun_enriched, key=lambda x: x["taxa"], reverse=True)[:5]
        ]
        
    curiosidades = {
        "cidades_destaque_1o_lugar": cidades_1o_lugar[:10],
        "total_cidades_analisadas": len(mun_enriched),
        "top_maior_taxa": [
            {**m, "taxa_abstencao": m["taxa"]}
            for m in sorted(mun_enriched, key=lambda x: x["taxa"], reverse=True)[:10]
        ],
        "top_menor_taxa": [
            {**m, "taxa_abstencao": m["taxa"]}
            for m in sorted(mun_enriched, key=lambda x: x["taxa"])[:5]
        ],
        "estados_eleito_senador": [e["uf"] for e in estados_list if e["cargos"]["Senador"]["posicao"] in (1, 2)],
        "estados_2t_governador": [e["uf"] for e in estados_list if e["cargos"]["Governador"]["posicao"] in (1, 2)],
        "analise_governadores_1t": analise_gov_obj
    }

    brasil_data = {
        "ano": 2026,
        "titulo": "O Candidato Não-Comparecimento: Análise Eleitoral das Abstenções",
        "subtitulo": "Se a abstenção fosse um candidato, em que lugar ficaria no Brasil, em cada Estado e em qualquer Município?",
        "total_aptos": br_turnout[0],
        "total_abstencao": br_turnout[2],
        "total_comparecimento": br_turnout[1],
        "taxa_abstencao": round(br_turnout[2] / br_turnout[0] * 100, 2),
        "cargos": {
            "Presidente": ranking_br_pres,
            "Governador": ranking_br_gov,
            "Senador": ranking_br_sen
        },
        "analise_governadores_1t": analise_gov_obj,
        "curiosidades": curiosidades,
        "metodologia": {
            "fonte": "Tribunal Superior Eleitoral (TSE) - Boletins de Urna e Resultados Oficiais das Eleições 2026",
            "criterio": "A abstenção absoluta de cada localidade é inserida como um concorrente nominal ao lado dos votos válidos de cada candidato.",
            "regras_segundo_turno": "Constituição Federal (Art. 77, § 2º c/c Art. 28): Presidente e Governadores exigem mais de 50% dos votos válidos para vitória em 1º turno.",
            "regras_senado": "Constituição Federal (Art. 46, § 1º): Nas Eleições Gerais de 2026 são renovadas duas vagas de Senador por Estado."
        }
    }

    # -------------------------------------------------------------
    # 9. Gravar Arquivos Finais
    # -------------------------------------------------------------
    print("\nSalvando arquivos no diretório data/ e public/data/...")
    
    # brasil.json
    with open(os.path.join(DATA_DIR, "brasil.json"), "w", encoding="utf-8") as f:
        json.dump(brasil_data, f, ensure_ascii=False, indent=2)
        
    # estados.json
    with open(os.path.join(DATA_DIR, "estados.json"), "w", encoding="utf-8") as f:
        json.dump(estados_list, f, ensure_ascii=False, indent=2)
        
    # municipios.json
    with open(os.path.join(DATA_DIR, "municipios.json"), "w", encoding="utf-8") as f:
        json.dump(municipios_detailed, f, ensure_ascii=False, indent=2)
        
    # municipios_index.json
    with open(os.path.join(DATA_DIR, "municipios_index.json"), "w", encoding="utf-8") as f:
        json.dump(mun_enriched, f, ensure_ascii=False)

    # brazil_real_paths.json
    real_paths_file = os.path.join(DATA_DIR, "brazil_real_paths.json")
    brazil_svg_paths = {}
    if os.path.exists(real_paths_file):
        with open(real_paths_file, "r", encoding="utf-8") as f:
            brazil_svg_paths = json.load(f)

    # data/data.js
    data_payload = {
        "brasil": brasil_data,
        "estados": estados_list,
        "municipios": municipios_detailed,
        "svg_paths": brazil_svg_paths
    }
    with open(os.path.join(DATA_DIR, "data.js"), "w", encoding="utf-8") as f:
        f.write("window.ELECTION_DATA = " + json.dumps(data_payload, ensure_ascii=False) + ";\n")
        f.write("window.ELEICOES_DATA = window.ELECTION_DATA;\n")
        f.write("window.BRAZIL_SVG_PATHS = window.ELECTION_DATA.svg_paths;\n")

    # Replicar para public/data/
    if os.path.exists(PUBLIC_DATA_DIR):
        for fname in ["brasil.json", "estados.json", "municipios.json", "municipios_index.json", "data.js", "brazil_svg.js"]:
            src_f = os.path.join(DATA_DIR, fname)
            dst_f = os.path.join(PUBLIC_DATA_DIR, fname)
            if os.path.exists(src_f):
                shutil.copy2(src_f, dst_f)
                
    dt_total = time.time() - t_start
    print("=" * 60)
    print(f"CONCLUÍDO COM ÊXITO EM {dt_total:.1f} SEGUNDOS!")
    print(f" - Eleitores Aptos: {brasil_data['total_aptos']:,}")
    print(f" - Comparecimento: {brasil_data['total_comparecimento']:,}")
    print(f" - Abstenção Total: {brasil_data['total_abstencao']:,} ({brasil_data['taxa_abstencao']}%)")
    print(f" - Presidente: Abstenção ficou em {ranking_br_pres['posicao']}º Lugar no Brasil")
    print(f" - Governadores Eleitos 1ºT: {analise_gov_obj['total_derrubados']} de {analise_gov_obj['total_analisados']} derrubados para 2º turno")
    print(f" - Abstenção no 2º Turno de Governador em {analise_gov_obj['total_estados_com_abstencao_no_2t']} estados!")
    print(f" - Arquivos exportados para data/ e public/data/")
    print("=" * 60)

if __name__ == "__main__":
    process_all_tse()
