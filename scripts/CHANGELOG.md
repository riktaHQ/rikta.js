# 🔄 Version Sync Script - Dynamic Update

## Cosa è cambiato

Lo script `sync-core-version.js` è stato aggiornato per gestire **dinamicamente** tutti i package del monorepo, invece di hardcodare solo il package `swagger`.

### Prima ❌
```javascript
// Hardcoded - solo swagger
const swaggerPackage = readPackageJson('packages/swagger/package.json');
if (swaggerPackage.peerDependencies?.['@riktajs/core']) {
  // update...
}
```

### Dopo ✅
```javascript
// Dinamico - tutti i package
const allPackages = findAllPackages();
for (const { name, path, packageJson } of allPackages) {
  if (packageJson.peerDependencies?.['@riktajs/core']) {
    // update...
  }
}
```

## Come funziona

Lo script ora:

1. **Legge dinamicamente la configurazione dei workspace** dal `package.json` root
2. **Scopre automaticamente** tutti i package nelle directory configurate:
   - `packages/*` → Trova tutti i package in `packages/` (es: `swagger`)
   - `example` → Package example
   - `benchmarks` → Package benchmarks
3. **Esclude automaticamente** il package `@riktajs/core`
4. **Aggiorna le peerDependencies** in tutti i package che dipendono da `@riktajs/core`

## Vantaggi

✅ **Scalabile**: Quando aggiungi nuovi package (es: `@riktajs/database`, `@riktajs/auth`), vengono automaticamente inclusi

✅ **Zero manutenzione**: Non serve modificare lo script quando aggiungi package

✅ **Flessibile**: Gestisce sia pattern glob (`packages/*`) che riferimenti diretti (`example`)

✅ **Robusto**: Gestisce errori se directory o file non esistono

## Test effettuati

```bash
# Test 1: Sincronizzazione normale
npm run sync:version
# ✓ Trova e aggiorna swagger automaticamente

# Test 2: Version bump
npm run version:core patch
# ✓ Pre-version: test + build
# ✓ Version: 0.4.1 → 0.4.2
# ✓ Post-version: sync automatico di swagger (>=0.4.1 → >=0.4.2)
# ✓ Git staging automatico
```

## Aggiunta di nuovi package

Quando crei un nuovo package che dipende da `@riktajs/core`:

```bash
mkdir packages/database
cd packages/database
npm init -y
```

Nel `package.json`:
```json
{
  "name": "@riktajs/database",
  "peerDependencies": {
    "@riktajs/core": ">=0.4.0"
  }
}
```

Esegui:
```bash
npm run sync:version
```

Lo script **troverà automaticamente** il nuovo package e aggiornerà le sue peerDependencies! 🎉

## Struttura del codice

```javascript
findAllPackages() {
  // 1. Legge workspaces da package.json root
  // 2. Per ogni workspace pattern:
  //    - packages/* → scannerizza directory
  //    - example → legge direttamente
  // 3. Esclude @riktajs/core
  // 4. Ritorna array di {name, path, packageJson}
}
```

## Output dello script

```
📦 Syncing @riktajs/core version across packages...
✓ Current @riktajs/core version: 0.4.1

🔄 Updating peerDependencies...
  ✓ Updated @riktajs/swagger peerDependency: >=0.4.0 → >=0.4.1
  ✓ Updated @riktajs/database peerDependency: >=0.3.0 → >=0.4.1
  
🔍 Verifying workspace dependencies...
  ✓ @riktajs/swagger: @riktajs/core uses "*" (workspace protocol)
  ✓ @riktajs/database: @riktajs/core uses "*" (workspace protocol)
  ✓ rikta-example: @riktajs/core uses "*" (workspace protocol)
  
✅ Version sync complete!
```
