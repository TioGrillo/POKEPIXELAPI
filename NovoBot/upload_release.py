import requests
import json
import os

TOKEN = os.environ.get("GITHUB_TOKEN", "") # Insira seu token como variavel de ambiente ou cole aqui na hora de rodar
if not TOKEN:
    print("Por favor defina GITHUB_TOKEN")
    exit(1)
HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

# PREENCHA AQUI COM O SEU USUÁRIO E O NOME DO REPOSITÓRIO NO GITHUB
username = "TioGrillo"
repo_name = "POKEPIXELAPI"
repo_url = f"https://api.github.com/repos/{username}/{repo_name}"

release_name = "PokePixel Bot V1.0.6"
tag_name = "v1.0.6"

print(f"Criando release {tag_name} no repositorio {username}/{repo_name}...")
r_rel = requests.post(f"{repo_url}/releases", headers=HEADERS, json={
    "tag_name": tag_name,
    "name": release_name,
    "body": "Adicionado: Versões e logs de atualização agora sincronizam dinamicamente com o Github.",
    "draft": False,
    "prerelease": False
})

if r_rel.status_code == 422:
    print("Release já existe. Buscando release existente...")
    r_rel = requests.get(f"{repo_url}/releases/tags/{tag_name}", headers=HEADERS)
    
r_rel.raise_for_status()
release_data = r_rel.json()
upload_url = release_data["upload_url"].split("{")[0]

file_path = r"D:\PROJETOS AT\a\POKEPIXELAPI\NovoBot\release\PokePixel Bot 1.0.6.exe"
file_name = "PokePixel_Bot_1.0.6.exe"

if not os.path.exists(file_path):
    print(f"ERRO: Arquivo não encontrado: {file_path}")
    exit(1)

print(f"Fazendo upload de {file_name}... Isso pode demorar um pouco dependendo do tamanho e da sua internet.")

upload_headers = HEADERS.copy()
upload_headers["Content-Type"] = "application/octet-stream"

with open(file_path, "rb") as f:
    r_up = requests.post(
        f"{upload_url}?name={file_name}",
        headers=upload_headers,
        data=f
    )
r_up.raise_for_status()
asset_data = r_up.json()

print("-" * 50)
print("UPLOAD CONCLUÍDO COM SUCESSO!")
print("LINK DIRETO DE DOWNLOAD:")
print(asset_data.get("browser_download_url"))
print("-" * 50)
