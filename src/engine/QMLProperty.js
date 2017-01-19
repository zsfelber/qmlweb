let propertyIds = 0;

class QMLProperty {
  constructor(type, obj, name) {
    this.obj = obj;
    this.name = name;
    this.changed = QmlWeb.Signal.signal([], { obj });
    this.binding = null;
    this.objectScope = null;
    this.componentScope = null;
    this.value = undefined;
    this.type = type;
    this.animation = null;
    this.needsUpdate = true;

    // This list contains all signals that hold references to this object.
    // It is needed when deleting, as we need to tidy up all references to this
    // object.
    this.$tidyupList = [];

    this.propertyId = ++propertyIds;
    this.evalTreeConnections = {};
  }

  // Called by update and set to actually set this.val, performing any type
  // conversion required.
  $setVal(val, componentScope) {
    const constructors = QmlWeb.constructors;
    if (constructors[this.type] === QmlWeb.qmlList) {
      this.val = QmlWeb.qmlList({
        object: val,
        parent: this.obj,
        context: componentScope
      });
    } else if (val instanceof QmlWeb.QMLMetaElement) {
      const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
      if (constructors[val.$class] === QMLComponent ||
          constructors[this.type] === QMLComponent) {
        this.val = new QMLComponent({
          object: val,
          parent: this.obj,
          context: componentScope
        });
        /* $basePath must be set here so that Components that are assigned to
         * properties (e.g. Repeater delegates) can properly resolve child
         * Components that live in the same directory in
         * Component.createObject. */
        this.val.$basePath = componentScope.$basePath;
      } else {
        this.val = QmlWeb.construct({
          object: val,
          parent: this.obj,
          context: componentScope
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

  // Updater recalculates the value of a property if one of the dependencies
  // changed
  update() {
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
      var oldEvalTreeConnections = this.evalTreeConnections;
      this.evalTreeConnections = {};

      this.$setVal(this.binding.eval(this.objectScope, this.componentScope,
        this.componentScopeBasePath), this.componentScope);

      for (var i in oldEvalTreeConnections) {
        if (!this.evalTreeConnections[i]) {
          // obsolete
          oldEvalTreeConnections[i].disconnect();
        }
      }


    } catch (e) {
      console.log("QMLProperty.update binding error:",
        e,
        Function.prototype.toString.call(this.binding.eval)
      );
    } finally {
      if (pushed) {
        QMLProperty.popEvaluatingProperty();
      }
    }

    if (this.animation) {
      this.animation.$actions = [{
        target: this.animation.target || this.obj,
        property: this.animation.property || this.name,
        from: this.animation.from || oldVal,
        to: this.animation.to || this.val
      }];
      this.animation.restart();
    }

    if (this.val !== oldVal) {
      this.changed(this.val, oldVal, this.name);
    }
  }

  updateLater() {
    if (this.animation || this.changed.connectedSlots.length) {
      update();
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
    if (QMLProperty.evaluatingProperty) {
      ////console.log(this,QMLProperty.evaluatingProperties.slice(0),this.val);
      //this.changed.connect(
      //  QMLProperty.evaluatingProperty,
      //  QMLProperty.prototype.update,
      //  QmlWeb.Signal.UniqueConnection
      //);

      var parent = QMLProperty.evaluatingProperty;

      var con = parent.evalTreeConnections[this.propertyId];
      if (!con) {
        con = this.changed.connect(
          parent,
          QMLProperty.prototype.updateLater,
          QmlWeb.Signal.UniqueConnection
        );
        parent.evalTreeConnections[this.propertyId] = con;
      }


      var connections = this.evalTreeConnections[parent.propertyId];
      if (connections) {
        for (var i in connections) {
          var con = connections[i];
          var cs = --con.connections;
          if (!QMLProperty.evaluatingProperties.map[i]) {
            if (!cs) {
              con.disconnect();
              delete this.evalAllConnections[i];
            }
            delete connections[i];￼
          }
        }
      } else {
        this.evalTreeConnections[parent.propertyId] = connections = {};
      }
      QMLProperty.evaluatingProperties.stack.forEach(function (ep){
        var con = this.evalAllConnections[ep.propertyId];
        if (con) {
          con.connections++;
        } else {
          con = this.changed.connect(
            ep,
            QMLProperty.prototype.updateLater,
            QmlWeb.Signal.UniqueConnection
          );
          con.connections = 1;
          this.evalAllConnections[ep.propertyId] = con;
        }
        connections[ep.propertyId] = con;
      });


    }

    if (this.val && this.val.$get) {
      return this.val.$get();
    }

    return this.val;
  }

  cleanupEvalConnections(nextProp) {
    if (nextProp !== this.currentNextProp) {
      if (this.evalTreeConnections) {
        for (var i in this.evalTreeConnections) {
          var con = this.evalTreeConnections[i];
          if (!--con.connections) {
            con.disconnect();
            delete this.evalAllConnections[i];
          }
          delete this.evalTreeConnections[i];
        }
      } else {
        this.evalTreeConnections = {};
      }
      this.currentNextProp = nextProp;
    }
  }

  // Define setter
  set(newVal, reason, objectScope, componentScope) {
    const oldVal = this.val;

    let val = newVal;
    if (val instanceof QmlWeb.QMLBinding) {
      if (!objectScope || !componentScope) {
        throw new Error("Internal error: binding assigned without scope");
      }
      this.binding = val;
      this.objectScope = objectScope;
      this.componentScope = componentScope;
      this.componentScopeBasePath = componentScope.$basePath;

      if (QmlWeb.engine.operationState !== QmlWeb.QMLOperationState.Init) {
        if (!val.compiled) {
          val.compile();
        }
        try {
          QMLProperty.pushEvaluatingProperty(this);
          this.needsUpdate = false;
          val = this.binding.eval(objectScope, componentScope,
            this.componentScopeBasePath);
        } finally {
          QMLProperty.popEvaluatingProperty();
        }
      } else {
        QmlWeb.engine.boundProperties.push(this);
        return;
      }
    } else {
      if (reason !== QMLProperty.ReasonAnimation) {
        this.binding = null;
      }
      if (val instanceof Array) {
        val = val.slice(); // Copies the array
      }
    }

    if (reason === QMLProperty.ReasonInit && typeof val === "undefined") {
      if (QMLProperty.typeInitialValues.hasOwnProperty(this.type)) {
        val = QMLProperty.typeInitialValues[this.type];
      }
    }

    this.$setVal(val, componentScope);

    if (this.val !== oldVal) {
      if (this.animation && reason === QMLProperty.ReasonUser) {
        this.animation.running = false;
        this.animation.$actions = [{
          target: this.animation.target || this.obj,
          property: this.animation.property || this.name,
          from: this.animation.from || oldVal,
          to: this.animation.to || this.val
        }];
        this.animation.running = true;
      }
      if (this.obj.$syncPropertyToRemote instanceof Function &&
          reason === QMLProperty.ReasonUser) {
        // is a remote object from e.g. a QWebChannel
        this.obj.$syncPropertyToRemote(this.name, val);
      } else {
        this.changed(this.val, oldVal, this.name);
      }
    }
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
    if (QMLProperty.evaluatingProperty) {
      QMLProperty.evaluatingProperty.cleanupEvalConnections(prop);
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

QmlWeb.QMLProperty = QMLProperty;
