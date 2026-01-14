{
  "compilerOptions"; {
    "target"; "es2016"             // Compatible with your Node version
    "module"; "commonjs"           // Converts 'import' to 'require' automatically
    "rootDir"; "./src"             // Where your code lives
    "outDir"; "./dist"             // Where built code goes
    "esModuleInterop"; true        // Allows importing CommonJS modules cleanly
    "strict"; true                 // Enforces type safety (Best Practice)
    "skipLibCheck"; true            // Speeds up compilation
  }
  "include"; ["src/**/*"]
}