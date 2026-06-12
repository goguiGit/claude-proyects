#!/usr/bin/env bash
# Instala pre-commit hooks de seguridad en el repo especificado.
# Uso: bash scripts/security/install_hooks.sh [REPO_ROOT]
set -euo pipefail

REPO_ROOT="${1:-.}"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "Error: $HOOKS_DIR no existe. ¿Es un repositorio git?" >&2
  exit 1
fi

cat > "$HOOKS_DIR/pre-commit" << 'HOOK'
#!/usr/bin/env bash
# Pre-commit hook: bloquea archivos sensibles y cambios a CLAUDE.md
set -euo pipefail

# Bloquear .env* y credenciales
BLOCKED=$(git diff --cached --name-only | grep -E '\.(env|pem|key|p12|pfx)$' || true)
if [ -n "$BLOCKED" ]; then
  echo "Bloqueado: intento de commitear archivos sensibles:"
  echo "$BLOCKED"
  exit 1
fi

# Alertar si CLAUDE.md o settings cambian
SENSITIVE=$(git diff --cached --name-only | grep -E '(CLAUDE\.md|\.claude/settings.*\.json)$' || true)
if [ -n "$SENSITIVE" ]; then
  echo "Advertencia: se estan commiteando archivos de configuracion del agente:"
  echo "$SENSITIVE"
  echo "Continuar de todas formas? (Ctrl+C para cancelar, Enter para continuar)"
  if [ -t 0 ]; then
    read -r _confirm
  fi
  # En entornos no interactivos (CI/CD) se permite continuar automaticamente
fi

exit 0
HOOK

chmod +x "$HOOKS_DIR/pre-commit"
echo "Pre-commit hook instalado en $HOOKS_DIR/pre-commit"
