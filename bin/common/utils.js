const { resolve } = require('path')
const { existsSync } = require('fs')
const consola = require('consola')
const esm = require('esm')(module, {
  cache: false,
  cjs: {
    cache: true,
    vars: true,
    namedExports: true
  }
})

const getRootDir = argv => resolve(argv._[0] || '.')
const getNuxtConfigFile = argv => resolve(getRootDir(argv), argv['config-file'])
const getLatestHost = (argv) => {
  const port =
    argv.port ||
    process.env.NUXT_PORT ||
    process.env.PORT ||
    process.env.npm_package_config_nuxt_port
  const host =
    argv.hostname ||
    process.env.NUXT_HOST ||
    process.env.HOST ||
    process.env.npm_package_config_nuxt_host
  const socket =
    argv['unix-socket'] ||
    process.env.UNIX_SOCKET ||
    process.env.npm_package_config_unix_socket

  return { port, host, socket }
}

exports.runAsyncScript = (fn) => {
  fn().then(() => { process.exit(0) })
    .catch((err) => {
      consola.fatal('Failed to run async Buxt script!')
      consola.fatal(err)
      process.exit(1)
    })
}

exports.nuxtConfigFile = getNuxtConfigFile

exports.loadNuxtConfig = async (argv) => {
  const rootDir = getRootDir(argv)
  const nuxtConfigFile = getNuxtConfigFile(argv)

  let options = {}

  if (existsSync(nuxtConfigFile)) {
    delete require.cache[nuxtConfigFile]
    options = esm(nuxtConfigFile)
    if (!options) {
      options = {}
    }
    if (options.default) {
      options = options.default
    }

    if (typeof options === 'function') {
      try {
        options = await options()
      } catch (error) {
        consola.fatal('Error while fetching async configuration')
        consola.fatal(error)
      }
    }
  } else if (argv['config-file'] !== 'nuxt.config.js') {
    consola.fatal('Could not load config file: ' + argv['config-file'])
  }

  if (typeof options.rootDir !== 'string') {
    options.rootDir = rootDir
  }

  // Nuxt Mode
  options.mode =
    (argv.spa && 'spa') || (argv.universal && 'universal') || options.mode

  // Server options
  if (!options.server) {
    options.server = {}
  }
  const { port, host, socket } = getLatestHost(argv)
  options.server.port = port || options.server.port || 3000
  options.server.host = host || options.server.host || 'localhost'
  options.server.socket = socket || options.server.socket
  return options
}
