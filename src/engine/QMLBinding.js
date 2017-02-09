let bindingIds = 0;

function _ubertrim(str) {
  if (!str) {
    str = "";
  } else if (str && str.replace) {
    str = str.replace(/^(?:\s|[;,])*/g, "");
    str = str.replace(/(?:\s|[;,])*$/g, "");
  } else {
    console.warn("_ubertrim not possible : "+str+" "+(typeof str)+" "+JSON.stringify(str));
  }

  return str;
}

function compressImpl(src) {
  src = _ubertrim(src);
  var src0 = src;
  if (UglifyJS) {
    var e1,e2;
    try {
      src = UglifyJS.minify("_="+src0, {fromString: true});
      if (src.hasOwnProperty("code")) {
        src = src.code;
      } else {
        console.warn(JSON.stringify(src));
      }

      src = src.substring(2);
      if (src) {
        src = _ubertrim(src);
      }
      if (!src) {
        e1 = {message:"no result"};
      }
    } catch (e) {
      e1 = e;
    }
    if (e1) {
      try {
        src = UglifyJS.minify(src0, {fromString: true, parse:{bare_returns:true}});
        if (src.hasOwnProperty("code")) {
          src = src.code;
        } else {
          console.warn(JSON.stringify(src));
        }
        if (src) {
          src = _ubertrim(src);
        }
        if (!src) {
          e2 = {message:"no result"};
        }
      } catch (e) {
        e2 = e;
      }
    }
  }
  if (e2) {
    console.warn(e1.message+":\n"+e2.message+":\n"+info+":\n(_=) "+src0+"\n ->\n"+src);
  }
  return src;
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
      src = compressImpl(src);
      this.stripFunction(src);
      delete this.args;
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

  stripFunction(src, stripargs) {
    if (src) {
      let match;
      if (this.flags & QMLBinding.ImplFunction) {
        match = /^(?:function\b)?\s*(?:\w|\$)*\(((?:(?:\w|\$)*\s*\,\s*)*(?:\w|\$)*)\)\s*\{/m.exec(src);
      } else {
        match = /^function\s*(?:\w|\$)*\(((?:(?:\w|\$)*\s*\,\s*)*(?:\w|\$)*)\)\s*\{/m.exec(src);
      }
      if (match && src[src.length-1]==='}') {
        if (!this.flags) {
          throw new Error("Binding is effectively a function but declared to expression : "+(this.info?this.info:src));
        }
        src = src.substring(match[0].length-1);
        if (!stripargs) {
          src = "("+match[1]+")"+src;
        }
        this.args = match[1];

        this.flags &= ~QMLBinding.ImplBlock;
        this.flags |= QMLBinding.ImplFunction;
      } else {
        if (this.flags & QMLBinding.ImplFunction) {
          throw new Error("Binding is effectively not a function but declared so : "+(this.info?this.info:src));
        }
      }
    }
    this.src = src;
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

  get(obj) {
    var prevComponent = QmlWeb.engine.$component;
    QmlWeb.engine.$component = this.$component;

    // .call is needed for `this` support
    try {
      if (!this.implGet) {
        var os = QmlWeb.objToStringSafe(obj);
        console.warn("Binding/get error  compiled:"+this.compiled+"  no compiled getter  this:"+os+"   src:\n"+this.src);
        return;
      }
      return this.implGet.call(obj);
    } catch (err) {
      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
        var os = QmlWeb.objToStringSafe(obj);
        QmlWeb.dumpEvalError("Binding/get error : "+err.message+" this:"+os+(err.srcdumpok?" srcdump:ok":" "+this), err);
      }
      err.srcdumpok = 1;
      throw err;
    } finally {
      QmlWeb.engine.$component = prevComponent;
    }
  }

  set(obj, value, flags, declaringItem) {
    var prevComponent = QmlWeb.engine.$component;
    QmlWeb.engine.$component = this.$component;

    // .call is needed for `this` support
    try {
      if (!this.implSet) {
        var os = QmlWeb.objToStringSafe(obj);
        console.warn("Binding/set error  compiled:"+this.compiled+"  no compiled setter  this:"+os+" value:"+value+" flags:"+flags+" src:\n"+this.src);
        return;
      }
      this.implSet.call(obj, value, flags, declaringItem);
    } catch (err) {
      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
        var os = QmlWeb.objToStringSafe(obj);
        QmlWeb.dumpEvalError("Binding/set error : "+err.message+" this:"+os+" value:"+value+" flags:"+flags+(err.srcdumpok?" srcdump:ok":" "+this), err);
      }
      err.srcdumpok = 1;
      throw err;
    } finally {
      QmlWeb.engine.$component = prevComponent;
    }
  }

  // this == connection : var connection = Signal.connect(...); binding.run.call(connection, ...);
  run() {
    var prevComponent = QmlWeb.engine.$component;
    QmlWeb.engine.$component = this.bindingObj.$component;

    try {
      if (!this.binding.implRun) {
        var os = QmlWeb.objToStringSafe(this.bindingObj);
        console.warn("Binding/run error  compiled:"+this.binding.compiled+"  no compiled runner  this:" + os + " src:\n"+this.binding.src);
        return;
      }
      this.binding.implRun.apply(this.bindingObj, arguments);
    } catch (err) {
      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
        var os = QmlWeb.objToStringSafe(this.bindingObj);
        QmlWeb.dumpEvalError("Binding/run error : "+err.message+" this:" + os + (err.srcdumpok?" srcdump:ok":" "+this.binding), err);
      }
      err.srcdumpok = 1;
      throw err;
    } finally {
      QmlWeb.engine.$component = prevComponent;
    }
  }

  /**
   * Compile binding. Afterwards you may call binding.eval/get/set/run to evaluate.
   */
  compile() {
    if (!this.$bindingId) {
      this.$bindingId = ++bindingIds;
    }

    this.compiled = true;

    if (this.flags & QMLBinding.User) {
      this.implGet = this.bindGet();
      if (this.flags & QMLBinding.Bidirectional) {
        this.implSet = this.bindSet();
      }

    } else {

      if (typeof (this.src) === "string") {
        this.src = _ubertrim(this.src);
      }

      if (this.flags&QMLBinding.ImplFunction) {
        if (this.args!==undefined) {
          if (this.src0===undefined) this.src0 = this.src;
          this.src = "("+this.args+")"+this.src0;
        }
        this.stripFunction(this.src, true);
        this.implRun = this.bindRun();
      } else {
        this.implGet = this.bindGet();
        if (this.flags & QMLBinding.Bidirectional) {
          this.implSet = this.bindSet();
        }
      }
    }
  }

  namespace() {
    var vvith;
    if (this.flags & QMLBinding.OmitContext) {
      if (this.flags & QMLBinding.Alias) {
        vvith = "with(QmlWeb) with(this.$leaf!==this?this.$leaf.$noalias:{}) with(this.$noalias)";
      } else {
        vvith = "with(QmlWeb) with(this.$leaf!==this?this.$leaf:{})          with(this)";
      }
    } else {

      // NOTE necessary to use $context.$ownerObject instead of 'this' directly because of attached objects
      // see QObject() QMLComponent.getAttachedObject()

      if (this.flags & QMLBinding.Alias) {
        vvith = "var c=this.$context,o,lf; with(QmlWeb) with(c.loaderContext) with((lf=(o=c.$ownerObject).$leaf)!==o?lf.$noalias:{}) with(c.$elements) with(o.$noalias)";
      } else {
        vvith = "var c=this.$context,o,lf; with(QmlWeb) with(c.loaderContext) with((lf=(o=c.$ownerObject).$leaf)!==o?lf:{})          with(c.$elements) with(o)";
      }
    }
    return vvith;
  }

  bindGet() {

    if (this.flags & QMLBinding.User) {
      if ((this.flags&QMLBinding.ImplBlock) || !(this.flags&QMLBinding.ImplFunction)) {
        throw new Error("Invalid Qt.Binding flags : "+this.flags," Valid flags:User,ImplFunction,Bidirectional,Alias");
      }
      if (!this.getterFunc) {
        throw new Error("Invalid Qt.binding call, no getterFunc: "+this);
      }

      return this.getterFunc;

    } else if (!this.src || typeof (this.src) === "string") {

      const vvith = this.namespace();

      var src = this.src;
      if (this.property) {
        var fp = QmlWeb.formatPath(this.property);
        if (this.flags&(QMLBinding.ImplFunction|QMLBinding.ImplBlock)) {
          throw new Error("Invalid binding property, passed along with a function/block : "+this);
        }
        if (src) {
          src = src + QmlWeb.formatPath(this.property, this.property);
        } else {
          src = fp;
        }
      } else {
        if (this.flags&(QMLBinding.ImplFunction)) {
          throw new Error("Function is not valid binding type for get : "+this);
        }
      }

      if (!src) {
        throw new Error("Invalid binding path : "+this);
      }

      return new Function(`
        ${vvith} {
          ${ (this.flags&QMLBinding.ImplFunction) ? "return function"+src+";" : (this.flags&QMLBinding.ImplBlock) ? src : "return "+src+";"}
        }
      `);
    } else if (this.src instanceof Object) {
      var thisObj = this.src;
      if (this.property) {
        var fp = QmlWeb.formatPath(this.property);
        return function() {
          return thisObj[fp];
        };
      } else {
        return function() {
          return thisObj;
        };
      }
    } else {
      throw new Error("Invalid Binding.src type : "+(typeof this.src));
    }
  }

  bindSet() {

    const vvith = this.namespace();
    var props;
    if (this.flags & QMLBinding.Alias) {
      props = "$properties_noalias";
    } else {
      props = "$properties";
    }

    if (this.flags & QMLBinding.User) {
      if ((this.flags&QMLBinding.ImplBlock) || !(this.flags&QMLBinding.ImplFunction)) {
        throw new Error("Invalid Qt.Binding flags : "+this.flags," Valid flags:User,ImplFunction,Bidirectional,Alias");
      }
      if (!this.setterFunc) {
        throw new Error("Invalid bidirectional Qt.binding call, no setterFunc: "+this);
      }

      return this.setterFunc;

    } else {
      if (this.flags&(QMLBinding.ImplFunction|QMLBinding.ImplBlock)) {
        throw new Error("Invalid writable/bidirectional binding, it should be an expression : "+this);
      }
      if (!this.property) {
        throw new Error("Invalid bidirectional binding, no property: "+this);
      }

      // NOTE validate first
      var fp = QmlWeb.formatPath(this.property, this.property);

      if (!this.src || typeof (this.src) === "string") {

        if (this.src) {

          return new Function("$$__value", "$$__flags", "$$__declaringItem", `
            ${vvith} {
              var obj = ${this.src};
              if (!obj) {
                console.error("Writable/Bidirectional binding write error : target property '${this.src}' is null. Cannot set '${fp}' on null.");
                return;
              }
              var prop;
              if (obj === this)
                prop = obj.${props}${fp};
              else
                prop = obj.$properties${fp};

              if (prop) {
                prop.set($$__value, $$__flags | QmlWeb.QMLProperty.ThroughBinding, $$__declaringItem);
              } else {
                if (obj.$context.$elements${fp}) {
                  throw new Error("Writable/Bidirectional binding write error : target property '${this.src} ${fp}' is an element, considered readonly.");
                } else {
                  throw new Error("Writable/Bidirectional binding write error : target property '${this.src} ${fp}' not found, cannot write to null.");
                }
              }
            }
          `);
        } else {

          return new Function("$$__value", "$$__flags", "$$__declaringItem", `
            ${vvith} {
              var prop = this.${props}${fp};

              if (prop) {
                if (prop.readOnly) {
                  throw new Error("Writable/Bidirectional binding write error : target property '${fp}' is read-only.");
                } else {
                  prop.set($$__value, $$__flags | QmlWeb.QMLProperty.ThroughBinding, $$__declaringItem);
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
      } else if (this.src instanceof Object) {
        var thisObj = this.src;
        return function($$__value, $$__flags, $$__declaringItem) {
          var prop = thisObj[fp];

          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding write error : target property '"+fp+"' is read-only.");
            } else {
              prop.set($$__value, $$__flags | QmlWeb.QMLProperty.ThroughBinding, $$__declaringItem);
            }
          } else {
            if (this.$context.$elements[fp]) {
              throw new Error("Writable/Bidirectional binding write error : target property '"+fp+"' is an element, considered readonly.");
            } else {
              throw new Error("Writable/Bidirectional binding write error : target property '"+fp+"' not found, cannot write to null.");
            }
          }
        };
      } else {
        throw new Error("Invalid Binding.src type : "+(typeof this.src));
      }
    }

  }



  bindRun() {

    const vvith = this.namespace();

    if (!this.flags&QMLBinding.ImplFunction) {
      throw new Error("Binding/run should be a function : " + this);
    }

    return eval(`(function noname(${this.args}) {
      ${vvith} ${this.src}
    })`);
  }


  toString() {
    return "Binding#"+this.$bindingId+": flags:"+this.flags+" prop:"+QmlWeb.formatPath(this.property)+"  impl:("+this.args+")=>\n"+this.src;
  }
}
QMLBinding.ImplExpression = 0;
QMLBinding.ImplBlock = 1;
QMLBinding.ImplFunction = 2;
QMLBinding.Bidirectional = 4;
QMLBinding._Alias = 8;
QMLBinding.Alias = 12; // always bidirectional
QMLBinding.User = 16;
QMLBinding.OmitContext = 32;
QMLBinding.ListTemplate = 64;

QmlWeb._ubertrim = _ubertrim;
QmlWeb.compressImpl = compressImpl;
QmlWeb.QMLBinding = QMLBinding;
