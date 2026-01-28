# Version Management Scripts

Questi script gestiscono automaticamente il versioning nel monorepo Rikta.

## 📋 Script Disponibili

### `bump-version.js` - Unified Version Bumping (Lockstep)
**NUOVO** - Aggiorna tutti i package alla stessa versione in un unico comando.

**Cosa fa:**
- Aggiorna `version` in tutti i package `@riktajs/*` alla stessa versione
- Aggiorna `dependencies` interne con `^<version>`
- Aggiorna `peerDependencies` interne con `>=<version>`
- Approccio **lockstep versioning**: tutti i package avanzano insieme

**Vantaggi lockstep:**
- ✅ Più semplice gestire le release
- ✅ Più facile per gli utenti (tutte le dipendenze hanno la stessa versione)
- ✅ Comunicazione più chiara delle release
- ✅ I package sono già strettamente accoppiati

**Utilizzo:**
```bash
# Bump patch version (0.10.1 -> 0.10.2)
npm run bump patch

# Bump minor version (0.10.1 -> 0.11.0)
npm run bump minor

# Bump major version (0.10.1 -> 1.0.0)
npm run bump major

# Set specific version
npm run bump 1.2.3

# Skip confirmation (CI/automation)
SKIP_CONFIRM=1 npm run bump patch
```

**Esempio output:**
```
📦 Bumping version across all packages...

Current version: 0.10.1
Bump type: patch
New version: 0.10.2

🔄 Updating package versions...

  ✓ @riktajs/cli: 0.3.3 → 0.10.2
  ✓ @riktajs/core: 0.10.1 → 0.10.2
  ✓ @riktajs/mcp: 0.4.1 → 0.10.2
  ✓ @riktajs/passport: 0.2.0 → 0.10.2
  ✓ @riktajs/queue: 0.5.0 → 0.10.2
  ✓ @riktajs/swagger: 0.3.0 → 0.10.2
  ✓ @riktajs/typeorm: 0.3.0 → 0.10.2

✅ Updated 7 package(s) to version 0.10.2!
```

### `sync-core-version.js` - Sync Core Version (Legacy)
Sincronizza manualmente la versione di `@riktajs/core` in tutti i package dipendenti.

**Nota:** Con `bump-version.js`, questo script è meno necessario ma può essere utile per fix manuali.

**Cosa fa:**
- Legge la versione corrente da `packages/core/package.json`
- **Trova dinamicamente** tutti i package nel monorepo (escludendo core)
- Aggiorna `peerDependencies` in ogni package che dipende da `@riktajs/core` a `>=<version>`
- Verifica che tutti i workspace usino `"*"` per le dipendenze interne

**Comportamento dinamico:**
- Legge automaticamente la configurazione `workspaces` dal `package.json` root
- Supporta pattern glob come `packages/*`
- Gestisce riferimenti diretti come `example` e `benchmarks`
- **Non richiede modifiche** quando aggiungi nuovi package

**Utilizzo:**
```bash
npm run sync:version
```

### `preversion-core.js`
Hook automatico che si esegue prima di `npm version` nel package core.

**Cosa fa:**
- Esegue tutti i test
- Effettua il build del package
- Previene il bump della versione se ci sono errori

### `postversion-core.js`
Hook automatico che si esegue dopo `npm version` nel package core.

**Cosa fa:**
- Sincronizza la nuova versione in tutti i package dipendenti
- Aggiunge i file modificati a git (staging)
- Fornisce istruzioni per completare il processo

## 🚀 Workflow di Rilascio

### Approccio Raccomandato: Lockstep Versioning

```bash
# 1. Assicurati che tutto sia committato
git status

# 2. Esegui i test
npm test

# 3. Bump version (usa patch, minor o major)
npm run bump minor

# 4. Verifica le modifiche
git diff

# 5. Rebuild per verificare
npm run build

# 6. Commit e tag
git add .
git commit -m "chore: release v0.11.0"
git tag v0.11.0

# 7. Push
git push && git push --tags

# 8. Pubblica su npm
npm run publish:all

# O dry run prima per verificare
npm run publish:dry
```

### Rilasciare solo @riktajs/core (Deprecato)

