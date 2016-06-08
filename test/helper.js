'use strict'

let fs = require('fs')
let path = require('path')
let rimraf = require('rimraf')
let resultsDir = path.join(__dirname, '../allure-results')
let Launcher = require('webdriverio/build/lib/launcher')
let parseXmlString = require('xml2js').parseString

class helper {

  static getResultsXML () {
      let promises = helper.getResults().map((result) => {
          return new Promise((resolve, reject) => {
              parseXmlString(result, { trim: true }, (err, xmlData) => {
                  if (err) {
                      reject(err)
                  } else {
                      resolve(xmlData)
                  }
              })
          })
      })

      return Promise.all(promises)
  }

  static getResults () {
      return helper.getResultFiles('xml')
        .map((file) => {
            return fs.readFileSync(path.join(resultsDir, file))
        })
  }

  static getResultFiles (pattern) {
      let filter = getResultFileFilter(pattern)

      return fs.readdirSync(resultsDir)
        .filter(filter)
  }

  static clean () {
      return new Promise((resolve, reject) => {
          rimraf(resultsDir, (err) => {
              if (err) {
                  reject(err)
              } else {
                  resolve()
              }
          })
      })
  }

  static run (specs, configName) {
      helper.disableOutput()
      specs = specs.map((spec) => './test/fixtures/specs/' + spec + '.js')

      let launcher = new Launcher(getConfigFilePath(configName), {
          specs
      })

      let out = launcher.run()
      out.then(helper.enableOutput)

      return out
  }

  static disableOutput () {
      console.log = function () {}
      console.error = function () {}
  }

  static enableOutput () {
      console.log = console.orig_log
      console.error = console.orig_error
  }

}

function getConfigFilePath (configName) {
    configName = configName ? 'wdio-' + configName : 'wdio'
    return `./test/fixtures/${configName}.conf.js`
}

function getResultFileFilter (pattern) {
    if (pattern instanceof Array) {
        return (file) => {
            let match = false
            pattern
              .map(getResultFileFilter)
              .forEach((filter) => {
                  if (!match && filter(file)) {
                      match = true
                  }
              })

            return match
        }
    } else if (typeof pattern === 'string') {
        return (file) => file.endsWith('.' + pattern)
    } else if (pattern instanceof RegExp) {
        return (file) => pattern.test(file)
    } else {
        return () => true
    }
}

console.orig_log = console.log
console.orig_error = console.error

module.exports = helper
