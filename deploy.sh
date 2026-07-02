#!/usr/bin/env bash
# Deploy manual na VPS: puxa a última versão, reconstrói a imagem e reinicia os containers.
# Uso: ./deploy.sh  (rodar dentro do diretório do projeto na VPS)
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env.production ]; then
  echo "Erro: .env.production não encontrado. Copie .env.example, preencha e salve como .env.production." >&2
  exit 1
fi

git pull --ff-only
docker compose build
docker compose up -d
docker image prune -f
docker compose ps
