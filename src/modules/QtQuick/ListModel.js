const omittedRoles = {"index":1, "container":1, "parent":1, "$index":1, "$resourceIndex":1, "$childIndex":1};

class ListModel extends QtObject {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, ListModel);

    this.$firstItem = true;
    this.$itemsChanged.connect(this, this.$on$itemsChanged);
    this.$model = new QmlWeb.JSItemModel();
    this.$model.data = (index, role) => this.$items[index][role];
    this.$model.rowCount = () => this.$items.length;
    this.$model.rowsInserted.connect(this, this.$_onRowsInserted);
    this.$model.modelReset.connect(this, this.$_onModelReset);
  }
  $on$itemsChanged(newVal) {
    this.count = this.$items.length;
    if (this.$firstItem && newVal.length > 0) {
      this.$firstItem = false;
      this.extractRoles(newVal[0]);
    }
  }
  $_onRowsInserted(startIndex, endIndex) {
    this.count = this.$items.length;
    if (this.$firstItem) {
      for (let index = startIndex; index < endIndex; index++) {
        const item = this.$items[index];
        this.$firstItem = false;
        this.extractRoles(item);
        break;
      }
    }
  }
  $_onModelReset() {
    this.$firstItem = true;
  }

  extractRoles(dict) {
    const roleNames = [];
    if (dict instanceof ListElement) {
      dict = dict.$properties;
    }
    for (const i in dict) {
      if (!omittedRoles[i]) {
        roleNames.push(i);
      }
    }
    this.$model.setRoleNames(roleNames);
  }

  append(dict) {
    const index = this.$items.length;
    let c = 0;

    if (dict instanceof Array) {
      for (const key in dict) {
        this.$items.push(dict[key]);
        c++;
      }
    } else {
      this.$items.push(dict);
      c = 1;
    }

    //this.$itemsChanged(this.$items);
    this.$model.rowsInserted(index, index + c);
  }
  clear() {
    this.$items.length = 0;
    this.count = 0;
    this.$model.modelReset();
  }
  get(index) {
    return this.$items[index];
  }
  insert(index, dict) {
    this.$items.splice(index, 0, dict);
    //this.$itemsChanged(this.$items);
    this.$model.rowsInserted(index, index + 1);
  }
  move(from, to, n) {
    const vals = this.$items.splice(from, n);
    for (let i = 0; i < vals.length; i++) {
      this.$items.splice(to + i, 0, vals[i]);
    }
    this.$model.rowsMoved(from, from + n, to);
  }
  remove(index) {
    this.$items.splice(index, 1);
    this.$model.rowsRemoved(index, index + 1);
    this.count = this.$items.length;
  }
  set(index, dict) {
    this.$items[index] = dict;
    this.$model.dataChanged(index, index);
  }
  setProperty(index, property, value) {
    this.$items[index][property] = value;
    this.$model.dataChanged(index, index);
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "ListModel",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    count: "int",
    $items: "list"
  },
  defaultProperty: "$items",
  constructor:ListModel
});

QmlWeb.ListModel = ListModel;
