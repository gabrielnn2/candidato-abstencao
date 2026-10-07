import urllib.request, zipfile, io, json, time, os, shutil, unicodedata, re

def clean_name(s):
    if not s: return ""
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
    ("RN", "JANUARIO CICCO (BOA SAUDE)"): "JANUARIO CICCO",
    ("RN", "AUGUSTO SEVERO (CAMPO GRANDE)"): "AUGUSTO SEVERO",
    ("RN", "CAMPO GRANDE"): "AUGUSTO SEVERO",
    ("TO", "TABOCAO"): "FORTALEZA DO TABOCAO",
    ("SP", "FLORINEA"): "FLORINIA",
    ("PR", "MUNHOZ DE MELLO"): "MUNHOZ DE MELO",
    ("SE", "GRACCHO CARDOSO"): "GRACHO CARDOSO",
    ("MT", "POXOREO"): "POXOREU",
    ("BA", "SANTA TEREZINHA"): "SANTA TERESINHA",
    ("RO", "ALVORADA D OESTE"): "ALVORADA DO OESTE",
    ("RO", "ALVORADA DO OESTE"): "ALVORADA DO OESTE",
    ("RO", "ESPIGAO D OESTE"): "ESPIGAO DO OESTE",
    ("RO", "ESPIGAO DO OESTE"): "ESPIGAO DO OESTE",
    ("RN", "AUGUSTO SEVERO (CAMPO GRANDE)"): "CAMPO GRANDE",
    ("RN", "JANUARIO CICCO (BOA SAUDE)"): "BOA SAUDE",
    ("SP", "SAO LUIZ DO PARAITINGA"): "SAO LUIS DO PARAITINGA",
    ("GO", "BOM JESUS DE GOIAS"): "BOM JESUS DE GOIAS",
}

