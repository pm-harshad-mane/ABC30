(function() {
	var parseResponse = function(resp) {
		if (window.console) console.log("RESPONSE %o", resp);
		try {
			if (!resp.ads || !resp.siteSection) return;
			var crs = {};
			var ads = resp.ads[0]._.ad;
			for (var a=0; a<ads.length; a++) {
				var ad = ads[a];
				for (var c=0; c<ad._.creatives[0]._.creative.length; c++) {
					var creative = ad._.creatives[0]._.creative[c];
					for (var r=0; r<creative._.creativeRenditions[0]._.creativeRendition.length; r++) {
						var creativeRendition = creative._.creativeRenditions[0]._.creativeRendition[r];
						for (var s=0; s<creativeRendition._.asset.length; s++) {
							try {
								var asset = creativeRendition._.asset[s];
								var content = asset._.content[0]._;
								var contentType = asset.contentType;
								crs['_' + ad.adId + '_'+creativeRendition.creativeRenditionId+'_'+creativeRendition.adReplicaId] = content;
							} catch (e) {
								if (window.console) console.log("invalid creative rendition asset %o", e);
							}
						}
					}
				}
			}
			if (window.console) console.log("RENDITIONS", crs);
			var cnt=0;
			for (var s=0; s<resp.siteSection[0]._.adSlots[0]._.adSlot.length; s++) {
				var slot = resp.siteSection[0]._.adSlots[0]._.adSlot[s];
				for (var a=0; a<slot._.selectedAds[0]._.adReference.length; a++) {
					var adReference = slot._.selectedAds[0]._.adReference[a];
					var cbURLs = [];
					var cbs = adReference._.eventCallbacks[0]._.eventCallback;
					for (var cb=0; cb<cbs.length; cb++) {
						if (cbs[cb].name=='defaultImpression') {
							cbURLs.push(cbs[cb].url);
							if (cbs[cb]._ && cbs[cb]._.trackingURLs) {
								if (cbs[cb]._.trackingURLs[0]._) {
									var trackingURLs = cbs[cb]._.trackingURLs[0]._.url;
									for (var index = 0; index < trackingURLs.length; ++index) {
										cbURLs.push(trackingURLs[index].value);
									}
								}
							}
						}
					}
					dealSlot(slot.customId, crs['_' + adReference.adId + '_' + adReference.creativeRenditionId + '_' + adReference.replicaId], cbURLs);
				}
			}
			var needRefresh = false;
			var refreshInterval = 0;
			if (resp.parameters) {
				for (var p = 0; p < resp.parameters[0]._.parameter.length; p++) {
					var param = resp.parameters[0]._.parameter[p];
					if (param.name == "refreshType" && param._ == "time") needRefresh = true;
					if (param.name == "refreshInterval") refreshInterval = parseInt(param._ , 10);
				}
			}
			if (needRefresh && !isNaN(refreshInterval) && refreshInterval > 0 && window._fw_linktag_refresh) {
				window._fw_linktag_refresh(refreshInterval);
			}
		} catch (e) {
		    if (window.console) console.log("ERROR in parseResponse %o", e);
		}
	};
	var dealSlot = function(slid, html, cbURLs) {
		if (!slid || !html || !document.getElementById(slid)) return;
		if (window.console) console.log("SLOT %s AD str(%i) ACK %o", slid, html.length, cbURLs);
		//setTimeout(function(){
			try {
				fillSlot(slid, html);
				for (var i = 0; i < cbURLs.length; ++i) {
					if (cbURLs[i] && cbURLs[i].length) sendCallback(slid, cbURLs[i]);
				}
			} catch (e) {
			    if (window.console) console.log("ERROR in dealing slot %o", e);
			}
		//}, Math.floor(Math.random()*10+1));
	};
	var fillSlot = function(safeId, innerHTML) {
		var adContainer = document.getElementById('_fw_container_'+safeId);
		if (!adContainer) return;
		if (navigator.appVersion.match(/\bMSIE\b/)){ // IE8 innerHTMl setter bug
			adContainer.innerHTML = '<img id="_fw_img_placeholder" border="0" width="0" height="0" style="display:none;border:0px;width:0px;height:0px;padding:0px;margin:0px;">' + innerHTML;
			var p = adContainer.firstChild;
			if (p.id == '_fw_img_placeholder') {
				adContainer.removeChild(p);
			}
		} else {
			adContainer.innerHTML = innerHTML;
		}
		var scripts = adContainer.getElementsByTagName('script');
		var head = document.getElementsByTagName("head")[0];
		for (var i=0;i<scripts.length;i++) {
			var script = scripts[i];
			if (script.src) {
				var script2 = document.createElement("script");
				if (script.charset) script2.charset = script.charset;
				script2.src = script.src;
				script2.onload = script2.onreadystatechange = function(){ 
					if (!this.readyState || this.readyState == "loaded" || this.readyState == "complete") {
						head.removeChild( script2 );
					}
				};
				head.appendChild(script2);
			} else {
				eval(script.innerHTML);
			}
		}
		return 1;
	};
	var sendCallback = function(safeId, callbackURL) {
		if (!callbackURL) return 0;
		var img= (navigator.appVersion.match(/\bMSIE\b/)) ? new Image() : document.createElement('img');
		img.id = '_fw_cb_' + safeId;
		img.src= callbackURL;
		img.border = "0";
		img.width="0";
		img.height="0";
		img.style.border = "0";
		img.style.height = "1px";
		img.style.width = "1px";
		img.style.position = "absolute";
		img.style.top = "0";
		img.style.left = "0";
		img.style.zIndex = "999";
		img.style.backgroundColor = "transparent";
		img.style.backgroundImage = "none";
		img.style.padding = "0";
		img.style.margin = "0";
		img.style.filter = "Alpha(Opacity=0)";
		img.style.visibility = "hidden";
		if (document.body) {
			if (document.body.insertBefore && document.body.childNodes[0]) {
				document.body.insertBefore(img, document.body.childNodes[0]);
			} else {
			  document.body.appendChild(img);
		  }
	  }
		return 1;
	};
	parseResponse({
  "parameters":[
  {_:{
    "parameter":[
    {category:"profile", name:"enableCpxHtmlExpansion", _:"1"
    }]}
  }],
  "errors":[
  {_:{
    "error":[
    {id:"3", name:"INVALID_ASSET_CUSTOM_ID", severity:"WARN", _:{
      "context":[
      {_:"7651"
      }]}
    }]}
  }],
  "visitor":[
  {_:null
  }],
  "ads":[
  {_:{
    "ad":[
    {adId:"23949718", adUnit:"27448", _:{
      "creatives":[
      {_:{
        "creative":[
        {adUnit:"still-image", baseUnit:"still-image", creativeId:"3547569", duration:"15", _:{
          "creativeRenditions":[
          {_:{
            "creativeRendition":[
            {adReplicaId:"0", creativeApi:"None", creativeRenditionId:"9823708", height:"90", preference:"0", width:"970", _:{
              "asset":[
              {bytes:"3908", contentType:"text/html_lit_js_wc_nw", id:"9743865", mimeType:"text/html", name:"Default Asset for Rendition", _:{
                "content":[
                {_:"<span data-width=\"970\" data-height=\"90\" style=\"display:inline-block; vertical-align:top; margin:0;\"><iframe id=\"_fw_frame_kfsn_main_Leaderboard 728x90|Leaderboard 970x90\" width=\"970\" height=\"90\" marginwidth=\"0\" marginheight=\"0\" frameborder=\"0\" scrolling=\"no\" ALLOWTRANSPARENCY=\"true\"><\/iframe>\n<script language=\"javascript\" type=\"text/javascript\" id=\"_fw_container_js_kfsn_main_Leaderboard 728x90|Leaderboard 970x90\">//<!-- \n  (function(){\n    var fw_scope_window = window;\n    var fw_scope = document;\n    var fw_content = \"<!DOCTYPE HTML PUBLIC \\\"-//W3C//DTD HTML 4.01 Transitional//EN\\\" \\\"http://www.w3.org/TR/html4/loose.dtd\\\">\\n<html>\\n<head>\\n\\t<title>Advertisement<\/title>\\n\\t<scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\">window._fw_page_url = \\\"http://abc30.com/\\\";<\/scr\" + \"ipt>\\n<\/head>\\n<body style=\\\"margin:0px;background-color:transparent;\\\"><scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\">\\n\\t\\tvar pubId=51217;\\n\\t\\tvar siteId=66008;\\n\\t\\tvar kadId=1348546;\\n\\t\\tvar kadwidth=970;\\n\\t\\tvar kadheight=90;\\n\\t\\tvar kadtype=1;\\n\\t\\tvar kadpageurl = \\\"abc30.com\\\";\\n<\/scr\" + \"ipt>\\n<scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\" src=\\\"http://ads.pubmatic.com/AdServer/js/showad.js\\\"><\/scr\" + \"ipt><\/body>\\n<\/html>\";\n    var targetFrame = fw_scope.getElementById(\"_fw_frame_kfsn_main_Leaderboard 728x90|Leaderboard 970x90\");\n    var targetFrameDoc = (targetFrame.contentWindow) ? targetFrame.contentWindow : (targetFrame.contentDocument.document) ? targetFrame.contentDocument.document : targetFrame.contentDocument;\n    var writeContent = function(doc, content) {\n      var timeout = 0;\n      if(navigator.userAgent.match(/MSIE/) || navigator.userAgent.match(/Opera/)){\n        timeout = 7500;\n      } else if(navigator.userAgent.match(/Gecko\\//)) {\n        timeout = 30000;\n      }\n      targetFrameDoc.document.open();\n      targetFrameDoc.document.write(fw_content);\n      if (timeout>0) { setTimeout(function(){if (!!targetFrameDoc.document) targetFrameDoc.document.close()}, timeout); }\n      else if (!timeout) { targetFrameDoc.document.close(); }\n    }\n    var hasNoSandbox = false;\n    if ('never' == \"never\"){\n    \thasNoSandbox = true;\n    }\n    else if ('never' == \"always\"){\n    \thasNoSandbox = false;\n    }\n    else{\n    \thasNoSandbox = fw_content.indexOf(\"<!-\"+\"-nosandbox-\"+\"->\") >= 0 || fw_content.indexOf(\"<!-\"+\"-noecho-\"+\"->\") >= 0 || !!'';\n    }\n    var slotContentKey = \"_fw_slot_content_kfsn_main_Leaderboard 728x90|Leaderboard 970x90\";\n    var proxyHtml = window._fw_xd_proxy ? window._fw_xd_proxy : \"/_fw_xd_frame.html\";\n    if(hasNoSandbox) {\n      try {\n        if(!navigator.userAgent.match(/Gecko\\//)) { \n\t\t\t\t\twriteContent(targetFrameDoc, fw_content, 7500);\n\t\t\t\t} else if (targetFrameDoc.document.readyState == \"complete\" || targetFrameDoc.document.readyState == \"interactive\" ){\n          writeContent(targetFrameDoc, fw_content, 7500);\n        } else {\n\t\t\t\t\ttargetFrame.onload = function(){\n\t\t\t\t\t\twriteContent(targetFrameDoc, fw_content, 7500);\n\t\t\t\t\t};\n\t\t\t\t}\n      } catch (e) {\n        fw_scope_window[slotContentKey] = fw_content;\n        targetFrame.src = proxyHtml + \"?slid=kfsn_main_Leaderboard 728x90|Leaderboard 970x90&domain=\" + document.domain;\n      }\n    } else {\n      fw_scope_window[slotContentKey] = fw_content;\n      try {\n        targetFrameDoc.document.write('<script> window.name = parent[\"' + slotContentKey + '\"] + \"<!--\" + Math.random() + \"-->\"; window.location.replace(\"http://m2.feiwei.tv/g/lib/template/sandbox.html\");<\\/script>');\n      } catch(e) {\n        if((/MSIE 6/i.test(navigator.userAgent) && document.domain == fw_scope_window.location.hostname) ||\n            navigator.userAgent.match(/Gecko\\//) || navigator.userAgent.match(/Safari\\//)) {\n        } else {\n          targetFrame.src = proxyHtml + \"?sandbox&slid=kfsn_main_Leaderboard 728x90|Leaderboard 970x90&domain=\" + document.domain;\n        }\n      }\n    }\n  })();\n// --><\/script>\n<\/span>\n"
                }]}
              }]}
            }]}
          }],
          "parameters":[
          {_:{
            "parameter":[
            {name:"moat", _:"168285;168285;;;;;22267737;27448;;g221752;959566;g927383;7651;3547569;9823708;15;;;168285:otv_web_display;cpx-non;1532540222640779021"
            },
            {name:"moat_callback", _:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=23949718&reid=9823708&arid=0&absid=&trigid=&et=i&cn=concreteEvent"
            }]}
          }]}
        }]}
      }]}
    },
    {adId:"12675659", adUnit:"45126", _:{
      "creatives":[
      {_:{
        "creative":[
        {adUnit:"fixed-size-interactive", baseUnit:"fixed-size-interactive", creativeId:"1842370", duration:"15", _:{
          "creativeRenditions":[
          {_:{
            "creativeRendition":[
            {adReplicaId:"0", creativeApi:"None", creativeRenditionId:"4252331", height:"1", preference:"0", width:"1", _:{
              "asset":[
              {bytes:"6659", contentType:"text/html_lit_js_wc_nw", id:"4194863", mimeType:"text/html", name:"external url/tag for Default asset package of  - 1", _:{
                "content":[
                {
                	_:"<script type=\"text/javascript\">(function(){ var script = document.createElement('script'); script.async = true; script.type = 'text/javascript'; script.src = 'http://ads.pubmatic.com/AdServer/js/userSync.js'; script.onload = function(){ PubMaticSync.sync({ pubId: 51217 }); }; var node = document.getElementsByTagName('script')[0]; node.parentNode.insertBefore(script, node); })();<\/script>"
                }]}
              }]}
            }]}
          }],
          "parameters":[
          {_:{
            "parameter":[
            {name:"moat", _:"168285;168285;;;;;12674279;45126;;g221752;959566;g927383;7651;1842370;4252331;15;;;168285:otv_web_display;cpx-non;1532540222640779021"
            },
            {name:"moat_callback", _:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=12675659&reid=4252331&arid=0&absid=&trigid=&et=i&cn=concreteEvent"
            }]}
          }]}
        }]}
      }]}
    },
    {adId:"23949719", adUnit:"27449", _:{
      "creatives":[
      {_:{
        "creative":[
        {adUnit:"still-image", baseUnit:"still-image", creativeId:"3547567", duration:"15", _:{
          "creativeRenditions":[
          {_:{
            "creativeRendition":[
            {adReplicaId:"0", creativeApi:"None", creativeRenditionId:"9823705", height:"90", preference:"0", width:"970", _:{
              "asset":[
              {bytes:"3920", contentType:"text/html_lit_js_wc_nw", id:"9743862", mimeType:"text/html", name:"Default Asset for Rendition", _:{
                "content":[
                {_:"<span data-width=\"970\" data-height=\"90\" style=\"display:inline-block; vertical-align:top; margin:0;\"><iframe id=\"_fw_frame_kfsn_main_Leaderboard2 728x90|Leaderboard2 970x90\" width=\"970\" height=\"90\" marginwidth=\"0\" marginheight=\"0\" frameborder=\"0\" scrolling=\"no\" ALLOWTRANSPARENCY=\"true\"><\/iframe>\n<script language=\"javascript\" type=\"text/javascript\" id=\"_fw_container_js_kfsn_main_Leaderboard2 728x90|Leaderboard2 970x90\">//<!-- \n  (function(){\n    var fw_scope_window = window;\n    var fw_scope = document;\n    var fw_content = \"<!DOCTYPE HTML PUBLIC \\\"-//W3C//DTD HTML 4.01 Transitional//EN\\\" \\\"http://www.w3.org/TR/html4/loose.dtd\\\">\\n<html>\\n<head>\\n\\t<title>Advertisement<\/title>\\n\\t<scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\">window._fw_page_url = \\\"http://abc30.com/\\\";<\/scr\" + \"ipt>\\n<\/head>\\n<body style=\\\"margin:0px;background-color:transparent;\\\"><scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\">\\n\\t\\tvar pubId=51217;\\n\\t\\tvar siteId=66008;\\n\\t\\tvar kadId=1348546;\\n\\t\\tvar kadwidth=970;\\n\\t\\tvar kadheight=90;\\n\\t\\tvar kadtype=1;\\n\\t\\tvar kadpageurl = \\\"abc30.com\\\";\\n<\/scr\" + \"ipt>\\n<scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\" src=\\\"http://ads.pubmatic.com/AdServer/js/showad.js\\\"><\/scr\" + \"ipt><\/body>\\n<\/html>\";\n    var targetFrame = fw_scope.getElementById(\"_fw_frame_kfsn_main_Leaderboard2 728x90|Leaderboard2 970x90\");\n    var targetFrameDoc = (targetFrame.contentWindow) ? targetFrame.contentWindow : (targetFrame.contentDocument.document) ? targetFrame.contentDocument.document : targetFrame.contentDocument;\n    var writeContent = function(doc, content) {\n      var timeout = 0;\n      if(navigator.userAgent.match(/MSIE/) || navigator.userAgent.match(/Opera/)){\n        timeout = 7500;\n      } else if(navigator.userAgent.match(/Gecko\\//)) {\n        timeout = 30000;\n      }\n      targetFrameDoc.document.open();\n      targetFrameDoc.document.write(fw_content);\n      if (timeout>0) { setTimeout(function(){if (!!targetFrameDoc.document) targetFrameDoc.document.close()}, timeout); }\n      else if (!timeout) { targetFrameDoc.document.close(); }\n    }\n    var hasNoSandbox = false;\n    if ('never' == \"never\"){\n    \thasNoSandbox = true;\n    }\n    else if ('never' == \"always\"){\n    \thasNoSandbox = false;\n    }\n    else{\n    \thasNoSandbox = fw_content.indexOf(\"<!-\"+\"-nosandbox-\"+\"->\") >= 0 || fw_content.indexOf(\"<!-\"+\"-noecho-\"+\"->\") >= 0 || !!'';\n    }\n    var slotContentKey = \"_fw_slot_content_kfsn_main_Leaderboard2 728x90|Leaderboard2 970x90\";\n    var proxyHtml = window._fw_xd_proxy ? window._fw_xd_proxy : \"/_fw_xd_frame.html\";\n    if(hasNoSandbox) {\n      try {\n        if(!navigator.userAgent.match(/Gecko\\//)) { \n\t\t\t\t\twriteContent(targetFrameDoc, fw_content, 7500);\n\t\t\t\t} else if (targetFrameDoc.document.readyState == \"complete\" || targetFrameDoc.document.readyState == \"interactive\" ){\n          writeContent(targetFrameDoc, fw_content, 7500);\n        } else {\n\t\t\t\t\ttargetFrame.onload = function(){\n\t\t\t\t\t\twriteContent(targetFrameDoc, fw_content, 7500);\n\t\t\t\t\t};\n\t\t\t\t}\n      } catch (e) {\n        fw_scope_window[slotContentKey] = fw_content;\n        targetFrame.src = proxyHtml + \"?slid=kfsn_main_Leaderboard2 728x90|Leaderboard2 970x90&domain=\" + document.domain;\n      }\n    } else {\n      fw_scope_window[slotContentKey] = fw_content;\n      try {\n        targetFrameDoc.document.write('<script> window.name = parent[\"' + slotContentKey + '\"] + \"<!--\" + Math.random() + \"-->\"; window.location.replace(\"http://m2.feiwei.tv/g/lib/template/sandbox.html\");<\\/script>');\n      } catch(e) {\n        if((/MSIE 6/i.test(navigator.userAgent) && document.domain == fw_scope_window.location.hostname) ||\n            navigator.userAgent.match(/Gecko\\//) || navigator.userAgent.match(/Safari\\//)) {\n        } else {\n          targetFrame.src = proxyHtml + \"?sandbox&slid=kfsn_main_Leaderboard2 728x90|Leaderboard2 970x90&domain=\" + document.domain;\n        }\n      }\n    }\n  })();\n// --><\/script>\n<\/span>\n"
                }]}
              }]}
            }]}
          }],
          "parameters":[
          {_:{
            "parameter":[
            {name:"moat", _:"168285;168285;;;;;22267737;27449;;g221752;959566;g927383;7651;3547567;9823705;15;;;168285:otv_web_display;cpx-non;1532540222640779021"
            },
            {name:"moat_callback", _:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=23949719&reid=9823705&arid=0&absid=&trigid=&et=i&cn=concreteEvent"
            }]}
          }]}
        }]}
      }]}
    },
    {adId:"22267738", adUnit:"23180", _:{
      "creatives":[
      {_:{
        "creative":[
        {adUnit:"still-image", baseUnit:"still-image", creativeId:"3153519", duration:"15", _:{
          "creativeRenditions":[
          {_:{
            "creativeRendition":[
            {adReplicaId:"0", creativeApi:"None", creativeRenditionId:"8657620", height:"250", preference:"0", width:"300", _:{
              "asset":[
              {bytes:"3788", contentType:"text/html_lit_js_wc_nw", id:"8579148", mimeType:"text/html", name:"Default Asset for Rendition", _:{
                "content":[
                {_:"<span data-width=\"300\" data-height=\"250\" style=\"display:inline-block; vertical-align:top; margin:0;\"><iframe id=\"_fw_frame_kfsn_main_Rectangle 300x250\" width=\"300\" height=\"250\" marginwidth=\"0\" marginheight=\"0\" frameborder=\"0\" scrolling=\"no\" ALLOWTRANSPARENCY=\"true\"><\/iframe>\n<script language=\"javascript\" type=\"text/javascript\" id=\"_fw_container_js_kfsn_main_Rectangle 300x250\">//<!-- \n  (function(){\n    var fw_scope_window = window;\n    var fw_scope = document;\n    var fw_content = \"<!DOCTYPE HTML PUBLIC \\\"-//W3C//DTD HTML 4.01 Transitional//EN\\\" \\\"http://www.w3.org/TR/html4/loose.dtd\\\">\\n<html>\\n<head>\\n\\t<title>Advertisement<\/title>\\n\\t<scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\">window._fw_page_url = \\\"http://abc30.com/\\\";<\/scr\" + \"ipt>\\n<\/head>\\n<body style=\\\"margin:0px;background-color:transparent;\\\"><scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\">\\n\\t\\tvar pubId=51217;\\n\\t\\tvar siteId=66008;\\n\\t\\tvar kadId=148343;\\n\\t\\tvar kadwidth=300;\\n\\t\\tvar kadheight=250;\\n\\t\\tvar kadtype=1;\\n\\t\\tvar kadpageurl=\\\"abc30.com\\\";\\n<\/scr\" + \"ipt>\\n<scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\" src=\\\"http://ads.pubmatic.com/AdServer/js/showad.js\\\"><\/scr\" + \"ipt><\/body>\\n<\/html>\";\n    var targetFrame = fw_scope.getElementById(\"_fw_frame_kfsn_main_Rectangle 300x250\");\n    var targetFrameDoc = (targetFrame.contentWindow) ? targetFrame.contentWindow : (targetFrame.contentDocument.document) ? targetFrame.contentDocument.document : targetFrame.contentDocument;\n    var writeContent = function(doc, content) {\n      var timeout = 0;\n      if(navigator.userAgent.match(/MSIE/) || navigator.userAgent.match(/Opera/)){\n        timeout = 7500;\n      } else if(navigator.userAgent.match(/Gecko\\//)) {\n        timeout = 30000;\n      }\n      targetFrameDoc.document.open();\n      targetFrameDoc.document.write(fw_content);\n      if (timeout>0) { setTimeout(function(){if (!!targetFrameDoc.document) targetFrameDoc.document.close()}, timeout); }\n      else if (!timeout) { targetFrameDoc.document.close(); }\n    }\n    var hasNoSandbox = false;\n    if ('never' == \"never\"){\n    \thasNoSandbox = true;\n    }\n    else if ('never' == \"always\"){\n    \thasNoSandbox = false;\n    }\n    else{\n    \thasNoSandbox = fw_content.indexOf(\"<!-\"+\"-nosandbox-\"+\"->\") >= 0 || fw_content.indexOf(\"<!-\"+\"-noecho-\"+\"->\") >= 0 || !!'';\n    }\n    var slotContentKey = \"_fw_slot_content_kfsn_main_Rectangle 300x250\";\n    var proxyHtml = window._fw_xd_proxy ? window._fw_xd_proxy : \"/_fw_xd_frame.html\";\n    if(hasNoSandbox) {\n      try {\n        if(!navigator.userAgent.match(/Gecko\\//)) { \n\t\t\t\t\twriteContent(targetFrameDoc, fw_content, 7500);\n\t\t\t\t} else if (targetFrameDoc.document.readyState == \"complete\" || targetFrameDoc.document.readyState == \"interactive\" ){\n          writeContent(targetFrameDoc, fw_content, 7500);\n        } else {\n\t\t\t\t\ttargetFrame.onload = function(){\n\t\t\t\t\t\twriteContent(targetFrameDoc, fw_content, 7500);\n\t\t\t\t\t};\n\t\t\t\t}\n      } catch (e) {\n        fw_scope_window[slotContentKey] = fw_content;\n        targetFrame.src = proxyHtml + \"?slid=kfsn_main_Rectangle 300x250&domain=\" + document.domain;\n      }\n    } else {\n      fw_scope_window[slotContentKey] = fw_content;\n      try {\n        targetFrameDoc.document.write('<script> window.name = parent[\"' + slotContentKey + '\"] + \"<!--\" + Math.random() + \"-->\"; window.location.replace(\"http://m2.feiwei.tv/g/lib/template/sandbox.html\");<\\/script>');\n      } catch(e) {\n        if((/MSIE 6/i.test(navigator.userAgent) && document.domain == fw_scope_window.location.hostname) ||\n            navigator.userAgent.match(/Gecko\\//) || navigator.userAgent.match(/Safari\\//)) {\n        } else {\n          targetFrame.src = proxyHtml + \"?sandbox&slid=kfsn_main_Rectangle 300x250&domain=\" + document.domain;\n        }\n      }\n    }\n  })();\n// --><\/script>\n<\/span>\n"
                }]}
              }]}
            }]}
          }],
          "parameters":[
          {_:{
            "parameter":[
            {name:"moat", _:"168285;168285;;;;;22267737;23180;;g221752;959566;g927383;7651;3153519;8657620;15;;;168285:otv_web_display;cpx-non;1532540222640779021"
            },
            {name:"moat_callback", _:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=22267738&reid=8657620&arid=0&absid=&trigid=&et=i&cn=concreteEvent"
            }]}
          }]}
        }]}
      }]}
    },
    {adId:"18571773", adUnit:"52732", _:{
      "creatives":[
      {_:{
        "creative":[
        {adUnit:"fixed-size-interactive", baseUnit:"fixed-size-interactive", creativeId:"2627994", duration:"15", _:{
          "creativeRenditions":[
          {_:{
            "creativeRendition":[
            {adReplicaId:"0", creativeApi:"None", creativeRenditionId:"6741958", height:"1", preference:"0", width:"1", _:{
              "asset":[
              {bytes:"3578", contentType:"text/html_lit_js_wc_nw", id:"6669100", mimeType:"text/html", name:"external url/tag for Default asset package of  - 1", _:{
                "content":[
                {_:"<span data-width=\"1\" data-height=\"1\" style=\"display:inline-block; vertical-align:top; margin:0;\"><iframe id=\"_fw_frame_kfsn_main_Native\" width=\"1\" height=\"1\" marginwidth=\"0\" marginheight=\"0\" frameborder=\"0\" scrolling=\"no\" ALLOWTRANSPARENCY=\"true\"><\/iframe>\n<script language=\"javascript\" type=\"text/javascript\" id=\"_fw_container_js_kfsn_main_Native\">//<!-- \n  (function(){\n    var fw_scope_window = window;\n    var fw_scope = document;\n    var fw_content = \"<!DOCTYPE HTML PUBLIC \\\"-//W3C//DTD HTML 4.01 Transitional//EN\\\" \\\"http://www.w3.org/TR/html4/loose.dtd\\\">\\n<html>\\n<head>\\n\\t<title>Advertisement<\/title>\\n\\t<scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\">window._fw_page_url = \\\"http://abc30.com/\\\";<\/scr\" + \"ipt>\\n<\/head>\\n<body style=\\\"margin:0px;background-color:transparent;\\\"><div data-str-native-key=\\\"%%PATTERN:strnativekey%%\\\" style=\\\"display: none;\\\"><\/div>\\n<scr\" + \"ipt type=\\\"text/javascr\" + \"ipt\\\" src=\\\"//native.sharethrough.com/assets/sfp-set-targeting.js\\\"><\/scr\" + \"ipt><\/body>\\n<\/html>\";\n    var targetFrame = fw_scope.getElementById(\"_fw_frame_kfsn_main_Native\");\n    var targetFrameDoc = (targetFrame.contentWindow) ? targetFrame.contentWindow : (targetFrame.contentDocument.document) ? targetFrame.contentDocument.document : targetFrame.contentDocument;\n    var writeContent = function(doc, content) {\n      var timeout = 0;\n      if(navigator.userAgent.match(/MSIE/) || navigator.userAgent.match(/Opera/)){\n        timeout = 7500;\n      } else if(navigator.userAgent.match(/Gecko\\//)) {\n        timeout = 30000;\n      }\n      targetFrameDoc.document.open();\n      targetFrameDoc.document.write(fw_content);\n      if (timeout>0) { setTimeout(function(){if (!!targetFrameDoc.document) targetFrameDoc.document.close()}, timeout); }\n      else if (!timeout) { targetFrameDoc.document.close(); }\n    }\n    var hasNoSandbox = false;\n    if ('never' == \"never\"){\n    \thasNoSandbox = true;\n    }\n    else if ('never' == \"always\"){\n    \thasNoSandbox = false;\n    }\n    else{\n    \thasNoSandbox = fw_content.indexOf(\"<!-\"+\"-nosandbox-\"+\"->\") >= 0 || fw_content.indexOf(\"<!-\"+\"-noecho-\"+\"->\") >= 0 || !!'';\n    }\n    var slotContentKey = \"_fw_slot_content_kfsn_main_Native\";\n    var proxyHtml = window._fw_xd_proxy ? window._fw_xd_proxy : \"/_fw_xd_frame.html\";\n    if(hasNoSandbox) {\n      try {\n        if(!navigator.userAgent.match(/Gecko\\//)) { \n\t\t\t\t\twriteContent(targetFrameDoc, fw_content, 7500);\n\t\t\t\t} else if (targetFrameDoc.document.readyState == \"complete\" || targetFrameDoc.document.readyState == \"interactive\" ){\n          writeContent(targetFrameDoc, fw_content, 7500);\n        } else {\n\t\t\t\t\ttargetFrame.onload = function(){\n\t\t\t\t\t\twriteContent(targetFrameDoc, fw_content, 7500);\n\t\t\t\t\t};\n\t\t\t\t}\n      } catch (e) {\n        fw_scope_window[slotContentKey] = fw_content;\n        targetFrame.src = proxyHtml + \"?slid=kfsn_main_Native&domain=\" + document.domain;\n      }\n    } else {\n      fw_scope_window[slotContentKey] = fw_content;\n      try {\n        targetFrameDoc.document.write('<script> window.name = parent[\"' + slotContentKey + '\"] + \"<!--\" + Math.random() + \"-->\"; window.location.replace(\"http://m2.feiwei.tv/g/lib/template/sandbox.html\");<\\/script>');\n      } catch(e) {\n        if((/MSIE 6/i.test(navigator.userAgent) && document.domain == fw_scope_window.location.hostname) ||\n            navigator.userAgent.match(/Gecko\\//) || navigator.userAgent.match(/Safari\\//)) {\n        } else {\n          targetFrame.src = proxyHtml + \"?sandbox&slid=kfsn_main_Native&domain=\" + document.domain;\n        }\n      }\n    }\n  })();\n// --><\/script>\n<\/span>\n"
                }]}
              }]}
            }]}
          }],
          "parameters":[
          {_:{
            "parameter":[
            {name:"moat", _:"168285;168285;;;;;18571770;52732;;g221752;959566;g927383;7651;2627994;6741958;15;;;168285:otv_web_display;cpx-non;1532540222640779021"
            },
            {name:"moat_callback", _:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=18571773&reid=6741958&arid=0&absid=&trigid=&et=i&cn=concreteEvent"
            }]}
          }]}
        }]}
      }]}
    }]}
  }],
  "siteSection":[
  {customId:"kfsn_main", pageViewRandom:"0.576062379212438", _:{
    "videoPlayer":[
    {_:{
      "videoAsset":[
      {customId:"7651", _:{
        "adSlots":[
        {_:null
        }]}
      }]}
    }],
    "adSlots":[
    {_:{
      "adSlot":[
      {customId:"kfsn_main_Native", height:"1", width:"1", _:{
        "selectedAds":[
        {_:{
          "adReference":[
          {adId:"18571773", creativeId:"2627994", creativeRenditionId:"6741958", replicaId:"0", _:{
            "eventCallbacks":[
            {_:{
              "eventCallback":[
              {type:"GENERIC", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=18571773&reid=6741958&arid=0", _:null
              },
              {name:"defaultImpression", type:"IMPRESSION", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=18571773&reid=6741958&arid=0&auid=&cn=defaultImpression&et=i&_cc=18571773,6741958,28363.,28363.,1532540222,1&tpos=&init=1&cr=", _:null
              },
              {name:"defaultClick", type:"CLICK", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=18571773&reid=6741958&arid=0&auid=&cn=defaultClick&et=c&_cc=&tpos=&cr=", _:null
              }]}
            }]}
          }]}
        }]}
      },
      {customId:"kfsn_main_Rectangle 300x250", height:"250", width:"300", _:{
        "selectedAds":[
        {_:{
          "adReference":[
          {adId:"22267738", creativeId:"3153519", creativeRenditionId:"8657620", replicaId:"0", _:{
            "eventCallbacks":[
            {_:{
              "eventCallback":[
              {type:"GENERIC", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=22267738&reid=8657620&arid=0", _:null
              },
              {name:"defaultImpression", type:"IMPRESSION", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=22267738&reid=8657620&arid=0&auid=&cn=defaultImpression&et=i&_cc=22267738,8657620,33526.,33526.,1532540222,1&tpos=&init=1&cr=", _:null
              },
              {name:"defaultClick", type:"CLICK", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=22267738&reid=8657620&arid=0&auid=&cn=defaultClick&et=c&_cc=&tpos=&cr=", _:null
              }]}
            }]}
          }]}
        }]}
      },
      {compatibleDimensions:"970,90", customId:"kfsn_main_Leaderboard2 728x90|Leaderboard2 970x90", height:"90", width:"728", _:{
        "selectedAds":[
        {_:{
          "adReference":[
          {adId:"23949719", creativeId:"3547567", creativeRenditionId:"9823705", replicaId:"0", _:{
            "eventCallbacks":[
            {_:{
              "eventCallback":[
              {type:"GENERIC", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=23949719&reid=9823705&arid=0", _:null
              },
              {name:"defaultImpression", type:"IMPRESSION", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=23949719&reid=9823705&arid=0&auid=&cn=defaultImpression&et=i&_cc=23949719,9823705,33526.,33526.,1532540222,1&tpos=&init=1&cr=", _:null
              },
              {name:"defaultClick", type:"CLICK", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=23949719&reid=9823705&arid=0&auid=&cn=defaultClick&et=c&_cc=&tpos=&cr=", _:null
              }]}
            }]}
          }]}
        }]}
      },
      {compatibleDimensions:"970,90", customId:"kfsn_main_Leaderboard 728x90|Leaderboard 970x90", height:"90", width:"728", _:{
        "selectedAds":[
        {_:{
          "adReference":[
          {adId:"23949718", creativeId:"3547569", creativeRenditionId:"9823708", replicaId:"0", _:{
            "eventCallbacks":[
            {_:{
              "eventCallback":[
              {type:"GENERIC", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=23949718&reid=9823708&arid=0", _:null
              },
              {name:"defaultImpression", type:"IMPRESSION", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=23949718&reid=9823708&arid=0&auid=&cn=defaultImpression&et=i&_cc=23949718,9823708,33526.,33526.,1532540222,1&tpos=&init=1&cr=", _:null
              },
              {name:"defaultClick", type:"CLICK", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=23949718&reid=9823708&arid=0&auid=&cn=defaultClick&et=c&_cc=&tpos=&cr=", _:null
              }]}
            }]}
          }]}
        }]}
      },
      {customId:"kfsn_main_Overpage|Adhesion|Prestitial", height:"1", width:"1", _:{
        "selectedAds":[
        {_:{
          "adReference":[
          {adId:"12675659", creativeId:"1842370", creativeRenditionId:"4252331", replicaId:"0", _:{
            "eventCallbacks":[
            {_:{
              "eventCallback":[
              {type:"GENERIC", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=12675659&reid=4252331&arid=0", _:null
              },
              {name:"defaultImpression", type:"IMPRESSION", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=12675659&reid=4252331&arid=0&auid=&cn=defaultImpression&et=i&_cc=12675659,4252331,21288.,21288.,1532540222,1&tpos=&init=1&cr=", _:null
              },
              {name:"defaultClick", type:"CLICK", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021&f=&r=168285&adid=12675659&reid=4252331&arid=0&auid=&cn=defaultClick&et=c&_cc=&tpos=&cr=", _:null
              }]}
            }]}
          }]}
        }]}
      }]}
    }]}
  }],
  "eventCallbacks":[
  {_:{
    "eventCallback":[
    {type:"GENERIC", url:"http://2915d.v.fwmrm.net/ad/l/1?s=b129&n=168285%3B168285&t=1532540222640779021", _:null
    }]}
  }]});
})();
