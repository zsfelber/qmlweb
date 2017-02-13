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

const toStrCalls = {};
function objToStringSafe(obj, detail) {
  var os = "";
  try {
    if (!obj) {
      os = obj;
    } else {
      if (obj.$objectId) {
        if (toStrCalls[obj.$objectId]) {
          os = "toString loop:";
          try {
            os+=(obj.$base?obj.$base.toString():obj.$objectId);
          } catch (err) {
            os+=(err.ctType?err.ctType+":":"invalid:")+obj.$objectId;
          }
          return os;
        } else {
          toStrCalls[obj.$objectId] = 1;
        }
      }

      if (engine.operationState & QmlWeb.QMLOperationState.BeforeStart) {
        os = (obj.$base?obj.$base.toString():(obj.$objectId?obj.$objectId:"object"));
      } else {
        os = obj.toString(detail);
      }
    }
  } catch (err) {
    try {
      os += (err.ctType?err.ctType+":":"invalid:");
      os += (obj.$base?obj.$base.toString():(obj.$objectId?obj.$objectId:"object"));
    } catch (err2) {
      os += (err2.ctType?err2.ctType+":":"invalid:");
      os += (obj.$objectId?obj.$objectId:"object");
    }
  } finally {
    if (obj && obj.$objectId) {
      delete toStrCalls[obj.$objectId];
    }
  }

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
    this.updateState &= ~QmlWeb.QMLPropertyState.DirtyUninit;
    this.updateState |= QmlWeb.QMLPropertyState.Updating;

    let newVal;

    var pushed;
    try {

      if (!this.binding || !(flags & QmlWeb.QMLPropertyState.SaveBinding))  {
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

        if (flags & QmlWeb.QMLPropertyState.SaveBinding) {
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
        if (flags & (QmlWeb.QMLPropertyState.SaveBinding|QmlWeb.QMLPropertyFlags.Changed)) {
          throw new Error("Assertion failed : "+QmlWeb.QMLPropertyFlags.toString(flags));
        }
      } else {
        // when err.ctType==true:
        // PendingEval uses custom logic in get() implementation :
        this.updateState = origState;
      }

      throw err;

    } finally {

      parent.updateState &= ~QmlWeb.QMLPropertyState.Updating;

      if (pushed) {
        QMLProperty.popEvaluatingProperty();
      }
      if (this.obsoleteConnections) {
        for (var i in this.obsoleteConnections) {
          con = this.obsoleteConnections[i];
          con.disconnect();
          con.signalOwner.childEvalTreeConnections--;
        }
        delete this.obsoleteConnections;
      }
    }


    if (this.binding ? (flags & QmlWeb.QMLPropertyState.SaveBinding ? false : newVal !== oldVal) :
                  (flags & QmlWeb.QMLPropertyFlags.Changed ? newVal !== oldVal : e("Assertion failed : no binding/read/update"))  ) {
      this.sendChanged(oldVal, newVal);
    }
  }

  updateLater() {
    if (this.binding) {
      if (this.animation || (this.changed.connectedSlots && this.changed.connectedSlots.length>this.childEvalTreeConnections)) {
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
      error = new QmlWeb.PendingEvaluation(`(Secondary) property binding loop detected for property : ${this.toString(true)}\n${this.stacksToString()}`, this);
    } else if (invalidityFlags) {
      if (QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init) {
        if (this.updateState & QmlWeb.QMLPropertyState.NeedsUpdate) {
          // not possible to update at init stage :
          throw new Error(`Init time, cannot update : Binding get in invalid state : ${QmlWeb.QMLPropertyState.toString(invalidityFlags)}`, this);
        }
        // otherwise : return uninitialized value (undefined, [] or so) finally
      } else if (this.binding || (flags & QmlWeb.QMLPropertyFlags.Changed)) {
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

    if (invalidityFlags && !(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init)) {
      // This 'get' is directed to an unitialized property
      throw new QmlWeb.PendingEvaluation(`Binding get in invalid state : ${QmlWeb.QMLPropertyState.toString(invalidityFlags)}`, this);
    }

    if (this.value && this.value.$get) {
      return this.value.$get();
    }


    return this.value;
  }

  // Define setter
  set(newVal, flags, declaringItem) {

    QmlWeb.QMLProperty.pushEvalStack();

    try {

      flags = flags || QmlWeb.QMLPropertyFlags.ReasonUser;
      if (this.readOnly && !(flags & QmlWeb.QMLPropertyFlags.Privileged)) {
        throw new Error(`property '${this.name}' has read only access`);
      }

      if (newVal === undefined) {
        if (flags & QmlWeb.QMLPropertyFlags.ReasonInit) {
          newVal = QMLProperty.typeInitialValues[this.type];
        }
        this.updateState &= ~QmlWeb.QMLPropertyState.Dirty;
      } else {
        //if (newVal instanceof Array) {
        //  newVal = newVal.slice(); // Copies the array
        //}
        this.updateState &= ~QmlWeb.QMLPropertyState.DirtyUninit;
      }

      let oldVal = this.value;
      let desiredState;
      let needSend;
      if (flags & QmlWeb.QMLPropertyFlags.ResetBinding) {
        this.binding = null;
      }
      if (newVal instanceof QmlWeb.QMLBinding || newVal instanceof QmlWeb.QtBindingDefinition) {
        needSend = this.binding !== newVal;
        this.binding = newVal;
        desiredState = QmlWeb.QMLPropertyState.NeedsUpdate;
      } else {
        if (this.binding && (this.binding.flags & QmlWeb.QMLBindingFlags.Bidirectional)) {
          desiredState = QmlWeb.QMLPropertyState.SaveBinding;
          needSend = true;
        } else {
          if (!(flags & QmlWeb.QMLPropertyFlags.ReasonAnimation)) {
            this.binding = null;
          }
          desiredState = QmlWeb.QMLPropertyState.Changed;
          needSend = !(this.updateState & QmlWeb.QMLPropertyState.Uninitialized);
        }
        if (newVal !== oldVal) {
          this.$setVal(newVal, flags, declaringItem);
        } else {
          needSend = false;
        }
      }

      if (needSend) {
        this.updateState = desiredState;
        if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init)) {
          needSend = false;
          // with get/binding mode
          this.update(flags);
        }
      }


      if (needSend) {

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
                info:"Pending property : "+this+" "+QmlWeb.QMLPropertyFlags.toString(flags),
                flags, declaringItem, oldVal
                };
              QmlWeb.engine.pendingOperations.map[this.$propertyId] = itm;
              // triggers update at Starting stage:
              QmlWeb.engine.pendingOperations.stack.push(itm);
            }
          }

        } else {

          if (flags & QmlWeb.QMLPropertyFlags.ReasonInit) {
            this.changed(this.value, oldVal, this.name);
          } else {
            this.sendChanged(oldVal, this.value);
          }
        }
      }

    } finally {
      QmlWeb.QMLProperty.popEvalStack();
    }
  }

  toString(detail) {
    var os = objToStringSafe(this.obj);

    // $base because to avoid infinite loops for overriden toString:
    return os+" . prop:"+this.name+(detail?"#"+this.$propertyId:"")+
      (detail?" "+QmlWeb.QMLPropertyState.toString(this.updateState)+(this.binding?" "+QmlWeb.QMLBindingFlags.toString(this.binding.flags):""):"")+
       (this.value?" v:"+this.value:"")+(this.readOnly?" ro":"")+(this.pendingInit?" pi":"");
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
      result += this.stackToString(s.stack);
      ++i;
    }, this);
    result += "Current:\n";
    result += this.stackToString();
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
      console.error(`(Primary) property binding loop detected for property : ${prop.toString(true)}\n${this.stackToString()}`);
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


QmlWeb.QMLProperty = QMLProperty;
QmlWeb.PendingEvaluation = PendingEvaluation;
QmlWeb.dumpEvalError = dumpEvalError;
QmlWeb.objToStringSafe = objToStringSafe;
