var STAMLTransformer = (function(){

	function STAMLTransformer(functions){
		for( var key in functions ){
			this[key] = functions[key];
		}
	}

	STAMLTransformer.prototype.transform = function(context){
		return this.merge( this.documentInformation(context),
											 this.articleInformation(context) );
		/* return this.merge( this.metadataTransformer(context),
						   this.recursiveMap(this.sectionDivider(context),
						   					 this.tagTransformer),
						   this.applicationSetting ? this.applicationSetting(context) : undefined );
		*/
	}


	STAMLTransformer.prototype.transformBack = function(STAMLcontext){
		return this.mergeToContext( this.unmerge(STAMLcontext) );
	}

	/*
	STAMLTransformer.prototype.recursiveXML = function(node, userdata, linkdata ){
		var nodeData = { type: node.nodeName };
		if( node.hasAttribute("subtype") ){
			nodeData.subtype = node.getAttribute("subtype") ;
		}

		if( node.hasAttribute("userdataRef") ){
			nodeData.userdata = userdata[node.getAttribute("userdataRef")];
		}

		if( node.hasAttribute("linkdataRef") ){
			nodeData.linkdata = linkdata[node.getAttribute("linkdataRef")];
		}

		for( var i = 0 ; i < node.childNodes.length ; i++ ){
			if( node.childNodes[i].nodeType === 3 ){
				nodeData.content = node.childNodes[i].nodeValue;
			}
			else if( node.childNodes[i].nodeType === 1 ){
				nodeData.content = this.recursiveXML(node.childNodes[i], userdata, linkdata);
			}
		}

		return nodeData;
	}
	
	STAMLTransformer.prototype.XMLtoContent = function(xmlNode, userdata, linkdata){
		if( xmlNode.childNodes.length === 1 && xmlNode.firstChild.nodeType === 3 ){
			return xmlNode.firstChild.nodeValue;
		}

		var result = [];
		var childNodes = xmlNode.childNodes;
		for( var i = 0 ; i < childNodes.length ; i++ ){
			if( childNodes[i].nodeType === 3 ){
				result.push( childNodes[i].nodeValue.escape() );
			}
			else if( childNodes[i].nodeType === 1 ){
				result.push( this.recursiveXML(childNodes[i], userdata, linkdata) );
			}
		}

		return result;
	}
	*/
	STAMLTransformer.prototype.XMLtoObject = function(xmlNode){
		if( xmlNode.childNodes.length === 1 && xmlNode.firstChild.nodeType === 3 ){
			return xmlNode.firstChild.nodeValue.escape();
		}
		
		var object = {};
		var childNodes = xmlNode.childNodes;
		for( var i = 0 ; i < childNodes.length ; ++i ){
			if( object[childNodes[i].nodeName] !== undefined ){
				if( !Array.isArray(object[childNodes[i].nodeName]) ){
					object[childNodes[i].nodeName] = [ object[childNodes[i].nodeName] ];
				}
				object[childNodes[i].nodeName].push(this.XMLtoObject(childNodes[i]));
			}
			object[childNodes[i].nodeName] = this.XMLtoObject(childNodes[i]);
		}
		
		return object;
	}
	
	STAMLTransformer.prototype.XMLtoTaggedObject = function(isArray, setting, xmlNode){
		if( xmlNode.childNodes.length === 1 && xmlNode.firstChild.nodeType === 3 ){
			return xmlNode.firstChild.nodeValue.escape();
		}

		var array = [];
		var childNodes = xmlNode.childNodes;
		console.log(childNodes);
		for( var i = 0 ; i < childNodes.length ; ++i ){
			if( childNodes[i].nodeType === 3 ){
				array.push(childNodes[i].nodeValue.escape());
				continue;
			}
			
			var object = {};
			object.type = childNodes[i].nodeName;
			if( childNodes[i].hasAttribute("subtype") ){
				object.subtype = childNodes[i].getAttribute("subtype");
			}
			
			for( var name in setting ){
				if( childNodes[i].hasAttribute(name+"Ref") ){
					object[name] = setting[name][childNodes[i].getAttribute(name+"Ref")];
				}
			}
			
			object.content = this.XMLtoTaggedObject((object.type === "chapter" || object.type === "section"), setting, childNodes[i]);
			array.push(object);
		}
		
		if( !isArray ){
			return array[0];
		}
		else{
			return array;
		}
	}
	
	
	STAMLTransformer.prototype.objectToXML = function(object){
		if( String.isString(object) ){
			return object.escape();
		}
		
		if( Array.isArray(object) ){
			return object.map(this.objectToXML).join(" ");
		}
		
		var xmlString = "";
		for( var key in object ){
			xmlString += "<" + key + ">" + this.objectToXML(object[key]) + "</" + key + ">";
		}
		return xmlString;
	}
	
	STAMLTransformer.prototype.taggedObjectToXML = function(setting, object){
		if( String.isString(object) ){
			return object.escape();
		}
		
		if( Array.isArray(object) ){
			return object.map(this.taggedObjectToXML.bind(this, setting)).join("");
		}
		

		var xmlString = "<";
		console.log(object);
		xmlString += object.type;
		
		if( object.subtype ){
			xmlString += " subtype='" + object.subtype + "'";
		}
		
		for( var name in setting ){
			if( object[name] !== undefined ){
				xmlString += " " + name + "Ref='" + setting[name].length + "'";
				object[name]["refID"] = setting[name].length.toString();
				setting[name].push(object[name]);
			}
		}
		xmlString += ">";
		
		xmlString += this.taggedObjectToXML(setting, object.content);
		
		xmlString += "</" + object.type + ">";
		return xmlString;
	}

	STAMLTransformer.prototype.merge = function(document, article){
		/*
			document : {
									 metadata: { title: ...., author: ...., date: ....., .......},
									 userdata: { ....... },
									 linkdata: { ....... },
									 application: { ....... }
								 }

			article : [{
									type: "chapter",
									content: [
															{
																type: "section",
																content: [
																	".....",
																	{
																		type: "person event datetime location thing",
																		content: {
																			type: "person event datetime location thing",
																			content: "",
																			userdata: { ....... },
			 																linkdata: { ....... },
			 																application: { ....... }
																		},
																		userdata: { ....... },
		 																linkdata: { ....... },
		 																application: { ....... }
																	}, ....
																],
																userdata: { ....... },
 																linkdata: { ....... },
 																application: { ....... }
															}, .....
													 ],
									userdata: { ....... }
									linkdata: { ....... }
									application: { ....... }
								},
								...... ]

		*/

		var xmlString = "<STAML><metadata></metadata><article></article><application></application><userdata></userdata><linkdata></linkdata></STAML>";
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(xmlString, "text/xml");

		var setting = { userdata: [], linkdata: [], application: [] };
		var itemName = { userdata: "data", linkdata: "link", application: "appdata"};
		
		/* metadata */
		var metadata = document.metadata;
		var metadataNode = xmlDoc.getElementsByTagName("metadata")[0];
		for( var key in metadata ){
			if( setting[key] !== undefined ){
				var attribute = xmlDoc.createAttribute(key + "Ref");
				attribute.value = setting[key].length.toString();
				metadata[key]["refID"] = setting[key].length.toString();
				setting[key].push(metadata[key]);
				metadataNode.setAttributeNode(attribute);
			}
			else{
				var result = this.taggedObjectToXML(setting, metadata[key]);
				var node = xmlDoc.createElement(key);
				appendAllChildren( result, node );
				metadataNode.appendChild(node);
			}
		}
		
		/* article */
		var articleNode = xmlDoc.getElementsByTagName("article")[0];
		appendAllChildren( this.taggedObjectToXML(setting, article), articleNode );
		
		
		/* userdata, linkdata, application */
		for( var key in setting ){
			var node = xmlDoc.getElementsByTagName(key)[0];
			if( document[key] !== undefined ){
				appendAllChildren( "<" + itemName[key] + ">" + this.objectToXML(document[key]) + "</" + itemName[key] + ">", node);
			}
			
			for( var i = 0 ; i < setting[key].length ; ++i ){
				appendAllChildren( "<" + itemName[key] + ">" + this.objectToXML(setting[key][i]) + "</" + itemName[key] + ">", node);
			}
		}
		
		return new XMLSerializer().serializeToString(xmlDoc);
	}

	STAMLTransformer.prototype.unmerge = function(STAMLcontext){
		//var metadata = {}, sections = [], application = [];
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(STAMLcontext, "text/xml");
		
		var setting = { userdata: [], linkdata: [], application: [] };
		var itemName = { userdata: "data", linkdata: "link", application: "appdata"};
		
		var document = { metadata: {} }, article = {};
		/* userdata, linkdata, application */
		for( var key in setting ){
			var node = xmlDoc.getElementsByTagName(key)[0];
			var childNodes = node.childNodes;
			
			for( var i = 0 ; i < childNodes.length ; ++i ){
				if( childNodes[i].hasAttribute("refID") ){
					setting[key][childNodes[i].getAttribute("refID")] = this.XMLtoObject(childNodes[i]);
				}
				else{
					document[key] = this.XMLtoObject(childNodes[i]);				
				}
			}
		}
		
		/* article */
		var articleNode = xmlDoc.getElementsByTagName("article")[0];
		article = this.XMLtoTaggedObject(true, setting, articleNode);
		
		/* metadata */
		var metadataNode = xmlDoc.getElementsByTagName("metadata")[0];
		var metadataChildNodes = metadataNode.childNodes;
		for( var i = 0 ; i < metadataChildNodes.length ; ++i ){
			var isRef = false;
			for( var key in setting ){
				if( metadataChildNodes[i].nodeName == key + "Ref" ){
					document.metadata[metadataChildNodes[i].nodeName] = setting[key][metadataChildNodes[i].value];
					isRef = true;
					break;
				}
			}
			
			if( !isRef ){
				document.metadata[metadataChildNodes[i].nodeName] = this.XMLtoTaggedObject(false, setting, metadataChildNodes[i]);
			}
		}
		
		console.log(document);
		console.log(article);
		
		return {
			document: document,
			article: article
		};
		/*
		var userdata = {}, linkdata = {};
		var dataNodes = xmlDoc.getElementsByTagName("userdata")[0].getElementsByTagName("data");
		for( var i = 0 ; i < dataNodes.length ; i++ ){
			var data = { id: dataNodes[i].getAttribute("refID") };
			var childNodes = dataNodes[i].childNodes;
			for( var j = 0 ; j < childNodes.length ; j++ ){
				if( childNodes[j].nodeType === 1 ){
					data[childNodes[j].nodeName] = childNodes[j].firstChild.nodeValue;
				}
			}

			userdata[data.id] = data;
		}


		var linkNodes = xmlDoc.getElementsByTagName("linkdata")[0].getElementsByTagName("link");
		for( var i = 0 ; i < linkNodes.length ; i++ ){
			var link = { id: linkNodes[i].getAttribute("refID") };
			var childNodes = linkNodes[i].childNodes;
			for( var j = 0 ; j < childNodes.length ; j++ ){
				if( childNodes[j].nodeType === 1 ){
					link[childNodes[j].nodeName] = childNodes[j].firstChild.nodeValue;
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

		var metadataNodes = xmlDoc.getElementsByTagName("metadata")[0].childNodes;
		for( var i = 0 ; i < metadataNodes.length ; i++ ){
			if( metadataNodes[i].nodeType === 1 ){
				metadata[metadataNodes[i].nodeName] = this.XMLtoContent(metadataNodes[i], userdata, linkdata);
			}
		}

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

		return {
			metadata: metadata,
			sections: sections,
			application: application
		};
		*/
	}

	return STAMLTransformer;
})();
