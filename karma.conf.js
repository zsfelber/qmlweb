module.exports = function(config) {
  config.set({
    basePath: "",
    frameworks: ["jasmine"],
    files: [
      config.coverageEnabled ? "tmp/qt.covered.js" : "lib/qt.js",
      config.debug ? "karma_debug.js": "karma_nodebug.js",
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
      { pattern: "tests/*/**/*.png", included: false },
      "lib/qmlweb.css"
    ],
    browsers: ["PhantomJSCustom"],
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
      }
   }
  });
};