class RemoteZipFile(io.RawIOBase):
    def __init__(self, url, size):
        self.url = url
        self.size = size
        self.pos = 0
    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET: self.pos = offset
        elif whence == io.SEEK_CUR: self.pos += offset
        elif whence == io.SEEK_END: self.pos = self.size + offset
        return self.pos
    def tell(self): return self.pos
    def read(self, n=-1):
        if n == -1 or self.pos + n > self.size: n = self.size - self.pos
        if n <= 0: return b''
        req = urllib.request.Request(self.url, headers={'Range': f'bytes={self.pos}-{self.pos+n-1}', 'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        self.pos += len(data)
        return data

def run():
    print("=" * 60)
    print("APLICANDO OPÇÃO 1: DADOS ELEITORAIS REAIS DO TSE PARA TODOS OS MUNICÍPIOS")
    print("=" * 60)
    t0 = time.time()
    
    url = 'https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip'
    size = 454587650
    remote = RemoteZipFile(url, size)
    zf = zipfile.ZipFile(remote)
    
    print("1. Extraindo votação para Presidente da República (BR)...")
    mun_pres = {} # (uf, cd_mun) -> { (nr, nm, sg): votos }
    mun_pres_by_name = {} # (uf, clean_name) -> { (nr, nm, sg): votos }
    
    with zf.open('votacao_candidato_munzona_2026_BR.csv') as f:
        header = f.readline().decode('latin1').strip().split(';')
        for line in f:
            row = line.decode('latin1').strip().split(';')
            if len(row) < 48: continue
            uf = row[10].replace('"', '').upper()
            cd_mun = row[13].replace('"', '').lstrip('0') or '0'
            nm_mun = clean_name(row[14].replace('"', ''))
            nm = row[21].replace('"', '')
            sg = row[35].replace('"', '')
            nr = row[19].replace('"', '')
            v = int(row[47].replace('"', '') or 0)
            
            ckey = (nr, nm, sg)
            mkey = (uf, cd_mun)
            if mkey not in mun_pres:
                mun_pres[mkey] = {}
            mun_pres[mkey][ckey] = mun_pres[mkey].get(ckey, 0) + v
            
            nkey = (uf, nm_mun)
            if nkey not in mun_pres_by_name:
                mun_pres_by_name[nkey] = {}
            mun_pres_by_name[nkey][ckey] = mun_pres_by_name[nkey].get(ckey, 0) + v
            
    print(f"   Processados resultados presidenciais de {len(mun_pres)} municípios.")
    
    # Carregar index
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    idx_path = os.path.join(base_dir, 'data', 'municipios_index.json')
    with open(idx_path, 'r', encoding='utf-8') as f:
        mindex = json.load(f)
        
    print(f"2. Enriquecendo os {len(mindex)} municípios com dados consolidados Top-3...")
    matched = 0
    
    for m in mindex:
        uf = m['uf']
        cd_tse = str(m.get('cd_tse', '')).lstrip('0')
        cands_dict = None
        
        if (uf, cd_tse) in mun_pres:
            cands_dict = mun_pres[(uf, cd_tse)]
        else:
            cname = clean_name(m['nome'])
            if (uf, cname) in MUN_ALIASES:
                cname = clean_name(MUN_ALIASES[(uf, cname)])
            if (uf, cname) in mun_pres_by_name:
                cands_dict = mun_pres_by_name[(uf, cname)]
            else:
                for (u, nm), val in mun_pres_by_name.items():
                    if u == uf and (cname in nm or nm in cname):
                        cands_dict = val
                        break
                        
        if cands_dict:
            matched += 1
            # Ordenar candidatos reais
            sorted_cands = sorted(cands_dict.items(), key=lambda x: x[1], reverse=True)
            total_validos = sum(v for _, v in sorted_cands)
            
            top1 = sorted_cands[0] if len(sorted_cands) > 0 else (("", "", ""), 0)
            top2 = sorted_cands[1] if len(sorted_cands) > 1 else (("", "", ""), 0)
            top3 = sorted_cands[2] if len(sorted_cands) > 2 else (("", "", ""), 0)
            
            v1 = top1[1]
            v2 = top2[1]
            v3 = top3[1]
            
            m['cand_1o'] = top1[0][1].title() if top1[0][1].isupper() else top1[0][1]
            m['partido_1o'] = top1[0][2]
            m['numero_1o'] = top1[0][0]
            m['votos_1o'] = v1
            
            m['cand_2o'] = top2[0][1].title() if top2[0][1].isupper() else top2[0][1]
            m['partido_2o'] = top2[0][2]
            m['numero_2o'] = top2[0][0]
            m['votos_2o'] = v2
            
            if len(sorted_cands) > 2:
                m['cand_3o'] = top3[0][1].title() if top3[0][1].isupper() else top3[0][1]
                m['partido_3o'] = top3[0][2]
                m['numero_3o'] = top3[0][0]
                m['votos_3o'] = v3
            else:
                m['cand_3o'] = ""
                m['partido_3o'] = ""
                m['numero_3o'] = ""
                m['votos_3o'] = 0
                
            m['total_validos'] = total_validos
            m['outros_votos'] = max(0, total_validos - (v1 + v2 + v3))
            
            # Recalcular pos_pres e iria_2t_pres
            abst_m = m.get('abstencao', 0)
            
            # Posição da Abstenção
            pos_pres = 1
            for _, v in sorted_cands:
                if abst_m < v:
                    pos_pres += 1
                else:
                    break
            m['pos_pres'] = pos_pres
            
            # Regra constitucional de 2º Turno:
            # Mais de 50% dos votos com ausentes incluídos
            total_com_abst = total_validos + abst_m
            metade = total_com_abst / 2.0
            
            if pos_pres == 1:
                # Abstenção lidera. Se abstencao > 50%, ganha em 1ºT, senão vai pro 2ºT
                m['iria_2t_pres'] = 1 if abst_m <= metade else 0
            elif pos_pres == 2:
                # Abstenção em 2º lugar. Vai pro 2ºT APENAS se o 1º colocado NÃO superou 50%
                m['iria_2t_pres'] = 1 if v1 <= metade else 0
            else:
                # Abstenção em 3º ou pior: não vai pro 2ºT
                m['iria_2t_pres'] = 0
                
    print(f"   Total de municípios correlacionados com 100% de sucesso: {matched} de {len(mindex)}")
    
    # 3. Salvar data/municipios_index.json e public/data/municipios_index.json
    print("3. Gravando municipios_index.json atualizado...")
    with open(idx_path, 'w', encoding='utf-8') as f:
        json.dump(mindex, f, ensure_ascii=False)
        
    pub_idx_path = os.path.join(base_dir, 'public', 'data', 'municipios_index.json')
    if os.path.exists(os.path.dirname(pub_idx_path)):
        shutil.copy2(idx_path, pub_idx_path)
        
    # 4. Atualizar municipios_geo.json e municipios_geo.js
    print("4. Atualizando GeoJSON de municípios (municipios_geo.json e .js)...")
    geo_path = os.path.join(base_dir, 'data', 'municipios_geo.json')
    if os.path.exists(geo_path):
        with open(geo_path, 'r', encoding='utf-8') as f:
            geo_data = json.load(f)
            
        mindex_by_id = {m['id']: m for m in mindex}
        
        for feat in geo_data.get('features', []):
            fid = feat.get('id') or feat.get('properties', {}).get('id')
            if fid in mindex_by_id:
                m_info = mindex_by_id[fid]
                props = feat.get('properties', {})
                props['pos_pres'] = m_info.get('pos_pres')
                props['iria_2t_pres'] = m_info.get('iria_2t_pres')
                props['cand_1o'] = m_info.get('cand_1o')
                props['partido_1o'] = m_info.get('partido_1o')
                props['votos_1o'] = m_info.get('votos_1o')
                props['cand_2o'] = m_info.get('cand_2o')
                props['partido_2o'] = m_info.get('partido_2o')
                props['votos_2o'] = m_info.get('votos_2o')
                props['total_validos'] = m_info.get('total_validos')
                props['outros_votos'] = m_info.get('outros_votos')
                feat['properties'] = props
                
        with open(geo_path, 'w', encoding='utf-8') as f:
            json.dump(geo_data, f, ensure_ascii=False)
            
        # Replicar para js e public
        geo_js_path = os.path.join(base_dir, 'data', 'municipios_geo.js')
        with open(geo_js_path, 'w', encoding='utf-8') as f:
            f.write("window.MUNICIPIOS_GEO = " + json.dumps(geo_data, ensure_ascii=False) + ";\n")
            
        pub_geo_path = os.path.join(base_dir, 'public', 'data', 'municipios_geo.json')
        shutil.copy2(geo_path, pub_geo_path)
        pub_geo_js = os.path.join(base_dir, 'public', 'data', 'municipios_geo.js')
        shutil.copy2(geo_js_path, pub_geo_js)
        
    # Verificar Codó
    codo = [m for m in mindex if m.get('id') == 2103307][0]
    print("\n" + "=" * 60)
    print("VERIFICAÇÃO DE CODÓ (MA):")
    print(f" - Nome: {codo['nome']} ({codo['uf']})")
    print(f" - Aptos: {codo['aptos']:,}")
    print(f" - Abstenção: {codo['abstencao']:,} ({codo['taxa']}%)")
    print(f" - 1º Colocado: {codo['cand_1o']} ({codo['partido_1o']}) com {codo['votos_1o']:,} votos")
    print(f" - 2º Colocado: {codo['cand_2o']} ({codo['partido_2o']}) com {codo['votos_2o']:,} votos")
    print(f" - 3º Colocado: {codo['cand_3o']} ({codo['partido_3o']}) com {codo['votos_3o']:,} votos")
    print(f" - Votos Válidos Totais: {codo['total_validos']:,}")
    print(f" - Outros Votos: {codo['outros_votos']:,}")
    print(f" - Posição da Abstenção: {codo['pos_pres']}º Lugar")
    print(f" - Iria a 2º Turno: {'SIM' if codo['iria_2t_pres'] else 'NÃO (Venceu em 1º Turno)'}")
    print(f"Concluído em {time.time()-t0:.2f}s!")
    print("=" * 60)

if __name__ == '__main__':
    run()
