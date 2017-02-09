class ItemBase {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);

    this.elementAdd.connect(this, this.$onElementAdd);
    this.elementRemove.connect(this, this.$onElementRemove);
    this.hoveredChanged.connect(this, this.$onHoveredChanged);
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

  $onHoveredChanged() {
    if (this.parent) {
      if (this.hovered) {
        if (this.hoverChildIndex)
          this.parent.$properties.hoverIndex.set(this.hoverChildIndex, QmlWeb.QMLProperty.ReasonInitPrivileged);
        else
          this.parent.$properties.hoverIndex.set(this.$childIndex, QmlWeb.QMLProperty.ReasonInitPrivileged);
      } else {
        this.parent.$properties.hoverIndex.set(-1, QmlWeb.QMLProperty.ReasonInitPrivileged);
      }
    }
  }

  treeBindTo(that, tbflags = QmlWeb.TBall, suffix, path, dump, dumplen) {
    if (!suffix) suffix = "Model";
    var sr = new RegExp("(.*)"+suffix+"$");
    const top = !path;
    if (!path) {
      path = [];
      dump = {};
      dumplen = [0];
    }

    try {
      if (!(tbflags & QmlWeb._TBthiselems)) {
        path.push(path[path.length-1]===this.id ? "-s->" : "-s->"+this.id);
      } else {
        path.push(this.id);
      }

      const n1 = this+" "+this.id;
      const n2 = that+" "+that.id;

      const bindingbottom = this.$properties.hasOwnProperty("bindingbottom") ? this.bindingbottom : false;

      if (this.id !== that.id+suffix){
        if (this.id === that.id){
          if (this.id) {
            (dump[path] = dump[(++dumplen[0])+" "+path] = {n1, info:"<-id:match->", n2, that, this});
          } else {
            (dump[path+" ?"] = dump[(++dumplen[0])+" "+path+" ?"] = {n1, info:"<-id:null->", n2, that, this});
          }
        } else {
          (dump[path+" ?"] = dump[(++dumplen[0])+" "+path+" ?"] = {n1, info:"<-id:!match!->", n2, that, this});
        }
      } else {
        (dump[path] = dump[(++dumplen[0])+" "+path] = {n1,info:"<-id:ok->", n2, that, this});
      }

      if (bindingbottom) {
        if (this.bindTo) {
          this.bindTo(that);
          (dump[path+".b"] = dump[(++dumplen[0])+" "+path+".b"] = {info:"<-bound:ok->"});
        } else {
          (dump["X "+path+".b"] = dump[(++dumplen[0])+" X "+path+".b"] = {info:"<-!bindTo->"});
        }
      } else {
        (dump["X "+path+".b"] = dump[(++dumplen[0])+" X "+path+".b"] = {info:"<-!bottom->"});
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
          if (thisval === this || thatval === that) {
            (dump["X "+path+"."+thiselem] = dump[(++dumplen[0])+" X "+path+"."+thiselem] = {n1val, info:"<-this->", n2val});
          } else if (!thisval || !thatval) {
            (dump["X "+path+"."+thiselem] = dump[(++dumplen[0])+" X "+path+"."+thiselem] = {n1val, info:"<-null->", n2val});
          } else {
            // This flag serves to prevent duplications, all child elements are also in this.$context.$elements :
            thisval.treeBindTo(thatval, tbflags | QmlWeb._TBthiselems, suffix, path, dump, dumplen);
          }
        }
      }

      if (tbflags & QmlWeb.TBproperties) {
        if ((tbflags & QmlWeb.TBproperties) && that.$properties) {
          let tpdone = 0;
          let thatprop;
          if (this.modelProperty) {
            thatprop = that.$properties[this.modelProperty];
          } else {
            if (that.id) {
              thatprop = that.$properties[that.id+suffix];
            }
            if (!thatprop) {
              thatprop = that.$properties["model"];
            }
            if (!bindingbottom && thatprop && thatprop.obj !== that) {
              var inf = {info:"<-!super!Model->"};
              inf[thatprop.toString(true)]=thatprop;
              (dump["X "+path+".m"] = dump[(++dumplen[0])+" X "+path+".m"] = inf);
              tpdone = 1;
            }
          }

          if (!tpdone) {
            if (thatprop) {
              var inf = {info:"<-Model:ok->"};
              inf[thatprop.toString(true)]=thatprop;
              (dump[path+".m"] = dump[(++dumplen[0])+" "+path+".m"] = inf);
              thatprop.readOnly = true;
              thatprop.set(this, QmlWeb.QMLProperty.ReasonInitPrivileged);
            } else {
              (dump["X "+path+".m"] = dump[(++dumplen[0])+" X "+path+".m"] = {info:"<-!ModelProp->"});
            }
          }
        } else {
          (dump["X "+path+".m"] = dump[(++dumplen[0])+" X "+path+".m"] = {info:"<-!that.$prop->"});
        }
      }

      if (!this.$properties.hasOwnProperty("bindingbottom") || !this.bindingbottom) {
        var pthis = this.__proto__;
        var pthat = that.__proto__;
        const n1val = ""+pthis+(pthis?" "+pthis.id:"");
        const n2val = ""+pthat+(pthat?" "+pthat.id:"");
        if (!pthis || !pthat) {
          (dump["X "+path+".-s->"] = dump[(++dumplen[0])+" X "+path+".-s->"] = {n1val, info:"<-no super->", n2val});
        } else if (!pthis.treeBindTo && !pthat.treeBindTo) {
          (dump["X "+path+".-s->"] = dump[(++dumplen[0])+" X "+path+".-s->"] = {n1val, info:"<-bad super->", n2val});
        } else {
          pthis.treeBindTo(pthat, tbflags & ~QmlWeb._TBthiselems, suffix, path, dump, dumplen);
        }
      } else {
        (dump["X "+path+".-s->"] = dump[(++dumplen[0])+" X "+path+".-s->"] = {info:"<-bottom->"});
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
    modelProperty: { type: "string", readOnly:true },
    hovered: { type: "bool", readOnly:true },
    hoverIndex: { type: "int", readOnly:true }
  },
  defaultProperty: "data",
  constructor: ItemBase
});

QmlWeb.ItemBase = ItemBase;

QmlWeb.TBproperties = 1;
QmlWeb.TBelements = 2;
QmlWeb.TBall = 3;
QmlWeb._TBthiselems = 4;
