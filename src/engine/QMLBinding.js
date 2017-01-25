let bindingIds = 0;

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
    try {
      if (!this.implGet) {
        console.warn("Binding/get error  compiled:"+this.compiled+"  no compiled getter  src:\n"+this.src);
        return;
      }
      return this.implGet.call(object, namespaceObject);
    } catch (err) {
      if (QmlWeb.engine.operationState !== QmlWeb.QMLOperationState.Init) {
        console.warn("Binding/get error : "+err.message+"  impl:\n"+this.implGet.toString());
      }
      throw err;
    }
  }

  set(namespaceObject, basePath, value, flags) {
    var object = namespaceObject.$object ? namespaceObject.$object : namespaceObject;
    var context = namespaceObject.$context;
    QmlWeb.executionContext = context;
    if (basePath) {
      QmlWeb.engine.$basePath = basePath;
    }
    // .call is needed for `this` support
    try {
      if (!this.implSet) {
        console.warn("Binding/set error  compiled:"+this.compiled+"  no compiled setter  src:\n"+this.src);
        return;
      }
      this.implSet.call(object, value, flags, namespaceObject);
    } catch (err) {
      if (QmlWeb.engine.operationState !== QmlWeb.QMLOperationState.Init) {
        console.warn("Binding/set error : "+err.message+"  impl:\n"+this.implSet.toString());
      }
      throw err;
    }
  }

/**
 * Compile binding. Afterwards you may call binding.eval/get/set to evaluate.
 */
  compile() {
    if (!this.bindingId) {
      this.bindingId = ++bindingIds;
    }
    this.src = _ubertrim(this.src);
    this.compiled = true;
    this.implGet = QMLBinding.bindGet(this.src, this.property, this.flags);
    if (this.flags & QMLBinding.Bidirectional) {
      this.implSet = QMLBinding.bindSet(this.src, this.property, this.flags);
    }
  }

  static bindGet(src, property, flags) {

    if (property) {
      var fp = QmlWeb.formatPath(property);
      if (flags&(QMLBinding.ImplFunction|QMLBinding.ImplBlock)) {
        throw new Error("Invalid binding property, passed along with a function/block : "+fp);
      }
      if (src) {
        src = src + QmlWeb.formatPath(property, property);
      } else {
        src = fp;
      }
    }

    if (!src) {
      throw new Error("Invalid binding path : "+src);
    }

    var vvith;
    if (flags & QMLBinding.Alias) {
      vvith = "with(QmlWeb) with(QmlWeb.executionContext.$elementoverloads) with(QmlWeb.executionContext) with(this.$noalias)";
    } else {
      vvith = "with(QmlWeb) with(QmlWeb.executionContext) with(QmlWeb.executionContext.$elementoverloads) with(this)";
    }

    return new Function("__ns", `
      ${vvith} {
        ${ (flags&QMLBinding.ImplFunction) ? "return function"+src+";" : (flags&QMLBinding.ImplBlock) ? src : "return "+src+";"}
      }
    `);
  }

  static bindSet(src, property, flags) {
    if (flags&(QMLBinding.ImplFunction|QMLBinding.ImplBlock)) {
      throw new Error("Invalid writable/bidirectional binding, it should be an expression : "+src);
    }

    var props, vvith;
    if (flags & QMLBinding.Alias) {
      props = "$properties_noalias";
      vvith = "with(QmlWeb) with(QmlWeb.executionContext.$elementoverloads) with(QmlWeb.executionContext) with(this.$noalias)";
    } else {
      props = "$properties";
      vvith = "with(QmlWeb) with(QmlWeb.executionContext) with(QmlWeb.executionContext.$elementoverloads) with(this)";
    }

    // NOTE validate first
    var fp = QmlWeb.formatPath(property, property);

    if (src) {

      return new Function("__value", "__flags", "__ns", `
        ${vvith} {
          var obj = ${src};
          if (!obj) {
            console.error("Writable/Bidirectional binding write error : target property '${src}' is null. Cannot set '${property}' on null.");
            return;
          }
          var prop;
          if (obj === this)
            prop = obj.${props}${fp};
          else
            prop = obj.$properties${fp};

          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding write error : target property '${src} ${fp}' is read-only.");
            } else {
              prop.set(__value, __flags, __ns);
            }
          } else {
            if (obj.$context.$elements${fp}) {
              throw new Error("Writable/Bidirectional binding write error : target property '${src} ${fp}' is an element, considered readonly.");
            } else {
              throw new Error("Writable/Bidirectional binding write error : target property '${src} ${fp}' not found, cannot write to null.");
            }
          }
        }
      `);
    } else {

      return new Function("__value", "__flags", "__ns", `
        ${vvith} {
          var prop = this.${props}${fp};

          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding write error : target property '${fp}' is read-only.");
            } else {
              prop.set(__value, __flags, __ns);
            }
          } else {
            if (this.$context.$elements${fp}) {
              throw new Error("Writable/Bidirectional binding write error : target property '${fp}' is an element, considered readonly.");
            } else {
              throw new Error("Writable/Bidirectional binding write error : target property '${fp}' not found, cannot write to null.");
            }
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
