String.prototype.escape = function() {
    var tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    return this.replace(/[&<>]/g, function(tag) {
        return tagsToReplace[tag] || tag;
    });
};

if (!Array.isArray) {
  Array.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

if( !String.isString ){
    String.isString = function(val) {
        return typeof val === 'string' || ((!!val && typeof val === 'object') && Object.prototype.toString.call(val) === '[object String]');
    }
}

var appendAllChildren = function( nodeString, nodeTo ){
    var parser = new DOMParser();
    var xmlTemp = parser.parseFromString("<append>" + nodeString + "</append>", "text/xml");
    console.log( (new XMLSerializer()).serializeToString(xmlTemp) );
    var nodeFrom = xmlTemp.getElementsByTagName("append")[0];
    if( nodeFrom.getElementsByTagName("refID")[0] !== undefined ){
        var id = xmlTemp.createAttribute("refID");
        id.value = nodeFrom.getElementsByTagName("refID")[0].textContent;
        nodeFrom.childNodes[0].setAttributeNode(id);
        nodeFrom.childNodes[0].removeChild(nodeFrom.getElementsByTagName("refID")[0]);
    }

    while( nodeFrom.hasChildNodes() ){
        nodeTo.appendChild(nodeFrom.removeChild(nodeFrom.firstChild));
    }
    
    
}

var createXMLDocumentFromNode = function( node ){
    return (new DOMParser()).parseFromString( (new XMLSerializer()).serializeToString(node), "text/xml");
}