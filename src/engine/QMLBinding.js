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
  constructor(val, tree, isfunc, bidirectional) {
    // this.isFunction states whether the binding is a simple js statement or a
    // function containing a return statement. We decide this on whether it is a
    // code block or not. If it is, we require a return statement. If it is a
    // code block it could though also be a object definition, so we need to
    // check that as well (it is, if the content is labels).
    this.isFunction = isfunc || (tree && tree[0] === "block" &&
                      tree[1][0] && tree[1][0][0] !== "label");
    this.src = val;
    this.bidirectional = bidirectional;
    this.compiled = false;

    this.serializedTypeId = "b";
    this.eval = this.get;
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
    this.implGet = QMLBinding.bindGet(this.src, this.isFunction);
    if (this.bidirectional) {
      this.implSet = QMLBinding.bindSet(this.src, this.isFunction);
    }
    this.compiled = true;
  }

  static bindGet(src, isFunction) {
    return new Function("__executionObject", "__executionContext", `
      with(QmlWeb) with(__executionContext) with(__executionObject) {
        ${isFunction ? src : "return "+_ubertrim(src)+";"}
      }
    `);
  }

  static bindSet(src, isFunction) {
    if (isFunction) {
      throw new Error("Invalid writable/bidirectional binding, it should not be a function : "+src);
    }

    // NOTE it generates a compilation error (somewhere) if invalid
    return new Function("__executionObject", "__executionContext", "__value", `
      with(QmlWeb) with(__executionContext) with(__executionObject) {
        ${_ubertrim(src)} = __value;
      }
    `);
  }

}

QmlWeb.QMLBinding = QMLBinding;
