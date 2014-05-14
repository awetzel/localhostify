localhostify = [
  //{localport: 8201, host: "www.shoppingadventure.fr", port: 80},
  {localport: 8200, host: "qa-order01.priv.qa.kbrwadventure.com", port: 80},
  {localport: 8201, host: "qa-pubwebsite01.priv.qa.kbrwadventure.com", port: 80}
]

socks = {host: "access.shoppingadventure.fr", port: 11111}

function typed_array_equals(a,b) {
  for(var i in a) if(a[i] != b[i]) return false;
  return true;
}

function proxify(proxyspecs,socks){
  for(var i in proxyspecs){
    (function(proxyspec){
      // create listening socket
      chrome.sockets.tcpServer.create({}, function(createListenInfo) {
        // listen on listening socket
        chrome.sockets.tcpServer.listen(createListenInfo.socketId,"127.0.0.1",proxyspec.localport,function(listenResultCode) {
          // add listener on listening socket accept
          chrome.sockets.tcpServer.onAccept.addListener(function(acceptInfo){
            if(acceptInfo.socketId != createListenInfo.socketId) return; // listener for this accepting socket only
            // create a socket to socks
            chrome.sockets.tcp.create({}, function(createConnectInfo) {
              // connect to socks5 tcp
              chrome.sockets.tcp.connect(createConnectInfo.socketId, socks.host, socks.port,function(connectResultCode){
                // send socks5 initialization : [version=5,one_authentication_method=1,no_authentication=0]
                chrome.sockets.tcp.send(createConnectInfo.socketId,(new Uint8Array([5,1,0])).buffer,function(){
                  // add a listener which remove itself to handle server authentication response
                  chrome.sockets.tcp.onReceive.addListener(function receiveSocksAuth(recinfo){
                    if(recinfo.socketId != createConnectInfo.socketId) return; // receive on socks5 socket 
                    chrome.sockets.tcp.onReceive.removeListener(receiveSocksAuth); 
                    var message = new Uint8Array(recinfo.data);
                    if(message[0] != 5 || message[1] != 0) return; // check socks5 resp: must be [version=5,no authentication=0]
                    // generate&send socks5 TCP connection query : [version=5+tcpconnect=1+reserved=0+dnsaddress=3+addr_len+addr+2byte port]
                    var query = new ArrayBuffer(7+proxyspec.host.length);
                    var d8=new Uint8Array(query); d8.set([5,1,0,3,proxyspec.host.length]); // set first bytes + addr len
                    for(var j=0; j<proxyspec.host.length;j++) d8[j+5]=proxyspec.host.charCodeAt(j); // put addr bytes
                    new DataView(query,d8.length-2,2).setUint16(0,proxyspec.port); // set port uint16 big endian
                    chrome.sockets.tcp.send(createConnectInfo.socketId,query,function(){
                      // add a listener which remove itself to handle server Socks connection query response
                      chrome.sockets.tcp.onReceive.addListener(function receiveSocksResp(recinfo){
                        if(recinfo.socketId != createConnectInfo.socketId) return; // receive on socks5 socket
                        chrome.sockets.tcp.onReceive.removeListener(receiveSocksResp); 
                        d8[1] = 0; // check expected response : the same as query but with a 0 meaning OK at the place of the query type
                        if(!typed_array_equals(new Uint8Array(recinfo.data),d8)) return;
                        // if all is OK, then add the final listener which transmit data both ways and unpause accept client socket
                        chrome.sockets.tcp.onReceive.addListener(function(recinfo){
                          if(recinfo.socketId == acceptInfo.clientSocketId){
                            chrome.sockets.tcp.send(createConnectInfo.socketId, recinfo.data,function(){});
                          }else if(recinfo.socketId == createConnectInfo.socketId){
                            chrome.sockets.tcp.send(acceptInfo.clientSocketId, recinfo.data,function(){});
                          }
                        });
                        chrome.sockets.tcp.setPaused(acceptInfo.clientSocketId,false, function(){});
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    })(localhostify[i]);
  }
}

chrome.app.runtime.onLaunched.addListener(function() {
  proxify(localhostify,socks);
  chrome.app.window.create('main.html', {
      id: 'config_server',
      bounds: { width: 800, height: 600, left: 100, top: 100 },
      minWidth: 800, minHeight: 600
//  }, function(win) {
//      win.contentWindow.document.querySelector('form').addEventListener('submit',function(){
//        var localports = win.contentWindow.document.querySelector('input[name="localport[]"]');
//        var hosts = win.contentWindow.document.querySelector('input[name="host[]"]');
//        var ports = win.contentWindow.document.querySelector('input[name="port[]"]');
//        var proxyspecs = [];
//        for(var i = 0; i<localports.length; i++) 
//          if(localports[i].value && hosts[i].value && ports[i].value)
//            proxyspecs.push({localport: localports[i].value,host: hosts[i].value, ports: ports[i].value});
//        console.log(proxyspecs);
//      });
  });
});

//function get_specs_restart(callback){
//  chrome.storage.local.get('specs_socks', function(data) {
//    if (data && data.proxyspecs) {
//      var specs_socks = JSON.parse(data.specs_socks);
//      proxify(specs_socks.specs,specs_socks.socks);
//      callback(specs_socks);
//    }
//  });
//}
