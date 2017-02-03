class ItemBase {
  constructor(meta) {
    QmlWeb.superAndInitMeta(this, meta);

    this.dataChanged.connect(this, this.$onDataChanged);

    this.elementAdd.connect(this, this.$onElementAdd);
    this.elementRemove.connect(this, this.$onElementRemove);
  }
  $onElementAdd(element) {
    var leafElement = element.$base.$leaf;
    element.$index = this.data.length;
    this.data.push(leafElement);
    if (leafElement instanceof ItemBase) {
      element.$childIndex = this.children.length;
      this.children.push(leafElement);
      this.childrenChanged();
    } else {
      element.$resourceIndex = this.resources.length;
      this.resources.push(leafElement);
      this.resourcesChanged();
    }
    if (this.dom) this.dom.appendChild(element.dom);
  }

  $onElementRemove(element) {
    var leafElement = element.$base.$leaf;

    this.data.splice(element.$index, 1);
    for (var i = element.$index; i < this.data.length; ++i) {
      this.data[i].$index=i;
    }
    if (leafElement instanceof ItemBase) {
      this.children.splice(element.$childIndex, 1);
      for (var i = element.$childIndex; i < this.children.length; ++i) {
        this.children[i].$childIndex=i;
      }
      this.childrenChanged();
    } else {
      this.resources.splice(element.$resourceIndex, 1);
      for (var i = element.$resourceIndex; i < this.resources.length; ++i) {
        this.resources[i].$resourceIndex=i;
      }
      this.resourcesChanged();
    }
    if (this.dom) this.dom.appendChild(element.dom);
  }
  $onDataChanged(newData) {
    if (this.$defaultProperty==="data") {

       for (const i in newData) {
         const child = newData[i];
         if (child instanceof ItemBase) {
           child.parent = this; // This will also add it to children.
         }
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
    data: { type: "list", bound:true },
    children: { type: "list", bound:true },
    resources: { type: "list", bound:true },
    $childIndex: { type: "int", bound:true },
  },
  defaultProperty: "data",
  constructor: ItemBase
});

QmlWeb.ItemBase = ItemBase;

