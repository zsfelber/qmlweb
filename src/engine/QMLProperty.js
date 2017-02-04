let propertyIds = 0;

class PendingEvaluation extends Error {
  constructor(...args) {
    super(...args);
    const prop = args[1];
    this.property = prop;
    this.ctType = "PendingEvaluation";
  }
}

function dumpEvalError(msg, err) {
  if (!err.ctType) {
    console.warn(msg);
  }
}

class QMLProperty {
  constructor(type, obj, name, options) {
    if (!obj) {
      throw new Error("Invalid QMLProperty:"+name+" of null, type:"+type+" options:"+JSON.stringify(options));
    }

    this.obj = obj;
    this.name = name;
    this.readOnly = options.readOnly;
    this.pendingInit = options.pendingInit;
    this.changed = QmlWeb.Signal.signal("changed", [{name:"val"}, {name:"oldVal"}, {name:"name"}], { obj });
    this.binding = null;
    this.value = undefined;
    this.type = type;
    this.animation = null;
    this.updateState = QMLProperty.StateNeedsUpdate;
    this.get.$owner = this;
    this.set.$owner = this;

    // This list contains all signals that hold references to this object.
    // It is needed when deleting, as we need to tidy up all references to this
    // object.
    this.$tidyupList = [];

    this.$propertyId = ++propertyIds;
    this.evalTreeConnections = {};
    this.childEvalTreeConnections = 0;
  }

