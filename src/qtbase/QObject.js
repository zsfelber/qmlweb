let objectIds = 0;

class QObject {
  constructor(parent, meta) {
    this.$parent = parent;
    this.$base = this;
    if (meta) {
      this.$meta = meta;

      if (meta.attached) {
        QObject.attach(parent, this, meta.$info);
      } else if (meta.$component) {
        // NOTE context bindings of object prototype chain :
        // QObject.context : UserAbstractItem.context
        // QtQml.QtObject.context : UserAbstractItem.context
        // QtQuick.Item.context : UserAbstractItem.context
        // UserAbstractItem.context : UserAbstractItem.context
        // UserItem.context : UserItem.context
        // ...
        // UserLeafItem.context : $leaf.context

        this.$component = meta.$component;
      }
    }


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

  initializeContext(parent) {
    // in QtQml.QtObject
  }

  createChild() {

    const childObj = Object.create(this);
    childObj.$base = this.$base;
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

  $delete() {
    if (this.$attachedComponent) {
      this.$attachedComponent.destruction();
    }

    while (this.$tidyupList.length > 0) {
      const item = this.$tidyupList[0];
      if (item.$delete) {
        // It's a QObject
        item.$delete();
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

    // must do this:
    // 1) parent will be notified and erase object from it's children.
    // 2) DOM node will be removed.
    this.parent = undefined;

    // Disconnect any slots connected to any of our signals. Do this after
    // clearing the parent, as that relies on parentChanged being handled.
    for (const i in this.$signals) {
      this.$signals[i].disconnect();
    }
  }

  // must have a `destroy` method
  // http://doc.qt.io/qt-5/qtqml-javascript-dynamicobjectcreation.html
  destroy() {
    this.$delete();
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
