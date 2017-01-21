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
  constructor(val, rhs, implementMode, bidirectional, info) {
    // this.implementMode states whether the binding is a simple js statement or a
    // function containing a return statement. We decide this on whether it is a
    // code block or not. If it is, we require a return statement. If it is a
    // code block it could though also be a object definition, so we need to
    // check that as well (it is, if the content is labels).
    if (implementMode === undefined) {
      if (rhs && rhs[0] === "block" &&
          rhs[1][0] && rhs[1][0][0] !== "label") {
        this.implementMode = QMLBinding.ImplBlock;
      }
      // else Not serialized, but still means false
    } else {
      this.implementMode = implementMode;
      this.rhs = rhs;
    }
    this.implementMode |= QMLBinding.ImplExpression;

    if (val) {
      if (UglifyJS) {
        try {
          this.src = UglifyJS.minify("_="+val, {fromString: true});
          while (this.src.code) this.src = this.src.code;
          this.src = this.src.substring(2);
        } catch (e) {
          try {
            this.src = UglifyJS.minify(val, {fromString: true, parse:{bare_returns:true}});
            while (this.src.code) this.src = this.src.code;
          } catch (e2) {
            console.warn(e.message+":\n"+e2.message+":\n(_=) "+val);
            this.src = val;
          }
        }
      } else {
        this.src = val.trim();
      }
    } else {
      this.src = val;
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

    this.bidirectional = bidirectional;
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
    if (this.rhs) {
      return `b({
        "src": "${this.src}",
        "implementMode": ${this.implementMode},
        "rhs": "${this.rhs}"
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

  set(object, context, basePath, value) {
    QmlWeb.executionContext = context;
    if (basePath) {
      QmlWeb.engine.$basePath = basePath;
    }
    // .call is needed for `this` support
    this.implSet.call(object, object, context, value);
  }

/**
 * Compile binding. Afterwards you may call binding.eval/get/set to evaluate.
 */
  compile() {
    this.src = this.src.trim();
    this.implGet = QMLBinding.bindGet(this.src, this.rhs, this.implementMode);
    if (this.bidirectional) {
      this.implSet = QMLBinding.bindSet(this.src, this.rhs, this.implementMode);
    }
    this.compiled = true;
  }

  static bindGet(src, rhs, implementMode) {
    if (implementMode===QMLBinding.ImplFunction) {
      //console.warn
      throw new Error("Invalid binding, it should be an expression/block : "+src);
      //return undefined;
    } else {
      src = _ubertrim(src);

      if (rhs) {
        if (implementMode) {
          throw new Error("Invalid binding rhs, passed along with a function/block : "+rhs);
        }
        if (!/^\w+$/.test(rhs)) {
          throw new Error("Invalid binding rhs property format :  "+rhs);
        }
        if (src) src += ".";
        src += rhs;
      }

      if (!src) {
        throw new Error("Invalid binding path : "+src);
      }

      return new Function("__executionObject", "__executionContext", `
        with(QmlWeb) with(__executionContext) with(__executionObject) {
          ${ implementMode===2 ? "(function"+src+").call(this);" : implementMode===1 ? src : "return "+src+";"}
        }
      `);
    }
  }

  static bindSet(src, rhs, implementMode) {
    if (implementMode) {
      throw new Error("Invalid writable/bidirectional binding, it should be an expression : "+src);
    }
    src = _ubertrim(src);

    if (src) {

      // NOTE validate first
      if (!/^\w+$/.test(rhs) || !/^(\w+\.)*\w+$/.test(src)) {
        throw new Error("Invalid writable/bidirectional binding expression :  "+src+" . "+rhs);
      }

      return new Function("__executionObject", "__executionContext", "__value", `
        with(QmlWeb) with(__executionContext) with(__executionObject) {
          var obj = ${src};
          if (!obj) {
            console.error("Writable/Bidirectional binding target property '${src}' is null. Cannot set '${rhs}' on null.");
            return;
          }
          var prop = obj.$properties["${rhs}"];
          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding target property '${src}' . '${rhs}' is read-only.");
            } else {
              prop.set(__value, QMLProperty.ReasonUser);
            }
          } else {
            throw new Error("Writable/Bidirectional binding target property '${src}' . '${rhs}' not found, it is not writable.");
          }
        }
      `);
    } else {

      // NOTE validate first
      if (!/^\w+$/.test(rhs)) {
        throw new Error("Invalid writable/bidirectional binding expression : "+rhs);
      }

      return new Function("__executionObject", "__executionContext", "__value", `
        with(QmlWeb) with(__executionContext) with(__executionObject) {
          var prop = this.$properties["${rhs}"];
          if (!prop) {
             prop = __executionContext.$properties["${rhs}"];
          }

          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding target property '${src}' . '${rhs}' is read-only.");
            } else {
              prop.set(__value, QMLProperty.ReasonUser);
            }
          } else {
            throw new Error("Writable/Bidirectional binding target property '${src}' . '${rhs}' not found, it is not writable.");
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
