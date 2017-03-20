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
        fileName: options && options.fileName || undefined
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

  function imagesEqual(a, b) {
    if (a.width !== b.width || a.height !== b.height) {
      return false;
    }

    return image2data(a) === image2data(b);
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
          const div = this.div;
          const qml = loadQmlFile(test.qml, div, {}, done).dom;
          var result;
          var expected;
          var loaded = 0;

          var process = function() {
            ++loaded;
            console.log("loaded:"+loaded);
            if (loaded !== 2) return;
            expect(imagesEqual(result, expected)).toBe(true);
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
            const f = test.group + "/" + test.name + ".png";
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
              delayedFrames(onTestLoad, options && options.framesDelay || 0)();
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
