var MarkusToSTAMLFuncs = (function(){
	var metadataTable = [
		{ from: "/div[@class='doc']/@filename", to: "filename"}
	];

	var applicationTable = [
		{ from: "/div[@class='doc']/@tag", to: "tag"}
	];

	var sectionDividerTable = {
		chapter: false,
		section: "/div[@class='doc']/pre/span[@type='passage']"
	}

	var tagTable = [
		{ type: "person", tag: "//span[@type='fullName']",
		    linkdata: [ { from: "/span/@cbdbid", to: "cbdbid"} ]},
		{ type: "person", subtype: "othername", tag: "//span[@type='partialName']",
		    linkdata: [ { from: "/span/@cbdbid", to: "cbdbid"} ]},
		 { type: "location", tag: "//span[@type='placeName']",
		    userdata: [ { from: "/span/@placename_id", to: "note"} ]},
		 { type: "person", subtype: "officialTitle", tag: "//span[@type='officialTitle']",
		    userdata: [ { from: "/span/@officialtitle_id", to: "note"} ]},
		 { type: "datetime",  tag: "//span[@type='timePeriod']",
		    userdata: [ { from: "/span/@timeperiod_id", to: "note"} ]},
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
	
	var tagTransformer = function( context ){
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

	var generateTag = function( object ){
		if( String.isString(object) ) return object;

		var tag = '<span class="' ;
		var tagName, moreThanOneIdData, moreThanOneIdAttribute;
		if( object.type === "person" ){
			if( object.subtype === "othername" ){
				tagName = "partialName";
				moreThanOneIdData = "linkdata";
				moreThanOneIdAttribute = "cbdbid";
			}
			else if( object.subtype === "officialTitle" ){
				tagName = "officialTitle";
				moreThanOneIdData = "userdata";
				moreThanOneIdAttribute = "note";
			}
			else {
				tagName = "fullName";
				moreThanOneIdData = "linkdata";
				moreThanOneIdAttribute = "cbdbid";
			}
		}
		else if(object.type === "location"){
			tagName = "placeName";
			moreThanOneIdData = "userdata";
			moreThanOneIdAttribute = "note";
		}
		else if(object.type === "datetime"){
			tagName = "timePeriod";
			moreThanOneIdData = "userdata";
			moreThanOneIdAttribute = "note";
		}
		else {
			return object.textContent;
		}

		tag += tagName + " markup unsolved";
		if( object[moreThanOneIdData] && object[moreThanOneIdData] [moreThanOneIdAttribute] && object[moreThanOneIdData] [moreThanOneIdAttribute] .split("|").length > 1 ){
			tag += " moreThanOneId";
		}
		tag += '" type="' + tagName + '"';
		if( object.linkdata ){
			for( var key in object.linkdata ){
				if( key === "id" ){
					continue;
				}
				tag += " " + key + '="' + object.linkdata[key] + '"';
			}
		}

		if( object.userdata ){
			for( var key in object.userdata ){
				if( key === "note" ){
					tag += " " + tagName.toLowerCase + '_id="' + object.userdata[key] + '"'
				}
				else if( key === "id" ){
					continue;
				}
				else {
					tag += " " + key + '="' + object.userdata[key] + '"';
				}
			}
		}

		tag += ">"

		if( String.isString(object.content) ){
			tag += object.content;
		}
		else {
			tag += generateTag(object.content);
		}

		tag += "</span>"

		return tag;
	}

	return {
		documentInformation: function( context ){
			var metadataTransform = XMLTableToJSON(metadataTable);
			var applicationTransform = XMLTableToJSON(applicationTable);
			
			return {
				metadata: metadataTransform(context),
				application: applicationTransform(context)
			};
		},
		articleInformation: function( context ){
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(context, "text/xml");
			var chapters = [];
			if( sectionDividerTable.chapter ){
				var nodes = xmlDoc.evaluate(sectionDividerTable.chapter, xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
				var node;
				while( node = nodes.iterateNext() ){
					chapters.push( {type: "chapter", content: createXMLDocumentFromNode(node)} );
				}
			}
			else{
				chapters.push({type: "chapter", content: xmlDoc} );
			}

			var sections = [];
			for( var i = 0 ; i < chapters.length ; i++ ){
				sections.push({type: "chapter", content: []});
				var nodes = chapters[i].content.evaluate(sectionDividerTable.section, chapters[i].content, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
				var node;
				while( node = nodes.iterateNext() ){
					sections[i].content.push({ type: "section", content: tagTransformer((new XMLSerializer()).serializeToString(node))});
				}
			}
			
			return sections;
		},

		mergeToContext: function( input ){
			var metadata = input.document.metadata;
			var sections = input.article;
			var application = input.document.application;

			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString( "<div class='doc'><pre></pre></div>" ,"text/xml");

			// metadata
			var rootNode = xmlDoc.evaluate("/div[@class='doc']", xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null).iterateNext();

			var filename = xmlDoc.createAttribute("filename");
			filename.value = metadata.filename;
			rootNode.setAttributeNode(filename);

			// application
			for( var i = 0 ; i < application.length ;i++ ){
				if( application[i].name === "MARKUS" ){
					var tag = xmlDoc.createAttribute("tag");
					tag.value = application[i].tag;
					rootNode.setAttributeNode(tag);
				}
			}

			// sections
			var sectionNumber = 0;
			for( var i = 0 ; i < sections.length ; i++ ){
				for( var j = 0 ; j < sections[i].content.length ; j++, sectionNumber++ ){
					var section = '<span class="passage" type="passage" id="passage' + sectionNumber + '"><span class="commentContainer" value="[]"><span class="glyphicon glyphicon-comment" type="commentIcon" style="display:none" aria-hidden="true" data-markus-passageid="passage' + sectionNumber + '"></span></span>';
					for( var k = 0 ; k < sections[i].content[j].content.length ; k++ ){
						section += generateTag( sections[i].content[j].content[k] );
					}
					section += "</span>\n\n";
					appendAllChildren( section, xmlDoc.getElementsByTagName("div")[0].getElementsByTagName("pre")[0] );
				}
			}


			return (new XMLSerializer()).serializeToString(xmlDoc) ;
		}
	};
})();
