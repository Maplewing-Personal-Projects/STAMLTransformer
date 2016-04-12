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

	STAMLTransformer.prototype.recursiveContent = function(content, setting, checkList, result){
		result.content += "<" + content.type;
		if( content.subtype ) result.content += " subtype='" + content.subtype + "'";
		
		for( var i = 0 ; i < checkList.length ; i++ ){
			if( content[checkList[i]] ){
				result.content += " " + checkList[i] + "Ref='" + setting[checkList[i]] + "'";
				content[checkList[i]].id = setting[checkList[i]];
				result[checkList[i]].push(content[checkList[i]]);
				++setting[checkList[i]];
			}
		}
		result.content += ">";
		if(  isString(content.content) ){
			result.content += content.content;
		}
		else {
			this.recursiveContent(content.content, setting, checkList, result);
		}

		result.content += "</" + content.type + ">";
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
				this.recursiveContent(content[i], setting, checkList, result);
			}
		}

		return result;
	}

	STAMLTransformer.prototype.recursiveXML = function(node, userdata, linkdata ){
		var nodeData = { type: node.nodeName };
		if( node.hasAttribute("subtype") ){
			nodeData.subtype = node.getAttribute("subtype") ;
		}

		if( node.hasAttribute("userdataRef") ){
			nodeData.userdata = userdata[node.getAttribute("userdataRef")];
		}

		if( node.hasAttribute("linkdataRef") ){
			nodeData.userdata = linkdata[node.getAttribute("linkdataRef")];
		}

		for( var i = 0 ; i < node.childNodes.length ; i++ ){
			if( node.childNodes[i].nodeType === 3 ){
				nodeData.content = node.childNodes[i].nodeValue;
			}
		}
	}

	STAMLTransformer.prototype.XMLtoContent = function(xmlNode, userdata, linkdata){
		if( xmlNode.childNodes.length === 1 && xmlNode.firstChild.nodeType === 3 ){
			return xmlNode.firstChild.nodeValue;
		}

		var result = [];
		var childNodes = xmlNode.childNodes;
		for( var i = 0 ; i < childNodes.length ; i++ ){
			if( childNodes[i].nodeType === 3 ){
				result.push( childNodes[i].nodeValue );
			}
			else if( childNodes[i].nodeType === 1 ){
				result.push( this.recursiveXML(childNodes[i], userdata, linkdata) );
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
			id.value = userdata[i].id;
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
			var data = { id: dataNodes[i].getAttribute("refID") };
			var childNodes = dataNodes[i].childNodes;
			for( var j = 0 ; j < childNodes.length ; j++ ){
				if( childNodes[i].nodeType === 1 ){
					data[childNodes[i].nodeName] = childNodes[i].firstChild.nodeValue;
				}
			}

			userdata[data.id] = data;
		}


		var linkNodes = xmlDoc.getElementsByTagName("linkdata")[0].getElementsByTagName("link");
		for( var i = 0 ; i < linkNodes.length ; i++ ){
			var link = { id: linkNodes[i].getAttribute("refID") };
			var childNodes = linkNodes[i].childNodes;
			for( var j = 0 ; j < childNodes.length ; j++ ){
				if( childNodes[i].nodeType === 1 ){
					link[childNodes[i].nodeName] = childNodes[i].firstChild.nodeValue;
				}
			}

			linkdata[link.id] = link;
		}

		var chapters = xmlDoc.getElementsByTagName("chapter");
		for( var i = 0 ; i < chapters.length ; i++ ){
			var chapterData = [];
			var sectionsNode = chapters[i].getElementsByTagName("section");
			for( var j = 0 ; j < sectionsNode.length ; j++ ){
				chapterData.push( this.XMLtoContent(sectionsNode[j], userdata, linkdata) );
			}
			sections.push(chapterData);
		}

		console.log(sections);

		var metadataNodes = xmlDoc.getElementsByTagName("metadata")[0].childNodes;
		for( var i = 0 ; i < metadataNodes.length ; i++ ){
			if( metadataNodes[i].nodeType === 1 ){
				metadata[metadataNodes[i].nodeName] = this.XMLtoContent(metadataNodes[i], userdata, linkdata);
			}
		}

		console.log( metadata );

		var applications = xmlDoc.getElementsByTagName("applicationSettings")[0].childNodes;
		for( var i = 0 ; i < applications.length ; i++ ){
			var applicationData = { name: applications[i].nodeName };
			var appChildNodes = applications[i].childNodes;
			for( var j = 0 ; j < appChildNodes.length ; j++ ){
				if( appChildNodes[j].nodeType === 1 ){
					applicationData[appChildNodes[j].nodeName] = appChildNodes[j].firstChild.nodeValue;
				}
			}
			application.push(applicationData);
		}

		console.log( application );

		return {
			metadata: metadata, 
			sections: sections,
			application: application
		};
	}

	return STAMLTransformer;
})();