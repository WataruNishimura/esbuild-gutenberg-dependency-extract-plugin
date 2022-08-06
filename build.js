const esbuild = require("esbuild");

const isDev = process.env.NODE_ENV && process.env.NODE_ENV === "development"

const buildOptions = {
  entryPoints: {
    index: "src/index.js"
  },
  plugins: [
  ],
  bundle: true,
  outdir: "lib",
  drop: isDev ? [] : ["console"],
  metafile: isDev,
  watch: isDev,
  platform: "node"
}

esbuild.build(buildOptions).catch(err => {
  process.stderr.write(err.stderr)
  process.exit(1)
})