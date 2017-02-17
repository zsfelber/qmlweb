let propertyIds = 0;

class PendingEvaluation extends Error {
  constructor(...args) {
    super(...args);
    this.property = args[1];
    this.ctType = "PendingEvaluation";
  }
}

class UninitializedEvaluation extends Error {
  constructor(...args) {
    super(...args);
    this.property = args[1];
    this.ctType = "UninitializedEvaluation";
  }
}

function dumpEvalError(msg, err) {
  if (!err.ctType) {
    QmlWeb.warn(msg);
  }
}

function objToStringSafe(obj, detail) {
  var os = (typeof obj.$info==="string"?obj.$info:(obj.$base?obj.$base.toString():(obj.$classname||obj.constructor?(obj.$classname||obj.constructor.name)+":":""))+(detail&&obj.$objectId?obj.$objectId+":":""));

  return os;
}

function e(msg) {
  throw new Error(msg);
}

class QMLProperty {
  constructor(type, obj, name, options) {
    if (!obj) {
      throw new Error("Invalid QMLProperty:"+name+" of null, type:"+type+" options:"+JSON.stringify(options));
    }

    this.stacks = QMLProperty;
    this.obj = obj;
    this.$rootComponent = obj.$component ? obj.$component.$root : {};
    this.name = name;
    this.options = options;
    this.readOnly = options.readOnly;
    this.pendingInit = options.pendingInit;
    this.updateState = QmlWeb.QMLPropertyState.Uninitialized;
    this.changed = QmlWeb.Signal.signal("changed", [{name:"val"}, {name:"oldVal"}, {name:"name"}], { obj });
    this.binding = null;
    this.value = undefined;
    this.type = type;
    this.animation = null;
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

  // Called by update and set to actually set this.value, performing any type
  // conversion required.
  $setVal(val, flags, declaringItem) {
    var prevComponent = QmlWeb.engine.$component;
    var prevImport = 0;
    var parentObj;

    try {
      const isch = flags & QmlWeb.QMLPropertyFlags.SetChildren;
      if (isch) {

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
        // SetChildren that is in init mode : we merge the subclasses items and don't clear it every time
        // otherwise : clear it, most important when this is the default property, otherwise it just appends new entries
        if (!isch) {
          // TODO cleanup (garbage collector now, but is it enough?). when isch/!isch?
          this.value = [];
        }

        // NOTE gz : key entry point 1 of QmlWeb.construct  -> see key entry point 2
        var tmp = QmlWeb.qmlList(val, parentObj, QmlWeb.QMLComponentFlags.Nested);

        // Otherwise, we trust containerChanged/onAddElement
        if (!isch) {
          this.value = tmp;
        }
      } else if (val instanceof QmlWeb.QMLMetaElement) {
        // Root element or nested Component element ?
        if (constructors[val.$class] === QMLComponent) {
          this.value = QmlWeb.createComponent({
            clazz: val,
            $file: val.$file
          }, QmlWeb.QMLComponentFlags.LazyOrFactory);
        } else if (constructors[this.type] === QMLComponent) {
          this.value = QmlWeb.createComponent({
            clazz: val,
            $file: val.$file
          }, QmlWeb.QMLComponentFlags.LazyOrFactory|QmlWeb.QMLComponentFlags.Flat);
        } else {
          // NOTE gz : key entry point 2 of QmlWeb.construct
          // all the other ones just forward these
          // Call to here comes from
          // [root QML top] classes.construct -> properties.applyProperties -> item.$properties[item.$defaultProperty].set
          this.value = QmlWeb.createComponentAndElement({clazz:val}, parentObj, QmlWeb.QMLComponentFlags.Nested);
        }
      } else if (val instanceof Object || val === undefined || val === null) {
        this.value = val;
      } else if (constructors[this.type].plainType) {
        this.value = constructors[this.type](val);
      } else {
        this.value = new constructors[this.type](val);
      }

    } finally {
      if (prevImport) {
        QmlWeb.engine.$component.bindImports(prevImport);
      }
      QmlWeb.engine.$component = prevComponent;
    }
  }

  // TODO move to Animation (binding it to a 'changed' slot)
  resetAnimation(oldVal) {
    this.animation.running = false;
    this.animation.$actions = [{
      target: this.animation.target || this.obj,
      property: this.animation.property || this.name,
      from: this.animation.from || oldVal,
      to: this.animation.to || this.value
    }];
    this.animation.running = true;
  }

  sendChanged(oldVal, newVal) {
    if (this.animation) {
      this.resetAnimation(oldVal);
    }
    this.changed(newVal, oldVal, this.name);

    // TODO gz   $syncPropertyToRemote !!!!!!!!!!!!
    if (this.$rootComponent.webSocket) {
      QmlWeb.$syncPropertyToRemote(this.$rootComponent, this);
    }
  }


  // Updater recalculates the value of a property if one of the dependencies
  // changed
  update(flags, declaringItem, oldVal) {

    const origState = this.updateState;
    this.updateState &= ~QmlWeb.QMLPropertyState.DirtyAll;
    this.updateState |= QmlWeb.QMLPropertyState.Updating;

    let newVal;

    var pushed;
    try {

      if (!this.binding || !(origState & QmlWeb.QMLPropertyState.BoundSet))  {
        this.obsoleteConnections = this.evalTreeConnections;
        // NOTE We replace each node in the evaluating dependencies graph by every 'get' :
        this.evalTreeConnections = {};
      }

      if (this.binding) {

        if (this.binding instanceof QmlWeb.QtBindingDefinition) {
          this.binding = Qt.binding(this.binding.get, this.binding.set, this.binding.flags);
        }

        if (!this.binding.compiled) {
          this.binding.compile();
        }

        if (origState & QmlWeb.QMLPropertyState.BoundSet) {
          // binding/set
          newVal = this.value;
          this.binding.set(this.obj, newVal, flags, declaringItem);
        } else {
          // this.binding/get
          pushed = QMLProperty.pushEvaluatingProperty(this);

          if (oldVal === undefined) oldVal = this.value;
          newVal = this.binding.get(this.obj);
          this.$setVal(newVal, flags, declaringItem);
        }
      } else {
        newVal = this.value;
      }

      this.updateState = QmlWeb.QMLPropertyState.Valid;

    } catch (err) {

      if (err.ctType) {
        if (origState & (QmlWeb.QMLPropertyState.BoundSet|QmlWeb.QMLPropertyState.NonBoundSet)) {
          QmlWeb.error("Assertion failed : "+err.ctType+" : "+QmlWeb.QMLPropertyState.toString(origState) +" -> "+ QmlWeb.QMLPropertyState.toString(this.updateState)+"  Invalid Error:"+err.message);
          this.updateState = origState;
        }
      } else {
        // when err.ctType==true:
        // PendingEval uses custom logic in get() implementation :
        this.updateState = origState;
      }

      if (pushed) {
        pushed = false;
        QMLProperty.popEvaluatingProperty();
      }

      throw err;

    } finally {

      if (this.obsoleteConnections) {
        for (var i in this.obsoleteConnections) {
          con = this.obsoleteConnections[i];
          con.disconnect();
          con.signalOwner.childEvalTreeConnections--;
        }
        delete this.obsoleteConnections;
      }

      parent.updateState &= ~QmlWeb.QMLPropertyState.Updating;
    }

    try {
      if (this.binding ? (origState & QmlWeb.QMLPropertyState.BoundSet ? false : newVal !== oldVal) :
                    (origState & QmlWeb.QMLPropertyState.NonBoundSet ? newVal !== oldVal : e("Assertion failed : no binding/read/update"))  ) {
        this.sendChanged(oldVal, newVal);
      }
    } catch (err2) {
      QmlWeb.err("Assertion failed : update / "+this+" . changed threw error : "+err2.message);
      throw err2;
    } finally {
      if (pushed) {
        QMLProperty.popEvaluatingProperty();
      }
    }
  }

  updateLater() {
    if (this.binding) {
      if (this.animation || (this.changed.$signal.connectedSlots && this.changed.$signal.connectedSlots.length>this.childEvalTreeConnections)) {
        this.update();
      } else {
        this.updateState = QmlWeb.QMLPropertyState.NeedsUpdate;
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

      // } else if ((this.binding.flags & QmlWeb.QMLBindingFlags.Bidirectional)) {
      //   ...
      // }

    } else  {
      this.updateState = QmlWeb.QMLPropertyState.NeedsUpdate;
    }
  }

  // Define getter
  get() {

    // defer exceptions, because it is still correct to register current eval tree state :
    let error;

    // Algo back-infects the dependent (eval tree 'parent') properties with 'this' invalidity :
    let invalidityFlags = this.updateState & QmlWeb.QMLPropertyState.InvalidityFlags;

    if (this.updateState & QmlWeb.QMLPropertyState.Updating) {
      QmlWeb.error(`(Secondary) property binding loop detected for property : ${this.toString(true)}`, this, "  recordedStack:", QMLProperty.recordStack());
      error = new QmlWeb.PendingEvaluation(`(Secondary) property binding loop detected for property : ${this.toString(true)}`, this);
    } else if (invalidityFlags) {
      if (QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init) {
        if (this.updateState & QmlWeb.QMLPropertyState.NeedsUpdate) {
          // not possible to update at init stage :
          throw new Error(`Init time, cannot update : Binding get in invalid state : ${QmlWeb.QMLPropertyState.toString(invalidityFlags)}`, this);
        }
        // otherwise : return uninitialized value (undefined, [] or so) finally
      } else if (this.binding || (this.updateState & QmlWeb.QMLPropertyState.NonBoundSet)) {
        try {
          this.update();
          invalidityFlags = 0;
        } catch (err) {
          error = err;
        }
      }
    }


    // If this call to the getter is due to a property that is dependant on thisQMLPropertyState
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
        con.isInternal = true;
        parent.evalTreeConnections[this.$propertyId] = con;
        con.signalOwner = this;
        this.childEvalTreeConnections++;

        // if 'parent' property depends on unitilazed/pending properties (just checking 'this'), 'parent' is considered
        // uninitialized/pending, too.
        // No need to double - register 'parent' property in pending queue because its dependency ('this') has already been marked :
        // its 'evalTreeConnections' automatically triggers 'parent' property update :
        parent.updateState |= invalidityFlags;
      }
    }, this);

