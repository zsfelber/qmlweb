
function $syncPropertyToRemote(rootComponent, property) {
  //rootComponent.serverWsAddress
  //rootComponent.webSocket;
  if (property.val && property.val.$base)
    rootComponent.webSocket.send(JSON.stringify({id:property.$propertyId, val:property.val.$objectId, type:1}));
  else
    rootComponent.webSocket.send(JSON.stringify({id:property.$propertyId, val:property.val}));
}

QmlWeb.$syncPropertyToRemote = $syncPropertyToRemote;
