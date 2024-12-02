// ==UserScript==
// @author         Zaso
// @name           LocalStorage Manager
// @category       Debug
// @version        0.1.1.20200216.174029
// @description    Manage LocalStorage: import, export and delete.
// @id             localstorage-manager@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/localstorage-manager.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/localstorage-manager.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-02-16-174029';
plugin_info.pluginId = 'localstorage-manager';
//END PLUGIN AUTHORS NOTE

// PlUGIN START ////////////////////////////////////////////////////////
// History
// 0.1.1 Headers changed. Ready for IITC-CE
// 0.1.0 Original sript

	// use own namespace for plugin
	window.plugin.manageStorage = function(){};

	window.plugin.manageStorage.generateFile = function(type, filename, text){
		var pom = document.createElement('a');
		pom.setAttribute('href', type + encodeURIComponent(text));
		pom.setAttribute('download', filename);

		pom.style.display = 'none';
		document.body.appendChild(pom);

		pom.click();
		document.body.removeChild(pom);
	}
	window.plugin.manageStorage.importFile = function(){
		var fileInput = document.getElementById('manage-localstorage-import');
		var file = fileInput.files[0];
		var textType = /text.*/;

		if (file.type.match(textType)){
			var reader = new FileReader();

			reader.onload = function(e){
				window.newData = JSON.parse(reader.result);

				for(storageName in newData){
					window.localStorage[storageName] = newData[storageName];
				}
			}
			reader.readAsText(file);  
			alert('Import successful! Refresh the page.');
		}else{
			alert('File not supported!');
		}
	}

	window.plugin.manageStorage.createFile = function(){
		var type = 'data:text/plain;charset=utf-8,';
		var selectedStorage = window.plugin.manageStorage.getSelectedKey();
		var title = 'localstorage-'+selectedStorage+'-'+new Date().getTime();
		if(title == ''){ title = 'untitled'; }
		var filename = title+'.txt';

		var str = {};

		var store = window.localStorage[selectedStorage];

		var text = '{"'+selectedStorage+'":'+JSON.stringify(store)+'}';

		window.plugin.manageStorage.generateFile(type, filename, text);
	}
	window.plugin.manageStorage.importData = function(){
		dialog({
			html: '<div class="local-storage-import"><p>Selected a single or global data file. <input type="file" id="manage-localstorage-import" accept="text/plain" onchange="window.plugin.manageStorage.importFile();return false;" /></div>',
			dialogClass: 'ui-dialog-local-storage-import',
			title: 'LocalStorage Manager - Import'
		});
	}
	window.plugin.manageStorage.reset = function(){
		var KEY = window.plugin.manageStorage.getSelectedKey();
		var promptAction = prompt('"'+KEY+'" data will be deleted. Are you sure? [Y/N]', '');
		if(promptAction !== null && (promptAction === 'Y' || promptAction === 'y')){
			delete localStorage[KEY];
			$('a.localData:contains(\''+KEY+'\')').remove();
		}
	}

	window.plugin.manageStorage.createFileAll = function(){
		var type = 'data:text/plain;charset=utf-8,';
		var title = 'localstorage-ALL-'+new Date().getTime();
		if(title == ''){ title = 'untitled'; }
		var filename = title+'.txt';

		var text = JSON.stringify(window.localStorage);

		window.plugin.manageStorage.generateFile(type, filename, text);
	}
	window.plugin.manageStorage.resetAll = function(){
		var promptAction = prompt('WARNING: All localStorage will be deleted. Are you sure? [Y/N]', '');
		if(promptAction !== null && (promptAction === 'Y' || promptAction === 'y')){
			var promptAction2 = prompt('WARNING: all, all, all your localStorage will be deleted. Are you really really really sure? [Y/N]', '');
			if(promptAction2 !== null && (promptAction2 === 'Y' || promptAction2 === 'y')){
				localStorage.clear();
				$('a.localData').remove();
			}
		}
	}

	window.plugin.manageStorage.selectKey = function(elem){
		$('.manage-local-storage a.localData').removeClass('selected');
		$(elem).addClass('selected');
	}
	window.plugin.manageStorage.getSelectedKey = function(){
		return $('.manage-local-storage a.localData.selected').text()
	}

	window.plugin.manageStorage.setupContent = function(){
		var txt = '';

		for(var key in localStorage){
			txt += '<a class="localData" onclick="window.plugin.manageStorage.selectKey(this);return false;">'+key+'</a>';
		}

		var warn = '- Don\'t import with this plugin data exported by a different plugin.<br/>';
		warn += '- Don\'t import the data exported by a different plugin with this plugin.';

		return warn+'<div class="manage-local-storage">'+txt+'</div>';
	}

	window.plugin.manageStorage.dialog = function(){
		dialog({
			html: plugin.manageStorage.setupContent,
			dialogClass: 'ui-dialog-local-storage',
			title: 'LocalStorage Manager',
			buttons:{
				'EXPORT': function(){
					if($('.manage-local-storage a.localData.selected').length){
						window.plugin.manageStorage.createFile();
					}
				},
				'DELETE': function(){
					if($('.manage-local-storage a.localData.selected').length){
						window.plugin.manageStorage.reset();
					}
				},
				'IMPORT': function(){
						window.plugin.manageStorage.importData();
				},
				'EXPORT ALL': function(){
					window.plugin.manageStorage.createFileAll();
				},
				'DELETE ALL': function(){
					window.plugin.manageStorage.resetAll();
				}
			}
		});
		$('.ui-dialog-local-storage button:contains(\'DELETE ALL\')').addClass('warning');
	}

	window.plugin.manageStorage.setupCSS = function(){
		$('<style>').prop('type', 'text/css').html(''
			+'.manage-local-storage .localData{display:block; border:1px solid #aaa; color:#aaa; padding:4px 4px 2px; text-align:center; margin:7px 2px;}'
			+'.manage-local-storage .localData:hover{text-decoration:none;background:rgba(8,48,78,.85);}'
			+'.manage-local-storage .localData.selected,#manage-localstorage-import{border:1px solid #ffce00;color:#ffce00;background:rgba(8,48,78,.85);}'
			+'.ui-dialog-local-storage button{margin:4px 0;margin-left:6px;padding: 5px 5px 4px;}'
			+'.ui-dialog-local-storage button.warning{border-color:#FF5454; color:#FF5454;}'
			+'.local-storage-import #manage-localstorage-import{margin-top:10px;}'
		).appendTo('head');
	}

	var setup = function(){
		window.plugin.manageStorage.setupCSS();
		$('#toolbox').append('<a class="list-group-item" onclick="window.plugin.manageStorage.dialog();return false;" title="Manage Storage"><i class="fa fa-hdd-o"></i>LocalStorage</a>');
	}

// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

