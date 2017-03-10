let objectIds = 0;

class QObject {
  constructor(parent, meta) {
    this.$parent = parent;
    this.$base = this;

    if (parent && parent.$tidyupList) {
      parent.$tidyupList.push(this);
    }

    // List of things to tidy up when deleting this object.
    // TODO use hash !
    this.$tidyupList = [];

    this.$properties = {};
    this.$properties_noalias = {};
    this.$noalias = {};
    this.$signals = {};
    this.$leaf = this;

    this.$objectId = ++objectIds;

    if (meta) {
      this.$meta = meta;

      if (meta.attached) {
        QObject.attach(parent, this, meta.$info);
      }
    }
  }

  static attach(parent, child, info) {
    if (!parent) {
      throw new Error("Object attached to null : "+child);
    }
    child.$isAttachedObj = true;
    child.$attached_as = info;

    // context for attached properties like "anchors" and so
    // see also $ownerObject
    QmlWeb.setupGetter(child, "$component", ()=>parent.$component, child);
    QmlWeb.setupGetter(child, "$context", ()=>parent.$context, child);
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
      fun:(destruction ? QMLComponent.complete : QObject.$delete),
      thisObj:item,
      info: (destruction?"Pending component.destruction (waiting to destroy) : ":
                         "Pending component.complete (waiting to initialization) : ")+item.$context,
      opId
    };

    QmlWeb.engine.addPendingOp(itm);
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

    while (this.$tidyupList.length > 0) {
      const item = this.$tidyupList[0];
      if (item.$delete) {
        // It's a QObject
        QObject.$delete.call(item);
      } else {
        // It must be a signal
        item.disconnect(this);
      }
    }

    for (const i in this.$properties) {
      const prop = this.$properties[i];
      while (prop.$tidyupList.length > 0) {
        prop.$tidyupList[0].disconnect(prop);
      }
    }

    if (this.$parent && this.$parent.$tidyupList) {
      const index = this.$parent.$tidyupList.indexOf(this);
      this.$parent.$tidyupList.splice(index, 1);
    }

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

    // Remove start/stop/ticker entry from engine
    QmlWeb.engine.$removeStart(this);
    QmlWeb.engine.$removeStop(this);
    QmlWeb.engine.$removeTicker(this);
  }

  // must have a `destroy` method
  // http://doc.qt.io/qt-5/qtqml-javascript-dynamicobjectcreation.html
  destroy() {
    QObject.pendingComplete(this, true);
  }

  toString(detail) {
    var tos =
      (typeof this.$info==="string"? this.$info : this.constructor.name) +
        (this.$leaf?this.$leaf.id?":"+this.$leaf.id:"":
                    (this.id?":"+this.id:""))+
        (detail?":"+this.$objectId:"");
    return tos;
  }
}

QmlWeb.QObject = QObject;
