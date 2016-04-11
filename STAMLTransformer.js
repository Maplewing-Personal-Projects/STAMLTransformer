var STAMLTransformer = (function(){

	if (!Array.isArray) {
	  Array.isArray = function(arg) {
	    return Object.prototype.toString.call(arg) === '[object Array]';
	  };
	}

	function isString(val) {
	   return typeof val === 'string' || ((!!val && typeof val === 'object') && Object.prototype.toString.call(val) === '[object String]');
	}
	
	function STAMLTransformer(functions){
		for( var key in functions ){
			this[key] = functions[key];
		}
	}

	STAMLTransformer.prototype.recursiveMap = function( array, func ){
		var mapArray = [];
		for( var i = 0 ; i < array.length ; i++ ){
			if( Array.isArray(array[i]) ){
				mapArray.push( this.recursiveMap(array[i], func) );
			}
			else {
				mapArray.push( func(array[i]) );
			}
		}

		return mapArray;
	}

	STAMLTransformer.prototype.transform = function(context){
		return this.merge( this.metadataTransformer(context),
						   this.recursiveMap(this.sectionDivider(context), 
						   					 this.tagTransformer),
						   this.applicationSetting ? this.applicationSetting(context) : undefined );
	}


	STAMLTransformer.prototype.transformBack = function(STAMLcontext){
		return this.mergeToContext( this.unmerge(STAMLcontext) );
	}

	STAMLTransformer.prototype.contentToXMLString = function(content, setting){
		var checkList = ["userdata", "linkdata"];
		var result = { content: "" };
		for( var i = 0 ; i < checkList.length ; i++ ){
			result[checkList[i]] = [];
		}

		if( isString(content) ){
			result.content = content ;
			return result; 
		}

		for( var i = 0 ; i < content.length ; i++ ){
			if( isString(content[i]) ){
				result.content += content[i];
			}
			else {
				result.content += "<" + content[i].type;
				if( content[i].subtype ) result.content += " subtype='" + content[i].subtype + "'";
				
				for( var j = 0 ; j < checkList.length ; j++ ){
					if( content[i][checkList[j]] ){
						result.content += " " + checkList[j] + "Ref='" + setting[checkList[j]] + "'";
						content[i][checkList[j]].id = setting[checkList[j]];
						result[checkList[j]].push(content[i][checkList[j]]);
						++setting[checkList[j]];
					}
				}
				result.content += ">" + content[i].content + "</" + content[i].type + ">";
			}
		}

		return result;
	}

	STAMLTransformer.prototype.XMLtoContent = function(xmlNode, xmlDoc, setting){
		var result = [];
		var childNodes = xmlNode.childNodes;
		for( var i = 0 ; i < childNodes.length ; i++ ){
			if( childNodes[i].nodeType === 3 ){
				result.push( childNodes[i].nodeValue );
			}
			else if( childNodes[i].nodeType === 1 ){
				var nodeData = { type: childNodes[i].nodeName };
				var children = childNodes[i].childNodes;
				for( var j = 0 ; j < children.length ; j++ ){
					if( children[j].nodeType === 3 ){
						nodeData.content = children[j].nodeValue;
					}
					else if( children[j].nodeType === 2 ){
						if( children[j].nodeName === "userdataRef" ){
							xmlDoc.getElementsByTagName("userdata")
						}
					}
				}

			}
		}

		return result;
	}

	STAMLTransformer.prototype.appendAllChildren = function( nodeString, nodeTo ){
		var parser = new DOMParser();
		var xmlTemp = parser.parseFromString("<append>" + nodeString + "</append>", "text/xml");
		var nodeFrom = xmlTemp.getElementsByTagName("append")[0];
		while( nodeFrom.hasChildNodes() ){
			nodeTo.appendChild(nodeFrom.removeChild(nodeFrom.firstChild));
		}
	}

	STAMLTransformer.prototype.merge = function(metadata, sections, application){
		var xmlString = "<STAML><metadata></metadata><article></article><applicationSettings></applicationSettings><userdata></userdata><linkdata></linkdata></STAML>";
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(xmlString, "text/xml");

		var userdata = [], linkdata = [];

		for( var key in metadata ){
			var node = xmlDoc.createElement(key);
			var result = this.contentToXMLString(metadata[key], {userdata: userdata.length, linkdata: linkdata.length});
			
			this.appendAllChildren( result.content, node );

			userdata = userdata.concat(result.userdata);
			linkdata = linkdata.concat(result.linkdata);


			xmlDoc.getElementsByTagName("metadata")[0].appendChild(node);
		}

		var articleNode = xmlDoc.getElementsByTagName("article")[0];
		for( var i = 0 ; i < sections.length ; i++ ){
			var chapterNode = xmlDoc.createElement("chapter");
			for( var j = 0 ; j < sections[i].length ; j++ ){
				var sectionNode = xmlDoc.createElement("section");
				var result = this.contentToXMLString(sections[i][j], {userdata: userdata.length, linkdata: linkdata.length});
			
				this.appendAllChildren( result.content, sectionNode );

				userdata = userdata.concat(result.userdata);
				linkdata = linkdata.concat(result.linkdata);
				chapterNode.appendChild(sectionNode);
			}

			articleNode.appendChild(chapterNode);
		}

		if( application ){
			var appRootNode = xmlDoc.createElement(application.name);
			for( var key in application ){
				if( key === "name" ) continue;
				var node = xmlDoc.createElement(key);
				node.appendChild( xmlDoc.createTextNode(application[key]));
				
				appRootNode.appendChild(node);
			}

			xmlDoc.getElementsByTagName("applicationSettings")[0].appendChild(appRootNode);
		}

		for( var i = 0 ; i < userdata.length ; i++ ){
			var dataNode = xmlDoc.createElement("data");
			var id = xmlDoc.createAttribute("refID");
			id.value = i;
			dataNode.setAttributeNode(id);

			for( var key in userdata[i] ){
				if( key === "id" ) continue;
				var node = xmlDoc.createElement(key);
				node.appendChild(xmlDoc.createTextNode(userdata[i][key]));
				dataNode.appendChild(node);
			}

			xmlDoc.getElementsByTagName("userdata")[0].appendChild(dataNode);
		}

		for( var i = 0 ; i < linkdata.length ; i++ ){
			var linkNode = xmlDoc.createElement("link");
			var id = xmlDoc.createAttribute("refID");
			id.value = i;
			linkNode.setAttributeNode(id);

			for( var key in linkdata[i] ){
				if( key === "id" ) continue;
				var node = xmlDoc.createElement(key);
				node.appendChild(xmlDoc.createTextNode(linkdata[i][key]));
				linkNode.appendChild(node);
			}

			xmlDoc.getElementsByTagName("linkdata")[0].appendChild(linkNode);
		}

		return new XMLSerializer().serializeToString(xmlDoc);
	}

	STAMLTransformer.prototype.unmerge = function(STAMLcontext){
		var metadata = {}, sections = [], application = [];
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(STAMLcontext, "text/xml");

		var userdata = {}, linkdata = {};
		var dataNodes = xmlDoc.getElementsByTagName("userdata")[0].getElementsByTagName("data");
		for( var i = 0 ; i < dataNodes.length ; i++ ){
			var data = {};
			var childNodes = dataNodes[i].childNodes;
			for( var j = 0 ; j < childNodes.length ; j++ ){
				if( childNodes[i].nodeType === 2 && childNodes[i].nodeName === "refID" ){
					data.id = childNodes[i].nodeValue;
				}
				else if( childNodes[i].nodeType === 1 ){
					data[childNodes[i].nodeName] = childNodes[i].firstChild.nodeValue;
				}
			}

			userdata[data.id] = data;
		}


		var linkNodes = xmlDoc.getElementsByTagName("linkdata")[0].getElementsByTagName("link");
		for( var i = 0 ; i < linkNodes.length ; i++ ){
			var link = {};
			var childNodes = linkNodes[i].childNodes;
			for( var j = 0 ; j < childNodes.length ; j++ ){
				if( childNodes[i].nodeType === 2 && childNodes[i].nodeName === "refID" ){
					link.id = childNodes[i].nodeValue;
				}
				else if( childNodes[i].nodeType === 1 ){
					link[childNodes[i].nodeName] = childNodes[i].firstChild.nodeValue;
				}
			}

			linkdata[data.id] = link;
		}

		console.log(userdata);
		console.log(linkdata);

		return {
			metadata: metadata, 
			sections: sections,
			application: application
		};
	}

	return STAMLTransformer;
})();