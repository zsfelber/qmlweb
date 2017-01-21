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
  constructor(val, rhs, isfunc, bidirectional, info) {
    // this.isFunction states whether the binding is a simple js statement or a
    // function containing a return statement. We decide this on whether it is a
    // code block or not. If it is, we require a return statement. If it is a
    // code block it could though also be a object definition, so we need to
    // check that as well (it is, if the content is labels).
    if (isfunc === undefined) {
      if (rhs && rhs[0] === "block" &&
          rhs[1][0] && rhs[1][0][0] !== "label") {
        this.isFunction = true;
      }
      // else Not serialized, but still means false
    } else {
      this.isFunction = isfunc;
      this.rhs = rhs;
    }
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
      if (!this.isFunction) {
        throw new Error("Binding is effectively a function but not declared so : "+this.src);
      }
      this.src = this.src.substring(match[0].length-1);
    } else {
      if (this.isFunction) {
        //console.warn("Binding is effectively not a function but declared so : "+(info?info:this.src));
        this.src = "(){"+this.src+"}";
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
        "isFunction": ${this.isFunction},
        "rhs": "${this.rhs}"
      })`;
    } else {
      return `b({
        "src": "${this.src}",
        "isFunction": ${this.isFunction}
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
    this.implGet = QMLBinding.bindGet(this.src, this.rhs, this.isFunction);
    if (this.bidirectional) {
      this.implSet = QMLBinding.bindSet(this.src, this.rhs, this.isFunction);
    }
    this.compiled = true;
  }

  static bindGet(src, rhs, isFunction) {
    src = _ubertrim(src);

    if (rhs) {
      if (isFunction) {
        throw new Error("Invalid binding rhs, passed along with a function : "+rhs);
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
        ${isFunction ? "function"+src : "return "+src+";"}
      }
    `);
  }

  static bindSet(src, rhs, isFunction) {
    if (isFunction) {
      throw new Error("Invalid writable/bidirectional binding, it should not be a function : "+src);
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

QmlWeb.QMLBinding = QMLBinding;
