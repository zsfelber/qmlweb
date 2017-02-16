# JavaScript powered QML Engine

[![Join the chat at https://gitter.im/qmlweb/qmlweb](https://badges.gitter.im/qmlweb/qmlweb.svg)](https://gitter.im/qmlweb/qmlweb)
[![Build Status](https://travis-ci.org/qmlweb/qmlweb.svg?branch=master)](https://travis-ci.org/qmlweb/qmlweb)
[![codecov](https://codecov.io/gh/qmlweb/qmlweb/branch/master/graph/badge.svg)](https://codecov.io/gh/qmlweb/qmlweb)

[![npm](https://img.shields.io/npm/v/qmlweb.svg)](https://www.npmjs.com/package/qmlweb)
[![Bower](https://img.shields.io/bower/v/qmlweb.svg)](http://bower.io/search/?q=qmlweb)
[![GitHub tag](https://img.shields.io/github/tag/qmlweb/qmlweb.svg)](https://github.com/qmlweb/qmlweb/releases)

This project aims at bringing the power of QML to the web browser.
Here's a sample of how QML looks like:

```QML
import QtQuick 2.0

Rectangle {
   width: 500; height: 200
   color: "lightgray"

   Text {
       id: helloText
       text: "Hello world!"
       anchors.verticalCenter: parent.verticalCenter
       anchors.horizontalCenter: parent.horizontalCenter
       font.pointSize: 24; font.bold: true
   }
}
```

## How to use

### Add the library to your web page

Using one of the methods below, install the qmlweb JavaScript library:

* [npm](https://www.npmjs.com/package/qmlweb) — `npm install qmlweb`
* [Bower](http://bower.io/search/?q=qmlweb) — `bower install qmlweb`
* GitHub [releases](https://github.com/qmlweb/qmlweb/releases) —
  `tar -xaf v0.2.0.tar.gz`
* Manually (recommended if you cloned from git) — `npm install && npm run build`

Next, simply add `lib/qt.js` to the list of other JavaScript files in your app's
HTML file:

```HTML
<script type="text/javascript" src="/lib/qt.js"></script>
```

See the [examples](examples) directory for more details and complete usage
examples.

### API

You can use DOM elements as the base for QML components:

```js
var div = document.getElementById('embed'); // this is your DOM element
var engine = new QmlWeb.QMLEngine(div);
engine.loadFile('qml/main.qml');
engine.start();
```

See also
[`engine.loadQML`](docs/QMLEngine.md#engineloadqmlsrc-parentcomponent--file-)
for constructing a QML element from a source string.

### Auto-load

You can modify the `<body>` element to specify what QML file to load when
the page is opened. The loaded QML element will fill the whole page.

```HTML
<!DOCTYPE html>
<html>
  <head>
    <title>QML Auto-load Example</title>
    <script type="text/javascript" src="/lib/qt.js"></script>
  </head>
  <body style="margin: 0" data-qml="qml/main.qml">
  </body>
</html>
```

### Web Components

You can register QML files as
[Custom Elements](https://www.w3.org/TR/custom-elements/).

Note: browser support for Custom Elements v1 is limited, and QmlWeb does not
include a polyfill. You might want to load a
[polyfill](https://github.com/webcomponents/custom-elements) manually.

Registering the element:

```js
QmlWeb.registerElement('qml-main', 'qml/main.qml');
```

Using the element:

```html
<qml-main height="300" color="red" firstName="World"></qml-main>
```

Top-level properties get exported as HTML attributes and are binded to them,
real-time updates are possible.

## Supported modules and elements

Approximate modules support status for the git version could be viewed on the
[Projects](https://github.com/qmlweb/qmlweb/projects/1) page.

You can click on the module cards for per-class details.

## How to use with Gulp

See [gulp-qmlweb](https://github.com/qmlweb/gulp-qmlweb) package.

## How to extend

See [Extending](docs/Extending.md).

## History

1. [git://anongit.kde.org/qmlweb](https://quickgit.kde.org/?p=qmlweb.git), see [Webapps written in qml not far from reality anymore](http://akreuzkamp.de/2013/07/10/webapps-written-in-qml-not-far-from-reality-anymore),
2. [@JoshuaKolden/qmlweb](https://github.com/JoshuaKolden/qmlweb),
3. [@Plaristote/qmlweb](https://github.com/Plaristote/qmlweb),
4. [@labsin/qmlweb](https://github.com/labsin/qmlweb),
5. [@arnopaehler/qmlweb](https://github.com/arnopaehler/qmlweb).



## This Fork/Branch

6. [@zsfelber/qmlweb](https://github.com/zsfelber/qmlweb).

My version of engine is a medium deep rewrite of original, it is faster and has cleaner code. (as soon as it's ready)

Intended to fix parse errors (like that of readonly property) and maybe another simple bugs which prevent my actual qml model to be compiled and used..
As time has gone, I found the whole code needed a  serious refresh impulse which I did. These made my branch something might be called "QmlWeb2", in fact-
I haven't yet given any name. Just enjoy despite these are my Anonymous Updates.

Added:
Support for [@zsfelber/qmlweb-parser](https://github.com/zsfelber/qmlweb-parser) extensions:
[readonly]  [list<xxx> templates]   [var xxx = {"aaa:" : <expression>}  json like var property syntax ]

Support for [@zsfelber/gulp-qmlweb](https://github.com/zsfelber/gulp-qmlweb) extensions.

### Details

Fixed import strategy to resolve preloaded qrc-s

Extended Binding : understands impl/block, impl/function, impl/expression, bidirectional, alias flags

Changed alias implementation to use QMLBinding in a special bidirectional mode, extended to understand &lt;arbitrary property path>.property
As an extended version of QML we can now use 2-directional Bindings, as well as indirect alias like:
property alias aliasprop:aaa.bbb[indexprop];
property string indexprop;
Resolving aliases as specified by qml standard (as expected, it doesn't see same object aliases, resolves property/property and property/element overload cases)

Changed init time load strategy: for a single property (in engine.applyProperties), it aborts (temporally omits it) when a binding has not yet initialized,
signal evaluation reached uninitilized expression, or so. Then it places them to 1 single engine.pendingOperations queue.
After whole load cycle it attempts to resolve all of them subsequentially, from a queue in the exact order it appeared initially.
It became more flexible and intelligent.

JS Object oriented implementation of qml inheritance (_proto chain) for stacking the context, like this.$component, this._proto.$component, this._proto._proto.$component ...)
1 single stack of loader components, Component's import cache variables, $context and 'this' object hirearchy (_protos) cover everything intuitively, the as - intended way.
Main abstraction 1 is now "Component" that covers file loading stack, context inheritance (prototyping from top-to-bottom), and everything. Component
has child Components, either "Root", "Super" or "Nested". A child Component created by "Component.$createObject" has also got the "Element" flag.
Main abstraction 2 is classes.js/construct method which encapsulates object / container recursive creation looking more attractive than before.
It now also deals with a prototype chain (makes _proto chain for created items), but from bottom-to-top versus top-to-bottom logic of context
inheritance, indeed. It's traversing the include/contain graph from current type (QML) towards the supertype/deepest nested elements (element tag QML),
and starting instantiation from the base type QObject of elements and root object inheritance hierarchy, as intended.


So, I removed namespace objects, global executionContext, global $basePath stacks, componentScope+objectScope, importContextId and so.
These were too much complexity, source of a lot of experienced and possible bugs.I simplified it.
Now using 1 single function parameter almost across whole api consequently :
- current object passed as "this" func.call(obj,...), func.apply(obj,...), func.bind(obj,...) as possible
- object.$context points to a shared QMLContext instance in every loaded top component and its Supers, top parent is engine.rootContext.
Nesting element Component always creates a new Context over prototype chain.
( so rootContext !== anymore but is the parent of rootObject.context(s) : rootObject is alterable if loading multiple roots subsequently. )
- We use actual object's Component (obj.$component) for the $basePath, import cache container variables (no importContextId anymore), and Component
is now a central object to reach "everything".

QMLProperty : new alias support codes goes here. Property get strategy changed to lazy, a new way of listening the evaluation tree is implemented.
Connection cleanup strategy was not implemented here, I did it, too. So now, with deferring unnecessary tree evaluations as well as removing obsolete
evaluation tree connections, this step gives major performance bonus.

Minor coding style changes, simplifications eg:
- using 1 flag variable in QMLBinding(ImplFunction/ImplBlock/.../Bidrection/Alias), QMLProperty(reasons,priviligezed/break readonly, break bidirectional binding at set)
instead of several global boolean properties
- using 1 interface and 1 queue for engine.pendingOperations (instead of 'engine.bindedProperties' + engine.pendingOperations + Component.completed and 3 queues at startup finish)
- relocated a couple of compile time functions to resolve.js, load.js, import.js, classes.js
