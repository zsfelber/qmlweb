let objectIds = 0;

class QObject {
  constructor(parent, meta) {
    this.$parent = parent;
    this.$base = this;
    this.$engine = QmlWeb.getEngine();

    // List of things to tidy up when deleting this object.
    // TODO use hash !
    this.$tidyupList = [];

    this.$properties = {};
    this.$properties_noalias = {};
    this.$noalias = {};
    this.$signals = {};
    this.$leaf = this;

    this.$objectId = ++objectIds;

    let att = 0;
    if (meta) {
      this.$meta = meta;

      if (meta.attached) {
        QObject.attach(parent, this, meta.$info);
        att = 1;
      }
    }

    if (!att && parent && parent.$tidyupList) {
      parent.$tidyupList.push(this);
    }
  }

  static attach(parent, child, info) {
    if (!parent) {
      throw new Error("Object attached to null : "+child);
    }
    child.$isAttachedObj = true;
    child.$attached_as = info;
    child.parent = parent;

    // context for attached properties like "anchors" and so
    // see also $ownerObject
    QmlWeb.setupGetter(child, "$component", function() { return this.parent.$component; }, child);
    QmlWeb.setupGetter(child, "$context", function() { return this.parent.$context; }, child);
    QmlWeb.setupGetter(child, "$componentCreateFlags", function() { return this.parent.$componentCreateFlags; }, child);

    if (!child.destroy) child.destroy = 1;
    if (!child.$leaf) child.$leaf = child;
    if (!child.$base) child.$base = child;
    if (!child.$tidyupList) child.$tidyupList = [];
    if (!child.$signals) child.$signals = [];
    if (!child.$parent) child.$parent = parent;
    else if (child.$parent !== parent) throw new AssertionError("Assertion failed : attached object parent is not target : "+child.$parent+" vs "+parent);

    if (parent && parent.$tidyupList) {
      parent.$tidyupList.push(child);
    }
  }

  static pendingComplete(item, destruction) {
    // NOTE one level of supertype hierarchy, QObject's component first (recursively) :
    // NOTE not possible even trying to emit 'completed' right now, because we are before "applyProperties"
    // and so unable to determine whether a called property exists and not yet initialiazed or it doesn't exist at all.
    let opId;
    if (item.$component) {
      opId = "C:"+item.$component.$componentId;
    } else {
      opId = "C0:"+item.$objectId;
    }

    const itm = {
      fun:(destruction ? QObject.$delete : QMLComponent.complete),
      thisObj:item,
      info: (destruction?"Pending component.destruction (waiting to destroy) : ":
                         "Pending component.complete (waiting to initialization) : ")+item.$context,
      opId
    };

    const engine = item.$engine;
    engine.addPendingOp(itm);
  }

  initializeContext(parent) {
    // in QtQml.QtObject
  }

  createChild() {

    const childObj = Object.create(this);
    childObj.$properties = Object.create(this.$properties);
    childObj.$properties_noalias = Object.create(this.$properties_noalias);
    // see properties.createProperty /
    // namespace setting in QMLBinding with(...) -s / QObject.$noalias.createChild / components.js.createChild :
    // noalias only matters in context in this object's alias bindings to prevent it to access
    // only this object' aliases : not the parent (or inherited/supertype) aliases (at least in my interpretation).
    childObj.$noalias = Object.create(this.$noalias);
    childObj.$signals = Object.create(this.$signals);

    this.$base.$leaf = childObj;

    return childObj;
  }

  static createAttachmentChild(attObj, parent) {
    const childObj = Object.create(attObj);
    childObj.parent = parent;
    if (attObj.$properties) childObj.$properties = Object.create(attObj.$properties);
    if (attObj.$signals) childObj.$signals = Object.create(attObj.$signals);

    attObj.$base.$leaf = childObj;

    return childObj;
  }

  parentCreatedBy(component) {
    var result;
    if (this.$component === component) {
      result = this;
    } else if (__proto__.parentFor) {
      result = __proto__.parentFor(component);
    } else {
      result = null;
    }
    return result;
  }

  static $delete() {
    try {
      if (this.$leaf.$attachedComponent) {
        if (!(this instanceof QObject)) {
          throw new AssertionError("$delete non-QObject : " + this);
        }

        for (var obj = this.$leaf; obj !== obj.constructor.prototype; obj=obj.__proto__) {
          if (obj.hasOwnProperty("$attachedComponent")) {
            obj.$attachedComponent.destruction();
          }
        }
      }
    } catch (err) {
      console.error("$delete error : ", this, err);
    }

    try {
      while (this.$tidyupList.length > 0) {
        const item = this.$tidyupList[0];
        if (item.destroy) {
          // It's a QObject
          QObject.$delete.call(item);
        } else {
          // It must be a signal
          item.disconnect(this);
        }
      }

    } catch (err) {
      console.error("$delete error : ", this, err);
    }

    try {
      for (const i in this.$properties) {
        const prop = this.$properties[i];
        while (prop.$tidyupList.length > 0) {
          prop.$tidyupList[0].disconnect(prop);
        }
      }
    } catch (err) {
      console.error("$delete error : ", this, err);
    }

    try {

      if (this.$parent && this.$parent.$tidyupList) {
        const index = this.$parent.$tidyupList.indexOf(this);
        this.$parent.$tidyupList.splice(index, 1);
      }
    } catch (err) {
      console.error("$delete error : ", this, err);
    }

    try {

      this.$base.$isDeleted = true;
      // must do this:
      // 1) parent will be notified and erase object from it's children.
      // 2) DOM node will be removed.
      this.container = undefined;

      // Disconnect any slots connected to any of our signals. Do this after
      // clearing the parent, as that relies on parentChanged being handled.
      for (const i in this.$signals) {
        this.$signals[i].disconnect();
      }
    } catch (err) {
      console.error("$delete error : ", this, err);
    }

    try {

      const engine = this.$engine;
      // Remove start/stop/ticker entry from engine
      engine.$removeStart(this);
      engine.$removeStop(this);
      engine.$removeTicker(this);
    } catch (err) {
      console.error("$delete error : ", this, err);
    }
  }

  // must have a `destroy` method
  // http://doc.qt.io/qt-5/qtqml-javascript-dynamicobjectcreation.html
  destroy() {
    QObject.pendingComplete(this, true);
    const engine = this.$engine;
    if (!(engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
      // We don't call those on first creation, as they will be called
      // by the regular creation-procedures at the right time.
      engine.processPendingOperations();
    }
  }

  toString(detail) {
    var tos =
      (this.hasOwnProperty("$info")? this.$info :
          (this.$info?this.$info:(this.$leaf.$info?"(l)"+this.$leaf.$info:(this.$cinfo?this.$cinfo:"")))+"("+this.constructor.name+")") +
        (this.id?":"+this.id:(this.$leaf.id?":(l)"+this.$leaf.id:""))+
        (this.$leaf===this?"($l)":"")+
        (detail?":"+this.$objectId:"");
    return tos;
  }
}

QmlWeb.QObject = QObject;
