# 🚀 Release Process

Guida completa per rilasciare una nuova versione di `@riktajs/core` e mantenere sincronizzate tutte le dipendenze nel monorepo.

## ⚡ Quick Start

Per rilasciare una nuova versione:

```bash
# Dalla root del monorepo
npm run version:core patch  # oppure minor, major
```

Il sistema gestirà automaticamente:
- ✅ Esecuzione dei test
- ✅ Build del package
- ✅ Bump della versione
- ✅ Sincronizzazione delle dipendenze
- ✅ Commit e tag git

## 📖 Processo Dettagliato

### 1. Preparazione

Assicurati che il tuo branch sia pulito e aggiornato:

```bash
git checkout main
git pull origin main
git status  # dovrebbe essere pulito
```

### 2. Rilascio della Versione

Scegli il tipo di versione da rilasciare:

```bash
# Patch: bugfix e piccoli aggiornamenti (0.4.1 → 0.4.2)
npm run version:core patch

# Minor: nuove funzionalità backward-compatible (0.4.1 → 0.5.0)
npm run version:core minor

# Major: breaking changes (0.4.1 → 1.0.0)
npm run version:core major

# Prerelease: versioni alpha/beta (0.4.1 → 0.4.2-0)
npm run version:core prerelease --preid=alpha
```

### 3. Cosa Succede Automaticamente

Quando esegui `npm run version:core <type>`:

#### Pre-version Hook
1. Esegue tutti i test del package core
2. Effettua il build del package
3. Se fallisce, il processo si interrompe

#### Version Update
4. Aggiorna `version` in `packages/core/package.json`
5. Crea un commit git con messaggio `v<version>`
6. Crea un tag git `v<version>`

#### Post-version Hook
7. Esegue `npm run sync:version`
8. Aggiorna `peerDependencies` in `packages/swagger/package.json`
9. Verifica tutte le dipendenze workspace
10. Aggiunge i file modificati al commit (staging)

### 4. Revisione e Push

Dopo il bump automatico:

```bash
# Rivedi tutte le modifiche
git log -2
git show HEAD

# Verifica i file modificati
git diff HEAD~1

# Se vuoi includere i file sincronizzati nel commit di versione
git commit --amend --no-edit

# Oppure crea un commit separato (già staged)
git commit -m "chore: sync core version across packages"

# Push dei commit e dei tag
git push origin main
git push origin --tags
```

### 5. Pubblicazione su npm

#### Manuale

```bash
cd packages/core
npm publish --access public
```

#### Automatica (GitHub Actions)

Se hai configurato GitHub Actions, il push del tag avvia automaticamente:
- Run dei test
- Build dei package
- Pubblicazione su npm
- Creazione della GitHub Release

## 🔄 Workflow di Sincronizzazione

### Come Funziona

Il monorepo usa **npm workspaces** con protocolli di versioning diversi:

#### Dipendenze Interne (workspace)
```json
{
  "dependencies": {
    "@riktajs/core": "*"
  }
}
```
- Usa sempre la versione **locale** del workspace
- Permette sviluppo senza pubblicare
- Auto-linking tra package

#### Peer Dependencies (pubblicazione)
```json
{
  "peerDependencies": {
    "@riktajs/core": ">=0.4.1"
  }
}
```
- Specifica la versione minima richiesta
- Usata quando il package è installato da npm
- Aggiornata automaticamente dagli script

### Sincronizzazione Manuale

Se necessario, puoi sincronizzare manualmente:

```bash
npm run sync:version
```

Questo script:
1. Legge la versione da `packages/core/package.json`
2. Aggiorna `peerDependencies` in `packages/swagger/package.json`
3. Verifica che tutti i workspace usino `"*"`

## 📋 Checklist Pre-Release

Prima di rilasciare, verifica:

- [ ] Tutti i test passano (`npm test`)
- [ ] Build funziona (`npm run build`)
- [ ] CHANGELOG.md aggiornato
- [ ] Documentazione aggiornata
- [ ] Breaking changes documentati
- [ ] Branch main aggiornato

## 🔧 Comandi Utili

```bash
# Verifica versioni correnti
cat packages/core/package.json | grep version
cat packages/swagger/package.json | grep -A 5 peerDependencies

# Esegui solo i test di core
npm run test:core

# Build di tutti i package
npm run build

# Pulisci e reinstalla
rm -rf node_modules package-lock.json
npm install

# Lista tutti i package e versioni
npm list --workspaces --depth=0
```

## 🐛 Risoluzione Problemi

### Test falliscono durante preversion

```bash
cd packages/core
npm test
# Fix gli errori, poi riprova npm run version:core
```

### Build fallisce

```bash
npm run build
# Fix gli errori di compilazione
```

### Tag già esistente

```bash
# Rimuovi il tag locale
git tag -d v0.4.2

# Rimuovi il tag remoto
git push origin :refs/tags/v0.4.2
```

### Versione sbagliata bumped

```bash
# Torna indietro di un commit
git reset --hard HEAD~1

# Rimuovi il tag
git tag -d v0.4.2

# Riprova con la versione corretta
```

### Sincronizzazione non eseguita

```bash
# Esegui manualmente
npm run sync:version

# Aggiungi al commit di versione
git add packages/swagger/package.json
git commit --amend --no-edit
```

## 📚 Riferimenti

- [npm version](https://docs.npmjs.com/cli/v8/commands/npm-version)
- [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Semantic Versioning](https://semver.org/)

## 🔗 File Correlati

- [`scripts/README.md`](scripts/README.md) - Documentazione degli script
- [`scripts/sync-core-version.js`](scripts/sync-core-version.js) - Script di sincronizzazione
- [`scripts/preversion-core.js`](scripts/preversion-core.js) - Hook pre-version
- [`scripts/postversion-core.js`](scripts/postversion-core.js) - Hook post-version
- [`.github/workflows/release.yml`](.github/workflows/release.yml) - GitHub Actions workflow