  // Called by update and set to actually set this.val, performing any type
  // conversion required.
  $setVal(val, flags, declaringItem) {
    var prevComponent = QmlWeb.engine.$component;
    var prevImport = 0;
    var parentObj;

    try {
      if (flags & QMLProperty.SetChildren) {

        // NOTE declaringItem is passed only along with SetChildren
        // declaringItem !== this.obj.$component
        // declaringItem means : the QML where the current child element (val) is declared
        // what this.obj.$component is here : the QML supertype where the default property (eg"data") defined (eg"ItemBase")

        if (!declaringItem) {
          throw new Error("declaringItem not specified with SetChildren flag : "+this.obj);
        }
        // childObj.loaderComponent should be declaringItem.$component
        QmlWeb.engine.$component = declaringItem.$component;
        parentObj = declaringItem;
      } else {
        QmlWeb.engine.$component = this.obj.$component;
        parentObj = this.obj;
      }

      const constructors = this.obj.$component ? this.obj.$component.moduleConstructors : QmlWeb.constructors;
      if (constructors[this.type] === QmlWeb.qmlList) {
        // NOTE gz : key entry point 1 of QmlWeb.construct  -> see key entry point 2
        // TODO workaround  despite it's "setVal" we may merge all child class items into val,
        // its behavior is like "appendVal" at Init time now (all supertype Elements need to be merged in "data" "children" and "resources",
        // not only those of top level type)
        var tmp = QmlWeb.qmlList(val, parentObj, QmlWeb.QMLComponent.Nested);
        if (!this.val || !(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
          // TODO cleanup ! (?)
          this.val = tmp;
        } else {
          this.val = this.val.concat(tmp);
        }
      } else if (val instanceof QmlWeb.QMLMetaElement) {
        // Root element or nested Component element ?
        if (constructors[val.$class] === QMLComponent ||
            constructors[this.type] === QMLComponent) {
          // TODO gz , legacy code works here  ?? : val is usually a QMLMetaElement
          this.val = QmlWeb.createComponent({
            clazz: val,
            $file: val.$file
          }, QmlWeb.QMLComponent.Nested);
        } else {
          // NOTE gz : key entry point 2 of QmlWeb.construct
          // all the other ones just forward these
          // Call to here comes from
          // [root QML top] classes.construct -> properties.applyProperties -> item.$properties[item.$defaultProperty].set
          this.val = QmlWeb.createComponentAndElement({clazz:val}, parentObj, QmlWeb.QMLComponent.Nested);
        }
      } else if (val instanceof Object || val === undefined || val === null) {
        this.val = val;
      } else if (constructors[this.type].plainType) {
        this.val = constructors[this.type](val);
      } else {
        this.val = new constructors[this.type](val);
      }

      if (!(flags & QMLProperty.SetChildren)) {

        // Not doing this for initial SetChildren, this is what triggers $onElementAdd-s when replacing "data"
        // or default property:

        if (this.obj.$defaultProperty===this.name && this.val) {
           for (const i in this.val) {
             const child = this.val[i];
             if (child instanceof QmlWeb.ItemBase) {
               child.$properties.parent.set(this.obj, QmlWeb.QMLProperty.ReasonInitPrivileged);
             } else if (child instanceof QmlWeb.QtObject) {
               child.$properties.container.set(this.obj, QmlWeb.QMLProperty.ReasonInitPrivileged);
             }
           }
        }
      }

    } finally {
      if (prevImport) {
        QmlWeb.engine.$component.bindImports(prevImport);
      }
      QmlWeb.engine.$component = prevComponent;
    }
  }

  // TODO move to Animation (binding it to a 'changed' slot)
  resetAnimation() {
    this.animation.running = false;
    this.animation.$actions = [{
      target: this.animation.target || this.obj,
      property: this.animation.property || this.name,
      from: this.animation.from || oldVal,
      to: this.animation.to || this.val
    }];
    this.animation.running = true;
  }

  // Updater recalculates the value of a property if one of the dependencies
  // changed
  update(preventhacks, flags, declaringItem) {

    if (!this.binding) {
      this.updateState = QMLProperty.StateValid;
      return;
    }

    this.updateState = QMLProperty.StateUpdating;

    const oldVal = this.val;

    var pushed;
    try {
      pushed = QMLProperty.pushEvaluatingProperty(this);
      if (!this.binding.compiled) {
        this.binding.compile();
      }

      try {
        this.obsoleteConnections = QmlWeb.helpers.mergeObjects(this.evalTreeConnections);
        // NOTE We replace each node in the evaluating dependencies graph by every 'get' :
        this.evalTreeConnections = {};

        var val = this.binding.get(this.obj);

        this.$setVal(val, flags, declaringItem);

        this.updateState = QMLProperty.StateValid;

      } finally {
        for (var i in this.obsoleteConnections) {
          con = this.obsoleteConnections[i];
          con.disconnect();
          con.signalOwner.childEvalTreeConnections--;
        }
        delete this.obsoleteConnections;
      }


    } catch (e) {
      console.warn("QMLProperty.update binding error "+this, e);
      if (this.updateState !== QMLProperty.StateValid) {
        this.updateState = QMLProperty.StateNeedsUpdate;
      }
      throw e;
    } finally {
      if (pushed) {
        QMLProperty.popEvaluatingProperty();
      }
    }

    if (!preventhacks && this.val !== oldVal) {
      if (this.animation) {
        this.resetAnimation();
      }
      try {
        this.changed(this.val, oldVal, this.name);
      } catch (e) {
        // Not necessary to reevaluate and even rethrow it here in this case,
        // changed/Signal.$execute is reevaluated already !
        if (e.ctType !== "PendingEvaluation") {
          throw e;
        }
      }
    }
  }

  updateLater() {
    if (this.binding) {
      if (this.animation || (this.changed.connectedSlots && this.changed.connectedSlots.length>this.childEvalTreeConnections)) {
        this.update();
      } else {
        this.updateState = QMLProperty.StateNeedsUpdate;
      }

      // nothing to do with bidirectional binding here,
      // because binding target is notified from get() already
      // target is in the evaluation stack, too :

      // [alias*]
      //  |
      //  V
      // [alias target] ->get-> [dependency1]
      //                        [dependency2]
      //                        [dependency3]

      // } else if ((this.binding.flags & QmlWeb.QMLBinding.Bidirectional)) {
      //   ...
      // }

    } else  {
      this.updateState = QMLProperty.StateNeedsUpdate;
    }
  }

  // Define getter
  get() {
    if (this.updateState & QMLProperty.StateUpdating) {
      // This get is not valid, so throwing PendingEvaluation.
      // However, not registering this to engine.pendingOperations, as
      // this property is being updated anyway, and we can trust that outside process
      // takes care of it
      throw new QmlWeb.PendingEvaluation(`(Secondary) property binding loop detected for property.\n${this.stacksToString()}`, this);
    }

    if (this.updateState &&
        !(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init)) {
      this.update();
    }

    // If this call to the getter is due to a property that is dependant on this
    // one, we need it to take track of changes

    QMLProperty.evaluatingProperties.stack.forEach(function (parent) {
      var con = parent.obsoleteConnections[this.$propertyId];
      if (con) {
        delete parent.obsoleteConnections[this.$propertyId];
        // NOTE We replace each node in the evaluating dependencies graph by every 'get' :
        // so now we DON't put former dependency input "con" of parent to parent.evalTreeConnections
        // but mark this connection obsolete and remove / cleanup it after current cycle
      } else {
        // New property dependency detected :
        con = this.changed.connect(
          parent,
          QMLProperty.prototype.updateLater,
          QmlWeb.Signal.UniqueConnection
        );
        parent.evalTreeConnections[this.$propertyId] = con;
        con.signalOwner = this;
        this.childEvalTreeConnections++;
      }
    }, this);


    if (this.val && this.val.$get) {
      return this.val.$get();
    }

    if (this.updateState && (this.pendingInit || this.binding)) {
      QmlWeb.engine.pendingOperations.push({
         property:this,
         info:"Pending property get/binding initialization : "+this,
         });
      throw new QmlWeb.PendingEvaluation(`Binding not yet initialized.`, this);
    }

    return this.val;
  }

  // Define setter
  set(newVal, flags, declaringItem) {
    flags = flags || QMLProperty.ReasonUser;
    if (this.readOnly && !(flags & QMLProperty.Privileged)) {
      throw new Error(`property '${this.name}' has read only access`);
    }

    const oldVal = this.val;

    let val = newVal;
    if (val instanceof QmlWeb.QMLBinding) {
      this.binding = val;

      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init)) {
        this.update(true, flags);
      } else {
        QmlWeb.engine.pendingOperations.push({
           property:this,
           info:"Pending property set/binding initialization : "+this,
           flags, declaringItem
           });
        //console.warn("PendingEvaluation : Pending property set/binding :" + this.name + "  obj:" + this.obj);
        return;
      }
    } else {
      if (val instanceof Array) {
        val = val.slice(); // Copies the array
      }

      if (this.binding && (this.binding.flags & QmlWeb.QMLBinding.Bidirectional)) {
        if (flags & QMLProperty.RemoveBidirectionalBinding) {
          this.binding = null;
        } else {
          if (!this.binding.compiled) {
            this.binding.compile();
          }
          this.binding.set(this.obj, newVal, flags, declaringItem);
        }
      } else if (!(flags & QMLProperty.ReasonAnimation)) {
        this.binding = null;
      }

      this.$setVal(val, flags, declaringItem);
    }

