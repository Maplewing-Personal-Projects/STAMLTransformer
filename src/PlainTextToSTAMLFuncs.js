var PlainTextToSTAMLFuncs = (function(){
	return {
		documentInformation: function( context ){
			return {
				metadata: {}
			};
		},
		articleInformation: function( context ){
			
			return {
        type: "chapter",
        content: context.split("\n\n").map(function(section){ return {type: "section", content: [ section ] }})  
      };
		},

		mergeToContext: function( input ){
			var sections = input.article;
      
			// sections
			var contents = "";
			for( var i = 0 ; i < sections.length ; i++ ){
				for( var j = 0 ; j < sections[i].content.length ; j++ ){
					for( var k = 0 ; k < sections[i].content[j].content.length ; k++ ){
						for( var content = sections[i].content[j].content[k] ; !String.isString(content) ; content = content.content );
            contents += content; 
					}
          contents += "\n\n";
			  }
			}

			return contents;
		}
	};
})();
