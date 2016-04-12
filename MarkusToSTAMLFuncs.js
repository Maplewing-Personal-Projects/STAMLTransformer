var MarkusToSTAMLFuncs = (function(){
	var metadataTable = [
		{ from: "/div[@class='doc']/@filename", to: "filename"}
	];

	var applicationTable = [
		{ key: "name", value: "MARKUS"},
		{ from: "/div[@class='doc']/@tag", to: "tag"}
	];

	var sectionDividerTable = {
		chapter: false,
		section: "/div[@class='doc']/pre/span[@type='passage']"
	}

	var tagTable = [
		{ type: "person", subtype: "fullname", tag: "//span[@type='fullName']", 
		    linkdata: [ { from: "/@cbdbid", to: "cbdbid"} ]},
		{ type: "person", subtype: "othername", tag: "//span[@type='partialName']",
		    linkdata: [ { from: "/@cbdbid", to: "cbdbid"} ]},
		 { type: "location", tag: "//span[@type='placeName']",
		    userdata: [ { from: "/@placename_id", to: "note"} ]},
		 { type: "thing", subtype: "officialTitle", tag: "//span[@type='officialTitle']",
		    userdata: [ { from: "/@officialtitle_id", to: "note"} ]},
		 { type: "datetime",  tag: "//span[@type='timePeriod']",
		    userdata: [ { from: "/@timeperiod_id", to: "note"} ]},
	];

	var tagIgnore = [
		"/span[@class='commentContainer']"
	];

	var XMLTableToJSON  = function( table ){
		return function(context){
			var jsonData= {};
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(context, "text/xml");

			for( var i = 0 ; i < table.length ; i++ ){
				if( table[i].key ){
					jsonData[table[i].key] = table[i].value;
					continue;
				}
				var nodes = xmlDoc.evaluate(table[i].from, xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
				jsonData[table[i].to] = [];
				var node;
				while( node = nodes.iterateNext() ){
					if( node.nodeType === 1 ){
						jsonData[table[i].to] = node.textContent;
					}
					else if( node.nodeType === 2 ){
						jsonData[table[i].to] = node.value;
					}
					else if( node.nodeType === 3 ){
						jsonData[table[i].to] = node.nodeValue;
					}
				}

				if( jsonData[table[i].to].length === 1 ){
					jsonData[table[i].to] = jsonData[table[i].to][0];
				}

				if( jsonData[table[i].to].length === 0 ){
					delete jsonData[table[i].to];
				}
			}

			return jsonData;
		};
	}

	var createXMLDocumentFromNode = function( node ){
		return (new DOMParser()).parseFromString( (new XMLSerializer()).serializeToString(node), "text/xml");
	}

	var recursiveXML = function( node ){
		var content = {};
		var last = content;
		var now = content;

		for( var i = 0 ; i < tagTable.length ; i++ ){
			var tags = node.evaluate( tagTable[i].tag, node, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
			var tag;
			while( tag = tags.iterateNext() ){
				now.type = tagTable[i].type;
				if( tagTable[i].subtype ){
					now.subtype = tagTable[i].subtype;
				}
				if( tagTable[i].userdata ){
					now.userdata = (new XMLTableToJSON(tagTable[i].userdata))((new XMLSerializer()).serializeToString(tag) );
					if( Object.keys(now.userdata).length === 0 ){
						now.userdata = undefined;
						delete now.userdata;
					}
				}
				if( tagTable[i].linkdata ){
					now.linkdata = (new XMLTableToJSON(tagTable[i].linkdata))((new XMLSerializer()).serializeToString(tag) );
					if( Object.keys(now.linkdata).length === 0 ){
						now.linkdata = undefined;
						delete now.linkdata;
					}
				}

				last = now;
				now.content = {};
				now = now.content;
			}
		}

		last.content = node.firstChild.textContent;

		return content;
	}

	return {
		metadataTransformer: XMLTableToJSON(metadataTable),
		sectionDivider: function( context ){
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(context, "text/xml");

			var chapters = [];
			if( sectionDividerTable.chapter ){
				var nodes = xmlDoc.evaluate(sectionDividerTable.chapter, xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
				var node;
				while( node = nodes.iterateNext() ){
					chapters.push( node );
				}
			}
			else{
				chapters.push(xmlDoc);
			}

			var sections = [];
			for( var i = 0 ; i < chapters.length ; i++ ){
				sections.push([]);
				var nodes = xmlDoc.evaluate(sectionDividerTable.section, chapters[i], null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
				var node;
				while( node = nodes.iterateNext() ){
					sections[i].push((new XMLSerializer()).serializeToString(node));
				}
			}

			return sections;
		},
		tagTransformer: function( context ){
			var content = [];
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(context, "text/xml");

			var nodes = xmlDoc.firstChild.childNodes;
			for( var i = 0 ; i < nodes.length ; i++ ){
				if( nodes[i].nodeType === 3 ){
					content.push( nodes[i].nodeValue );
				}
				else if( nodes[i].nodeType === 1 ){
					var node = createXMLDocumentFromNode(nodes[i]);
					var ignore = false;
					for( var j = 0 ; j < tagIgnore.length ; j++ ){
						if( node.evaluate(tagIgnore[j], node, null, XPathResult.ANY_TYPE, null).iterateNext() ){
							ignore = true;
							break;
						}
					}
					if( !ignore ) content.push( recursiveXML(node) );
				}
			}

			return content;
		},

		applicationSetting: XMLTableToJSON(applicationTable)
	};
})();