    if (this.val !== oldVal) {
      function _changed_init() {
        if (flags & QMLProperty.ReasonInit) {
          this.changed(this.val, oldVal, this.name);
        } else {
          if (this.animation) {
            this.resetAnimation();
          }
          // TODO gz   $syncPropertyToRemote !!!!!!!!!!!!
          if (this.obj.$syncPropertyToRemote instanceof Function) {
            // is a remote object from e.g. a QWebChannel
            this.obj.$syncPropertyToRemote(this.name, val);
          } else {
            this.changed(this.val, oldVal, this.name);
          }
        }
      }
      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init)) {
        _changed_init.call(this);
      } else {
        QmlWeb.engine.pendingOperations.push({
          fun:_changed_init,
          thisObj:this,
          args:[],
          info:"Pending property set/changed_init : "+this,
        });
        //console.warn("PendingEvaluation : Pending property set/changed init :" + this.name + "  obj:" + this.obj);
      }
    }
  }

  toString(detail) {
    // $base because to avoid infinite loops for overriden toString:
    return (this.obj.$base?this.obj.$base.toString(detail):this.obj.toString(detail))+" . prop:"+this.name+(detail?"#"+this.$propertyId:"")+
      (detail?" "+(this.updateState?this.updateState&QMLProperty.StateNeedsUpdate?"needsUpdate":"updating":"ok")+" "+(this.binding?"b:"+this.binding.flags:""):"")+
       " "+(this.val?"v:"+this.val:"");
  }

  stackToString(stack) {
    var result = "";
    if (!stack) stack = QMLProperty.evaluatingProperties.stack;
    stack.forEach(function (item) {
      result += "  "+item.toString(true)+"\n";
    });
    return result;
  }

  stacksToString() {
    var result = "Stacks:\n";
    var i = 1;
    QMLProperty.evaluatingPropertyStackOfStacks.forEach(function (s) {
      result += i+":\n";
      result += stackToString(s.stack);
      ++i;
    });
    result += "Current:\n";
    result += stackToString();
    return result;
  }

  static pushEvalStack() {
    QMLProperty.evaluatingPropertyStackOfStacks.push(
      QMLProperty.evaluatingProperties
    );
    QMLProperty.evaluatingProperties = {stack:[], map:{}};
    QMLProperty.evaluatingProperty = undefined;
  //  console.log("evaluatingProperty=>undefined due to push stck ");
  }

  static popEvalStack() {
    if (!QMLProperty.evaluatingPropertyStackOfStacks.length) {
      throw new Error("Evaluating Stack (of stacks) error : pop called from empty stack.");
    }
    var s = QMLProperty.evaluatingPropertyStackOfStacks.pop();
    QMLProperty.evaluatingProperties = s;
    const prop = s.stack.length ? s.stack[s.stack.length - 1] : undefined;
    QMLProperty.evaluatingProperty = prop;
    //if (!prop) {
    //  console.warn("Evaluating Stack (of stacks) error : popped item is empty.");
    //}
  }

  static pushEvaluatingProperty(prop) {
    var s = QMLProperty.evaluatingProperties;
    // TODO say warnings if already on stack. This means primary binding loop.
    // NOTE secondary binding loop is possible when dependencies has hidden in "stack of stacks"
    if (s.map[prop.$propertyId]) {
      console.error(`(Primary) property binding loop detected for property.\n${this.stackToString()}`);
      return false;
    }
    QMLProperty.evaluatingProperty = prop;
    s.map[prop.$propertyId] = prop;
    s.stack.push(prop); //keep stack of props
    return true;
  }

  static popEvaluatingProperty() {
    var s = QMLProperty.evaluatingProperties;
    if (!s.stack.length) {
      throw new Error("Evaluating Stack error : pop called from empty stack.");
    }

    const prop = QMLProperty.evaluatingProperty;
    if (!prop) {
      throw new Error("Evaluating Stack error : pop called but element is not present in top pointer.");
    }

    const chkprop0 = s.map[prop.$propertyId];
    delete s.map[prop.$propertyId];
    const chkprop = s.stack.pop();
    if (prop !== chkprop0 || prop !== chkprop) {
      throw new Error("Evaluating Stack has corrupted. These should all be the same but: "+prop+" "+chkprop0+" "+chkprop);
    }

    const prop2 = s.stack.length ? s.stack[s.stack.length - 1] : undefined;
    QMLProperty.evaluatingProperty = prop2;
    //if (!prop2) {
    //  console.warn("Evaluating Stack error : popped item is empty.");
    //}
  }
}

