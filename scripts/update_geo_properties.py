import json
import os
import shutil

DATA_DIR = "data"
PUBLIC_DATA_DIR = os.path.join("public", "data")

print("--- Updating GeoJSON properties with official TSE calculations ---")

# 1. Carregar brasil.json e estados.json
with open(os.path.join(DATA_DIR, "brasil.json"), "r", encoding="utf-8") as f:
    brasil_data = json.load(f)

with open(os.path.join(DATA_DIR, "estados.json"), "r", encoding="utf-8") as f:
    estados_list = json.load(f)

with open(os.path.join(DATA_DIR, "municipios_index.json"), "r", encoding="utf-8") as f:
    municipios_index = json.load(f)

estados_map = {e["uf"]: e for e in estados_list}
mun_map = {m["id"]: m for m in municipios_index}

# 2. Atualizar estados_geo.json
estados_geo_path = os.path.join(DATA_DIR, "estados_geo.json")
with open(estados_geo_path, "r", encoding="utf-8") as f:
    estados_geo = json.load(f)

gov_1t_data = brasil_data["analise_governadores_1t"]["governadores"]
gov_1t_map = {g["uf"]: g for g in gov_1t_data}

for feat in estados_geo["features"]:
    uf = feat["properties"]["uf"]
    e = estados_map.get(uf)
    if e:
        props = feat["properties"]
        props["aptos"] = e["aptos"]
        props["abstencao"] = e["abstencao"]
        props["abstencoes"] = e["abstencao"]
        props["taxa"] = e["taxa_abstencao"]
        props["pos_pres"] = e["cargos"]["Presidente"]["posicao"]
        props["pos_gov"] = e["cargos"]["Governador"]["posicao"]
        props["pos_sen"] = e["cargos"]["Senador"]["posicao"]
        
        # Determinar status_gov
        g_info = gov_1t_map.get(uf)
        if g_info:
            if not g_info["sobrevive_1t"]:
                if g_info["adversario_tipo"] == "ABSTENCAO":
                    props["status_gov"] = "forcou_e_iria_2t"
                else:
                    props["status_gov"] = "forcou_2t_entre_dois"
            else:
                props["status_gov"] = "nao_alterou"
        else:
            # Já tinha 2º turno oficial
            props["status_gov"] = "nao_alterou"

with open(estados_geo_path, "w", encoding="utf-8") as f:
    json.dump(estados_geo, f, ensure_ascii=False)

# estados_geo.js
with open(os.path.join(DATA_DIR, "estados_geo.js"), "w", encoding="utf-8") as f:
    f.write("window.ESTADOS_GEO = " + json.dumps(estados_geo, ensure_ascii=False) + ";\n")

print(f"estados_geo.json e estados_geo.js atualizados com 27 UFs.")

# 3. Atualizar municipios_geo.json
mun_geo_path = os.path.join(DATA_DIR, "municipios_geo.json")
with open(mun_geo_path, "r", encoding="utf-8") as f:
    mun_geo = json.load(f)

updated_muns = 0
for feat in mun_geo["features"]:
    mid = feat["properties"]["id"]
    m = mun_map.get(mid)
    if m:
        updated_muns += 1
        props = feat["properties"]
        props["aptos"] = m["aptos"]
        props["abstencao"] = m["abstencao"]
        props["taxa"] = m["taxa"]
        props["pos_pres"] = m["pos_pres"]
        props["pos_gov"] = m["pos_gov"]
        props["pos_sen"] = m["pos_sen"]
        props["iria_2t_pres"] = 1 if m["pos_pres"] in (1, 2) else 0
        props["iria_2t_gov"] = 1 if m["pos_gov"] in (1, 2) else 0
        props["eleito_sen"] = 1 if m["pos_sen"] in (1, 2) else 0
        
        # Status de governador municipal
        if m["pos_gov"] == 2:
            props["status_gov"] = "forcou_e_iria_2t"
        elif m["pos_gov"] == 3:
            # Se a UF do município forçou 2T
            uf_status = estados_map.get(m["uf"], {}).get("dados_1t_governador")
            g_uf = gov_1t_map.get(m["uf"])
            if g_uf and not g_uf["sobrevive_1t"]:
                props["status_gov"] = "forcou_2t_entre_dois"
            else:
                props["status_gov"] = "nao_alterou"
        else:
            props["status_gov"] = "nao_alterou"

with open(mun_geo_path, "w", encoding="utf-8") as f:
    json.dump(mun_geo, f, ensure_ascii=False)

# municipios_geo.js
with open(os.path.join(DATA_DIR, "municipios_geo.js"), "w", encoding="utf-8") as f:
    f.write("window.MUNICIPIOS_GEO = " + json.dumps(mun_geo, ensure_ascii=False) + ";\n")

print(f"municipios_geo.json e municipios_geo.js atualizados ({updated_muns} municípios).")

# 4. Copiar para public/data/
for fname in ["estados_geo.json", "estados_geo.js", "municipios_geo.json", "municipios_geo.js"]:
    src = os.path.join(DATA_DIR, fname)
    dst = os.path.join(PUBLIC_DATA_DIR, fname)
    if os.path.exists(src):
        shutil.copy2(src, dst)

print("Arquivos copiados para public/data/ com sucesso!")
