
const initGeomProperties = {
  "width":1, "height":1, "x":1, "y":1, "z":1, "visible":1, "clip":1
};

const otherGeometryProperties = {
  "":{"left":1, "right":1, "top":1, "bottom":1},
  "anchors":{"fill":1},
};

var transform0Style = QmlWeb.helpers.mergeObjects(QmlWeb.defaultItemStyle, {
  transform: "rotate(0deg) scale(1) translate3d(0, 0, 0px)",
  WebkitTransform: "rotate(0deg) scale(1) translate3d(0, 0, 0px)",
  MsTransform: "rotate(0deg) scale(1) translate3d(0, 0, 0px)",
  transformStyle: "preserve-3d",
  WebkitTransformStyle: "preserve-3d"
});

class Item extends ItemBase {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Item);

    if (!this.dom) { // Create a dom element for this item.
      this.dom = document.createElement(meta.tagName || "div");
      this.dom.id = this.$objectId;
    }
    this.css = QmlWeb.createStyle(this.dom.style);
    // In case the class is qualified, only use the last part for the css class
    // name.
    // const classComponent = meta.$class.split(".").pop();
    //this.dom.className = `${classComponent}${this.id ? ` ${this.id}` : ""}`;
    //this.dom.className = "qmlitem";
    this.impl = null; // Store the actually drawn element

    const engine = this.$engine;
    const createProperty = engine.createProperty;

    if (!this.$parent) {
      engine.createProperty("var", this, "activeFocus");
    }

    this.parentChanged.connect(this, this.$onParentChanged_);
    this.stateChanged.connect(this, this.$onStateChanged);
    this.visibleChanged.connect(this, this.$onVisibleChanged_);
    this.clipChanged.connect(this, this.$onClipChanged);
    this.zChanged.connect(this, this.$onZChanged);
    this.xChanged.connect(this, this.$onXChanged);
    this.yChanged.connect(this, this.$onYChanged);
    this.widthChanged.connect(this, this.$onWidthChanged_);
    this.heightChanged.connect(this, this.$onHeightChanged_);
    this.focusChanged.connect(this, this.$onFocusChanged_);

    this.widthChanged.connect(this, this.$updateHGeometry);
    this.heightChanged.connect(this, this.$updateVGeometry);
    this.implicitWidthChanged.connect(this, this.$onImplicitWidthChanged);
    this.implicitHeightChanged.connect(this, this.$onImplicitHeightChanged);

    this.$isUsingImplicitWidth = true;
    this.$isUsingImplicitHeight = true;

    //this.anchors = new QmlWeb.QObject(this, {attached:true, info:"anchors"});
    // debug:
    // if (!this.anchors) throw new AssertionError("Assertion error : attached anchors not created !")

    // childrenRect property
    //this.childrenRect = new QmlWeb.QObject(this, {attached:true, info:"childrenRect"});

    this.rotationChanged.connect(this, this.$updateTransform);
    this.scaleChanged.connect(this, this.$updateTransform);
    this.transformChanged.connect(this, this.$updateTransform);

    this.Component.completed.connect(this, this.Component$onCompleted_);
    this.opacityChanged.connect(this, this.$calculateOpacity);
    if (this.$parent) {
      this.$parent.$opacityChanged.connect(this, this.$calculateOpacity);
    }

    this.spacing = 0;
    this.$revertActions = [];
  }
  $onParentChanged_(newParent, oldParent, propName) {
    this.$updateHGeometry(newParent, oldParent, propName);
    this.$updateVGeometry(newParent, oldParent, propName);
  }
  $onStateChanged(newVal, oldVal) {
    // let oldState; // TODO: do we need oldState?
    const newState = this.states.filter(state => state.name === newVal)[0];

    const newActions = this.$revertActions.slice();

    // Get current values for revert actions
    for (const i in newActions) {
      const newAction = newActions[i];
      newAction.from = newAction.property.get();
    }
    if (newState) {
      const changes = newState.$getAllChanges();

      // Get all actions we need to do and create actions to revert them
      for (let i = 0; i < changes.length; i++) {
        this.$applyChange(newActions, changes[i]);
      }
    }

    // Set all property changes and fetch the actual values afterwards
    // The latter is needed for transitions. We need to set all properties
    // before we fetch the values because properties can be interdependent.
    for (const i in newActions) {
      const newAction = newActions[i];
      // // TODO gz obsolete : scope
      // const scope = {
      //   action: action,
      //   $object: action.target,
      //   $context: (newState ? newState.$context : action.target.$context)
      // };
      if (newAction.explicit) {
        // Replace R binding (but not RW like alias)
        if (newAction.binding) {
          newAction.property.set(newAction.binding, QMLPropertyFlags.ReasonUser, newAction.target);
        }
        newAction.property.set(newAction.value, QMLPropertyFlags.ReasonUser, newAction.target);
      } else {
        newAction.property.set(newAction.value, QMLPropertyFlags.ReasonTemporally, newAction.target);
      }
    }
    for (const i in newActions) {
      const newAction = newActions[i];
      newAction.to = newAction.property.get();
    }

    // Find the best transition to use
    let transition;
    let rating = 0;
    for (let i = 0; i < this.transitions.length; i++) {
      // We need to stop running transitions, so let's do
      // it while iterating through the transitions anyway
      this.transitions[i].$stop();
      const curTransition = this.transitions[i];
      let curRating = 0;
      if (curTransition.from === oldVal ||
          curTransition.reversible && curTransition.from === newVal) {
        curRating += 2;
      } else if (curTransition.from === "*") {
        curRating++;
      } else {
        continue;
      }
      if (curTransition.to === newVal ||
        curTransition.reversible && curTransition.to === oldVal) {
        curRating += 2;
      } else if (curTransition.to === "*") {
        curRating++;
      } else {
        continue;
      }
      if (curRating > rating) {
        rating = curRating;
        transition = curTransition;
      }
    }
    if (transition) {
      transition.$start(newActions);
    }
  }

  $applyChange(newActions, change) {
    const arrayFindIndex = QmlWeb.helpers.arrayFindIndex;
    for (let j = 0; j < change.$actions.length; j++) {
      const changeAction = change.$actions[j];

      const action = {
        target: changeAction.target,
        property: changeAction.property,
        from: changeAction.property.get(),
        to: undefined,
        explicit: change.explicit,
        value: changeAction.value
      };

      const actionIndex = arrayFindIndex(newActions, element =>
        element.property === changeAction.property
      );
      if (actionIndex !== -1) {
        newActions[actionIndex] = action;
      } else {
        newActions.push(action);
      }

      // Look for existing revert action, else create it
      const revertIndex = arrayFindIndex(this.$revertActions, element =>
        element.property === changeAction.property
      );
      if (change.restoreEntryValues) {
        if (revertIndex === -1) {
          this.$revertActions.push({
            target: changeAction.target,
            property: changeAction.property,
            from: undefined,
            to: changeAction.property.value,
            value: changeAction.property.value,
            binding: changeAction.property.binding,
            explicit: change.explicit
          });
        }
      } else if (revertIndex !== -1) {
        // We don't want to revert, so remove it
        this.$revertActions.splice(revertIndex, 1);
      }
    }
  }
  $onVisibleChanged_(newVal) {
    QmlWeb.setStyle(this.css, "visibility", newVal ? "inherit" : "hidden");
  }
  $onClipChanged(newVal) {
    QmlWeb.setStyle(this.css, "overflow", newVal ? "hidden" : "visible");
  }
  $onZChanged() {
    this.$updateTransform();
  }
  $onXChanged(newVal) {
    QmlWeb.setStyle(this.css, "left", `${newVal}px`);
    this.$updateHGeometry();
  }
  $onYChanged(newVal) {
    QmlWeb.setStyle(this.css, "top", `${newVal}px`);
    this.$updateVGeometry();
  }
  $onWidthChanged_(newVal) {
    QmlWeb.setStyle(this.css, "width", newVal ? `${newVal}px` : "auto");
  }
  $onHeightChanged_(newVal) {
    QmlWeb.setStyle(this.css, "height", newVal ? `${newVal}px` : "auto");
  }
  $onFocusChanged_(newVal) {
    if (newVal) {
      if (this.dom.firstChild) {
        this.dom.firstChild.focus();
      }
      document.qmlFocus = this;
      this.$context.activeFocus = this;
    } else if (document.qmlFocus === this) {
      document.getElementsByTagName("BODY")[0].focus();
      const engine = this.$engine;
      document.qmlFocus = engine.rootObject.$context.base;
      this.$context.activeFocus = null;
    }
  }
  setupFocusOnDom(element) {
    const updateFocus = () => {
      const hasFocus = document.activeElement === this.dom ||
                       document.activeElement === this.dom.firstChild;
      if (this.focus !== hasFocus) {
        this.focus = hasFocus;
      }
    };
    element.addEventListener("focus", updateFocus);
    element.addEventListener("blur", updateFocus);
  }
  $updateTransform() {

    const QMLTranslate = QmlWeb.getConstructor("QtQuick", "2.0", "Translate");
    const QMLRotation = QmlWeb.getConstructor("QtQuick", "2.0", "Rotation");
    const QMLScale = QmlWeb.getConstructor("QtQuick", "2.0", "Scale");
    let transform = `rotate(${this.rotation}deg) scale(${this.scale})`;
    let filter = "";
    const transformStyle = "preserve-3d";

    for (let i = 0; i < this.transform.length; i++) {
      const t = this.transform[i];
      if (t instanceof QMLRotation) {
        const ax = t.axis;
        transform += ` rotate3d(${ax.x}, ${ax.y}, ${ax.z}, ${ax.angle}deg)`;
      } else if (t instanceof QMLScale) {
        transform += ` scale(${t.xScale}, ${t.yScale})`;
      } else if (t instanceof QMLTranslate) {
        transform += ` translate(${t.x}px, ${t.y}px)`;
      } else if (typeof t.transformType !== "undefined") {
        if (t.transformType === "filter") {
          filter += ` ${t.operation}(${t.parameters})`;
        }
      } else if (typeof t === "string") {
        transform += ` ${t}`;
      }
    }
    if (typeof this.z === "number") {
      transform += ` translate3d(0, 0, ${this.z}px)`;
    }
    QmlWeb.setStyle(this.css, "transform", transform, transform0Style);
    QmlWeb.setStyle(this.css, "transformStyle", transformStyle, transform0Style);
    QmlWeb.setStyle(this.css, "WebkitTransform", transform, transform0Style); // Chrome, Safari and Opera
    QmlWeb.setStyle(this.css, "WebkitTransformStyle", transformStyle, transform0Style);
    QmlWeb.setStyle(this.css, "MsTransform", transform, transform0Style);     // IE
    QmlWeb.setStyle(this.css, "filter", filter, transform0Style);
    QmlWeb.setStyle(this.css, "WebkitFilter", filter, transform0Style); // Chrome, Safari and Opera
  }

  Component$onCompleted_() {
    this.$calculateOpacity();

    // TODO gz

    for (const p in initGeomProperties) {

      // It is possible that bindings with these names was already evaluated
      // during eval of other bindings  (in case of bound property).

      // We manage unbound properties here (those initialized with constant and not a QMLBinding)
      // 1)We mark geometry dirty here if such non-bound property has initialized.
      // 2)And we still need to prioritize##en 'width' or 'height' (see $updateH/Vgeom impl why).
      // 3)+ We call $onVisibleChanged_  $onClipChanged ... slots because "changed" was not fired,
      //   but don't call second and other slots which trigger $updateHGeometry/$updateVGeometry

      const property = this.$properties[p];

      if (!(property.updateState & QmlWeb.QMLPropertyState.Uninitialized)) {

        const changedYesButNoUpdateHVgeom = property.changed.$signal.connectedSlots[0];
        QmlWeb.Signal.$execute(changedYesButNoUpdateHVgeom, [property.value, 0, p]);

        if (this.pendingUpdateH && this.pendingUpdateV) {
          continue;
        }
        if (!this.pendingUpdateH && property.changed.isConnected(this, this.$updateHGeometry)) {
          this.pendingUpdateH = p;
        }
        if (!this.pendingUpdateV && property.changed.isConnected(this, this.$updateVGeometry)) {
          this.pendingUpdateV = p;
        }
      }
    }

    for (const a in otherGeometryProperties) {
      if (this.pendingUpdateH && this.pendingUpdateV) {
        break;
      }
      // 1)We mark geometry dirty here if such non-bound property has initialized.
      const ap = otherGeometryProperties[a];
      const owner = a ? this[a] : this;
      for (const p in ap) {
        const property = owner.$properties[p];

        if (!(property.updateState & QmlWeb.QMLPropertyState.Uninitialized) && !property.binding) {
          if (!this.pendingUpdateH && property.changed.isConnected(this, this.$updateHGeometry)) {
            this.pendingUpdateH = p;
          }
          if (!this.pendingUpdateV && property.changed.isConnected(this, this.$updateVGeometry)) {
            this.pendingUpdateV = p;
          }
        }
        if (this.pendingUpdateH && this.pendingUpdateV) {
          break;
        }
      }
    }

    //   We filtered multiple $updateHGeometry and $updateVGeometry calls during the whole startup,
    //   and call each one for each instance only once (if required ).

    if (this.pendingUpdateH) {
      this.$updateHGeometry(this.width, 0, this.pendingUpdateH, true);
    }
    if (this.pendingUpdateV) {
      this.$updateVGeometry(this.height, 0, this.pendingUpdateV, true);
    }

  }
  getImplStyle() {
    return this.fcss ? this.fcss : (this.impl ? this.fcss = QmlWeb.createStyle(this.impl.style) : null);
  }
  $calculateOpacity() {
    // TODO: reset all opacity on layer.enabled changed
    /*
    if (false) { // TODO: check layer.enabled
      QmlWeb.setStyle(this.css, "opacity", this.opacity);
    }
    */
    const parentOpacity = this.$parent && this.$parent.$opacity || 1;
    this.$opacity = this.opacity * parentOpacity;
    const css = this.getImplStyle();
    if (css) {
      QmlWeb.setStyle(css, "opacity", this.$opacity);
    }
  }
  $onImplicitWidthChanged() {
    if (this.$isUsingImplicitWidth) {
      this.width = this.implicitWidth;
      this.$isUsingImplicitWidth = true;
    }
  }
  $onImplicitHeightChanged() {
    if (this.$isUsingImplicitHeight) {
      this.height = this.implicitHeight;
      this.$isUsingImplicitHeight = true;
    }
  }
  $updateHGeometry(newVal, oldVal, propName, oncompl) {
    if (this.$updatingHGeometry) {
      return;
    }
    const engine = this.$engine;
    if (!oncompl && !(engine.operationState & QmlWeb.QMLOperationState.Running)) {
      // resulting too expensive cyclic calls at init time:
      if (propName === "width") {
        this.pendingUpdateH = "width";
      } else if (!this.pendingUpdateH) {
        this.pendingUpdateH = true;
      }
      return;
    }

    delete this.pendingUpdateH;
    this.$updatingHGeometry = true;

    const anchors = this.$leaf.$anchors;
    const flags = QmlWeb.QMLSignalFlags.UniqueConnection;
    const w = this.width;
    const left = this.parent ? this.parent.left : 0;

    // Width
    if (propName === "width") {
      this.$isUsingImplicitWidth = !newVal;
    }

    const u = {}; // our update object
    let ok = 1;
    if (anchors) {
      const lM = anchors.leftMargin || anchors.margins;
      const rM = anchors.rightMargin || anchors.margins;

      // Position TODO: Layouts

      if (anchors.fill !== undefined) {
        const fill = anchors.fill;
        const props = fill.$properties;
        props.left.changed.connect(this, this.$updateHGeometry, flags);
        props.right.changed.connect(this, this.$updateHGeometry, flags);
        props.width.changed.connect(this, this.$updateHGeometry, flags);

        this.$isUsingImplicitWidth = false;
        u.width = fill.width - lM - rM;
        u.x = fill.left - left + lM;
        u.left = fill.left + lM;
        u.right = fill.right - rM;
        u.horizontalCenter = (u.left + u.right) / 2;
      } else if (anchors.centerIn !== undefined) {
        const horizontalCenter = anchors.centerIn.$properties.horizontalCenter;
        horizontalCenter.changed.connect(this, this.$updateHGeometry, flags);

        u.horizontalCenter = anchors.centerIn.horizontalCenter;
        u.x = u.horizontalCenter - w / 2 - left;
        u.left = u.horizontalCenter - w / 2;
        u.right = u.horizontalCenter + w / 2;
      } else if (anchors.left !== undefined) {
        u.left = anchors.left + lM;
        if (anchors.right !== undefined) {
          u.right = anchors.right - rM;
          this.$isUsingImplicitWidth = false;
          u.width = u.right - u.left;
          u.x = u.left - left;
          u.horizontalCenter = (u.right + u.left) / 2;
        } else if (anchors.horizontalCenter !== undefined) {
          u.horizontalCenter = anchors.horizontalCenter;
          this.$isUsingImplicitWidth = false;
          u.width = (u.horizontalCenter - u.left) * 2;
          u.x = u.left - left;
          u.right = 2 * u.horizontalCenter - u.left;
        } else {
          u.x = u.left - left;
          u.right = u.left + w;
          u.horizontalCenter = u.left + w / 2;
        }
      } else if (anchors.right !== undefined) {
        u.right = anchors.right - rM;
        if (anchors.horizontalCenter !== undefined) {
          u.horizontalCenter = anchors.horizontalCenter;
          this.$isUsingImplicitWidth = false;
          u.width = (u.right - u.horizontalCenter) * 2;
          u.x = 2 * u.horizontalCenter - u.right - left;
          u.left = 2 * u.horizontalCenter - u.right;
        } else {
          u.x = u.right - w - left;
          u.left = u.right - w;
          u.horizontalCenter = u.right - w / 2;
        }
      } else if (anchors.horizontalCenter !== undefined) {
        u.horizontalCenter = anchors.horizontalCenter;
        u.x = u.horizontalCenter - w / 2 - left;
        u.left = u.horizontalCenter - w / 2;
        u.right = u.horizontalCenter + w / 2;
      } else {
        ok = 0;
      }
    } else {
      ok = 0;
    }
    if (!ok) {
      if (this.parent) {
        const leftProp = this.parent.$properties.left;
        leftProp.changed.connect(this, this.$updateHGeometry, flags);
      }

      u.left = this.x + left;
      u.right = u.left + w;
      u.horizontalCenter = u.left + w / 2;
    }

    for (const key in u) {
      this[key] = u[key];
    }

    this.$updatingHGeometry = false;

    if (this.parent) this.$updateChildrenRect(this.parent);
  }
  $updateVGeometry(newVal, oldVal, propName, oncompl) {
    if (this.$updatingVGeometry) {
      return;
    }
    const engine = this.$engine;
    if (!oncompl && !(engine.operationState & QmlWeb.QMLOperationState.Running)) {
      // resulting too expensive cyclic calls at init time:
      if (propName === "height") {
        this.pendingUpdateV = "height";
      } else if (!this.pendingUpdateV) {
        this.pendingUpdateV = true;
      }
      return;
    }

    delete this.pendingUpdateV;
    this.$updatingVGeometry = true;

    const anchors = this.$leaf.$anchors;
    const flags = QmlWeb.QMLSignalFlags.UniqueConnection;
    const h = this.height;
    const top = this.parent ? this.parent.top : 0;

    // HeighttopProp
    if (propName === "height") {
      this.$isUsingImplicitHeight = !newVal;
    }

    const u = {}; // our update object
    let ok = 1;
    if (anchors) {
      const tM = anchors.topMargin || anchors.margins;
      const bM = anchors.bottomMargin || anchors.margins;

      // Position TODO: Layouts

      if (anchors.fill !== undefined) {
        const fill = anchors.fill;
        const props = fill.$properties;
        props.top.changed.connect(this, this.$updateVGeometry, flags);
        props.bottom.changed.connect(this, this.$updateVGeometry, flags);
        props.height.changed.connect(this, this.$updateVGeometry, flags);

        this.$isUsingImplicitHeight = false;
        u.height = fill.height - tM - bM;
        u.y = fill.top - top + tM;
        u.top = fill.top + tM;
        u.bottom = fill.bottom - bM;
        u.verticalCenter = (u.top + u.bottom) / 2;
      } else if (anchors.centerIn !== undefined) {
        const verticalCenter = anchors.centerIn.$properties.verticalCenter;
        verticalCenter.changed.connect(this, this.$updateVGeometry, flags);

        u.verticalCenter = anchors.centerIn.verticalCenter;
        u.y = u.verticalCenter - h / 2 - top;
        u.top = u.verticalCenter - h / 2;
        u.bottom = u.verticalCenter + h / 2;
      } else if (anchors.top !== undefined) {
        u.top = anchors.top + tM;
        if (anchors.bottom !== undefined) {
          u.bottom = anchors.bottom - bM;
          this.$isUsingImplicitHeight = false;
          u.height = u.bottom - u.top;
          u.y = u.top - top;
          u.verticalCenter = (u.bottom + u.top) / 2;
        } else if ((u.verticalCenter = anchors.verticalCenter) !== undefined) {
          this.$isUsingImplicitHeight = false;
          u.height = (u.verticalCenter - u.top) * 2;
          u.y = u.top - top;
          u.bottom = 2 * u.verticalCenter - u.top;
        } else {
          u.y = u.top - top;
          u.bottom = u.top + h;
          u.verticalCenter = u.top + h / 2;
        }
      } else if (anchors.bottom !== undefined) {
        u.bottom = anchors.bottom - bM;
        if ((u.verticalCenter = anchors.verticalCenter) !== undefined) {
          this.$isUsingImplicitHeight = false;
          u.height = (u.bottom - u.verticalCenter) * 2;
          u.y = 2 * u.verticalCenter - u.bottom - top;
          u.top = 2 * u.verticalCenter - u.bottom;
        } else {
          u.y = u.bottom - h - top;
          u.top = u.bottom - h;
          u.verticalCenter = u.bottom - h / 2;
        }
      } else if (anchors.verticalCenter !== undefined) {
        u.verticalCenter = anchors.verticalCenter;
        u.y = u.verticalCenter - h / 2 - top;
        u.top = u.verticalCenter - h / 2;
        u.bottom = u.verticalCenter + h / 2;
      } else {
        ok = 0;
      }
    } else {
      ok = 0;
    }
    if (!ok) {
      if (this.parent) {
        const topProp = this.parent.$properties.top;
        topProp.changed.connect(this, this.$updateVGeometry, flags);
      }

      u.top = this.y + top;
      u.bottom = u.top + h;
      u.verticalCenter = u.top + h / 2;
    }

    for (const key in u) {
      this[key] = u[key];
    }

    this.$updatingVGeometry = false;

    if (this.parent) this.$updateChildrenRect(this.parent);
  }
  $updateChildrenRect(component) {
    if (!component || !component.children || component.children.length === 0) {
      return;
    }
    const children = component.children;

    let maxWidth = 0;
    let maxHeight = 0;
    let minX = children.length > 0 ? children[0].x : 0;
    let minY = children.length > 0 ? children[0].y : 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      maxWidth = Math.max(maxWidth, child.x + child.width);
      maxHeight = Math.max(maxHeight, child.y + child.height);
      minX = Math.min(minX, child.x);
      minY = Math.min(minX, child.y);
    }

    const c = component.childrenRect.$properties;
    c.x.set(minX, QmlWeb.QMLPropertyFlags.Privileged);
    c.y.set(minY, QmlWeb.QMLPropertyFlags.Privileged);
    c.width.set(maxWidth, QmlWeb.QMLPropertyFlags.Privileged);
    c.height.set(maxHeight, QmlWeb.QMLPropertyFlags.Privileged);
  }
};

