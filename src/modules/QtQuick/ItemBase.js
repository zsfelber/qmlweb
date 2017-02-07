class ItemBase {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);

    this.elementAdd.connect(this, this.$onElementAdd);
    this.elementRemove.connect(this, this.$onElementRemove);
  }

  $onElementAdd(element) {
    var leafElement = element.$leaf;

    if (this.$defaultProperty) {
      var prop = this.$properties[this.$defaultProperty];
      if (prop.type === "list") {
        var parr = prop.get();
        element.$properties.$index.set(parr.length, QmlWeb.QMLProperty.ReasonInitPrivileged);
        parr.push(leafElement);
      } else {
        element.$properties.$index.set(0, QmlWeb.QMLProperty.ReasonInitPrivileged);
        prop.set(leafElement);
      }
    } else {
      throw new Error("ItemBase.$onElementAdd : No default property : "+this+"/"+this.$leaf);
    }

    if (leafElement instanceof ItemBase) {
      element.$properties.$childIndex.set(this.children.length, QmlWeb.QMLProperty.ReasonInitPrivileged);
      this.children.push(leafElement);
      this.childrenChanged();
    } else {
      element.$properties.$resourceIndex.set(this.resources.length, QmlWeb.QMLProperty.ReasonInitPrivileged);
      this.resources.push(leafElement);
      this.resourcesChanged();
    }
    if (this.dom) this.dom.appendChild(element.dom);
  }

  $onElementRemove(element) {
    var leafElement = element.$leaf;

    if (this.$defaultProperty) {
      var prop = this.$properties[this.$defaultProperty];
      if (prop.type === "list") {
        var parr = prop.get();
        parr.splice(element.$index, 1);
        for (var i = element.$index; i < parr.length; ++i) {
          parr[i].$properties.$index.set(i, QmlWeb.QMLProperty.ReasonInitPrivileged);
        }
      } else {
        prop.set(null);
      }
    } else {
      throw new Error("ItemBase.$onElementRemove : No default property : "+this+"/"+this.$leaf);
    }

    if (leafElement instanceof ItemBase) {
      this.children.splice(element.$childIndex, 1);
      for (var i = element.$childIndex; i < this.children.length; ++i) {
        this.children[i].$properties.$childIndex.set(i, QmlWeb.QMLProperty.ReasonInitPrivileged);
      }
      this.childrenChanged();
    } else {
      this.resources.splice(element.$resourceIndex, 1);
      for (var i = element.$resourceIndex; i < this.resources.length; ++i) {
        this.resources[i].$properties.$resourceIndex.set(i, QmlWeb.QMLProperty.ReasonInitPrivileged);
      }
      this.resourcesChanged();
    }
    if (this.dom) this.dom.appendChild(element.dom);
  }

  bindTo(that) {
    // does nothing by default, see GzItem
  }

  treeBindTo(that, tbflags = QmlWeb.TBelements, suffix, path) {
    if (!suffix) suffix = "Model";
    var sr = new RegExp("("+suffix+")$");
    if (!path) path = [];

    if (this.id !== that.id+suffix){
      if (this.id === that.id){
        if (this.id) {
          console.warn("treeBindTo  id pair anti-pattern-matches : "+path+" super:  model:"+this+" control:"+that);
        } else {
          console.warn("treeBindTo  no ids : "+path+" super:  model:"+this+" control:"+that);
        }
      } else {
        console.warn("treeBindTo  id pair doesn't match : "+path+" super:  model:"+this+" control:"+that);
      }
    }
    if (this.$class !== that.$class+suffix) {
      if (this.$class === that.$class) {
        if (this.$class) {
          console.warn("treeBindTo  superclass pair anti-pattern-matches : "+path+" super:  model:"+this+" control:"+that);
        } else {
          console.warn("treeBindTo  missing $class info : "+path+" super:  model:"+this+" control:"+that);
          return false;
        }
      } else {
        console.warn("treeBindTo  superclass pair doesn't match : "+path+" super:  model:"+this+" control:"+that);
      }
    }

    path.push("S"+this.id);
    console.warn("treeBindTo  "+path);

    if (tbflags & QmlWeb.TBelements) {
      for (var thiselem in this.$elements) {
        var m = sr.exec(thiselem);
        var thatelem;
        if (m) {
          thatelem = m[1];
        } else {
          thatelem = thiselem;
          console.warn("treeBindTo  Anti pattern element name : "+path+" . "+thatelem);
        }

        path.push(thatelem);

        var thisval = this.$elements[thiselem];
        var thatval = that.$elements[thatelem];
        if (!thisval || !thatval) {
          console.warn("treeBindTo  element->null : "+path+"   model:"+this+" . "+thiselem+":"+thisval+"   control:"+that+" . "+thatelem+":"+thatval);
        } else {
          thisval.treeBindTo(thatval, tbflags, suffix, path);
        }

        path.pop();
      }
    }

    if (tbflags & QmlWeb.TBproperties) {
      for (var thisprop in this.$properties) {
        var m = sr.exec(thisprop);
        var thatprop;
        if (m) {
          thatprop = m[1];
        } else {
          thatprop = thisprop;
          console.warn("treeBindTo  Anti pattern property name : "+path+" . "+thatprop);
        }

        path.push(thatprop);

        var thisval = this.$properties[thisprop];
        var thatval = that.$properties[thatprop];
        if (!thisval || !thatval || !thisval.val || !thatval.val) {
          console.warn("treeBindTo  property->null : "+path+"   model:"+thisprop+":"+thisval+"   control:"+thatprop+":"+thatval);
        } else {
          thisval.val.treeBindTo(thatval.val, tbflags, suffix, path);
        }

        path.pop();
      }
    }

    path.pop();

    var pthis = this.__proto__;
    var pthat = that.__proto__;
    if (pthis && pthat && pthis.treeBindTo && pthat.treeBindTo) {
      if (pthis.constructor !== ItemBase) {
        pthis.treeBindTo(pthat, tbflags, suffix, path);
      }
    } else if (pthis instanceof ItemBase) {
      console.warn("treeBindTo  ?? bad super  : "+pthis+"   "+pthat);
    }

    return true;
  }

};

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ItemBase",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    parent: { type: "alias", path:["container"], overrideType: "ItemBase" },
    data: { type: "list", pendingInit:true, readOnly:true },
    children: { type: "list", pendingInit:true, readOnly:true },
    resources: { type: "list", pendingInit:true, readOnly:true },
    $childIndex: { type: "int", pendingInit:true, readOnly:true },
  },
  defaultProperty: "data",
  constructor: ItemBase
});

QmlWeb.ItemBase = ItemBase;

QmlWeb.TBproperties = 1;
QmlWeb.TBelements = 2;
