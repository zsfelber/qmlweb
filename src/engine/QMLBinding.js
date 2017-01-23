function _ubertrim(str) {
    return str.replace(/(?:\s|[;,])*$/g, "");
}

class QMLBinding {
/**
 * Create QML binding.
 * @param {Variant} val Sourcecode or function representing the binding
 * @param {Array} tree Parser tree of the binding
 * @return {Object} Object representing the binding
 */
  constructor(src, property, implementMode, bidirectional, info) {
    // this.implementMode states whether the binding is a simple js statement or a
    // function containing a return statement. We decide this on whether it is a
    // code block or not. If it is, we require a return statement. If it is a
    // code block it could though also be a object definition, so we need to
    // check that as well (it is, if the content is labels).
    if (implementMode === undefined) {
      if (property && property[0] === "block" &&
          property[1][0] && property[1][0][0] !== "label") {
        this.implementMode = QMLBinding.ImplBlock;
      }
    } else {
      this.implementMode = implementMode;
      this.property = property;
    }
    this.implementMode |= QMLBinding.ImplExpression;
    this.bidirectional = bidirectional;

    if (src) {
      if (UglifyJS) {
        try {
          this.src = UglifyJS.minify("_="+src, {fromString: true});
          while (this.src.code) this.src = this.src.code;
          this.src = this.src.substring(2);
        } catch (e) {
          try {
            this.src = UglifyJS.minify(src, {fromString: true, parse:{bare_returns:true}});
            while (this.src.code) this.src = this.src.code;
          } catch (e2) {
            console.warn(e.message+":\n"+e2.message+":\n(_=) "+src);
            this.src = src;
          }
        }
      } else {
        this.src = src.trim();
      }

      var match = /^function\s*(\w|\d|\$)*\(/.exec(this.src);
      if (match) {
        if (!this.implementMode) {
          throw new Error("Binding is effectively a function but declared to expression : "+(info?info:this.src));
        }
        this.src = this.src.substring(match[0].length-1);
        this.implementMode = QMLBinding.ImplFunction;
      } else {
        if (this.implementMode === QMLBinding.ImplFunction) {
          throw new Error("Binding is effectively not a function but declared so : "+(info?info:this.src));
        }
      }
    } else {
      this.src = src;
    }

    // Not serialized, but still means false:
    //this.compiled = false;

    Object.defineProperty(this, "serializedTypeId", {
      value: "b",
      configurable: true,
      enumerable: false,
      writable: false
    });
    Object.defineProperty(this, "eval", {
      value: this.get,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  /*toJSON() {
    var src
    if (this.property) {
      return `b({
        "src": "${this.src}",
        "implementMode": ${this.implementMode},
        "property": "${this.property}"
      })`;
    } else {
      return `b({
        "src": "${this.src}",
        "implementMode": ${this.implementMode}
      })`;
    }
  }*/

  get(object, context, basePath) {
    QmlWeb.executionContext = context;
    if (basePath) {
      QmlWeb.engine.$basePath = basePath;
    }
    // .call is needed for `this` support
    return this.implGet.call(object, object, context);
  }

  set(object, context, basePath, value, flags) {
    QmlWeb.executionContext = context;
    if (basePath) {
      QmlWeb.engine.$basePath = basePath;
    }
    // .call is needed for `this` support
    this.implSet.call(object, object, context, value, flags);
  }

/**
 * Compile binding. Afterwards you may call binding.eval/get/set to evaluate.
 */
  compile() {
    this.src = this.src.trim();
    this.implGet = QMLBinding.bindGet(this.src, this.property, this.implementMode);
    if (this.bidirectional) {
      this.implSet = QMLBinding.bindSet(this.src, this.property, this.implementMode);
    }
    this.compiled = true;
  }

  static bindGet(src, property, implementMode) {
    src = _ubertrim(src);

    if (property) {
      if (implementMode) {
        throw new Error("Invalid binding property, passed along with a function/block : "+property);
      }
      if (!/^\w+$/.test(property)) {
        throw new Error("Invalid binding property property format :  "+property);
      }
      if (src) src += ".";
      src += property;
    }

    if (!src) {
      throw new Error("Invalid binding path : "+src);
    }

    return new Function("__executionObject", "__executionContext", `
      with(QmlWeb) with(__executionContext) with(__executionObject) {
        ${ implementMode===2 ? "return function"+src+";" : implementMode===1 ? src : "return "+src+";"}
      }
    `);
  }

  static bindSet(src, property, implementMode) {
    if (implementMode) {
      throw new Error("Invalid writable/bidirectional binding, it should be an expression : "+src);
    }
    src = _ubertrim(src);

    if (src) {

      // NOTE validate first
      if (!/^\w+$/.test(property) || !/^(\w+\.)*\w+$/.test(src)) {
        throw new Error("Invalid writable/bidirectional binding expression :  "+src+" . "+property);
      }

      return new Function("__executionObject", "__executionContext", "__value", "__flags", `
        with(QmlWeb) with(__executionContext) with(__executionObject) {
          var obj = ${src};
          if (!obj) {
            console.error("Writable/Bidirectional binding target property '${src}' is null. Cannot set '${property}' on null.");
            return;
          }
          var prop = obj.$properties["${property}"];
          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding target property '${src}' . '${property}' is read-only.");
            } else {
              prop.set(__value, __flags, prop.obj, __executionContext);
            }
          } else {
            throw new Error("Writable/Bidirectional binding target property '${src}' . '${property}' not found, it is not writable.");
          }
        }
      `);
    } else {

      // NOTE validate first
      if (!/^\w+$/.test(property)) {
        throw new Error("Invalid writable/bidirectional binding expression : "+property);
      }

      return new Function("__executionObject", "__executionContext", "__value", "__flags", `
        with(QmlWeb) with(__executionContext) with(__executionObject) {
          var prop = this.$properties["${property}"];
          if (!prop) {
             prop = __executionContext.$properties["${property}"];
          }

          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding target property '${src}' . '${property}' is read-only.");
            } else {
              prop.set(__value, __flags, prop.obj, __executionContext);
            }
          } else {
            throw new Error("Writable/Bidirectional binding target property '${src}' . '${property}' not found, it is not writable.");
          }
        }
      `);
    }

  }

}
QMLBinding.ImplExpression = 0;
QMLBinding.ImplBlock = 1;
QMLBinding.ImplFunction = 2;

QmlWeb.QMLBinding = QMLBinding;
