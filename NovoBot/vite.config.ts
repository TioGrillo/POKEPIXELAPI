import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: './',
  plugins: [
    react(),
    // @ts-ignore
    command === 'build' ? obfuscatorPlugin({
      include: ["**/*.js", "**/*.ts", "**/*.jsx", "**/*.tsx"],
      exclude: [/node_modules/],
      apply: "build",
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,
        debugProtection: true,
        disableConsoleOutput: true,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: false,
        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
      },
    }) : null,
  ],
}))
