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
  constructor(val, rhs, isfunc, bidirectional) {
    // this.isFunction states whether the binding is a simple js statement or a
    // function containing a return statement. We decide this on whether it is a
    // code block or not. If it is, we require a return statement. If it is a
    // code block it could though also be a object definition, so we need to
    // check that as well (it is, if the content is labels).
    if (isfunc === undefined) {
      this.isFunction = rhs && rhs[0] === "block" &&
                        rhs[1][0] && rhs[1][0][0] !== "label";
    } else {
      this.isFunction = isfunc;
      this.rhs = rhs;
    }
    this.src = val;
    this.bidirectional = bidirectional;
    this.compiled = false;

    this.serializedTypeId = "b";
    Object.defineProperty(this, "eval", {
      value: this.get,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  /*toJSON() {
    return {
      src: this.src,
      deps: JSON.stringify(this.deps),
      tree: JSON.stringify(this.tree)
    };
  }*/

  get(object, context, basePath) {
    QmlWeb.executionContext = context;
    if (basePath) {
      QmlWeb.engine.$basePath = basePath;
    }
    // .call is needed for `this` support
    return this.implGet.createPropertycall(object, object, context);
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
      src += "." + rhs;
    }

    return new Function("__executionObject", "__executionContext", `
      with(QmlWeb) with(__executionContext) with(__executionObject) {
        ${isFunction ? src : "return "+src+";"}
      }
    `);
  }

  static bindSet(src, rhs, isFunction) {
    if (isFunction) {
      throw new Error("Invalid writable/bidirectional binding, it should not be a function : "+src);
    }
    src = _ubertrim(src);

    // NOTE validate first
    if (!/^\w+$/.test(rhs) || !/^(\w+\.)*\w+$/.test(src)) {
      throw new Error("Invalid writable/bidirectional binding expression :  "+src+" . "+rhs);
    }

    return new Function("__executionObject", "__executionContext", "__value", `
      with(QmlWeb) with(__executionContext) with(__executionObject) {
        var obj = ${src};
        var prop = obj.$properties[${rhs}];
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

QmlWeb.QMLBinding = QMLBinding;
