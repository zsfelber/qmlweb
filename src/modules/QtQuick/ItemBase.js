class ItemBase extends QtObject {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, ItemBase);

    this.hoveredChanged.connect(this, this.$onHoveredChanged);
  }

  $elementAdd(element, flags, outallchanges) {
    const elemFlag = flags & QmlWeb.QMLComponentFlags.Element;

    if (element) {
      if (elemFlag) {
        super.$elementAdd(element, flags, outallchanges);

        if (element instanceof ItemBase) {
          element.$properties.$childIndex.set(this.$properties.children.value.length, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
          this.children.push(element);
          if (outallchanges)
            outallchanges.children = (outallchanges.children || 0) + 1;
          else
            this.childrenChanged();
        } else {
          element.$properties.$resourceIndex.set(this.$properties.resources.value.length, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
          this.resources.push(element);
          if (outallchanges)
            outallchanges.resources = (outallchanges.resources || 0) + 1;
          else
            this.resourcesChanged();
        }
      }
      if (this.dom) {
        if (element.dom) {
          this.dom.appendChild(element.dom);
        //} else {
        //  QmlWeb.warn("Child has no 'dom':"+element);
        }
      }
    }
  }

  $elementRemove(element, flags, outallchanges) {
    const elemFlag = flags & QmlWeb.QMLComponentFlags.Element;

    if (elemFlag) {
      super.$elementRemove(element, flags, outallchanges);

      if (element instanceof ItemBase) {
        this.children.splice(element.$childIndex, 1);
        for (var i = element.$childIndex; i < this.children.length; ++i) {
          this.children[i].$properties.$childIndex.set(i, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
        }
        if (outallchanges)
          outallchanges.children = (outallchanges.children || 0) + 1;
        else
          this.childrenChanged();
      } else {
        this.resources.splice(element.$resourceIndex, 1);
        for (var i = element.$resourceIndex; i < this.resources.length; ++i) {
          this.resources[i].$properties.$resourceIndex.set(i, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
        }
        if (outallchanges)
          outallchanges.resources = (outallchanges.resources || 0) + 1;
        else
          this.resourcesChanged();
      }
    }
    if (this.dom) {
      if (element.dom) {
        this.dom.removeChild(element.dom);
      //} else {
      //  QmlWeb.warn("Child has no 'dom':"+element);
      }
    }
  }

  $onHoveredChanged() {
    if (this.parent) {
      if (this.hovered) {
        if (this.hoverChildIndex)
          this.parent.$properties.hoverIndex.set(this.hoverChildIndex, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
        else
          this.parent.$properties.hoverIndex.set(this.$childIndex, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
      } else {
        this.parent.$properties.hoverIndex.set(-1, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
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
      if (!(tbflags & (QmlWeb._TBthiselems|QmlWeb.TBtop))) {
        path.push(path[path.length-1]===this.id ? "-s->" : "-s->"+this.id);
      } else {
        path.push(this.id);
      }

      var inf;
      let bindingbottom;
      try {
        if (!that) {
          (dump["X "+path] = dump[(++dumplen[0])+" X "+path] = inf = {info:"  no that->"});
          return false;
        }
        if (!this.$properties || !that.$properties) {
          (dump["X "+path] = dump[(++dumplen[0])+" X "+path] = inf = {info:"<-bad type/$prop->"});
          return false;
        }
        if (!this.treeBindTo || !that.treeBindTo) {
          (dump["X "+path] = dump[(++dumplen[0])+" X "+path] = inf = {info:"<-bad type/bindTo->"});
          return false;
        }


        bindingbottom = this.$properties.hasOwnProperty("bindingbottom") ? this.bindingbottom : false;

        if (this.id !== that.id+suffix){
          if (this.id === that.id){
            if (this.id) {
              (dump[path] = dump[(++dumplen[0])+" "+path] = inf = {info:"<-id:match->"});
            } else {
              (dump[path+" ?"] = dump[(++dumplen[0])+" "+path+" ?"] = inf = {info:"<-id:null->"});
            }
          } else {
            (dump[path+" ?"] = dump[(++dumplen[0])+" "+path+" ?"] = inf = {info:"<-id:!match!->"});
          }
        } else {
          (dump[path] = dump[(++dumplen[0])+" "+path] = inf = {info:"<-id:ok->"});
        }
      } finally {
        if (inf) {
          inf["this:"+this] = this;
          inf["that:"+that] = that;
        }
      }

      if (tbflags & QmlWeb.TBtop) {
        if (this.bindTo) {
          try {
            this.bindTo(that);
            (dump[path+".b"] = dump[(++dumplen[0])+" "+path+".b"] = {info:"<-bound:ok->"});
          } catch (err) {
            (dump["X "+path+".b"] = dump[(++dumplen[0])+" X "+path+".b"] = {info:"<-bindTo!err->", err});
          }

        } else {
          (dump["X "+path+".b"] = dump[(++dumplen[0])+" X "+path+".b"] = {info:"<-!bindTo->"});
        }
      } else {
        (dump["X "+path+".b"] = dump[(++dumplen[0])+" X "+path+".b"] = {info:"<-!top->"});
      }

      if (tbflags & QmlWeb.TBelements && that.$context && !(tbflags & QmlWeb._TBthiselems)) {
        for (var thiselem in this.$context.$pageElements) {
          var m = sr.exec(thiselem);
          var thatelem;
          if (m) {
            thatelem = m[1];
          } else {
            thatelem = thiselem;
          }

          var thisval = this.$context.$pageElements[thiselem];
          var thatval = that.$context.$pageElements[thatelem];

          inf = null;
          if (thisval === this || thatval === that) {
            (dump["X "+path+"."+thiselem] = dump[(++dumplen[0])+" X "+path+"."+thiselem] = inf = {info:"<-this->"});
          } else if (!thisval.treeBindTo) {
            (dump["X "+path+"."+thiselem] = dump[(++dumplen[0])+" X "+path+"."+thiselem] = inf = {info:"<-!treeBindTo"});
          }
          if (inf) {
            inf["thisval:"+thisval] = thisval;
            inf["thatval:"+thatval] = thatval;
          } else {
            // This flag serves to prevent duplications, all child elements are also in this.$context.$pageElements :
            thisval.treeBindTo(thatval, tbflags | QmlWeb.TBtop | QmlWeb._TBthiselems, suffix, path, dump, dumplen);
          }
        }
      }

      if (tbflags & QmlWeb.TBproperties) {
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
            inf = {info:"<-!super!Model->"};
            inf["thatprop:"+thatprop]=thatprop;
            (dump["X "+path+".m"] = dump[(++dumplen[0])+" X "+path+".m"] = inf);
            tpdone = 1;
          }
        }

        if (!tpdone) {
          if (thatprop) {
            inf = {info:"<-Model:ok->"};
            inf["thatprop:"+thatprop]=thatprop;
            (dump[path+".m"] = dump[(++dumplen[0])+" "+path+".m"] = inf);
            thatprop.readOnly = true;
            thatprop.set(this, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
          } else {
            (dump["X "+path+".m"] = dump[(++dumplen[0])+" X "+path+".m"] = {info:"<-!ModelProp->"});
          }
        }
      }

      if (!bindingbottom) {
        var pthis = this.__proto__;
        var pthat = that.__proto__;
        const n1val = ""+pthis+(pthis?" "+pthis.id:"");
        const n2val = ""+pthat+(pthat?" "+pthat.id:"");
        if (!pthis) {
          (dump["X "+path+".-s->"] = dump[(++dumplen[0])+" X "+path+".-s->"] = {n1val, info:"<-no super->", n2val});
        } else {
          pthis.treeBindTo(pthat, tbflags & ~(QmlWeb._TBthiselems|QmlWeb.TBtop), suffix, path, dump, dumplen);
        }
      } else {
        (dump["X "+path+".-s->"] = dump[(++dumplen[0])+" X "+path+".-s->"] = {info:"<-bottom->"});
      }


      return true;
    } finally {
      if (top) {
        QmlWeb.log("treeBindTo : ", dump);
      }
      path.pop();
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
QmlWeb.TBtop = 4;
QmlWeb.TBall = 7;
QmlWeb._TBthiselems = 8;
