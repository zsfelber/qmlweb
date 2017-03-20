
function objToStringSafe(obj, detail) {
  var os = obj ? QObject.prototype.toString.call(obj, detail) : obj;
  return os;
}

function diffStringTail(s1, s2) {
  var l = Math.min(s1.length, s2.length);
  var result = "";
  for (let i = 0, started = 0; i<l; i++) {
    if (started) {
      result += s2[i];
    } else if (s1[i]===s2[i]) {
      result = "…";
    } else {
      started = 1;
      result += s2[i];
    }
  }
  for (let i = l; i<s2.length; i++) {
    result += s2[i];
  }

  return result;
}

function e(msg) {
  throw new Error(msg);
}

var setEvaluatedObjAlreadyDone = {setE:"valuatedObjAlreadyDone"};

class QMLProperty {
  constructor(type, obj, name, options) {
    if (!obj) {
      throw new Error("Invalid QMLProperty:"+name+" of null, type:"+type+" options:"+JSON.stringify(options));
    }
    this.$engine = QmlWeb.getEngine();

    this.stacks = QMLProperty;
    this.queueItems = [];

    // NOTE
    // propDeclObj : where the property declared in prototype chain
    // bindingCtxObj : where the binding is initialized (holding the binding evaluation context)
    // valParentObj : where the value is recently passed to property.set

    // sole entry 1/1 of propDeclObj! nowhere else passed
    this.propDeclObj = obj;
    // main entry 1/2 of this.bindingCtxObj! nowhere else passed
    this.bindingCtxObj = obj;
    // main entry 1/2 of this.valParentObj! nowhere else passed
    this.valParentObj = obj;

    this.$rootComponent = obj.$component ? obj.$component.$root : {};
    this.name = name;
    this.options = options;
    this.readOnly = options.readOnly;
    this.autoPendingOpsBeforeGetDisabled = options.autoPendingOpsBeforeGetDisabled;
    this.updateState = QMLPropertyState.Uninitialized;
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

    this.$objectId = this.$propertyId = ++objectIds;
    this.evalTreeConnections = {};
    this.childEvalTreeConnections = 0;
  }

  // Called by update and set to actually set this.value, performing any type
  // conversion required.
  $setVal(newVal, flags, valParentObj) {
    const engine = this.$engine;
    var prevEvalObj = QmlWeb.$evaluatedObj;

    try {
      const isch = flags & QmlWeb.QMLPropertyFlags.SetChildren;
      const elemflag = (isch?QmlWeb.QMLComponentFlags.Element:0);

      if (valParentObj !== setEvaluatedObjAlreadyDone) this.setEvaluatedObj(valParentObj);

      const constructors = QmlWeb.constructors;

      if (newVal === undefined) {
        if (flags & QmlWeb.QMLPropertyFlags.ReasonInit) {
          newVal = QMLProperty.typeInitialValues[this.type];
        }
      } else {
        this.updateState &= ~QMLPropertyState.Uninitialized;
      }

      const cons = constructors[this.type];
      if (cons === QmlWeb.qmlList) {
        // SetChildren (used in init mode only) : we merge the subclasses items and don't clear it every time
        // otherwise : clear it, most important when this is the default property, otherwise it just appends new entries
        if (!isch) {
          // TODO cleanup (garbage collector now, but is it enough?). when isch/!isch?
          this.value = [];
        }

        // NOTE gz : key entry point 1 of QmlWeb.construct  -> see key entry point 2
        var tmp = QmlWeb.qmlList(newVal, this.valParentObj, QmlWeb.QMLComponentFlags.Nested|elemflag);

        // Otherwise, we trust containerChanged/onAddElement
        if (!isch) {
          this.value = tmp;
        }
      } else if (newVal instanceof QmlWeb.QMLMetaElement) {
        if (constructors[newVal.$class] === QMLComponent) {
          // Root element or nested Component element ?

          this.value = engine.createComponent({
            clazz: newVal,
            $file: newVal.$file
          });
        } else if (cons === QMLComponent) {
          // User declared Component type but assigned Element directly (eg initialized a delegate)

          this.value = engine.createComponent({
            clazz: newVal,
            $file: newVal.$file
          }, QmlWeb.QMLComponentFlags.Flat);
        } else {
          // NOTE gz : key entry point 2 of QmlWeb.construct
          // all the other ones just forward these
          // Call to here comes from
          // [root QML top] classes.construct -> properties.applyProperties -> item.$properties[item.$defaultProperty].set
          this.value = engine.createComponentAndElement({clazz:newVal}, this.valParentObj, QmlWeb.QMLComponentFlags.Nested|elemflag);
        }
      } else if (newVal === undefined || newVal === null || !cons) {
        this.value = newVal;
      } else if (cons.plainType) {
        this.value = cons(newVal);
      } else if (cons.valueType || !(newVal instanceof Object)) {
        this.value = new cons(newVal);
      } else {
        this.value = newVal;
      }

      return this.value;

    } finally {
      QmlWeb.$evaluatedObj = prevEvalObj;
    }
  }

