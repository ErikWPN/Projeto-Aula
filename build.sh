#!/usr/bin/env bash
# Gera o jar único: React (frontend/dist) dentro do Spring Boot (backend/target/mentoria-*.jar).
set -euo pipefail
cd "$(dirname "$0")"

echo "> frontend: instalando dependências e gerando build"
(cd frontend && npm ci --no-audit --no-fund && npm run build)

echo "> backend: testes e empacotamento"
(cd backend && mvn -B -q clean package)

echo "Pronto: $(ls backend/target/mentoria-*.jar)"
echo "Rodar: java -jar $(ls backend/target/mentoria-*.jar)"
