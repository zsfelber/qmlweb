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

  treeBindTo(that, tbflags = QmlWeb.TBall, suffix, path, dump, isfirstsup) {
    if (!suffix) suffix = "Model";
    var sr = new RegExp("(.*)"+suffix+"$");
    const top = !path;
    if (!path) {
      path = [];
      dump = [];
    }

    try {
      if (isfirstsup) {
        path.push(path[path.length-1]===this.id ? "-s->" : "-s->"+this.id);
      } else {
        path.push(this.id);
      }

      const n1 = this+" "+this.id;
      const n2 = that+" "+that.id;


      if (this.id !== that.id+suffix){
        if (this.id === that.id){
          if (this.id) {
            (dump[path] = {n1, info:"<-id:match->", n2});
          } else {
            (dump[path+" ?"] = {n1, info:"<-id:null->", n2});
          }
        } else {
          (dump[path+" ?"] = {n1, info:"<-id:!match!->", n2});
        }
      } else {
        (dump[path] = {n1,info:"<-id:ok->", n2});
      }

      if (this.bindTo) {
        this.bindTo(that);
        (dump[path+".b"] = {n1,info:"<-bound:ok->", n2});
      } else {
        (dump["X "+path+".b"] = {n1,info:"<-!bindTo->", n2});
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

          var thisval = this.$context.$elements[thiselem];
          var thatval = that.$context.$elements[thatelem];
          const n1val = ""+thisval+" "+thiselem;
          const n2val = ""+thatval+" "+thatelem;
          if (!thisval || !thatval) {
            (dump["X "+path+"."+thiselem] = {n1val, info:"<-null->", n2val});
          } else if (thisval === this || thatval === that) {
            (dump["X "+path+"."+thiselem] = {n1val, info:"<-this->", n2val});
          } else {
            // This flag serves to prevent duplications, all child elements are also in this.$context.$elements :
            thisval.treeBindTo(thatval, tbflags | QmlWeb._TBthiselems, suffix, path, dump);
          }
        }
      }

      if (tbflags & QmlWeb.TBproperties) {
        var thisprop = this.$properties[this.id+suffix];

        if (thisprop) {
          (dump[path+".m"] = {n1val, info:"<-Model:ok->", n2val});
          thisprop.readOnly = true;
          thisprop.set(that, QmlWeb.QMLProperty.ReasonInitPrivileged);
        } else {
          (dump["X "+path+".m"] = {n1val, info:"<-!ModelProp->", n2val});
        }
      }

      var pthis = this.__proto__;
      var pthat = that.__proto__;
      const n1val = ""+pthis+(pthis?" "+pthis.id:"");
      const n2val = ""+pthat+(pthat?" "+pthat.id:"");
      if (!pthis || !pthat) {
        (dump["X "+path+".-s->"] = {n1val, info:"<-no super->", n2val});
      } else if (!pthis.treeBindTo && !pthat.treeBindTo) {
        (dump["X "+path+".-s->"] = {n1val, info:"<-bad super->", n2val});
      } else if (!pthis.id && !pthat.id) {
        (dump["X "+path+".-s->"] = {n1val, info:"<-no super id->", n2val});
      } else {
        pthis.treeBindTo(pthat, tbflags & ~QmlWeb._TBthiselems, suffix, path, dump, tbflags & QmlWeb._TBthiselems);
      }

      path.pop();

      return true;
    } finally {
      if (top) {
        console.log("treeBindTo : ", dump);
      }
    }
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
QmlWeb.TBall = 3;
QmlWeb._TBthiselems = 4;