    // now, we forward exceptions:
    if (error) {
      throw error;
    }

    if (invalidityFlags) {
      if (invalidityFlags & QmlWeb.QMLPropertyState.Uninitialized) {
        if (QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Starting) {
          // This 'get' is directed to an unitialized property
          QmlWeb.engine.currentPendingOp.warnings.push({loc:"get",
                                                        err:`Binding get in invalid state : ${QmlWeb.QMLPropertyState.toString(invalidityFlags)} -> ${QmlWeb.QMLPropertyState.toString(this.updateState)}`,
                                                        prop:this});
        }
      } else {
        throw new QmlWeb.PendingEvaluation(`Binding get in invalid state : ${QmlWeb.QMLPropertyState.toString(invalidityFlags)} -> ${QmlWeb.QMLPropertyState.toString(this.updateState)}`, this);
      }
    }

    if (this.value && this.value.$get) {
      return this.value.$get();
    }


    return this.value;
  }

  // Define setter
  set(newVal, flags, declaringItem) {

    const pushed = QmlWeb.QMLProperty.pushEvalStack();

    try {

      flags = flags || QmlWeb.QMLPropertyFlags.ReasonUser;
      if (this.readOnly && !(flags & QmlWeb.QMLPropertyFlags.Privileged)) {
        throw new Error(`property '${this.name}' has read only access`);
      }

      let needSend = !(this.updateState & QmlWeb.QMLPropertyState.Uninitialized);

      if (newVal === undefined) {
        if (flags & QmlWeb.QMLPropertyFlags.ReasonInit) {
          newVal = QMLProperty.typeInitialValues[this.type];
        }
      } else {
        //if (newVal instanceof Array) {
        //  newVal = newVal.slice(); // Copies the array
        //}
        this.updateState &= ~QmlWeb.QMLPropertyState.Uninitialized;
      }

      let oldVal = this.value;
      let desiredState;

      if (flags & QmlWeb.QMLPropertyFlags.ResetBinding) {
        this.binding = null;
      }

      if (newVal instanceof QmlWeb.QMLBinding || newVal instanceof QmlWeb.QtBindingDefinition) {
        needSend = this.binding !== newVal;
        this.binding = newVal;
        desiredState = QmlWeb.QMLPropertyState.NeedsUpdate;
      } else {
        if (this.binding && (this.binding.flags & QmlWeb.QMLBindingFlags.Bidirectional)) {
          desiredState = QmlWeb.QMLPropertyState.BoundSet;
          needSend = true;
        } else {
          if (!(flags & QmlWeb.QMLPropertyFlags.ReasonAnimation)) {
            this.binding = null;
          }
          desiredState = QmlWeb.QMLPropertyState.NonBoundSet;
        }
        if (newVal !== oldVal) {
          this.$setVal(newVal, flags, declaringItem);
        } else {
          needSend = false;
        }
      }

      if (needSend) {

        this.updateState = desiredState;

        if (QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init) {

          if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Remote) ||
              (!this.$rootComponent.serverWsAddress === !this.$rootComponent.isClientSide)) {
            let itm;
            if (itm = QmlWeb.engine.pendingOperations.map[this.$propertyId]) {
              // NOTE not setting oldValue here, keeping the oldest one
              itm.flags = flags;
              itm.declaringItem = declaringItem;
              itm.info+=" "+QmlWeb.QMLPropertyFlags.toString(flags);
            } else {
              itm = {
                property:this,
                info:this+" "+QmlWeb.QMLPropertyFlags.toString(flags),
                flags, declaringItem, oldVal
                };
              QmlWeb.engine.pendingOperations.map[this.$propertyId] = itm;
              // triggers update at Starting stage:
              QmlWeb.engine.pendingOperations.stack.push(itm);
            }
          }

        } else {
          this.update(flags);
        }
      }

    } finally {
      if (pushed) QmlWeb.QMLProperty.popEvalStack();
    }
  }

  toString(detail) {
    var os = objToStringSafe(this.obj, detail);

    // $base because to avoid infinite loops for overriden toString:
    return os+" . prop:"+this.name+(detail?"#"+this.$propertyId:"")+
      (detail?" "+QmlWeb.QMLPropertyState.toString(this.updateState)+(this.binding?" b#"+this.binding.id+":"+QmlWeb.QMLBindingFlags.toString(this.binding.flags):""):"")+
       (this.value?" v:"+this.value:"")+" "+(this.readOnly?"ro":"")+(this.pendingInit?"pi":"");
  }

  static stackToString(stack, parent) {
    if (!parent) parent = this.stacks;
    var result = "";
    var cur = !stack;
    if (cur) {
      stack = parent.evaluatingProperties.stack;
    }
    stack.forEach(function (item) {
      result += "  "+item.toString(true)+"\n";
    });
    if (cur) {
      result += (parent.evaluatingProperty?"----\n"+parent.evaluatingProperty.toString(true):"");
    }
    return result;
  }

  static stacksToString(parent) {
    if (!parent) parent = this.stacks;
    var result = "Stacks:\n";
    var i = 1;
    parent.evaluatingPropertyStackOfStacks.forEach(function (s) {
      result += i+":\n";
      result += QMLProperty.stackToString.call(this, s.stack, parent);
      ++i;
    }, this);
    result += "Current:\n";
    result += QMLProperty.stackToString.call(this, undefined, parent);
    return result;
  }

  static pushEvalStack() {
    if (QMLProperty.evaluatingProperty) {
      QMLProperty.evaluatingPropertyStackOfStacks.push(
        QMLProperty.evaluatingProperties
      );
      QMLProperty.evaluatingProperties = {stack:[], map:{}};
      QMLProperty.evaluatingProperty = undefined;
      //  QmlWeb.log("evaluatingProperty=>undefined due to push stck ");
      return true;
    } else {
      return false;
    }
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
    //  QmlWeb.warn("Evaluating Stack (of stacks) error : popped item is empty.");
    //}
  }

  static initEvaluatingProperty(prop) {
    var s = QMLProperty.evaluatingProperties;
    QMLProperty.evaluatingProperty = prop;
    s.map[prop.$propertyId] = prop;
    s.stack.push(prop); //keep stack of props
  }

  static pushEvaluatingProperty(prop) {
    var s = QMLProperty.evaluatingProperties;
    // TODO say warnings if already on stack. This means primary binding loop.
    // NOTE secondary binding loop is possible when dependencies has hidden in "stack of stacks"
    if (s.map[prop.$propertyId]) {
      QmlWeb.error(`(Primary) property binding loop detected for property : ${prop.toString(true)}`, "  recordedStack:", QMLProperty.recordStack());
      return false;
    }
    QMLProperty.initEvaluatingProperty(prop);
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
    //  QmlWeb.warn("Evaluating Stack error : popped item is empty.");
    //}
  }

  static recordStack() {
    var dupEvalStack = [];
    QMLProperty.evaluatingPropertyStackOfStacks.forEach(function (item) {
      dupEvalStack.push({stack : item.stack.slice(0)});
    });

    var recordedStack = {
      evaluatingPropertyStackOfStacks : dupEvalStack,
      evaluatingProperties : {stack : QMLProperty.evaluatingProperties.stack.slice(0)},
      evaluatingProperty : QMLProperty.evaluatingProperty
    };
    recordedStack.stacks = recordedStack;

    Object.defineProperty(recordedStack, "stackLines", {
      get: QMLProperty.stackToString,
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(recordedStack, "stacksLines", {
      get: QMLProperty.stacksToString,
      configurable: true,
      enumerable: true
    });
    return recordedStack;
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


QmlWeb.QMLProperty = QMLProperty;
QmlWeb.PendingEvaluation = PendingEvaluation;
QmlWeb.UninitializedEvaluation = UninitializedEvaluation;
QmlWeb.dumpEvalError = dumpEvalError;
QmlWeb.objToStringSafe = objToStringSafe;
