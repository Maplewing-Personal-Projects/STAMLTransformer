var ChineseDateProcessing = (function(){
  function ChineseDateProcessing(context){
    this.context = (new DOMParser()).parseFromString(context, "text/xml");
    this.userdata = [];
    this.lastUserDataId = [].slice.call(this.context.getElementsByTagName("data")).reduce(function(lastId, x){
      if( x.hasAttribute("refID") ){
        lastId = Math.max(lastId, parseInt(x.getAttribute("refID")));
      }
    }, 0);
  }
  
  ChineseDateProcessing.prototype.turnChineseToNumber = function(year){
    year = year.toString();
    var number = 0;
    for( var i = 0 ; i < year.length ; ++i ){
      for( var j = 0 ; j < ChineseDateProcessing.numbers.length ; ++j ){
        if( year[i] === ChineseDateProcessing.numbers[j] ){
          if( ChineseDateProcessing.numberRef[j] === 10 ){
            number *= ChineseDateProcessing.numberRef[j];
          }
          else{
            number += ChineseDateProcessing.numberRef[j];
          }
        }
      }
    }
    
    return number - 1;
  }
  
  ChineseDateProcessing.prototype.findYear = function(nianhow, year){
    if( ChineseDateProcessing.yearMatch[nianhow] ){
      return ChineseDateProcessing.yearMatch[nianhow] + this.turnChineseToNumber(year);
    }
    else return -1;
  }
  
  ChineseDateProcessing.prototype.convert = function(){
    this.convertedContext = (new DOMParser()).parseFromString("<article></article>", "text/xml");
    var match;
    
    var articleNode = this.convertedContext.getElementsByTagName("article")[0];
    
    var chapters = this.context.getElementsByTagName("chapter");
    for( var i = 0 ; i < chapters.length ; ++i ){
      var chapterNode = this.convertedContext.createElement("chapter");
      var sections = chapters[i].getElementsByTagName("section");
      for( var j = 0 ; j < sections.length ; ++j ){
        var sectionNode = this.convertedContext.createElement("section");
        var childNodes = sections[j].childNodes;
        for( var k = 0 ; k < childNodes.length ; ++k ){
          if( childNodes[k].nodeType === 3 ){
            var convertString = "<append>";
            var regExp = new RegExp(ChineseDateProcessing.regExpHead + ChineseDateProcessing.regExpTail, "g");
            var lastIndex = 0;
            while( (match = regExp.exec(childNodes[k].nodeValue)) != null ){
              convertString += childNodes[k].nodeValue.substring(lastIndex, match.index);
              lastIndex = match.index + match[0].length;
              convertString += "<datetime"
              
              var year = this.findYear(match[3], match[4]);
              if( year !== -1 ){
                convertString += " userdataRef='" + this.lastUserDataId + "'";
                this.userdata.push({refID: this.lastUserDataId.toString(), note: "西元" + year + "年"});
                ++this.lastUserDataId;
              }
              convertString += ">" + match[0] + "</datetime>";
              
            }
            convertString += childNodes[k].nodeValue.substring(lastIndex, childNodes[k].nodeValue.length);
            convertString += "</append>";
            
            var convertXML = (new DOMParser()).parseFromString(convertString, "text/xml");
            var convertRootChildren = convertXML.getElementsByTagName("append")[0].childNodes;
            for( var l = 0 ; l < convertRootChildren.length ; ++l ){
              appendAllChildren((new XMLSerializer().serializeToString(convertRootChildren[l])), sectionNode );
            }
          }
          else{
            appendAllChildren((new XMLSerializer().serializeToString(childNodes[k])), sectionNode );
          }
        }
        appendAllChildren((new XMLSerializer().serializeToString(sectionNode)), chapterNode );
      }
      appendAllChildren((new XMLSerializer().serializeToString(chapterNode)), articleNode );
    }
    
    var originalArticleNode = this.context.getElementsByTagName("article")[0];
    var articleChild = this.context.getElementsByTagName("article")[0].childNodes;
    while( originalArticleNode.hasChildNodes() ){
      originalArticleNode.removeChild(originalArticleNode.firstChild);
    }
    
    for( var i = 0 ; i < articleNode.childNodes.length ; ++i ){
      appendAllChildren( (new XMLSerializer().serializeToString(articleNode.childNodes[i])), originalArticleNode)
    }
    
    var userdataNode = this.context.getElementsByTagName("userdata")[0];
    for( var i = 0 ; i < this.userdata.length ; ++i ){
      appendAllChildren( "<data refID='" + this.userdata[i].refID + "'><note>" + this.userdata[i].note + "</note></data>", userdataNode);
    }
    
    return (new XMLSerializer()).serializeToString(this.context);
    
  }
  
  ChineseDateProcessing.dynasties = "黃帝軒轅氏|少昊金天氏|顓頊高陽氏|帝嚳高辛氏|帝摯高辛氏|唐堯|虞舜|夏|商|桓楚|北遼|代|南明|漢趙|西遼|西梁|西燕|翟魏|冉魏|仇池|丁零|後金|周|西周|東周|春秋|戰國|秦|楚|漢|西漢|新|更始帝|東漢|曹魏|蜀漢|孫吳|晉|西晉|東晉|前趙|成漢|後趙|前涼|前燕|前秦|後秦|後燕|西秦|後涼|南涼|南燕|西涼|北涼|胡夏|北燕|劉宋|南齊|南梁|陳|北魏|東魏|西魏|北齊|北周|隋|唐|武周|後梁|後唐|後晉|後漢|後周|南吳|前蜀|吳越|南楚|南漢|閩|南平|後蜀|南唐|北漢|趙宋|北宋|南宋|遼|契丹|金|大金|元|大元|西夏|明|大明|清|大清|民國|日本|三秦|吳魏|南北朝|南朝|陳隋|唐宋|侯漢|蒙古|西元|公元";
  
  ChineseDateProcessing.emperor_names = "桓玄|宣宗|德妃|梁王|高祖|福王|唐王|魯王|桂王|烈帝|少主|德宗|感天后|仁宗|承天后|末主|宣帝|孝明帝|莒公|濟北王|威帝|段隨|慕容顗|慕容瑤|慕容忠|慕容永|翟遼|翟釗|魏武悼天王|太祖|太宗|始皇帝|二世|三世|西楚霸王|懷王|更始帝|孺子嬰|惠帝|呂后|文帝|景帝|武帝|昭帝|元帝|成帝|哀帝|平帝|王莽|光武帝|明帝|章帝|和帝|殤帝|安帝|順帝|沖帝|質帝|桓帝|靈帝|少帝|獻帝|北鄉侯|邵陵厲公|齊王|廢帝|高貴鄉公|昭烈帝|後主|大帝|歸命侯|懷帝|愍帝|康帝|穆帝|海西公|簡文帝|孝武帝|恭帝|趙王|始祖|幽公|中宗|海陽王|義陽王|新興王|忠成公|敬烈公|長寧侯|敬悼公|涼悼公|張大豫|烈祖|幽帝|厲王|世祖|哀平帝|延初帝|烈宗|開封公|昭文帝|蘭汗|建康公|康王|景公|世宗|北海王|涼公|李恂|哀王|拓王|武拓王|秦王|惠懿帝|文成帝|昭成帝|前廢帝|蒼梧王|後廢帝|劉劭|高帝|鬱林王|海陵王|東昏侯|豫章王|貞陽侯|敬帝|武陵王|臨海王|長城公|道武帝|明元帝|太武帝|南安王|獻文帝|孝文帝|宣武帝|孝莊帝|長廣王|東海王|節閔帝|安定王|出帝|平陽王|元釗|孝靜帝|文宣帝|濟南王|孝昭帝|武成帝|溫公|安德王|承光帝|孝閔帝|天王|靜帝|煬帝|高宗|睿宗|玄宗|肅宗|代宗|順宗|憲宗|穆宗|敬宗|文宗|武宗|懿宗|僖宗|昭宗|則天皇后|郢王|末帝|莊宗|明宗|閔帝|潞王|隱帝|睿帝|太祖武肅王|世宗文穆王|成宗忠獻王|忠遜王|忠懿王|康宗|景宗|恭懿王|嗣王|元宗|英武帝|真宗|英宗|神宗|哲宗|徽宗|欽宗|孝宗|光宗|寧宗|理宗|度宗|端宗|帝昺|聖宗|興宗|道宗|天祚帝|淳欽皇后|熙宗|章宗|衛紹王|哀宗|成宗|泰定帝|天順帝|毅宗|惠宗|崇宗|桓宗|襄宗|獻宗|成祖|熹宗|思宗|聖祖|恭宗|民國紀元|侯景|太宗后|定宗|定宗后";
  
  ChineseDateProcessing.eras = "龍飛|龍紀|龍朔|龍德|龍啟|龍升|黃龍|黃武|黃初|麟德|麟嘉|鴻嘉|鳳翔|鳳曆|鳳凰|顯道|顯慶|顯德|頒義|順義|順治|靖康|青龍|雍熙|雍正|雍寧|隆興|隆武|隆昌|隆慶|隆安|隆和|隆化|陽朔|陽嘉|開運|開興|開耀|開禧|開皇|開泰|開成|開慶|開平|開寶|開元|長興|長樂|長慶|長安|長壽|重熙|重和|道光|通正|通文|載初|赤烏|貞觀|貞祐|貞明|貞元|證聖|調露|萬歲通天|萬歲登封|萬曆|興平|興寧|興定|興安|興和|興光|興元|致和|至順|至道|至治|至正|至德|至寧|至大|至和|至元|聖曆|義熙|義寧|義和|總章|綏和|統和|紹興|紹聖|紹熙|紹泰|紹武|紹定|端拱|端平|章武|章和|竟寧|福聖承道|禎明|祥興|神龜|神龍|神鼎|神鳳|神璽|神瑞|神爵|神曆|神功|神冊|神䴥|真興|皇興|皇統|皇祐|皇慶|皇建|皇始|皇初|白龍|白雀|登國|甘露|玉衡|玉恒|玄始|燕興|燕王|燕元|熹平|熙平|熙寧|炎興|漢興|漢昌|漢安|清泰|清寧|淸泰|淳祐|淳熙|淳化|洪熙|洪武|洪始|泰豫|泰昌|泰常|泰寧|泰定|泰安|泰始|泰和|治平|河瑞|河清|河平|永鳳|永隆|永貞|永興|永熹|永熙|永漢|永淳|永洪|永泰|永樂|永曆|永明|永昌|永憙|永徽|永弘|永建|永康|永平|永崇|永寧|永定|永宏|永安|永始|永壽|永嘉|永和|永初|永光|永元|民國|武義|武泰|武成|武德|武平|武定|正隆|正豐|正觀|正統|正明|正德|正平|正始|正大|正光|正元|本始|本初|會昌|會同|更始|景龍|景雲|景耀|景福|景祐|景炎|景泰|景明|景德|景平|景定|景和|景初|景元|普通|普泰|晏平|昭寧|明道|明昌|明慶|明德|昌武|昌平|昇明|昇平|昇元|文明|文德|政和|收國|拱化|承陽|承聖|承玄|承明|承康|承平|承安|承和|承光|成化|應順|應曆|應天|應乾|慶曆|慶元|德興|德祐|德昌|征和|弘道|弘治|弘昌|弘始|弘光|建隆|建衡|建興|建義|建福|建熙|建炎|建武中元|建武|建昭|建明|建文|建德|建弘|建康|建平|建寧|建宏|建安|建始|建國|建和|建初|建光|建元|建中靖國|建中|延載|延興|延祐|延熹|延熙|延昌|延慶|延康|延平|延嗣甯國|延和|延初|延光|廣順|廣運|廣明|廣政|廣德|廣大|廣初|康熙|康定|康國|庚寅|庚子|崇福|崇禎|崇慶|崇德|崇寧|崇安|崇和|居攝|寶鼎|寶貞|寶義|寶祐|寶歷|寶正|寶曆|寶應|寶慶|寶太|寶大|寶元|寧康|宣統|宣政|宣德|宣平|宣和|定鼎|孝昌|孝建|始建國|始建|始光|始元|如意|奲都|太興|太熙|太清|太極|太昌|太建|太延|太康|太平興國|太平真君|太平|太寧|太安|太始|太和|太初元將|太初|太元|太上|天鳳|天顯|天順|天鑑|天輔|天贊|天賜禮盛國慶|天賜|天興|天聰|天聖|天統|天紀|天禧|天福|天祿|天祚|天祐|天眷|天監|天盛|天璽|天漢|天正|天會|天曆|天授禮法延祚|天授|天成|天慶|天德|天復|天康|天平|天寶|天安禮定|天安|天嘉|天啟|天和|天命|天冊萬歲|天冊|天儀治平|天保|天佑民安|天佑垂聖|大順|大通|大足|大象|大觀|大統|大業|大有|大曆|大明|大成|大慶|大德|大延|大康|大平|大寶|大寧|大定|大安|大和|大同|大亨|大中祥符|大中|壽隆|壽昌|壽光|垂拱|地節|地皇|嘉靖|嘉興|嘉禾|嘉祐|嘉熙|嘉泰|嘉慶|嘉平|嘉寧|嘉定|嗣聖|唐隆|唐興|唐安|唐元|咸雍|咸通|咸豐|咸熙|咸清|咸淳|咸康|咸平|咸寧|咸安|咸和|咸亨|和平|同治|同光|升平|升元|勝光|初平|初始|初元|光興|光緒|光熹|光熙|光慶|光定|光宅|光始|光天|光大|光壽|光啟|光和|光化|光初|先天|元鼎|元鳳|元貞|元象|元豐|元興|元統|元符|元祐|元璽|元狩|元熙|元朔|元徽|元德|元延|元康|元平|元封|元始|元壽|元嘉|元和|元初|元光|儀鳳|保貞|保寧|保定|保大|佐初|仁壽|人慶|交泰|五鳳|乾隆|乾道|乾貞|乾興|乾統|乾符|乾祐|乾甯|乾明|乾德|乾封|乾寧|乾定|乾和|乾化|乾元|乾佑|乾亨|久視|中興|中統|中平|中大通|中大同|中和|上元|西元|公元";
  
  ChineseDateProcessing.numbers = "0123456789零０一乙壹正元二貳三參四肆五伍六陸七柒八捌九玖十拾時廿廾念卅";
  ChineseDateProcessing.numberRef = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 10, 20, 20, 20, 30]; // T:10, X:20, Y:30
  
  ChineseDateProcessing.yearMatch = {
    "康熙": 1662,
    "雍正": 1723,
    "乾隆": 1736
  }
  
  ChineseDateProcessing.regExpHead = "(" + ChineseDateProcessing.dynasties + ")?" + 
                                     "(" + ChineseDateProcessing.emperor_names + ")?" +
                                     "(" + ChineseDateProcessing.eras + ")";
  ChineseDateProcessing.regExpTail = "(.{0,6}?)年([閏潤後])?(?:(.{0,5}?)月)?(?:(.{0,5}?)日)?";
                                      
  
  return ChineseDateProcessing;
  
})();
