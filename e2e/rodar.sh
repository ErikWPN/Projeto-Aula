#!/usr/bin/env bash
# Sobe o jar com banco em memória e roda o teste ponta a ponta com o helper da skill webapp-testing.
# Pré-requisito: ./build.sh (ou o jar já gerado em backend/target).
set -euo pipefail
cd "$(dirname "$0")/.."

JAR=$(ls backend/target/mentoria-*.jar | head -1)
PORTA=${PORTA:-8090}
# Banco em memória por padrão. Para testar no Postgres: DATABASE_URL=jdbc:postgresql://... DATABASE_USER=... ./e2e/rodar.sh
BANCO=${DATABASE_URL:-"jdbc:h2:mem:e2e;DB_CLOSE_DELAY=-1"}

# Se a porta já estiver ocupada, o teste rodaria contra outro servidor (talvez uma versão antiga).
if (exec 3<>"/dev/tcp/127.0.0.1/$PORTA") 2>/dev/null; then
  echo "A porta $PORTA já está em uso. Encerre o processo que a ocupa ou use PORTA=outra." >&2
  exit 1
fi

python3 .claude/skills/webapp-testing/scripts/with_server.py \
  --server "PORT=$PORTA ADMIN_SENHA=teste DATABASE_URL='$BANCO' exec java -jar $JAR" \
  --port "$PORTA" --timeout 90 \
  -- bash -c "BASE_URL=http://localhost:$PORTA ADMIN_SENHA=teste python3 e2e/test_fluxo.py && BASE_URL=http://localhost:$PORTA python3 e2e/revisao_visual.py"
