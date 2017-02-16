module.exports = function(config) {
  config.set({
    basePath: "",
    frameworks: ["jasmine"],
    files: [
      config.coverageEnabled ? "tmp/qt.covered.js" : "lib/qt.js",
      { pattern: "lib/*.js", included: false },
      { pattern: "lib/*.js.map", included: false },
      { pattern: "tmp/qmlweb.*.js", included: false },
      { pattern: "tmp/*.js.map", included: false },
      "tests/common.js",
      "tests/failingTests.js",
      "tests/*/*.js",
      { pattern: "tests/*/**/qmldir", included: false },
      { pattern: "tests/*/**/qml/*.js", included: false },
      { pattern: "tests/*/**/*.qml", included: false },
      { pattern: "tests/*/**/*.png", included: false }
    ],
    browsers: ["PhantomJSCustom", "Chrome_without_security"],
    reporters: ["spec", "coverage"],
    coverageReporter: {
      type: "lcov",
      dir: "coverage/"
    },
    customLaunchers: {
      PhantomJSCustom: {
        base: "PhantomJS",
        options: {
          onCallback: require("./tests/phantom.callback.js")
        }
      },
      Chrome_without_security: {
        base: 'Chrome',
        flags: ['--disable-web-security'],
        options: {
          onCallback: require("./tests/phantom.callback.js")
        }
      }
   }
  });
};
