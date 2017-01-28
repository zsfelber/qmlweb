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

Intended to fix parse errors (like that of readonly property) and maybe another simple bugs which prevent my actual qml model to be compiled and used..

Added:
Understand my qmlweb-parser extensions:
[readonly]  [list<xxx> templates]   [var xxx = {"aaa:" : <expression>}  json like var property syntax ]

Understand my gulp-qmlweb extensions

Fixed import strategy to resolve preloaded qrc-s

Extended Binding : understands impl/block, impl/function, impl/expression, bidirectional, alias flags

Changed alias implementation to use QMLBinding in a special bidirectional mode, extended to understand &lt;arbitrary property path>.property
As an extended version of QML we can now use 2-directional Bindings, as well as indirect alias like:
property alias aliasprop:aaa.bbb[indexprop];
property string indexprop;
Resolving aliases as specified by qml standard (as expected, it doesn't see same object aliases, resolves property/property and property/element overload cases)

Changed init time load strategy: for a single property (in engine.applyProperties), it aborts when a binding has not yet initialized,
signal evaluation reached uninitilized expression, or so. Then it places them to 1 single engine.pendingOperations queue, then attempts
to resolve them again at startup finish. It became more flexible and intelligent.

Changed coding style to more advanced (also to support better ways), eg:
- using 1 flag variable in QMLBinding(ImplFunction/ImplBlock/.../Bidrection/Alias), QMLProperty(reasons,priviligezed/break readonly, break bidirectional binding at set)
instead of several global boolean properties
- using 1 interface and 1 queue for engine.pendingOperations (instead of 'engine.bindedProperties' + engine.pendingOperations and 2 queues at startup finish)
- Removed namespace objects, global executionContext, global $basePath stacks, componentScope+objectScope or so. These were confusing, lead to a lot of bugs.I simplified it.
Using Component class which has the $basePath property, and "this" object and super (_proto) object hierarchy for stacking the context as many times as possible.
- relocated a couple of compile time functions to resolve.js, load.js, import.js, classes.js
