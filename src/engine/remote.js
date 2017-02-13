
function $syncPropertyToRemote(rootComponent, property) {
  //rootComponent.serverWsAddress
  //rootComponent.webSocket;
  if (property.value && property.value.$base)
    rootComponent.webSocket.send(JSON.stringify({id:property.$propertyId, val:property.value.$objectId, type:1}));
  else
    rootComponent.webSocket.send(JSON.stringify({id:property.$propertyId, val:property.value}));
}

QmlWeb.$syncPropertyToRemote = $syncPropertyToRemote;