```bash
# Dalla root del monorepo
npm run version:core patch  # o minor, major, prerelease, etc.
```

Questo comando:
1. ✅ Esegue i test automaticamente (`preversion`)
2. ✅ Effettua il build (`preversion`)
3. 🔄 Aggiorna la versione in `packages/core/package.json`
4. 🔄 Crea un commit e un tag git
5. ✅ Sincronizza la versione in tutti gli altri package (`postversion`)
6. ✅ Aggiunge i file modificati a git

Poi completa manualmente:
```bash
# Rivedi le modifiche
git diff --staged

# Se tutto è OK, puoi fare amend del commit di versione
git commit --amend --no-edit

# Oppure crea un commit separato
git commit -m "chore: sync core version across packages"

# Push con i tag
git push && git push --tags
```

### Sincronizzazione manuale

Se hai bisogno di sincronizzare manualmente (ad esempio dopo un merge):

```bash
npm run sync:version
```

## 📦 Struttura delle Dipendenze

### Dipendenze Interne (Workspace)
I package interni usano `"*"` come versione:

```json
{
  "dependencies": {
    "@riktajs/core": "*",
    "@riktajs/swagger": "*"
  }
}
```

Questo permette a npm workspaces di usare sempre la versione locale.

### Peer Dependencies
Il package swagger dichiara una peer dependency su core:

```json
{
  "peerDependencies": {
    "@riktajs/core": ">=0.4.1"
  }
}
```

Questa viene aggiornata automaticamente quando rilasci una nuova versione di core.

## � Publishing

### `publish-all.js` - Publish All Packages to npm

Pubblica tutti i package `@riktajs/*` su npm in sequenza.

**Cosa fa:**
- Trova tutti i package pubblicabili (non private)
- Pubblica ogni package su npm
- **Continua anche se un package fallisce**
- Mostra un report dettagliato al termine
- Gestisce errori comuni (versione già pubblicata, OTP, login, ecc.)

**Utilizzo:**
```bash
# Dry run - simula la pubblicazione
npm run publish:dry

# Pubblica tutti i package
npm run publish:all

# Con opzioni specifiche
node scripts/publish-all.js --tag beta
node scripts/publish-all.js --otp 123456
node scripts/publish-all.js --dry-run --tag next
```

**Opzioni disponibili:**
- `--dry-run` - Simula senza pubblicare
- `--tag <tag>` - Dist-tag (default: latest)
- `--access <public|restricted>` - Accesso package
- `--otp <code>` - One-time password per 2FA

**Esempio output:**
```
📦 Publishing packages to npm...

Found 7 package(s) to publish:
  • @riktajs/cli@0.10.2
  • @riktajs/core@0.10.2
  ...

Logged in as: username

[1/7] @riktajs/cli@0.10.2
  ✓ Published successfully

[2/7] @riktajs/core@0.10.2
  ✗ Failed: Version already published

═══════════════════════════════════════════════════════
📊 SUMMARY
═══════════════════════════════════════════════════════

Total packages: 7
✓ Successful: 6
✗ Failed: 1

✓ Successfully published:
  • @riktajs/cli@0.10.2
  ...

✗ Failed to publish:
  • @riktajs/core@0.10.2
    Reason: Version already published
```

**Note sulla sicurezza:**
- Richiede login npm (`npm login`)
- Supporta 2FA con `--otp`
- Usa sempre `--dry-run` per verificare prima

## �🔧 Risoluzione Problemi

### Script fallisce durante preversion
```bash
# Esegui manualmente i controlli
cd packages/core
npm test
npm run build
```

### Sincronizzazione manuale necessaria
```bash
# Se gli hook non hanno funzionato
npm run sync:version
git add packages/swagger/package.json
git commit -m "chore: sync core version"
```

### Verificare le versioni
```bash
# Mostra la versione di core
cat packages/core/package.json | grep version

# Mostra le peer dependencies di swagger
cat packages/swagger/package.json | grep -A 5 peerDependencies
```

## 📝 Note

- Gli hook `preversion` e `postversion` si eseguono automaticamente
- I file modificati vengono automaticamente aggiunti a git
- Il commit di versione viene creato automaticamente da `npm version`
- È sicuro eseguire `sync:version` più volte - è idempotente
