# Version Management Scripts

Questi script gestiscono automaticamente la sincronizzazione della versione di `@riktajs/core` attraverso tutto il monorepo.

## 📋 Script Disponibili

### `sync-core-version.js`
Sincronizza manualmente la versione di `@riktajs/core` in tutti i package dipendenti.

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

### Rilasciare una nuova versione di @riktajs/core

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

## 🔧 Risoluzione Problemi

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