  resetAnimation(oldVal, newVal, flags) {
    if (!(flags & QmlWeb.QMLPropertyFlags.ReasonTemporally)) {
      this.animation.running = false;
      this.animation.from = oldVal;
      this.animation.to = newVal;
      this.animation.running = true;
    }
  }

  sendChanged(oldVal, newVal, flags) {
    if (this.animation) {
      this.resetAnimation(oldVal, newVal, flags);
    }

    this.changed(newVal, oldVal, this.name);

    // TODO gz   $syncPropertyToRemote !!!!!!!!!!!!
    if (this.$rootComponent.webSocket) {
      QmlWeb.$syncPropertyToRemote(this.$rootComponent, this);
    }
  }


  // 'update' reevaluates the get/set binding, stores or emits the value of the property, as determined from this.updateState
  update(flags, oldVal, valParentObj, dirtyNow) {

    const engine = this.$engine;
    var prevEvalObj = QmlWeb.$evaluatedObj;

    const origState = this.updateState;
    this.updateState |= QMLPropertyState.Updating;
    if (!dirtyNow) {
      dirtyNow = origState & ~QMLPropertyState.Dynamic;
    }

    let newVal;

    var pushed;

    try {

      this.setEvaluatedObj(valParentObj);

      try {

        if (this.binding) {

          if (this.binding instanceof QmlWeb.QtBindingDefinition) {
            this.binding = Qt.binding(this.binding.get, this.binding.set, this.binding.flags);
          }

          if (!this.binding.compiled) {
            this.binding.compile();
          }

          if (dirtyNow & QMLPropertyState.ValueSaved) {

            // binding/set
            newVal = this.value;
            // NOTE valParentObj/bindingCtxObj is passed through property.set,$set or $setVal, its in the descendant level in object type hierarchy (proto chain),
            // NOTE we don't pass this.valParentObj as valParentObj because it only belongs to this property and not to newVal or another property
            this.binding.set(this.bindingCtxObj, newVal, flags);

          } else if (dirtyNow & QMLPropertyState.LoadFromBinding)  {

            this.obsoleteConnections = this.evalTreeConnections;
            // NOTE We replace each node in the evaluating dependencies graph by every 'get' :
            this.evalTreeConnections = {};

            // this.binding/get
            pushed = QMLProperty.pushEvaluatingProperty(this);

            if (oldVal === undefined) oldVal = this.value;
            newVal = this.binding.get(this.bindingCtxObj);
            newVal = this.$setVal(newVal, flags, setEvaluatedObjAlreadyDone);

          } else {
            throw new QmlWeb.AssertionError("Assertion failed : "+this+" . update("+QmlWeb.QMLPropertyFlags.toString(flags)+", "+oldVal+")   Invalid update state:"+QMLPropertyState.toString(this.updateState)+"  Binding:"+this.binding);
          }

        } else {

          if (dirtyNow & QMLPropertyState.ValueSaved)  {

            this.obsoleteConnections = this.evalTreeConnections;
            // NOTE We replace each node in the evaluating dependencies graph by every 'get' :
            this.evalTreeConnections = {};

            newVal = this.value;

          } else if (dirtyNow & QMLPropertyState.Dynamic)  {

            this.obsoleteConnections = this.evalTreeConnections;
            // NOTE We replace each node in the evaluating dependencies graph by every 'get' :
            this.evalTreeConnections = {};

            // this.binding/get
            pushed = QMLProperty.pushEvaluatingProperty(this);

            if (oldVal === undefined) oldVal = this.value;
            newVal = this.$setVal(this.deferredChildMeta, flags, setEvaluatedObjAlreadyDone);


          } else {
            throw new QmlWeb.AssertionError("Assertion failed : "+this+" . update("+QmlWeb.QMLPropertyFlags.toString(flags)+", "+oldVal+")   Invalid update state:"+QMLPropertyState.toString(this.updateState)+"  (case 'no binding')");
          }
        }

        this.updateState &= ~dirtyNow;

      } catch (err) {
        if (err instanceof QmlWeb.FatalError) throw err;

        if (err.ctType) {
          if (dirtyNow & QMLPropertyState.ValueSaved) {
            throw new QmlWeb.AssertionError("Assertion failed : "+err.ctType+" : "+QMLPropertyState.toString(dirtyNow) +" -> "+ QMLPropertyState.toString(this.updateState)+"  Invalid Error:", err);
          //} else {
            // when err.ctType==true: && LoadFromBinding
            // PendingEval uses custom logic in get() implementation :
          }
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

        this.updateState &= ~QMLPropertyState.Updating;
      }

      try {
        if (oldVal!==newVal && !(origState & QMLPropertyState.Uninitialized)) {
          if (this.updateState & QMLPropertyState.Uninitialized) {
            throw new QmlWeb.AssertionError("Assertion failed : "+this+" . update("+QmlWeb.QMLPropertyFlags.toString(flags)+", "+oldVal+")   Invalid state:"+QMLPropertyState.toString(this.updateState)+"  Property became Uninitialized meanwhile but value seems changed!");
          }
          this.sendChanged(oldVal, newVal, flags);
        }
      } catch (err2) {
        if (err2 instanceof QmlWeb.FatalError) throw err2;
        throw new QmlWeb.AssertionError("Assertion failed : update / "+this+" . changed threw error, ", err2);
        throw err2;
      } finally {
        if (pushed) {
          QMLProperty.popEvaluatingProperty();
        }
      }

    } finally {
      QmlWeb.$evaluatedObj = prevEvalObj;
    }
  }

  static fwdLazy(con) {
    if (!(con.slotObj instanceof QMLProperty)) {
      throw new QmlWeb.AssertionError("Assertion failed in ",this,", not a QMLProperty in connectedSlots connection when they should all be : ", con);
    }
    if (con.slotObj.binding) {
      con.slotObj.updateState |= QMLPropertyState.LoadFromBinding;
    } else {
      console.warn("Binding removed from connection.", this,"  connection : ", con);
    }
  }

  // slot bound to signal 'when one of the dependencies changed', triggers an immediate update or schedules a lazy update :
  updateBindingLater() {
    if (this.binding) {

      this.updateState |= QMLPropertyState.LoadFromBinding;

      if (this.animation || (this.changed.$signal.connectedSlots && this.changed.$signal.connectedSlots.length>this.childEvalTreeConnections)) {
        this.update();
      } else {
        // lazy load for inactive properties (and its dependencies):
        this.changed.$signal.connectedSlots.forEach(QMLProperty.fwdLazy, this);
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
    }
  }

  // Define getter
  get() {

    // defer exceptions, because it is still correct to register current eval tree state :
    let error;
    const engine = this.$engine;

    if (this.propDeclObj.$isDeleted) {
      return undefined;
    }

    if (engine.operationState & QmlWeb.QMLOperationState.Init) {
      if (this.updateState & QMLPropertyState.LoadFromBinding) {
        // not possible to update at init stage :
        throw new QmlWeb.AssertionError(`Assertion failed. Init time, cannot update : Binding get in invalid state : ${QMLPropertyState.toString(this.updateState)}`, this);
      }
      // in case Valid/ValueSaved/ValueSaved: this.value is ok, return this.value
      // otherwise (Uninitialized) : return uninitialized this.value (undefined, [] or so) finally (as it is intended to be undefined,null or so)
    } else {

      let toUpdate = 1;

      if ((engine.operationState & QmlWeb.QMLOperationState.Starting) || (this.updateState & QMLPropertyState.Dynamic)) {
        if (!engine.currentPendingOp) {
          console.warn("No engine.currentPendingOp  "+this);
        }
        // if it has been found and is not being already processed,
        // we take this property from queue and update it immediately,
        // if it is being processed, then we omit update
        // otherwise just don't do anything here:
        if (engine.currentPendingOps[this.$propertyId]) {
          toUpdate = 0;
        } else if (!this.autoPendingOpsBeforeGetDisabled) {
          try {
            toUpdate = !engine.processSinglePendingOperation(this.queueItems);
          } catch (err) {
            if (err instanceof QmlWeb.FatalError) throw err;
            error = err;
          }
        }
      } else if (engine.pendingOperations.map.hasOwnProperty(this.$propertyId)) {
        throw new QmlWeb.AssertionError(`Assertion failed. pendingOperation/property filled at runtime : `, this);
      }

      const dirty = this.updateState & QMLPropertyState.Changed;
      if (toUpdate && dirty) {
        if (dirty & ~QMLPropertyState.DirtyRead) {
          throw new QmlWeb.AssertionError("Assertion failed : "+this+" . get   Invalid state:"+QMLPropertyState.toString(this.updateState)+"  Property setter dirty state invalid at Runtime, only valid in Init/Starting state through pendingOperations queue!");
        }

        try {
          this.update();
        } catch (err) {
          if (err instanceof QmlWeb.FatalError) throw err;
          error = err;
        }
      }
    }

    // Algo back-infects the dependent (eval tree 'parent') properties with 'this' invalidity :
    // here , relevant flags are Uninitialized, LoadFromBinding
    let invalidityFlags = this.updateState & QMLPropertyState.InvalidityFlags;

    if (invalidityFlags) {

      if (this.updateState & QMLPropertyState.Updating) {
        if (engine.currentPendingOps[this.$propertyId]) {
          engine.currentPendingOp.warnings.push({loc:"get",
                                                err:`(Secondary) property binding loop detected for property. recordedStack: ${QMLProperty.recordStack()}`,
                                                prop:this});
          return this.value;
        } else {
          QmlWeb.error(`(Secondary) property binding loop detected for property : ${this.toString(true)}`, this, "  recordedStack:", QMLProperty.recordStack());
          error = new QmlWeb.PendingEvaluation(`(Secondary) property binding loop detected for property : ${this.toString(true)}`, this);
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
          QMLProperty.prototype.updateBindingLater,
          QmlWeb.QMLSignalFlags.UniqueConnection
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
      if (invalidityFlags & QMLPropertyState.Uninitialized) {
        if (engine.operationState & QmlWeb.QMLOperationState.Starting) {
          // This 'get' is directed to an unitialized property
          engine.currentPendingOp.warnings.push({loc:"get",
                                                err:`Binding get in invalid state : ${QMLPropertyState.toString(invalidityFlags)} -> ${QMLPropertyState.toString(this.updateState)}`,
                                                prop:this});
        }
      } else {
        throw new QmlWeb.PendingEvaluation(`Binding get in invalid state : ${QMLPropertyState.toString(invalidityFlags)} -> ${QMLPropertyState.toString(this.updateState)}`, this);
      }
    }

    if (this.value && this.value.$get) {
      return this.value.$get();
    }


    return this.value;
  }

  // Define setter
  set(newVal, flags, valParentObj) {

    const engine = this.$engine;
    flags = flags || QmlWeb.QMLPropertyFlags.ReasonUser;
    if (this.readOnly && !(flags & QmlWeb.QMLPropertyFlags.Privileged)) {
      throw new Error(`property '${this.name}' has read only access`);
    }

    const oldVal = this.value;

    const origState = this.updateState;
    let fwdUpdate;
    let dirty = 0;
    const p = valParentObj ? valParentObj : this.valParentObj;
    let dynamic = p.$componentCreateFlags & QMLComponentFlags.DynamicLoad ? QMLPropertyState.Dynamic : 0;

    if (newVal instanceof QmlWeb.QMLBinding || newVal instanceof QmlWeb.QtBindingDefinition) {
      fwdUpdate = dynamic || this.binding !== newVal;
      if (fwdUpdate) {
        this.updateState |= dirty = dynamic | QMLPropertyState.LoadFromBinding;
      }
    } else {
      if (dynamic) {
        this.updateState |= dirty = dynamic;
        this.deferredChildMeta = newVal;
        fwdUpdate = true;
      } else {
        newVal = this.$setVal(newVal, flags, valParentObj);

        fwdUpdate = newVal !== oldVal;
        if (fwdUpdate) {
          if (this.binding && (this.binding.flags & QmlWeb.QMLBindingFlags.Bidirectional)) {
            this.updateState |= dirty = QMLPropertyState.ValueSaved;
          } else if (origState & QMLPropertyState.LoadFromBinding) {
            this.updateState |= dirty = QMLPropertyState.ValueSaved;
          } else if (origState & QMLPropertyState.Uninitialized) {
            fwdUpdate = false;
          } else {
            this.updateState |= dirty = QMLPropertyState.ValueSaved;
          }
        }
      }
    }

    if (fwdUpdate) {

      if (dynamic) {

        const queueItem = {
          property:this, opId:this.$propertyId, oldVal, newVal, flags, valParentObj, dirty
        };

        engine.addPendingOp(queueItem, this.queueItems);

      } else if (engine.operationState & QmlWeb.QMLOperationState.Init) {

        if (!(engine.operationState & QmlWeb.QMLOperationState.Remote) ||
            (!this.$rootComponent.serverWsAddress === !this.$rootComponent.isClientSide)) {

          // triggers update at Starting stage:

          // 'dirty' keeps state flags consistency after 'update' called
          // 'update' always resets the current updated flag to 0 except the
          // remaining update tasks' dirty bits

          const queueItem = {
            property:this, opId:this.$propertyId, oldVal, newVal, flags, valParentObj, dirty
          };

          engine.addPendingOp(queueItem, this.queueItems);

        }

      } else {
        this.$set(newVal, oldVal, flags, valParentObj);
      }
    }
  }

  $set(newVal, oldVal, flags, valParentObj, queueItem, nextQueueItem) {

    const engine = this.$engine;
    flags = flags || QmlWeb.QMLPropertyFlags.ReasonUser;
    if (this.readOnly && !(flags & QmlWeb.QMLPropertyFlags.Privileged)) {
      throw new Error(`property '${this.name}' has read only access`);
    }
    if (engine.operationState & QmlWeb.QMLOperationState.Init) {
      throw new QmlWeb.AssertionError(`Assertion failed. Init time, cannot invoke $set: `, this);
    }

    const pushed = QmlWeb.QMLProperty.pushEvalStack();

    try {

      if (flags & QmlWeb.QMLPropertyFlags.ResetBinding) {
        this.binding = null;
        // reset this.bindingCtxObj
        this.bindingCtxObj = this.propDeclObj;
      }

      if (newVal instanceof QmlWeb.QMLBinding || newVal instanceof QmlWeb.QtBindingDefinition) {
        if (valParentObj) {
          // main entry 2/2 of this.bindingCtxObj! nowhere else passed
          this.bindingCtxObj = valParentObj;
        }

        this.binding = newVal;
      } else if (this.binding && !(this.binding.flags & QmlWeb.QMLBindingFlags.Bidirectional) && !(flags & QmlWeb.QMLPropertyFlags.ReasonTemporally)) {
        this.binding = null;
        // reset this.bindingCtxObj
        this.bindingCtxObj = this.propDeclObj;
      }

      let dirtyNow;
      if (queueItem) {
        dirtyNow = queueItem.dirty;

        if (!(this.updateState&dirtyNow)) {
          throw new QmlWeb.AssertionError("Assertion failed : "+this+" . Queued update state not matching : "+QMLPropertyState.toString(dirtyNow));
        }
      }

      this.update(flags, oldVal, valParentObj, dirtyNow);

      if (nextQueueItem) {
        this.updateState |= nextQueueItem.dirty;
      }

    } finally {
      if (pushed) QmlWeb.QMLProperty.popEvalStack();
    }
  }

  toString(detail) {
    var os = objToStringSafe(this.propDeclObj, detail), s = os;
    if (this.propDeclObj !== this.bindingCtxObj) {
      os += "(B:"+diffStringTail(s, s=objToStringSafe(this.bindingCtxObj))+")"
    }
    if (this.bindingCtxObj !== this.valParentObj) {
      os += "(V:"+diffStringTail(s, s=objToStringSafe(this.valParentObj))+")"
    }

    // $base because to avoid infinite loops for overriden toString:
    return os+" . prop:"+this.name+(detail?"#"+this.$propertyId:"")+" ["+QMLPropertyState.toString(this.updateState)+"]"+
      (detail?(this.binding?" b#"+this.binding.id+":"+QmlWeb.QMLBindingFlags.toString(this.binding.flags):""):"")+
       (this.value?" v:"+objToStringSafe(this.value):"")+" "+(this.readOnly?"ro":"");
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

  setEvaluatedObj(valParentObj) {
    const engine = this.$engine;
    var prevEvalObj = QmlWeb.$evaluatedObj;

    // NOTE valParentObj(/bindingCtxObj) is passed through property.set,$set or $setVal, its in the descendant level in object type hierarchy (proto chain),
    // eg. passed along with SetChildren

    if (valParentObj) {
      // main entry 2/2 of this.valParentObj! nowhere else passed
      this.valParentObj = valParentObj;

      // childObj.loaderComponent should be valParentObj.$component


    } else {

      const currentEvalParent = QMLProperty.findLoader(prevEvalObj, this.propDeclObj.$objectId);

      if (currentEvalParent) {

        // entry condition means : if   we are accessing this prop from a binding  in (some subtype of) current object:
        // then, using current binding context (and set current parent obj)

        // see tests/PropertiesUrl.qml and look at 'properties_url_import.remoteSet = "remoteSet.png"' :

        this.valParentObj = currentEvalParent;

      } else {

        // otherwise we add current bindingCtxObj's component to stack (if a binding exists, otherwise adding its variable's content
        // which points to this.propDeclObj )

        this.valParentObj = this.bindingCtxObj;
      }
    }

    // this.propDeclObj.$component : the QML supertype where the default property (eg"data") defined (eg"ItemBase")
    // this.bindingCtxObj.$component : the QML supertype where the current binding is initialized
    // these may be the supertype(s) of the actual parent (this.valParentObj) here:
    QmlWeb.$evaluatedObj = this.valParentObj;
  }

  static findLoader(evalObj, id) {
    if (evalObj.$context) {
      evalObj=evalObj.$context.$ownerObject;
    }

    for (; evalObj&&evalObj.$objectId!==id; (evalObj=evalObj.$loaderContext) && (evalObj=evalObj.$ownerObject));
    return evalObj;
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
QmlWeb.objToStringSafe = objToStringSafe;
