import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom plugin to resolve @ alias with proper extensions
function resolveAliasPlugin(): Plugin {
  const srcPath = path.resolve(__dirname, './src')
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']

  return {
    name: 'resolve-alias',
    enforce: 'pre',
    resolveId(source, importer, options) {
      if (source.startsWith('@/')) {
        const relativePath = source.slice(2) // Remove '@/'
        const targetPath = path.join(srcPath, relativePath)

        console.log(`[resolve-alias] Resolving: ${source}`)
        console.log(`[resolve-alias] Target path: ${targetPath}`)
        console.log(`[resolve-alias] Src path: ${srcPath}`)

        // Try each extension
        for (const ext of extensions) {
          const pathWithExt = targetPath + ext
          const exists = fs.existsSync(pathWithExt)
          console.log(`[resolve-alias] Trying ${ext}: ${pathWithExt} - exists: ${exists}`)
          if (exists) {
            console.log(`[resolve-alias] Found: ${pathWithExt}`)
            return { id: pathWithExt, external: false }
          }
        }

        // Try without extension (might be a directory with index file)
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
          for (const ext of extensions) {
            const indexPath = path.join(targetPath, 'index' + ext)
            if (fs.existsSync(indexPath)) {
              console.log(`[resolve-alias] Found index: ${indexPath}`)
              return { id: indexPath, external: false }
            }
          }
        }

        console.log(`[resolve-alias] Not found, falling through`)
      }
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [resolveAliasPlugin(), react()],
})
