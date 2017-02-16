const karma = require("karma");
const path = require("path");


new karma.Server({
  singleRun: true,
  configFile: "karma.conf.js"
}, code => {
  process.exit(code);
}).start();
