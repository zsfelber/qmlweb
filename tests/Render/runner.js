
(function() {
  //if (!window.top.callPhantom) {
  //  console.log("Render tests require PhantomJS");
  //  return;
  //}

  function screenshot(div, options) {

    var rect0 = div.getBoundingClientRect();
    var rect1 = window.parent.document.getElementById("context")
                                      .getBoundingClientRect();
    var offset = {
      width: div.offsetWidth,
      height: div.offsetHeight,
      top: rect0.top + rect1.top,
      left: rect0.left + rect1.left
    };

    var image = document.createElement("img");

    if (window.top.callPhantom) {
      var base64 = window.top.callPhantom("render", {
        offset: offset,
        fileName: options && options.fileName ? options.fileName : undefined
      });
      image.src = "data:image/png;base64," + base64;
    }

    return image;
  }

  function image2data(img) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    canvas.height = img.height;
    canvas.width = img.width;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png", 1);
  }

  function imagesEqual(result, expected, savefilenm) {
    var matching,d1;
    if (result.width !== expected.width || result.height !== expected.height) {
      console.warn("dimensions not matching : "+result.width+"x"+result.height+" vs "+expected.width+"x"+expected.height)
      matching = false;
    } else {
      matching = (d1=image2data(result)) === image2data(expected);
    }

    return matching;
  }

  function delayedFrames0(callback, frames, timeout) {
    console.log("delayedFrames0 : "+frames);
    if (frames === 0) {
      return callback;
    }
    setTimeout(function() {
      window.requestAnimationFrame(delayedFrames(callback, frames - 1));
    }, timeout);
  }

  function delayedFrames(callback, frames) {
    console.log("delayedFrames : "+frames);
    if (frames === 0) {
      return callback;
    }
    return function() {
      window.requestAnimationFrame(delayedFrames(callback, frames - 1));
    };
  }

  var regex = new RegExp("^/base/tests/Render/.*\\.qml$");
  var tests = Object.keys(window.__karma__.files)
    .filter(function(path) {
      return regex.test(path);
    })
    .map(function(path) {
      return {
        qml: path,
        png: path.replace(/.qml$/, ".png"),
        group: path.replace("/base/tests/Render/", "").replace(/[/][^/]+$/, "")
                   .replace(/[/]/g, "."),
        name: path.replace(/^.*[/]/, "").replace(".qml", "")
      };
    })
    .reduce(function(data, entry) {
      if (!data.hasOwnProperty(entry.group)) {
        data[entry.group] = [];
      }

      data[entry.group].push(entry);
      return data;
    }, {});

  Object.keys(tests).forEach(function(group) {
    describe("Render." + group, function() {
      setupDivElement();
      tests[group].forEach(function(test) {
        it(test.name, function(done) {
          const qml = loadQmlFile(test.qml, this.div, {}, done);
          const div = qml.dom;
          var result;
          var expected;
          var loaded = 0;

          const f = test.group + "/" + test.name + ".png";

          var process = function() {
            ++loaded;
            console.log("loaded:"+loaded);
            if (loaded !== 2) return;
            expect(imagesEqual(result, expected, "_"+f)).toBe(true);
            done();
          };

          expected = document.createElement("img");
          expected.src = test.png;
          console.log("expected png:"+expected.src);
          expected.onload = process;
          expected.onerror = function() {
            console.error("Could not load expected : "+test.png);
          };

          var onTestLoad = function() {
            console.log("screenshot ... "+f);
            result = screenshot(div, {
              fileName: f
            });
            result.onload = process;
            result.onerror = function() {
              console.error("Could not load screenshot : "+f);
            };
          };

          if (group.endsWith("Async")) {
            window.onTestLoad = function(options) {
              delayedFrames(onTestLoad, options && options.framesDelay || 0, 1000)();
            };
          } else {
            onTestLoad();
          }
          failTimeout(2000, done);
        });
      });
    });
  });
}());
