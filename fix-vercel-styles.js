/**
 * Script pour diagnostiquer et corriger les problèmes de styles sur Vercel
 */

console.log('🎨 DIAGNOSTIC ET CORRECTION DES STYLES VERCEL');
console.log('='.repeat(50));

// Vérification des fichiers de configuration
import fs from 'fs';
import path from 'path';

function checkFile(filePath, description) {
  try {
    const exists = fs.existsSync(filePath);
    console.log(`📄 ${description}: ${exists ? '✅ Existe' : '❌ Manquant'}`);
    
    if (exists) {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`   📏 Taille: ${content.length} caractères`);
      return content;
    }
    return null;
  } catch (error) {
    console.log(`   ❌ Erreur lecture: ${error.message}`);
    return null;
  }
}

function analyzeConfig() {
  console.log('\n🔍 ANALYSE DES CONFIGURATIONS:');
  
  // Vérifier les fichiers de configuration
  const configs = [
    { path: 'tailwind.config.js', desc: 'Configuration Tailwind' },
    { path: 'postcss.config.js', desc: 'Configuration PostCSS' },
    { path: 'vite.config.js', desc: 'Configuration Vite' },
    { path: 'vite.config.prod.js', desc: 'Configuration Vite Production' },
    { path: 'vercel.json', desc: 'Configuration Vercel' },
    { path: 'src/index.css', desc: 'CSS Principal' },
    { path: 'src/App.css', desc: 'CSS App' }
  ];
  
  configs.forEach(config => {
    checkFile(config.path, config.desc);
  });
}

function checkPackageJson() {
  console.log('\n📦 ANALYSE PACKAGE.JSON:');
  
  const packageContent = checkFile('package.json', 'Package.json');
  if (packageContent) {
    try {
      const pkg = JSON.parse(packageContent);
      
      console.log('\n🔧 Scripts de build:');
      console.log(`   build: ${pkg.scripts?.build || 'MANQUANT'}`);
      console.log(`   vercel-build: ${pkg.scripts?.['vercel-build'] || 'MANQUANT'}`);
      
      console.log('\n📚 Dépendances CSS/Tailwind:');
      const cssDepencies = [
        'tailwindcss',
        '@tailwindcss/postcss',
        'autoprefixer',
        'postcss'
      ];
      
      cssDepencies.forEach(dep => {
        const version = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
        console.log(`   ${dep}: ${version || '❌ MANQUANT'}`);
      });
      
    } catch (error) {
      console.log(`   ❌ Erreur parsing JSON: ${error.message}`);
    }
  }
}

function generateOptimizedConfigs() {
  console.log('\n⚙️ GÉNÉRATION DES CONFIGURATIONS OPTIMISÉES:');
  
  // Configuration PostCSS optimisée pour Vercel
  const postcssConfig = `// postcss.config.js - Optimisé pour Vercel
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}`;
  
  // Configuration Vite optimisée pour production
  const viteConfigProd = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

// Configuration optimisée pour Vercel
export default defineConfig({
  build: {
    cssCodeSplit: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const extType = info[info.length - 1]
          if (/\\.(css)$/.test(assetInfo.name)) {
            return \`assets/[name]-[hash].\${extType}\`
          }
          return \`assets/[name]-[hash].\${extType}\`
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
})`;
  
  // CSS principal optimisé
  const indexCSS = `/* src/index.css - Optimisé pour Vercel */
@import 'tailwindcss';

/* Styles de base */
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

#root {
  width: 100%;
  height: 100%;
}

/* Assurer que Tailwind est bien chargé */
@layer base {
  * {
    box-sizing: border-box;
  }
}`;
  
  console.log('✅ Configurations générées (prêtes à être appliquées)');
  console.log('\n📋 ACTIONS RECOMMANDÉES:');
  console.log('1. Vérifiez que postcss.config.js utilise @tailwindcss/postcss');
  console.log('2. Utilisez vite.config.prod.js pour le build Vercel');
  console.log('3. Assurez-vous que src/index.css importe correctement Tailwind');
  console.log('4. Forcez un redéploiement complet sur Vercel');
}

function checkDistFolder() {
  console.log('\n📁 ANALYSE DU DOSSIER DIST:');
  
  if (fs.existsSync('dist')) {
    console.log('✅ Dossier dist existe');
    
    // Vérifier les fichiers CSS
    const distFiles = fs.readdirSync('dist', { recursive: true });
    const cssFiles = distFiles.filter(file => file.endsWith('.css'));
    const jsFiles = distFiles.filter(file => file.endsWith('.js'));
    
    console.log(`📄 Fichiers CSS: ${cssFiles.length}`);
    cssFiles.forEach(file => console.log(`   - ${file}`));
    
    console.log(`📄 Fichiers JS: ${jsFiles.length}`);
    jsFiles.slice(0, 3).forEach(file => console.log(`   - ${file}`));
    if (jsFiles.length > 3) console.log(`   ... et ${jsFiles.length - 3} autres`);
    
  } else {
    console.log('❌ Dossier dist manquant - Exécutez npm run build');
  }
}

function main() {
  analyzeConfig();
  checkPackageJson();
  checkDistFolder();
  generateOptimizedConfigs();
  
  console.log('\n🎯 RÉSUMÉ DES ACTIONS:');
  console.log('1. Vérifiez les configurations CSS');
  console.log('2. Testez le build local: npm run build');
  console.log('3. Vérifiez le dossier dist généré');
  console.log('4. Déployez sur Vercel');
  console.log('5. Vérifiez les logs de déploiement Vercel');
}

main();
