QMLComponent.prototype.createObject = function(parent, properties) {
    var oldState = engine.operationState;
    engine.operationState = QMLOperationState.Init;

    var item = construct({
        object: this.$metaObject,
        parent: parent,
        context: Object.create(this.$context),
        isComponentRoot: true
    });

    engine.operationState = oldState;
    return item;
}

function QMLComponent(meta) {
    if (constructors[meta.object.$class] == QMLComponent)
        this.$metaObject = meta.object.$children[0];
    else
        this.$metaObject = meta.object;
    this.$context = meta.context;

    var loadJsImport = (function(importDesc) {
      var src = importDesc.subject;
      var js;

      if (typeof qmlEngine.basePath != 'undefined')
        src = qmlEngine.basePath + src;
      js = getUrlContents(src);
      eval(js);
    });

    var loadQmlImport = (function(importDesc) {
      var src = importDesc.subject;
      var qml;

      if (typeof qmlEngine.basePath != 'undefined')
        src = qmlEngine.basePath + src;
      qml = getUrlContents(src);
      qmlEngine.loadQML(qml);
    });

    if (meta.object.$imports instanceof Array)
    {
      var moduleImports = [];
      var loadImport    = (function(importDesc) {
        if (/\.js$/.test(importDesc.subject))
          loadJsImport(importDesc);
        else if (/\.qml$/.test(importDesc.subject))
          loadQmlImport(importDesc);
        else
          moduleImports.push(importDesc);
      }).bind(this);

      for (var i = 0 ; i < meta.object.$imports.length ; ++i) {
        loadImport(meta.object.$imports[i]);
      }
      loadImports(moduleImports);
    }
}

registerQmlType('Component',   QMLComponent);
registerQmlType('QMLDocument', QMLComponent);
