import micromatch from "micromatch"
import { exec } from "node:child_process"
import path from "node:path"
import { PluginOption } from "vite"

export const watch = (config: {
  pattern: string | string[]
  command: string | string[] | ((file: string) => string) | ((file: string) => string)[]
  silent?: boolean
  timeout?: number
  onInit?: boolean
}): PluginOption => {
  const options = {
    silent: false,
    timeout: 500,
    onInit: true,
    ...config,
  }

  let throttled = false

  const execute = (file: string) => {
    ;[options.command].flat().forEach((command) => {
      const commandToExecute = typeof command === "string" ? command : command(file)
      if (!options.silent) console.info("Running", commandToExecute)
      exec(commandToExecute, (exception, output, error) => {
        if (!options.silent && output) console.log(output)
        if (!options.silent && error) console.error(error)
      })
    })
  }

  return {
    name: "vite-plugin-watch",

    buildStart() {
      if (options.onInit) {
        execute("")
      }
    },

    handleHotUpdate({ file, server }) {
      if (throttled) return

      throttled = true

      setTimeout(() => (throttled = false), options.timeout)
      const patterns = Array.of(options.pattern).flat()
      const shouldRun = patterns.find(
        (pattern) =>
          micromatch([file], path.resolve(server.config.root, pattern).replaceAll("\\", "/"))
            .length > 0,
      )

      if (shouldRun) {
        execute(file)
      }
    },
  }
}