class ItemAnchors {
  constructor(parent, engine) {
    try {
      engine.pushengine();

      this.parent = parent;
      this.$engine = engine;
      this.$properties = {};
      this.$engine.initMeta(this, {}, ItemAnchors);

      const item = parent.$base;
      this.leftChanged.connect(item, item.$updateHGeometry);
      this.rightChanged.connect(item, item.$updateHGeometry);
      this.topChanged.connect(item, item.$updateVGeometry);
      this.bottomChanged.connect(item, item.$updateVGeometry);
      this.horizontalCenterChanged.connect(item, item.$updateHGeometry);
      this.verticalCenterChanged.connect(item, item.$updateVGeometry);
      this.fillChanged.connect(item, item.$updateHGeometry);
      this.fillChanged.connect(item, item.$updateVGeometry);
      this.centerInChanged.connect(item, item.$updateHGeometry);
      this.centerInChanged.connect(item, item.$updateVGeometry);
      this.leftMarginChanged.connect(item, item.$updateHGeometry);
      this.rightMarginChanged.connect(item, item.$updateHGeometry);
      this.topMarginChanged.connect(item, item.$updateVGeometry);
      this.bottomMarginChanged.connect(item, item.$updateVGeometry);
      this.marginsChanged.connect(item, item.$updateHGeometry);
      this.marginsChanged.connect(item, item.$updateVGeometry);

      QObject.attach(parent, this);
    } finally {
      engine.popengine();
    }
  }

