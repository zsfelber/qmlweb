const babel = require("gulp-babel");
const karma = require("karma");
const path = require("path");

function startTests() {
  new karma.Server({
    singleRun: true,
    configFile: "karma.conf.js"
  }, code => {
    process.exit(code);
  }).start();
}

module.exports = startTests;
