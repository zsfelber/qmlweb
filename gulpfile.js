const gulp = require("gulp");
const concat = require("gulp-concat");
const rename = require("gulp-rename");
const changed = require("gulp-changed");
const order = require("gulp-order");
const uglify = require("gulp-uglify");
const sourcemaps = require("gulp-sourcemaps");
const iife = require("gulp-iife");
const babel = require("gulp-babel");
const replace = require("gulp-replace");
const karma = require("karma");
const istanbul = require("gulp-istanbul");
const path = require("path");

const qtcoreSources = [
  "src/*.js",
  "src/qtbase/*.js",
  "src/modules/*.js",
  "src/modules/QtQml/Qt.js",
  "src/engine/QML*.js",
  "src/engine/modules.js",
  "src/engine/*.js",
  "src/modules/QtQml/QtObject.js",
  "src/modules/QtQml/Timer.js",
  "src/modules/QtQml/Connections.js",
  "src/modules/QtQml/Binding.js",
  "src/modules/QtQml/Component.js",
  "src/modules/QtQuick.Dialogs/*.js",
  "src/modules/QtNfc/*.js",
  "src/modules/QmlWeb/*.js",
  "src/modules/QmlWeb.Dom/*.js",
  "src/modules/QtQuick/*.js",
  "src/modules/QtMobility/*.js",
  "src/modules/QtQuick.Window/*.js",
  "src/modules/QtWebSockets/*.js",
  "src/modules/QtBluetooth/*.js",
  "src/modules/QtQml.Models/*.js",
  "src/modules/QtWebView/*.js",
  "src/modules/QtWebEngine/*.js",
  "src/modules/QtQuick.Controls.2/*.js",
  "src/modules/QtGraphicalEffects/*.js",
  "src/modules/Qt.labs.settings/*.js",
  "src/modules/QtMultimedia/*.js",
  "src/modules/QtQuick.Controls/*.js"
];

const parserSources = [
  "node_modules/qmlweb-parser/lib/*"
];

const licenseSources = [
  "LICENSE",
  "node_modules/qmlweb-parser/LICENSE"
];

const qrcSources = [
  "./lib/qmlwebqrc.js"
];

// This is required because other values confuse PhantomJS, and are sometimes
// set by default by the system.
process.env.QT_QPA_PLATFORM = "";

gulp.task("license", () =>
  gulp.src(licenseSources)
    .pipe(order(licenseSources, { base: __dirname }))
    .pipe(concat("LICENSE"))
    .pipe(changed("./lib"))
    .pipe(gulp.dest("./lib"))
);

gulp.task("parser", () =>
  gulp.src(parserSources)
    .pipe(gulp.dest("./lib"))
);

gulp.task("qrc", [], () =>
  gulp.src("./lib/qmlwebqrc.js")
    .pipe(rename("qmlwebqrc.min.js"))
    .pipe(changed("./lib"))
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("./lib"))
);

gulp.task("parser-covered", () =>
  // This file is not covered here on a purpose.
  // Name *.covered.js is required to autoload from qt.covered.js.
  gulp.src("node_modules/qmlweb-parser/lib/qmlweb.parser.js")
    .pipe(rename("qmlweb.parser.covered.js"))
    .pipe(changed("./tmp"))
    .pipe(gulp.dest("./tmp"))
);

gulp.task("qmlweb-covered", () =>
  gulp.src(qtcoreSources)
    .pipe(order(qtcoreSources, { base: __dirname }))
    .pipe(sourcemaps.init())
    .pipe(istanbul({
      // This is what karma uses
      coverageVariable: "__coverage__"
    }))
    .pipe(concat("qt.covered.js"))
    .pipe(changed("./tmp"))
    .pipe(babel())
    .pipe(replace(/["']use strict["'];/g, ""))
    .pipe(iife({
      useStrict: false,
      params: ["global"],
      args: ["typeof global != \"undefined\" ? global : window"]
    }))
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("./tmp"))
);

gulp.task("qmlweb-gen", () => {
  gulp.src(qtcoreSources)
    .pipe(order(qtcoreSources, { base: __dirname }))
    .pipe(concat("qt.0.js"))
    .pipe(changed("./lib"))
    .pipe(gulp.dest("./lib"));
});

gulp.task("qmlweb-dev", ["qmlweb-gen"], () => {
  gulp.src(qtcoreSources)
    .pipe(order(qtcoreSources, { base: __dirname }))
    .pipe(sourcemaps.init())
    .pipe(concat("qt.js"))
    .pipe(changed("./lib"))
    .pipe(babel())
    .pipe(replace(/"use strict";/g, ""))
    .pipe(iife({
      useStrict: false,
      params: ["global"],
      args: ["typeof global != \"undefined\" ? global : window"]
    }))
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("./lib"))
});

gulp.task("qmlweb", ["qmlweb-dev"], () =>
  gulp.src("./lib/qt.js")
    .pipe(rename("qt.min.js"))
    .pipe(changed("./lib"))
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("./lib"))
);

gulp.task("build-covered", ["parser-covered", "qmlweb-covered"]);

gulp.task("build-dev", ["qmlweb-dev", "parser", "qrc", "license"]);

gulp.task("build", ["qmlweb", "parser", "qrc", "license"]);

gulp.task("watch", ["build"], () => {
  gulp.watch(qtcoreSources, ["qmlweb"]);
  gulp.watch(parserSources, ["parser"]);
  gulp.watch(qrcSources, ["qrc"]);
  gulp.watch(licenseSources, ["license"]);
});

gulp.task("watch-dev", ["build-dev"], () => {
  gulp.watch(qtcoreSources, ["qmlweb-dev"]);
  gulp.watch(parserSources, ["parser"]);
  gulp.watch(qrcSources, ["qrc"]);
  gulp.watch(licenseSources, ["license"]);
});

gulp.task("test", ["build-dev"], () => {
  var g = typeof window!=="undefined" ? window : global;
  g.testernodebug = true;
  new karma.Server({
    singleRun: true,
    configFile: path.join(__dirname, "karma.conf.js"),
    browsers: ["PhantomJSCustom"]
  }, code => {
    process.exit(code);
  }).start();
});

gulp.task("coverage", ["build-covered"], () => {
  var g = typeof window!=="undefined" ? window : global;
  g.testernodebug = true;
  new karma.Server({
    singleRun: true,
    coverageEnabled: true,
    configFile: path.join(__dirname, "karma.conf.js"),
    browsers: ["PhantomJSCustom"]
  }, code => {
    process.exit(code);
  }).start();
});

gulp.task("test-watch", ["watch-dev"], done => {
  var g = typeof window!=="undefined" ? window : global;
  g.testernodebug = true;
  new karma.Server({
    configFile: path.join(__dirname, "karma.conf.js"),
    browsers: ["PhantomJSCustom"]
  }, done).start();
});

gulp.task("test-debug", ["watch-dev"], done => {
  new karma.Server({
    configFile: path.join(__dirname, "karma.conf.js"),
    browsers: ["PhantomJSCustom"/* "Chrome_without_security"*/],
    reporters: ["progress"],
    debug: true,
    singleRun: false,
    client: {
      captureConsole: false
    }
  }, done).start();
});

gulp.task("default", ["watch"]);
