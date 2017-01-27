let propertyIds = 0;

class PendingEvaluation extends Error {
  constructor(txt, prop) {
    super(txt);
    this.property = prop;
    this.ctType = "PendingEvaluation";
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
    this.bound = options.bound;
    this.changed = QmlWeb.Signal.signal("changed", [{name:"val"}, {name:"oldVal"}, {name:"name"}], { obj });
    this.binding = null;
    this.namespaceObject = null;
    this.value = undefined;
    this.type = type;
    this.animation = null;
    this.needsUpdate = true;
    this.get.$owner = this;
    this.set.$owner = this;

    // This list contains all signals that hold references to this object.
    // It is needed when deleting, as we need to tidy up all references to this
    // object.
    this.$tidyupList = [];

    this.propertyId = ++propertyIds;
    this.evalTreeConnections = {};
    this.childEvalTreeConnections = 0;
  }

  // Called by update and set to actually set this.val, performing any type
  // conversion required.
  $setVal(val, namespaceObject) {
    const constructors = QmlWeb.constructors;
    if (constructors[this.type] === QmlWeb.qmlList) {
      this.val = QmlWeb.qmlList({
        object: val,
        parent: this.obj,
        context: namespaceObject.$context
      });
    } else if (val instanceof QmlWeb.QMLMetaElement) {
      const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
      if (constructors[val.$class] === QMLComponent ||
          constructors[this.type] === QMLComponent) {
        this.val = new QMLComponent({
          object: val,
          parent: this.obj,
          context: namespaceObject.$context,
          isComponentRoot: false,
          isFromFile: false
        });
        if (namespaceObject.$context === QmlWeb.engine.rootContext) {
          throw new Error("Root context at property setVal : "+this);
        }

        /* $basePath must be set here so that Components that are assigned to
         * properties (e.g. Repeater delegates) can properly resolve child
         * Components that live in the same directory in
         * Component.createObject. */
        this.val.$basePath = namespaceObject.$context.$basePath;
      } else {
        this.val = QmlWeb.construct({
          object: val,
          parent: this.obj,
          context: namespaceObject.$context
        });
      }
    } else if (val instanceof Object || val === undefined || val === null) {
      this.val = val;
    } else if (constructors[this.type].plainType) {
      this.val = constructors[this.type](val);
    } else {
      this.val = new constructors[this.type](val);
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
  update(preventhacks) {
    this.needsUpdate = false;

    if (!this.binding) {
      return;
    }

    const oldVal = this.val;

    var pushed;
    try {
      pushed = QMLProperty.pushEvaluatingProperty(this);
      if (!this.binding.compiled) {
        this.binding.compile();
      }

      try {
        this.obsoleteConnections = QmlWeb.helpers.mergeObjects(this.evalTreeConnections);
        this.evalTreeConnections = {};

        var val = this.binding.eval(this.namespaceObject,
          this.namespaceObject.$context.$basePath);

        this.$setVal(val, this.namespaceObject);

      } finally {
        for (var i in this.obsoleteConnections) {
          con = this.obsoleteConnections[i];
          con.disconnect();
          con.signalOwner.childEvalTreeConnections--;
        }
        delete this.obsoleteConnections;
      }


    } catch (e) {
      console.warn("QMLProperty.update binding error #"+this.propertyId, e);
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
      this.changed(this.val, oldVal, this.name);
    }
  }

  updateLater() {
    if (this.binding) {
      if (this.animation || (this.changed.connectedSlots && this.changed.connectedSlots.length>this.childEvalTreeConnections)) {
        this.update();
      } else {
        this.needsUpdate = true;
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
      this.needsUpdate = true;
    }
  }

  // Define getter
  get() {
    //if (this.needsUpdate && !QMLProperty.evaluatingPropertyPaused) {
    if (this.needsUpdate &&
        QmlWeb.engine.operationState !== QmlWeb.QMLOperationState.Init) {
      this.update();
    }

    // If this call to the getter is due to a property that is dependant on this
    // one, we need it to take track of changes
    // if (QMLProperty.evaluatingProperty) {
      ////console.log(this,QMLProperty.evaluatingProperties.slice(0),this.val);
      //this.changed.connect(
      //  QMLProperty.evaluatingProperty,
      //  QMLProperty.prototype.update,
      //  QmlWeb.Signal.UniqueConnection
      //);

      QMLProperty.evaluatingProperties.stack.forEach(function (parent) {
        var con = parent.evalTreeConnections[this.propertyId];
        if (con) {
          delete parent.obsoleteConnections[this.propertyId];
        } else {
          con = this.changed.connect(
            parent,
            QMLProperty.prototype.updateLater,
            QmlWeb.Signal.UniqueConnection
          );
          parent.evalTreeConnections[this.propertyId] = con;
          con.signalOwner = this;
          this.childEvalTreeConnections++;
        }
      }, this);

    // }

    if (this.val && this.val.$get) {
      return this.val.$get();
    }

    if (this.needsUpdate && (this.bound || this.binding)) {
      QmlWeb.engine.pendingOperations.push({
         property:this,
         info:"Pending property get/binding initialization. #"+this.propertyId,
         });
      throw new QmlWeb.PendingEvaluation(`Binding not yet initialized.`, this);
    }

    return this.val;
  }

  // Define setter
  set(newVal, flags, namespaceObject) {
    flags = flags || QMLProperty.ReasonUser;
    if (this.readOnly && !(flags & QMLProperty.Privileged)) {
      throw new Error(`property '${this.name}' has read only access`);
    }

    const oldVal = this.val;

    let val = newVal;
    if (val instanceof QmlWeb.QMLBinding) {
      if (!namespaceObject) {
        throw new Error("Internal error: binding assigned without scope");
      }
      this.binding = val;
      this.namespaceObject = namespaceObject;

      if (QmlWeb.engine.operationState !== QmlWeb.QMLOperationState.Init) {
        this.update(true);
      } else {
        QmlWeb.engine.pendingOperations.push({
           property:this,
           info:"Pending property set/binding initialization.",
           flags:flags,
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
          this.binding.set(this.namespaceObject,
                           this.namespaceObject.$context.$basePath, newVal, flags);
        }
      } else if (!(flags & QMLProperty.ReasonAnimation)) {
        this.binding = null;
      }

      this.$setVal(val, namespaceObject);
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
      if (QmlWeb.engine.operationState !== QmlWeb.QMLOperationState.Init) {
        _changed_init.call(this);
      } else {
        QmlWeb.engine.pendingOperations.push({
          fun:_changed_init,
          thisObj:this,
          args:[],
          info:"Pending property set/changed_init.",
        });
        //console.warn("PendingEvaluation : Pending property set/changed init :" + this.name + "  obj:" + this.obj);
      }
    }
  }

  toString() {
    return this.obj+" . prop:"+this.name+" u:"+this.needsUpdate+" "+(this.binding?"b:"+this.binding.flags:"")+" "+(this.val?"v:"+this.val:"");
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
    QMLProperty.evaluatingProperties =
      QMLProperty.evaluatingPropertyStackOfStacks.pop() || {stack:[], map:{}};
    QMLProperty.evaluatingProperty =
      QMLProperty.evaluatingProperties.stack[
        QMLProperty.evaluatingProperties.stack.length - 1
      ];
  }

  static pushEvaluatingProperty(prop) {
    // TODO say warnings if already on stack. This means binding loop.
    // BTW actually we do not loop because needsUpdate flag is reset before
    // entering update again.
    if (QMLProperty.evaluatingProperties.map[prop.propertyId]) {
      console.error("Property binding loop detected for property",
        prop.name,
        [prop].slice(0)
      );
      return false;
    }
    QMLProperty.evaluatingProperty = prop;
    QMLProperty.evaluatingProperties.map[prop.propertyId] = prop;
    QMLProperty.evaluatingProperties.stack.push(prop); //keep stack of props
    return true;
  }

  static popEvaluatingProperty() {
    delete QMLProperty.evaluatingProperties.map[QMLProperty.evaluatingProperty.propertyId];
    QMLProperty.evaluatingProperty = QMLProperty.evaluatingProperties.stack.pop();
    //QMLProperty.evaluatingProperty = QMLProperty.evaluatingProperties.stack[
    //  QMLProperty.evaluatingProperties.length - 1
    //];
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
QMLProperty.ReasonInitPrivileged = QMLProperty.ReasonInit | QMLProperty.Privileged;

QmlWeb.QMLProperty = QMLProperty;
QmlWeb.PendingEvaluation = PendingEvaluation;
