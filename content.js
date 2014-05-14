function removeOnDelete(){
  var elems = document.querySelectorAll('.delete');
  for(var i=0; i<elems.length; i++){
    elems[i].addEventListener('click',function(e){
      e.preventDefault(); 
      var remove = e.target.parentNode;
      remove.parentNode.removeChild(remove);
    });
  }
}
function reload(){
  chrome.storage.sync.get('config', function(data) {
    if (data && data.config) {
      var config = JSON.parse(data.config);
      document.querySelector('#speccontainer').innerHTML = '';
      var newspec = document.querySelector('#newspec');
      for(var i in config.specs){
        var clone = newspec.cloneNode(true);
        clone.removeAttribute('id');
        clone.querySelector('input[name="localport[]"]').value = config.specs[i].localport;
        clone.querySelector('input[name="host[]"]').value = config.specs[i].host;
        clone.querySelector('input[name="port[]"]').value = config.specs[i].port;
        document.querySelector('#speccontainer').appendChild(clone);
      }
      document.querySelector('input[name=sockshost]').value = config.socks.host;
      document.querySelector('input[name=socksport]').value = config.socks.port;
      removeOnDelete();
      var event = new CustomEvent('reload', { 'detail': config });
      window.dispatchEvent(event);
    }
  });
}
function next(){
  var newspec = document.querySelector('#newspec');
  var clone = newspec.cloneNode(true);
  clone.removeAttribute('id');
  document.querySelector('#speccontainer').appendChild(clone);
  newspec.querySelector('input[name="localport[]"]').value = "";
  newspec.querySelector('input[name="host[]"]').value = "";
  newspec.querySelector('input[name="port[]"]').value = "";
  removeOnDelete();
}
function savereload(){
  var localports = document.querySelectorAll('input[name="localport[]"]');
  var hosts = document.querySelectorAll('input[name="host[]"]');
  var ports = document.querySelectorAll('input[name="port[]"]');
  var proxyspecs = [];
  for(var i = 0; i<localports.length; i++) 
    if(localports[i].value && hosts[i].value && ports[i].value)
      proxyspecs.push({localport: parseInt(localports[i].value),host: hosts[i].value, port: parseInt(ports[i].value)});
  var sockshost = document.querySelector('input[name="sockshost"]').value;
  var socksport = parseInt(document.querySelector('input[name="socksport"]').value);
  chrome.storage.sync.set({'config': JSON.stringify({socks: {host: sockshost,port: socksport},specs: proxyspecs})}, function() {
    reload();
  });
}
function downloadRules() {
  chrome.storage.sync.get('config', function(data) {
    window.URL = window.webkitURL || window.URL;
    var blob = new Blob([data.config || ""]);
    var a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'rules.json'; // set the file name
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click(); //this is probably the key - simulatating a click on a download link
    delete a;// we don't need this anymore
  });
}
function loadRules() {
  chrome.fileSystem.chooseEntry({},function(entry){
    entry.file(function(file) {
      var reader = new FileReader();
      reader.onloadend = function(e) {
        chrome.storage.sync.set({'config': e.target.result}, function() {
          reload();
        });
      };
      reader.readAsText(file);
    });
  });
}
document.querySelector('#save').addEventListener('click',function(e){
  e.preventDefault(); savereload();
});
document.querySelector('#next').addEventListener('click',function(e){
  e.preventDefault(); next();
});
document.querySelector('#download').addEventListener('click',function(e){
  e.preventDefault(); downloadRules();
});
document.querySelector('#load').addEventListener('click',function(e){
  e.preventDefault(); loadRules();
});
reload();
