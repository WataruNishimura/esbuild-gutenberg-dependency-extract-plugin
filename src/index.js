const fs = require("fs")
const path = require("path")
const json2php = require("json2php")
const md5 = require("js-md5")

// Mapping Object for Dependency Extraction
const dependenciesMappings = {
  "@wordpress/components": "wp.components",
  "@wordpress/api-fetch": "wp.apiFetch",
  "@wordpress/edit-post": "wp.editPost",
  "@wordpress/element": "wp.element",
  "@wordpress/plugins": "wp.plugins",
  "@wordpress/editor": "wp.editor",
  "@wordpress/block-editor": "wp.blockEditor",
  "@wordpress/blocks": "wp.blocks",
  "@wordpress/hooks": "wp.hooks",
  "@wordpress/utils": "wp.utils",
  "@wordpress/date": "wp.date",
  "@wordpress/data": "wp.data",
  "react": "React",
  "react-dom": "ReactDOM",
}

// Mapping Object for export dependencies to handle

const handleMappings = {
  "@wordpress/components": "wp-components",
  "@wordpress/api-fetch": "wp-api-fetch",
  "@wordpress/edit-post": "wp-edit-post",
  "@wordpress/element": "wp-element",
  "@wordpress/plugins": "wp-plugins",
  "@wordpress/editor": "wp-editor",
  "@wordpress/block-editor": "wp-block-editor",
  "@wordpress/blocks": "wp-blocks",
  "@wordpress/hooks": "wp-hooks",
  "@wordpress/utils": "wp-utils",
  "@wordpress/date": "wp-date",
  "@wordpress/data": "wp-data",
  "react": "react",
  "react-dom": "react-dom",
}

// Use this class for export [name].asset.php
class DependenciesManifest {

  constructor(namespace, path) {
    this.namespace = namespace
    this.path = path
    this.dependencies = []
  }

  // dependency management function
  addDependency(name) {
    if (this.dependencies.includes(name)) {
      return
    }
    this.dependencies.push(name)
  }

  // return file hash as version and dependencies handle
  getAsset() {
    const buffer = readFileSync(this.path)
    const hash = md5(buffer)
    return {
      dependencies: this.dependencies,
      version: hash.toString()
    }
  }
}

function dependencyExtractPlugin() {

  // filtering function based on mappings
  const escRe = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const filter = new RegExp(
    Object.keys(dependenciesMappings)
      .map((mod) => `^${escRe(mod)}$`)
      .join("|"),
  );

  return {
    name: "wp-dependency-extract",
    setup(build) {

      // initialize manifest
      const dependenciesManifests = []

      build.onStart(() => {
        const { entryPoints } = build.initialOptions

        // Each entry points, create dependency manifest; [name].asset.php
        Object.keys(entryPoints).map((key) => {
          const absWorkingDir = process.cwd()
          const dependenciesManifest = new DependenciesManifest(key, path.resolve(absWorkingDir, entryPoints[key]))
          dependenciesManifests.push(dependenciesManifest)
        })

      })


      build.onResolve({ filter }, (args) => {
        const { path } = args

        dependenciesManifests.map(manifest => {
          Object.keys(handleMappings).map(key => {
            if (path == key) {
              manifest.addDependency(handleMappings[key])
            }
          })
        })


        // replace dependency depends on mappings
        if (!dependenciesMappings[path]) {
          throw new Error("Unknown global: " + path);
        }
        return {
          path: path,
          namespace: "external-global",
        };
      })

      build.onLoad(
        {
          filter,
          namespace: "external-global",
        },
        async (args) => {
          const global = dependenciesMappings[args.path];
          return {
            contents: `module.exports = ${global};`,
            loader: "js",
          };
        },)

      build.onEnd(() => {
        const {
          outdir
        } = build.initialOptions;

        dependenciesManifests.map((manifest) => {
          fs.writeFileSync(path.resolve(outdir, manifest.namespace + ".asset.php"), "<?php return " + json2php(manifest.getAsset()) + " ?>")
        })
      })
    }
  }
}

module.exports = dependencyExtractPlugin