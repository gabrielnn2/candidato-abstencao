import re
import json

svg_path = r'C:\Users\gabri\.gemini\antigravity-ide\brain\4c9f086a-286f-42c6-969c-35cd8d690711\.system_generated\steps\481\content.md'
with open(svg_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for simplemaps SVG: <path d="..." id="BRXX" name="...">
matches = re.findall(r'<path d="([^"]+)" id="BR([A-Z]{2})" name="([^"]+)"', content)

print(f"Total matching state paths found: {len(matches)}")

state_paths = {}
for d, uf, name in matches:
    state_paths[uf] = d
    print(f"  {uf} ({name}): path length {len(d)}")

# Check missing states
all_ufs = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]
missing = [u for u in all_ufs if u not in state_paths]
print("Missing UFs:", missing)

with open('data/brazil_real_paths.json', 'w', encoding='utf-8') as f:
    json.dump(state_paths, f, ensure_ascii=False)
print("Saved to data/brazil_real_paths.json!")
