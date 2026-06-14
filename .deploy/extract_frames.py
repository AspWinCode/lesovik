import json, re

path = r'C:\Users\direc\.claude\projects\D--project-lesovik\5f9caf8d-a8d4-4505-8d5e-0clientId-0614363c6408\tool-results\mcp-figma-get_metadata-1781109436319.txt'
path = r'C:\Users\direc\.claude\projects\D--project-lesovik\5f9caf8d-a8d4-4505-8d5e-0614363c6408\tool-results\mcp-figma-get_metadata-1781109436319.txt'
with open(path, 'r', encoding='utf-8') as f:
    raw = f.read()

data = json.loads(raw)
xml = data[0]['text']

# Top-level frames are direct children of <canvas ...>
# They appear as <frame id="..." name="..." ...> at depth 1
top_frames = re.findall(r'^\s{2}<frame id="([^"]+)" name="([^"]+)"', xml, re.MULTILINE)
print(f'Top-level screens ({len(top_frames)}):')
for fid, name in top_frames:
    # decode garbled names where possible
    try:
        decoded = name.encode('latin-1').decode('cp1251')
    except Exception:
        decoded = name
    print(f'  {fid}: {name!r}  ({decoded})')