// Property that is currently beeing evaluated. Used to get the information
// which property called the getter of a certain other property for
// evaluation and is thus dependant on it.
QMLProperty.evaluatingProperty = undefined;
QMLProperty.evaluatingPropertyPaused = false;
QMLProperty.evaluatingProperties = {stack:[], map:{}};
QMLProperty.evaluatingPropertyStackOfStacks = [];

QMLProperty.typeInitialValues = {
  int: 0,
  real: 0,
  double: 0,
  string: "",
  bool: false,
  list: [],
  enum: 0,
  url: ""
};

QMLProperty.ReasonUser = 0;
QMLProperty.ReasonInit = 1;
QMLProperty.ReasonAnimation = 2;
QMLProperty.Privileged = 4;
QMLProperty.RemoveBidirectionalBinding = 8;
QMLProperty.SetChildren = 16;
QMLProperty.ThroughBinding = 32;
QMLProperty.ReasonInitPrivileged = QMLProperty.ReasonInit | QMLProperty.Privileged;

QMLProperty.StateValid = 0;
QMLProperty.StateNeedsUpdate = 1;
QMLProperty.StateUpdating = 2;

QmlWeb.QMLProperty = QMLProperty;
QmlWeb.PendingEvaluation = PendingEvaluation;
QmlWeb.dumpEvalError = dumpEvalError;

