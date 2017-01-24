function _ubertrim(str) {
  if (str.replace) {
    str = str.replace(/^(?:\s|[;,])*/g, "");
    str = str.replace(/(?:\s|[;,])*$/g, "");
  } else {
    console.warn("_ubertrim not possible : what's this?!:"+str+" "+(typeof str)+" "+JSON.stringify(str));
  }

  return str;
}

class QMLBinding {
/**
 * Create QML binding.
 * @param {Variant} val Sourcecode or function representing the binding
 * @param {Array} tree Parser tree of the binding
 * @return {Object} Object representing the binding
 */
  constructor(src, property, flags, info) {
    // this.flags states whether the binding is a simple js statement, a
    // function containing a return statement, or a block of statements.
    // it may also fine tune other aspects, like bidirectionality of binding or
    // whether it is an alias

    // If flags is not passed, we decide it here.
    // If it is a block, we require a return statement. If it is a
    // formal code block it could though also be a object definition, so we need to
    // check that as well (it is, if the content is labels).
    if (flags === undefined) {
      if (property && property[0] === "block" &&
          property[1][0] && property[1][0][0] !== "label") {
        this.flags = QMLBinding.ImplBlock;
      }
    } else {
      this.flags = flags;
      this.property = property;
    }
    this.flags |= QMLBinding.ImplExpression;

    if (src) {
      src = _ubertrim(src);
      if (UglifyJS) {
        try {
          src = UglifyJS.minify("_=("+src+")", {fromString: true});
          while (src.code!==undefined) src = src.code;
          src = src.substring(2);
        } catch (e) {
          try {
            src = UglifyJS.minify(src, {fromString: true, parse:{bare_returns:true}});
            while (src.code!==undefined) src = src.code;
          } catch (e2) {
            console.warn(e.message+":\n"+e2.message+":\n(_=) "+src);
          }
        }
        if (src) {
          src = _ubertrim(src);
        }
      }

      var match = /^function\s*(\w|\d|\$)*\(/.exec(src);
      if (match) {
        if (!this.flags) {
          throw new Error("Binding is effectively a function but declared to expression : "+(info?info:src));
        }
        src = src.substring(match[0].length-1);
        this.flags &= ~QMLBinding.ImplBlock;
        this.flags |= QMLBinding.ImplFunction;
      } else {
        if (this.flags & QMLBinding.ImplFunction) {
          throw new Error("Binding is effectively not a function but declared so : "+(info?info:src));
        }
      }
    }

    this.src = src;

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
        "flags": ${this.flags},
        "property": "${this.property}"
      })`;
    } else {
      return `b({
        "src": "${this.src}",
        "flags": ${this.flags}
      })`;
    }
  }*/

  get(namespaceObject, basePath) {
    var object = namespaceObject.$object ? namespaceObject.$object : namespaceObject;
    var context = namespaceObject.$context;
    QmlWeb.executionContext = context;
    if (basePath) {
      QmlWeb.engine.$basePath = basePath;
    }
    // .call is needed for `this` support
    return this.implGet.call(object);
  }

  set(namespaceObject, basePath, value, flags) {
    var object = namespaceObject.$object ? namespaceObject.$object : namespaceObject;
    var context = namespaceObject.$context;
    QmlWeb.executionContext = context;
    if (basePath) {
      QmlWeb.engine.$basePath = basePath;
    }
    // .call is needed for `this` support
    this.implSet.call(object, value, flags, namespaceObject);
  }

/**
 * Compile binding. Afterwards you may call binding.eval/get/set to evaluate.
 */
  compile() {
    this.src = _ubertrim(this.src);
    this.implGet = QMLBinding.bindGet(this.src, this.property, this.flags);
    if (this.flags & QMLBinding.Bidirectional) {
      this.implSet = QMLBinding.bindSet(this.src, this.property, this.flags);
    }
    this.compiled = true;
  }

  static bindGet(src, property, flags) {

    if (property) {
      if (flags) {
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

    return new Function(`
      with(QmlWeb) with(QmlWeb.executionContext) with(this) {
        ${ flags===2 ? "return function"+src+";" : flags===1 ? src : "return "+src+";"}
      }
    `);
  }

  static bindSet(src, property, flags) {
    if (flags) {
      throw new Error("Invalid writable/bidirectional binding, it should be an expression : "+src);
    }

    var props = (flags & QMLBinding.Alias) ? "$properties" : "$propsboth";

    if (src) {

      // NOTE validate first
      if (!/^\w+$/.test(property) || !/^(\w+\.)*\w+$/.test(src)) {
        throw new Error("Invalid writable/bidirectional binding expression :  "+src+" . "+property);
      }

      return new Function("__value", "__flags", "__ns", `
        with(QmlWeb) with(QmlWeb.executionContext) with(this) {
          var obj = ${src};
          if (!obj) {
            console.error("Writable/Bidirectional binding target property '${src}' is null. Cannot set '${property}' on null.");
            return;
          }
          var prop = obj.${props}["${property}"];
          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding target property '${src}' . '${property}' is read-only.");
            } else {
              prop.set(__value, __flags, __ns);
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

      return new Function("__value", "__flags", "__ns", `
        with(QmlWeb) with(QmlWeb.executionContext) with(this) {
          var prop = this.${props}["${property}"];

          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding target property '${src}' . '${property}' is read-only.");
            } else {
              prop.set(__value, __flags, __ns);
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
QMLBinding.Bidirectional = 4;
QMLBinding.Alias = 12; // always bidirectional

QmlWeb.QMLBinding = QMLBinding;
