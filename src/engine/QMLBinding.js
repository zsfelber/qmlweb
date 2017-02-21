let bindingIds = 0;

function _ubertrim(str) {
  if (!str) {
    str = "";
  } else if (str && str.replace) {
    str = str.replace(/^(?:\s|[;,])*/g, "");
    str = str.replace(/(?:\s|[;,])*$/g, "");
  } else {
    QmlWeb.warn("_ubertrim not possible : "+str+" "+(typeof str)+" "+JSON.stringify(str));
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
        QmlWeb.warn(JSON.stringify(src));
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
          QmlWeb.warn(JSON.stringify(src));
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
    QmlWeb.warn(e1.message+":\n"+e2.message+":\n"+info+":\n(_=) "+src0+"\n ->\n"+src);
  }
  return src;
}

// note(IIFE)
// why "(function() {" used : because otherwise 'with' sucks and overwrites context variables if we use "var ..." inside !!!!!!
// see http://www.2ality.com/2011/06/with-statement.html
// "If you don’t want to expose the temporary variable b to the current scope, you can use an IIFE:
//  (function() {"

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
        this.flags = QmlWeb.QMLBindingFlags.ImplBlock;
      }
    } else {
      this.flags = flags;
      this.property = property;
    }
    this.flags |= QmlWeb.QMLBindingFlags.ImplExpression;

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
      if (this.flags & QmlWeb.QMLBindingFlags.ImplFunction) {
        match = /^(?:function\b)?\s*(?:\w|\$)*\(((?:(?:\w|\$)*\s*\,\s*)*(?:\w|\$)*)\)\s*\{/m.exec(src);
      } else {
        match = /^function\s*(?:\w|\$)*\(((?:(?:\w|\$)*\s*\,\s*)*(?:\w|\$)*)\)\s*\{/m.exec(src);
      }
      if (match && src[src.length-1]==='}') {
        if (!this.flags) {
          QmlWeb.warn("Binding is effectively a function but declared to expression : "+(this.info?this.info:src));
        }
        src = src.substring(match[0].length-1);
        if (!stripargs) {
          src = "("+match[1]+")"+src;
        }
        this.args = match[1];

        this.flags &= ~QmlWeb.QMLBindingFlags.ImplBlock;
        this.flags |= QmlWeb.QMLBindingFlags.ImplFunction;
      } else {
        if (this.flags & QmlWeb.QMLBindingFlags.ImplFunction) {
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
    QmlWeb.engine.$component = obj.$component;

    // .call is needed for `this` support
    try {
      if (!this.implGet && !this.implRun) {
        var os = QmlWeb.objToStringSafe(obj);
        QmlWeb.warn("Binding/get error  compiled:"+this.compiled+"  no compiled getter/runner  this:"+os+"   src:\n"+this.src);
        return;
      }
      if (this.implGet) {
        return this.implGet.call(obj);
      } else {
        return this.run.bind({binding:this, bindingObj:obj});
      }
    } catch (err) {
      if (err instanceof QmlWeb.FatalError) throw err;
      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
        var os = QmlWeb.objToStringSafe(obj);
        QmlWeb.dumpEvalError("Binding#"+this.$bindingId+"/get error : "+err.message+" this:"+os+(err.srcdumpok?" srcdump:ok":" "+this), err);
      } else {
        err.message += "  Binding#"+this.$bindingId;
      }

      err.srcdumpok = 1;
      throw err;
    } finally {
      QmlWeb.engine.$component = prevComponent;
    }
  }

  set(obj, value, flags, valParentObj) {
    var prevComponent = QmlWeb.engine.$component;
    QmlWeb.engine.$component = obj.$component;

    // .call is needed for `this` support
    try {
      if (!this.implSet) {
        var os = QmlWeb.objToStringSafe(obj);
        QmlWeb.warn("Binding/set error  compiled:"+this.compiled+"  no compiled setter  this:"+os+" value:"+value+" flags:"+flags+" src:\n"+this.src);
        return;
      }
      this.implSet.call(obj, value, flags, valParentObj);
    } catch (err) {
      if (err instanceof QmlWeb.FatalError) throw err;
      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
        var os = QmlWeb.objToStringSafe(obj);
        QmlWeb.dumpEvalError("Binding#"+this.$bindingId+"/set error : "+err.message+" this:"+os+" value:"+value+" flags:"+flags+(err.srcdumpok?" srcdump:ok":" "+this), err);
      } else {
        err.message += "  Binding#"+this.$bindingId;
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
        QmlWeb.warn("Binding/run error  compiled:"+this.binding.compiled+"  no compiled runner  this:" + os + " src:\n"+this.binding.src);
        return;
      }
      return this.binding.implRun.apply(this.bindingObj, arguments);
    } catch (err) {
      if (err instanceof QmlWeb.FatalError) throw err;
      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
        var os = QmlWeb.objToStringSafe(this.bindingObj);
        QmlWeb.dumpEvalError("Binding#"+this.binding.$bindingId+"/run error : "+err.message+" this:" + os + (err.srcdumpok?" srcdump:ok":" "+this.binding), err);
      } else {
        err.message += "  Binding#"+this.$bindingId;
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

    if (this.flags & QmlWeb.QMLBindingFlags.User) {
      this.implGet = this.bindGet();
      if (this.flags & QmlWeb.QMLBindingFlags.Bidirectional) {
        this.implSet = this.bindSet();
      }

    } else {

      if (typeof (this.src) === "string") {
        this.src = _ubertrim(this.src);
      }

      if (this.flags&QMLBindingFlags.ImplFunction) {
        if (this.args!==undefined) {
          if (this.src0===undefined) this.src0 = this.src;
          this.src = "("+this.args+")"+this.src0;
        }
        this.stripFunction(this.src, true);
        this.implRun = this.bindRun();
      } else {
        this.implGet = this.bindGet();
        if (this.flags & QmlWeb.QMLBindingFlags.Bidirectional) {
          this.implSet = this.bindSet();
        }
      }
    }
  }

  namespace() {
    var vvith;
    if (this.flags & QmlWeb.QMLBindingFlags.OmitContext) {
      if (this.flags & QmlWeb.QMLBindingFlags.Alias) {
        vvith = "with(QmlWeb) with(this.$leaf!==this?this.$leaf.$noalias:{}) with(this.$noalias)";
      } else {
        vvith = "with(QmlWeb) with(this.$leaf!==this?this.$leaf:{})          with(this)";
      }
    } else {

      // NOTE necessary to use $context.$ownerObject instead of 'this' directly because of attached objects
      // see QObject() QMLComponent.getAttachedObject()

      // removed: with(($$lf=($$o=$$c.$ownerObject).$leaf)!==$$o?$$lf(.$noalias):{}) with($$o(.$noalias))
      if (this.flags & QmlWeb.QMLBindingFlags.Alias) {
        vvith = "var $$c=this.$context,$$o=$$c.$ownerObject; with(QmlWeb) with($$c.loaderContext) with($$c.$pageContext) with($$o.$noalias)";
      } else {
        vvith = "var $$c=this.$context,$$o=$$c.$ownerObject; with(QmlWeb) with($$c.loaderContext) with($$c.$pageContext) with($$o)";
      }
    }
    return vvith;
  }

  bindGet() {

    if (this.flags & QmlWeb.QMLBindingFlags.User) {
      if ((this.flags&QmlWeb.QMLBindingFlags.ImplBlock) || !(this.flags&QmlWeb.QMLBindingFlags.ImplFunction)) {
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
        if (this.flags&(QmlWeb.QMLBindingFlags.ImplFunction|QmlWeb.QMLBindingFlags.ImplBlock)) {
          throw new Error("Invalid binding property, passed along with a function/block : "+this);
        }
        if (src) {
          src = src + QmlWeb.formatPath(this.property, this.property);
        } else {
          src = fp;
        }
      } else {
        if (this.flags&(QmlWeb.QMLBindingFlags.ImplFunction)) {
          throw new Error("Function is not valid binding type for get : "+this);
        }
      }

      if (!src) {
        throw new Error("Invalid binding path : "+this);
      }

      // see note(IIFE) ^^^
      return new Function(`
        ${vvith} {
          return (function() {
            ${ (this.flags&QmlWeb.QMLBindingFlags.ImplFunction) ? "return function"+src+";" : (this.flags&QmlWeb.QMLBindingFlags.ImplBlock) ? src : "return "+src+";"}
          }).apply(this);
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
    if (this.flags & QmlWeb.QMLBindingFlags.Alias) {
      props = "$properties_noalias";
    } else {
      props = "$properties";
    }

    if (this.flags & QmlWeb.QMLBindingFlags.User) {
      if ((this.flags&QmlWeb.QMLBindingFlags.ImplBlock) || !(this.flags&QmlWeb.QMLBindingFlags.ImplFunction)) {
        throw new Error("Invalid Qt.Binding flags : "+this.flags," Valid flags:User,ImplFunction,Bidirectional,Alias");
      }
      if (!this.setterFunc) {
        throw new Error("Invalid bidirectional Qt.binding call, no setterFunc: "+this);
      }

      return this.setterFunc;

    } else {
      if (this.flags&(QmlWeb.QMLBindingFlags.ImplFunction|QmlWeb.QMLBindingFlags.ImplBlock)) {
        throw new Error("Invalid writable/bidirectional binding, it should be an expression : "+this);
      }
      if (!this.property) {
        throw new Error("Invalid bidirectional binding, no property: "+this);
      }

      // NOTE validate first
      var fp = QmlWeb.formatPath(this.property, this.property);

      if (!this.src || typeof (this.src) === "string") {

        if (this.src) {

          // see note(IIFE) ^^^
          return new Function("$$__value", "$$__flags", "$$__valParentObj", `
            ${vvith} {
              (function() {
                var obj = ${this.src};
                if (!obj) {
                  QmlWeb.error("Writable/Bidirectional binding#"+this.$bindingId+" write error : target property '${this.src}' is null. Cannot set '${fp}' on null.");
                  return;
                }
                var prop;
                if (obj === this)
                  prop = obj.${props}${fp};
                else
                  prop = obj.$properties${fp};

                if (prop) {
                  prop.set($$__value, $$__flags | QmlWeb.QMLPropertyFlags.ThroughBinding, $$__valParentObj);
                } else {
                  if (obj.$context.$pageElements${fp}) {
                    throw new Error("Writable/Bidirectional binding#"+this.$bindingId+" write error : target property '${this.src} ${fp}' is an element, considered readonly.");
                  } else {
                    throw new Error("Writable/Bidirectional binding#"+this.$bindingId+" write error : target property '${this.src} ${fp}' not found, cannot write to null.");
                  }
                }
              }).apply(this);
            }
          `);
        } else {

          // see note(IIFE) ^^^
          return new Function("$$__value", "$$__flags", "$$__valParentObj", `
            ${vvith} {
              (function() {
                var prop = this.${props}${fp};

                if (prop) {
                  if (prop.readOnly) {
                    throw new Error("Writable/Bidirectional binding#"+this.$bindingId+" write error : target property '${fp}' is read-only.");
                  } else {
                    prop.set($$__value, $$__flags | QmlWeb.QMLPropertyFlags.ThroughBinding, $$__valParentObj);
                  }
                } else {
                  if (this.$context.$pageElements${fp}) {
                    throw new Error("Writable/Bidirectional binding#"+this.$bindingId+" write error : target property '${fp}' is an element, considered readonly.");
                  } else {
                    throw new Error("Writable/Bidirectional binding#"+this.$bindingId+" write error : target property '${fp}' not found, cannot write to null.");
                  }
                }
              }).apply(this);
            }
          `);
        }
      } else if (this.src instanceof Object) {
        var thisObj = this.src;
        return function($$__value, $$__flags, $$__valParentObj) {
          var prop = thisObj[fp];

          if (prop) {
            if (prop.readOnly) {
              throw new Error("Writable/Bidirectional binding#"+this.$bindingId+" write error : target property '"+fp+"' is read-only.");
            } else {
              prop.set($$__value, $$__flags | QmlWeb.QMLPropertyFlags.ThroughBinding, $$__valParentObj);
            }
          } else {
            if (this.$context.$pageElements[fp]) {
              throw new Error("Writable/Bidirectional binding#"+this.$bindingId+" write error : target property '"+fp+"' is an element, considered readonly.");
            } else {
              throw new Error("Writable/Bidirectional binding#"+this.$bindingId+" write error : target property '"+fp+"' not found, cannot write to null.");
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

    if (!this.flags&QmlWeb.QMLBindingFlags.ImplFunction) {
      throw new Error("Binding/run should be a function : " + this);
    }

    // see note(IIFE) ^^^
    // $$__arguments also prevents overwriting function args by 'with' scopes
    return eval(`(function _${this.$bindingId}() {
      var $$__arguments = arguments;
      ${vvith} return (function(${this.args}) {
        ${this.src}
      }).apply(this, $$__arguments);
    })`);
  }


  toString() {
    return "Binding#"+this.$bindingId+": "+QmlWeb.QMLBindingFlags.toString(this.flags)+
      " prop:"+QmlWeb.formatPath(this.property)+"  impl:("+this.args+")=>\n"+this.src;
  }
}

QmlWeb._ubertrim = _ubertrim;
QmlWeb.compressImpl = compressImpl;
QmlWeb.QMLBinding = QMLBinding;