  static getAttachedObject() {
    if (!this.hasOwnProperty("$anchors")) {
      this.$anchors = new ItemAnchors(this, this.$engine);
    }
    return this.$anchors;
  }

  toString() {
    return "anchors:"+this.parent;
  }
}

class ItemChildrenRect {
  constructor(parent, engine) {
    try {
      engine.pushengine();

      this.parent = parent;
      this.$engine = engine;
      this.$properties = {};
      this.$engine.initMeta(this, {}, ItemChildrenRect);

      QObject.attach(parent, this);
    } finally {
      engine.popengine();
    }
  }

  static getAttachedObject() {
    if (!this.hasOwnProperty("$childrenRect")) {
      this.$childrenRect = new ItemChildrenRect(this, this.$engine);
    }
    return this.$childrenRect;
  }

  toString() {
    return "childrenRect:"+this.parent;
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Item",
  versions: /.*/,
  baseClass: "ItemBase",
  properties: {
    $opacity: { type: "real", initialValue: 1 },
    state: { type: "string", initialValue: null },
    states: "list",
    transitions: "list",
    transform: "list",
    x: { type: "real", initialValue: 0 },
    y: { type: "real", initialValue: 0 },
    z: { type: "real", initialValue: 0 },
    width: { type: "real", initialValue: 0 },
    height: { type: "real", initialValue: 0 },
    implicitWidth: { type: "real", initialValue: 0 },
    implicitHeight: { type: "real", initialValue: 0 },
    left: "real",
    right: "real",
    top: "real",
    bottom: "real",
    horizontalCenter: "real",
    verticalCenter: "real",
    rotation: "real",
    scale: { type: "real", initialValue: 1 },
    opacity: { type: "real", initialValue: 1 },
    visible: { type: "bool", initialValue: true },
    clip: "bool",
    focus: "bool",
    antialiasing: "bool",
    smooth : "bool"
  },
  defaultProperty: "data",
  constructor: Item
});

QmlWeb.registerQmlType({
  global: true,
  module: "QtQml",
  name: "anchors",
  versions: /.*/,
  owners: /QtQuick\.Item/,
  signals: {
  },
  properties: {
    left: "var",
    right: "var",
    top: "var",
    bottom: "var",
    horizontalCenter: "var",
    verticalCenter: "var",
    fill: "Item",
    centerIn: "Item",
    margins: "real",
    leftMargin: "real",
    rightMargin: "real",
    topMargin: "real",
    bottomMargin: "real"
  },
  constructor: ItemAnchors
});

QmlWeb.registerQmlType({
  global: true,
  module: "QtQml",
  name: "childrenRect",
  versions: /.*/,
  owners: /QtQuick\.Item/,
  signals: {
  },
  properties: {
    x: { type: "real", readOnly:true},
    y: { type: "real", readOnly:true},
    width: { type: "real", readOnly:true},
    height: { type: "real", readOnly:true}
  },
  constructor: ItemChildrenRect
});

QmlWeb.Item = Item;
