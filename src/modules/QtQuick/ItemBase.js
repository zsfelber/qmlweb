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
    var sr = new RegExp("(.*)"+suffix+"$");
    if (!path) path = [];

    path.push("S"+this.id);

    const n1 = this+":"+this.id;
    const n2 = that+":"+that.id;


    if (this.id !== that.id+suffix){
      if (this.id === that.id){
        if (this.id) {
          console.warn("treeBindTo  "+path+"  "+n1+"  <-id:match->  "+n2);
        } else {
          console.warn("treeBindTo  "+path+"  "+n1+"  <-id:null->  "+n2);
        }
      } else {
        console.warn("treeBindTo  "+path+"  "+n1+"  <-id:!match!->  "+n2);
      }
    } else {
      console.warn("treeBindTo  "+path+"      "+n1+"  vs  "+n2);
    }


    if (tbflags & QmlWeb.TBelements && that.$context && !(tbflags & QmlWeb._TBthiselems)) {
      for (var thiselem in this.$context.$elements) {
        var m = sr.exec(thiselem);
        var thatelem;
        if (m) {
          thatelem = m[1];
        } else {
          thatelem = thiselem;
        }

        path.push(thatelem);

        var thisval = this.$context.$elements[thiselem];
        var thatval = that.$context.$elements[thatelem];
        const n1val = ""+thisval+":"+thiselem;
        const n2val = ""+thatval+":"+thatelem;
        if (!thisval || !thatval) {
          console.warn("treeBindTo  "+path+"  "+n1val+"  <-null->  "+n2val);
        } else if (thisval === this || thatval === that) {
          console.warn("treeBindTo  "+path+"  "+n1val+"  <-this->  "+n2val);
        } else {
          // This flag serves to prevent duplications, all child elements are also in this.$context.$elements :
          thisval.treeBindTo(thatval, tbflags | QmlWeb._TBthiselems, suffix, path);
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
        }

        path.push(thatprop);

        var thisval = this.$properties?this.$properties[thisprop]:null;
        var thatval = that.$properties?that.$properties[thatprop]:null;
        if (!thisval || !thatval || !thisval.val || !thatval.val) {
          const n1val = ""+thisval+(thisval&&thisval.val?":"+thisval.id:"");
          const n2val = ""+thatval+(thatval&&thatval.val?":"+thatval.id:"");
          console.warn("treeBindTo  "+path+"  "+n1val+"  <-null->  "+n2val);
        } else {
          thisval.val.treeBindTo(thatval.val, tbflags & ~QmlWeb._TBthiselems, suffix, path);
        }

        path.pop();
      }
    }

    path.pop();

    var pthis = this.__proto__;
    var pthat = that.__proto__;
    const n1val = ""+pthis+(pthis?":"+pthis.id:"");
    const n2val = ""+pthat+(pthat?":"+pthat.id:"");
    if (!pthis || !pthat) {
      console.warn("treeBindTo  "+path+"  "+n1val+"  <-no super->  "+n2val);
    } else if (!pthis.treeBindTo && !pthat.treeBindTo) {
      console.warn("treeBindTo  "+path+"  "+n1val+"  <-bad super->  "+n2val);
    } else if (!pthis.id && !pthat.id) {
      console.warn("treeBindTo  "+path+"  "+n1val+"  <-no super id->  "+n2val);
    } else {
      pthis.treeBindTo(pthat, tbflags & ~QmlWeb._TBthiselems, suffix, path);
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
QmlWeb._TBthiselems = 4;
