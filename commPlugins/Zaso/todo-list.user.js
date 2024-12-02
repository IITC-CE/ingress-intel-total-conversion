// ==UserScript==
// @author         Zaso
// @name           To Do List
// @category       Misc
// @version        0.0.3.20200216.174030
// @description    Add a To Do List.
// @id             todo-list@Zaso
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/todo-list.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/Zaso/todo-list.meta.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'ZasoItems';
plugin_info.dateTimeVersion = '2020-02-16-174030';
plugin_info.pluginId = 'todo-list';
//END PLUGIN AUTHORS NOTE

// PLUGIN START ////////////////////////////////////////////////////////
// History
// 0.0.3 Headers changed. Ready for IITC-CE
// 0.0.2 Original sript


	// use own namespace for plugin
	window.plugin.todolist = function(){};

	window.plugin.todolist.obj = {};
	window.plugin.todolist.storage = {};
	window.plugin.todolist.data = {};
	window.plugin.todolist.ui = {};
	window.plugin.todolist.layer = {};
	window.plugin.todolist.getHTML = {};
	window.plugin.todolist.action = {};
	window.plugin.todolist.dialog = {};
	window.plugin.todolist.mpe = {};

	// Generate an ID for the bookmark (date time + random number)
	window.plugin.todolist.generateID = function() {
		var d = new Date();
		var ID = d.getTime()+(Math.floor(Math.random()*99)+1);
		var ID = 'id'+ID.toString();
		return ID;
	}
	// Format the string
	window.plugin.todolist.escapeHtml = function(text) {
		return text
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;")
				.replace(/\//g, '&#47;')
				.replace(/\\/g, '&#92;');
	}

	//------------------------------------------------------------------
	// OBJ
	//------------------------------------------------------------------
    window.plugin.todolist.obj.main = {settings:{drawMode:0,copyMode:0}, players:[], tasks:[]};
    window.plugin.todolist.obj.actions = ['capture', 'deploy', 'destroy', 'get key', 'go to', 'hack', 'link', 'mod', 'upgrade', 'virus'];
    window.plugin.todolist.obj.curr = {player:null, action:window.plugin.todolist.obj.actions[0]};
    window.plugin.todolist.obj.linkMode = {};
    window.plugin.todolist.obj.portals = {};

	//------------------------------------------------------------------
	// STORAGE
	//------------------------------------------------------------------
    window.plugin.todolist.storage.NAME = 'plugin-todolist';

    window.plugin.todolist.storage.save = function(){
        window.localStorage[window.plugin.todolist.storage.NAME] = JSON.stringify(window.plugin.todolist.obj.main);
    }
    window.plugin.todolist.storage.load = function(){
        window.plugin.todolist.obj.main = JSON.parse(window.localStorage[window.plugin.todolist.storage.NAME]);
    }
    window.plugin.todolist.storage.reset = function(){
        window.plugin.todolist.obj.main = {settings:{drawMode:0,copyMode:0}, players:[], tasks:[]};
        window.plugin.todolist.obj.curr = {player:null, action:window.plugin.todolist.obj.actions[0]};
        window.plugin.todolist.data.resetLinkMode();
        window.plugin.todolist.storage.save();
    }
    window.plugin.todolist.storage.check = function(){
        if(window.localStorage[window.plugin.todolist.storage.NAME] === undefined){
            window.plugin.todolist.storage.save();
        }
        window.plugin.todolist.storage.load();
    }

	//------------------------------------------------------------------
	// DATA
	//------------------------------------------------------------------
    window.plugin.todolist.data.getActions = function(){
        return window.plugin.todolist.obj.actions;
    }
    window.plugin.todolist.data.getPlayers = function(){
        return window.plugin.todolist.obj.main['players'];
    }
    window.plugin.todolist.data.getTasks = function(){
        return window.plugin.todolist.obj.main['tasks'];
    }
    window.plugin.todolist.data.getTask = function(index){
        return window.plugin.todolist.obj.main['tasks'][index];
    }
    window.plugin.todolist.data.getCurr = function(objName){
        var curr = window.plugin.todolist.obj.curr;

        if(objName === undefined){
            return curr;
        }
        return curr[objName];
    }
    window.plugin.todolist.data.getTasksLength = function(){
        return window.plugin.todolist.data.getTasks().length;
    }
    window.plugin.todolist.data.getIndexPlayer = function(name){
        var list = window.plugin.todolist.data.getPlayers();
        var index = list.indexOf(name);

        if(index > -1){
            return index;
        }
        return false;
    }

    window.plugin.todolist.data.setCurrAction = function(name){
        window.plugin.todolist.obj.curr['action'] = name;
    }
    window.plugin.todolist.data.setCurrPlayer = function(name){
        window.plugin.todolist.obj.curr['player'] = name;
    }

	window.plugin.todolist.data.resetLinkMode = function(){
		window.plugin.todolist.obj.linkMode = {};
	}
	window.plugin.todolist.data.isEnabledDrawMode = function(){
		return Boolean(window.plugin.todolist.obj.main.settings.drawMode);
	}
	window.plugin.todolist.data.isEnabledCopyMode = function(){
		return Boolean(window.plugin.todolist.obj.main.settings.copyMode);
	}
    window.plugin.todolist.data.checkDrawMode = function(){
        var curr = window.plugin.todolist.data.isEnabledDrawMode();

        if(curr === false){
            window.plugin.todolist.obj.main.settings.drawMode = 1;
        }else{
            window.plugin.todolist.obj.main.settings.drawMode = 0;
        }
    }
    window.plugin.todolist.data.checkCopyMode = function(){
        var curr = window.plugin.todolist.data.isEnabledCopyMode();

        if(curr === false){
            window.plugin.todolist.obj.main.settings.copyMode = 1;
        }else{
            window.plugin.todolist.obj.main.settings.copyMode = 0;
        }
    }

	window.plugin.todolist.data.generateID = function(){
		return 'uuid-'+((new Date).getTime().toString(16)+Math.floor(1E7*Math.random()).toString(16));
	}

    window.plugin.todolist.data.addPlayer = function(name){
        window.plugin.todolist.obj.main.players.push(window.escapeJavascriptString(name));

        var list = window.plugin.todolist.data.getPlayers();
        window.plugin.todolist.obj.main.players = window.plugin.todolist.data.orderArray(list);
    }
    window.plugin.todolist.data.deletePlayer = function(index){
        var curr = window.plugin.todolist.data.getCurr('player');
        var player = window.plugin.todolist.data.getPlayers()[index];

        if(curr === player){
            window.plugin.todolist.data.setCurrPlayer(null);
        }

        window.plugin.todolist.obj.main.players.splice(index, 1);
    }

    window.plugin.todolist.data.insertTask = function(taskObj){
        window.plugin.todolist.obj.main.tasks.push(taskObj);
    }
    window.plugin.todolist.data.deleteTask = function(index){
        window.plugin.todolist.obj.main.tasks.splice(index, 1);
    }

    window.plugin.todolist.data.checkTask = function(index, status){
        var isChecked = window.plugin.todolist.data.isCheckedTask(index);
        if(status === undefined){
            status = Number(!isChecked);
        }

        window.plugin.todolist.obj.main['tasks'][index].check = status;
    }
    window.plugin.todolist.data.getCheckedLength = function(){
        var list = window.plugin.todolist.data.getTasks();
        var checkedLen = 0;

        for(index in list){
            if(list[index].check === 1){
                checkedLen++;
            }
        }

        return checkedLen;
    }
    window.plugin.todolist.data.isCheckedTask = function(index){
        return window.plugin.todolist.obj.main['tasks'][index].check;
    }
    window.plugin.todolist.data.getTextTask = function(index){
        var list = window.plugin.todolist.data.getTasks();
        var task = list[index];

        var str = '';
        var check = (task.check === 1)? '+' : '-';
        var player = (task.nick !== null)? task.nick+' ' : '';
        var action = task.action;
        var portal = task.to.title;

        str += check+' ';
        str += player;
        str += action+' ';

        if(task.from){
            str += 'from ';
            str += task.from.title;
            str += ' to ';
        }

        str += portal;

        return str;
    }

    window.plugin.todolist.data.orderArray = function(arr){
        arr.sort(function(a, b){
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        return arr;
    }
    window.plugin.todolist.data.importMain = function(obj){
        window.plugin.todolist.obj.main = obj;
    }
    window.plugin.todolist.data.replaceStrArr = function(arr){
        for(i in arr){
            arr[i] = Number(arr[i].replace('idTask_', ''));
        }
        return arr;
    }
	window.plugin.todolist.data.getDragListDOM = function(){
        return $('.toDoList.box.main .tasksList');
    }

    window.plugin.todolist.generateIntelByLatLng = function(latlng, title){
        var isPortal = (title === undefined)? false : true;
        var zoom = (isPortal === true)? 17 : map.getZoom();
        var ll = latlng.lat+','+latlng.lng;
        var portal = (isPortal === true)? '&pll='+ll : '';
        var permalink = 'https://intel.ingress.com/intel?ll='+ll+'&z='+zoom+portal;

        return permalink;
    }
    window.plugin.todolist.generateGmapsByLatLng = function(latlng, title){
        var isPortal = (title === undefined)? false : true;
        var ll = latlng.lat+','+latlng.lng;
        var portal = (isPortal === true)? '&q='+ll+'%20('+encodeURI(title)+')' : '';
        var permalink = 'https://maps.google.com/maps?ll='+ll+portal;

        return permalink;
    }

    //------------------------------------------------------------------
	// UI
	//------------------------------------------------------------------
    window.plugin.todolist.ui.redrawSelectActions = function(){
        var options = window.plugin.todolist.getHTML.optionActions();
        $('select.toDoList.select.actions').html(options);
        window.plugin.todolist.ui.updateLabelAddTask();
    }
    window.plugin.todolist.ui.redrawSelectPlayers = function(){
        var options = window.plugin.todolist.getHTML.optionPlayers();
        $('select.toDoList.select.players').html(options);
    }
    window.plugin.todolist.ui.redrawTasksList = function(){
        var tasksList = window.plugin.todolist.getHTML.allTasks();
        $('.toDoList.tasksList.allTasks').html(tasksList);
        window.plugin.todolist.action.sortRefresh();
		map.closePopup();
    }

    window.plugin.todolist.ui.redrawSettings = function(){
        var html = window.plugin.todolist.getHTML.settingsBox();
        $('.ui-dialog-todolist.settings .ui-dialog-content.ui-widget-content').html(html);
    }

    window.plugin.todolist.ui.appendTask = function(taskObj, index){
        var html = window.plugin.todolist.getHTML.task(taskObj, index);
        $('.toDoList.tasksList').append(html);
    }
    window.plugin.todolist.ui.deleteTask = function(index){
//        $('.toDoList.tasksList .task[data-task="'+index+'"]').remove();
        $('.toDoList.tasksList .task[data-index="'+index+'"]').remove();
    }

    window.plugin.todolist.ui.checkTask = function(index){
        var elem = $('.toDoList.tasksList .task[data-index="'+index+'"]');
        var checkbox = elem.find('.fa.checkbox');
        var isChecked = window.plugin.todolist.data.isCheckedTask(index);

        if(isChecked){
            elem.addClass('checked');
        }else{
            elem.removeClass('checked');
        }

        var checkedInputClass = (isChecked === 1)? 'fa-check-square-o' : 'fa-square-o';
        checkbox.removeClass('fa-check-square-o, fa-square-o');
        checkbox.addClass(checkedInputClass);
    }
    window.plugin.todolist.ui.updateCounter = function(){
        var curr = window.plugin.todolist.data.getCheckedLength();
        var max = window.plugin.todolist.data.getTasksLength();
        var count = curr+'/'+max;
        $('.ui-dialog-todolist.main .ui-dialog-buttonpane .ui-dialog-buttonset button:first').text(count);

        window.plugin.todolist.layer.drawPortalsMarkers();
    }

    window.plugin.todolist.ui.updateLabelAddTask = function(){
        var curr = window.plugin.todolist.data.getCurr('action');
        var elem = $('.toDoList.padCommand .addTask span');

        if(curr == 'link'){
            if(window.plugin.todolist.obj.linkMode['from'] === undefined){
                elem.text('From');
            }else{
                elem.text('To');
            }
        }else{
            elem.text('Task');
        }
    }

	window.plugin.todolist.action.sortRefresh = function(){
        var elem = window.plugin.todolist.data.getDragListDOM();
        elem.sortable('refresh');
    }
	window.plugin.todolist.action.sortInit = function(){
        var elem = window.plugin.todolist.data.getDragListDOM();

        window.plugin.todolist.obj.drag = {};
        window.plugin.todolist.obj.drag.before = [];
        window.plugin.todolist.obj.drag.after = [];

		elem.sortable({
			items:'.task',
			placeholder:'sortable-placeholder',
			forcePlaceholderSize:true,
            axis: 'y',
            distance: 10,
            start: function(event, ui){
                var l = elem.sortable('toArray');
                window.plugin.todolist.obj.drag.before = window.plugin.todolist.data.replaceStrArr(l);
            },
            update: function(event, ui){
                var l = elem.sortable('toArray');
                window.plugin.todolist.obj.drag.after = window.plugin.todolist.data.replaceStrArr(l);

                var list = window.plugin.todolist.data.getTasks();
                var newList = [];

                for(i in window.plugin.todolist.obj.drag.after){
                    if(window.plugin.todolist.obj.drag.after[i] !== window.plugin.todolist.obj.drag.before[i]){
                        newList[i] = list[window.plugin.todolist.obj.drag.after[i]];

                        var oldIndex = window.plugin.todolist.obj.drag.before[i];
                        var newIndex = window.plugin.todolist.obj.drag.after[i];
                        $('.toDoList.tasksList .task[data-index="'+oldIndex+'"]').attr('data-index', newIndex).attr('id', 'idTask_'+newIndex);
//                        $('.toDoList.tasksList .task[data-index="'+oldIndex+'"]').each(function(){$(this).data('index', newIndex);});
                    }else{
                        newList[i] = list[i];
                    }
                }

                var obj = {
                    settings: window.plugin.todolist.obj.main.settings,
                    players: window.plugin.todolist.data.getPlayers(),
                    tasks: newList,
                };
                window.plugin.todolist.data.importMain(obj);
                window.plugin.todolist.storage.save();
                window.plugin.todolist.ui.redrawTasksList();
            }
		});
		elem.disableSelection();
	}

	//------------------------------------------------------------------
	// HTML
	//------------------------------------------------------------------
    window.plugin.todolist.getHTML.triggerBox = function(){
        return '<a onclick="window.plugin.todolist.dialog.openBoxMain();return false;"><i class="fa fa-check-square-o"></i>To Do List</a>';
    }
	window.plugin.todolist.getHTML.mainBox = function(){
		return '<div class="toDoList box main">'
				+'<div class="toDoList padCommand">'
                    +'<i class="fa fa-user" title="Players"></i>'
                    +window.plugin.todolist.getHTML.selectPlayers()
                    +'<i class="fa fa-font" title="Actions"></i>'
                    +window.plugin.todolist.getHTML.selectActions()
                    +window.plugin.todolist.getHTML.addTaskBtn()
                    +'<div class="clear"></div>'
				+'</div>'
				+'<div class="toDoList tasksList allTasks">'
                    +window.plugin.todolist.getHTML.allTasks()
                +'</div>'
        +'';
    }
	window.plugin.todolist.getHTML.settingsBox = function(){
		return '<div class="toDoList box settings">'
                    +'<div class="managePlayers">'
                        +'<h3><i class="fa fa-user"></i> Manage Players</h3>'
                        +'<a class="btn btn-s delete" onclick="window.plugin.todolist.action.deletePlayer($(this).siblings(\'select.players\').val());return false;" title="Delete current player"><i class="fa fa-trash"></i></a>'
                        +'<select class="toDoList select players">'+window.plugin.todolist.getHTML.optionPlayers()+'</select>'
                        +'<a class="btn btn-s add" onclick="window.plugin.todolist.dialog.addPlayer();return false;" title="Add a player"><i class="fa fa-plus"></i></a>'
                        +'<div class="clear"></div>'
                    +'</div>'

                    +'<div class="">'
                        +'<h3><i class="fa fa-font"></i> Advance Actions Settings</h3>'
                        +'<label class="btn btn-l"><input type="checkbox" class="" '+((window.plugin.todolist.data.isEnabledDrawMode())?'checked':'')+' onchange="window.plugin.todolist.action.checkDrawMode();" /> Draw when add a "link" task</label>'
                        +'<label class="btn btn-l"><input type="checkbox" class="" '+((window.plugin.todolist.data.isEnabledCopyMode())?'checked':'')+' onchange="window.plugin.todolist.action.checkCopyMode();" /> Add "Copy" buttons</label>'
                    +'</div>'

                    +'<h3><i class="fa fa-wrench"></i> Data Options</h3>'
                    +'<a class="btn btn-l add" onclick="window.plugin.todolist.dialog.export_storage();return false;"><i class="fa fa-upload"></i> Export Storage</a>'
                    +'<a class="btn btn-l add" onclick="window.plugin.todolist.dialog.import_storage();return false;"><i class="fa fa-download"></i> Import Storage</a>'
                    +'<a class="btn btn-l add" onclick="window.plugin.todolist.dialog.reset();return false;"><i class="fa fa-trash"></i> Reset Storage</a>'

                    +'<a class="btn btn-l add" onclick="window.plugin.todolist.dialog.export_tsv();return false;"><i class="fa fa-upload"></i> Export as TSV for gSheet</a>'
                    +'<a class="btn btn-l add" onclick="window.plugin.todolist.dialog.export_simple();return false;"><i class="fa fa-upload"></i> Export as Text</a>'
				+'</div>'
        +'';
    }

	window.plugin.todolist.getHTML.selectActions = function(){
        var html = '';

        html += '<select class="toDoList select actions" onchange="window.plugin.todolist.action.selectAction($(this).val());">';
            html += window.plugin.todolist.getHTML.optionActions();
        html += '</select>';

        return html;
    }
	window.plugin.todolist.getHTML.optionActions = function(){
        var list = window.plugin.todolist.data.getActions();
        var curr = window.plugin.todolist.data.getCurr('action');
        var html = '';

        for(index in list){
            var isSelected = (curr === list[index])? 'selected' : '';
            html += '<option '+isSelected+' value="'+list[index]+'">'+list[index]+'</option>';
        }

        return html;
    }
	window.plugin.todolist.getHTML.selectPlayers = function(){
        var html = '';

        html += '<select class="toDoList select players" onchange="window.plugin.todolist.action.selectPlayer($(this).val());">';
            html += window.plugin.todolist.getHTML.optionPlayers();
        html += '</select>';

        return html;
    }
	window.plugin.todolist.getHTML.optionPlayers = function(){
        var list = window.plugin.todolist.data.getPlayers();
        var curr = window.plugin.todolist.data.getCurr('player');
        var html = '';

        var isSelected = (curr === null)? 'selected' : '';
        html += '<option '+isSelected+' value="null">- - -</option>';

        for(index in list){
            var isSelected = (curr === list[index])? 'selected' : '';
            html += '<option '+isSelected+' value="'+list[index]+'">'+list[index]+'</option>';
        }

        return html;
    }

	window.plugin.todolist.getHTML.addTaskBtn = function(){
        return '<a accesskey="t" class="addTask" onclick="window.plugin.todolist.action.addTask();return false;" title="[t]"><i class="fa fa-plus"></i> <span>Task</span></a>';
    }
	window.plugin.todolist.getHTML.portaLink = function(guid, title, latlng){
        var ll = '['+latlng.lat+','+latlng.lng+']';
        var clickAction = 'window.zoomToAndShowPortal(\''+guid+'\', '+ll+');';

        var html = '';
        html += '<a class="portal" onclick="'+clickAction+'return false;" title="'+title+'">';
            html += title;
        html += '</a>';

        return html;
    }

	window.plugin.todolist.getHTML.allTasks = function(){
        var tasks = window.plugin.todolist.data.getTasks();
        var len = window.plugin.todolist.data.getTasksLength();
        var html = '';

        if(len === 0){
            html = '<div class="task noTask"><div class="content">No tasks</div></div>';
        }else{
            for(index in tasks){
                html += window.plugin.todolist.getHTML.task(tasks[index], index);
            }
        }

        return html;
    }
	window.plugin.todolist.getHTML.task = function(taskObj, index){
        var myTeam = window.PLAYER.team.toLowerCase();

        var action = taskObj.action;
        var playerNick = taskObj.nick;
        var portalTitle = taskObj.to.title;
        var html = '';
        var isChecked = window.plugin.todolist.data.isCheckedTask(index);

        var checkedClass = (isChecked === 1)? 'checked' : '';
        var checkedInputClass = (isChecked === 1)? 'fa-check-square-o' : 'fa-square-o';
        var checkedInput = (isChecked === 1)? 'checked' : '';

        var isEnabledCopyMode = window.plugin.todolist.data.isEnabledCopyMode();
        var copyHTML = (isEnabledCopyMode === false)? '' : '<a class="copy" onclick=" window.plugin.todolist.action.copyTask($(this).parent().data(\'index\'));return false;" title="Copy"><i class="fa fa-copy"></i></a>';
        var copyParentClass = (isEnabledCopyMode === false)? '' : ' copyMode';

        html += '<div id="idTask_'+index+'" class="task '+checkedClass+copyParentClass+'" data-index="'+index+'">';
            html += '<a class="delete" onclick="window.plugin.todolist.action.deleteTask($(this).parent().data(\'index\'));return false;" title="Delete">X</a>';
            html += '<i class="checkbox fa '+checkedInputClass+'" onclick="window.plugin.todolist.action.checkTask($(this).parent().data(\'index\'));"></i>';
            html += '<div class="content '+((action === 'link')? 'link':'')+'">';
                html += (playerNick)? '<span class="nick player '+myTeam+'" title="'+playerNick+'">'+playerNick+'</span> ' : '';
                html += ' <span class="action">'+action+'</span> ';

                if(action === 'link' && taskObj.from){
                    html += '<span>from</span> ';
                    html += window.plugin.todolist.getHTML.portaLink(taskObj.from.guid, taskObj.from.title, taskObj.from.ll);
                    html += ' <span>to</span> ';
                }

                html += window.plugin.todolist.getHTML.portaLink(taskObj.to.guid, taskObj.to.title, taskObj.to.ll);
            html += '</div>';
            html += copyHTML;
            html += '<div class="clear"></div>';
        html += '</div>';

        return html;
    }

	//------------------------------------------------------------------
	// ACTION
	//------------------------------------------------------------------
    window.plugin.todolist.action.selectAction = function(name){
        window.plugin.todolist.data.setCurrAction(name);
        window.plugin.todolist.data.resetLinkMode();
        window.plugin.todolist.ui.redrawSelectActions();
    }
    window.plugin.todolist.action.selectPlayer = function(name){
        if(name === 'null'){ name = null; }
        window.plugin.todolist.data.setCurrPlayer(name);
        window.plugin.todolist.ui.redrawSelectPlayers();
    }

    window.plugin.todolist.action.reset = function(){
        window.plugin.todolist.storage.reset();
        window.plugin.todolist.action.reloadBox();
    }

    window.plugin.todolist.action.addPlayer = function(name){
        window.plugin.todolist.data.addPlayer(name);
        window.plugin.todolist.storage.save();
        window.plugin.todolist.ui.redrawSelectPlayers();
    }
    window.plugin.todolist.action.deletePlayer = function(name){
        var index = window.plugin.todolist.data.getIndexPlayer(name);

        if(index !== false && name !== null){
            window.plugin.todolist.data.deletePlayer(index);
            window.plugin.todolist.ui.redrawSelectPlayers();
            window.plugin.todolist.storage.save();
        }

    }

    window.plugin.todolist.action.addTask = function(){
		if(!window.selectedPortal){
            window.plugin.todolist.dialog.openBoxMessage('<ol><li>Select a portal;</li><li>Click "+ Task";</li></ol>');
			return;
		}

        var curr = window.plugin.todolist.data.getCurr();

        var guid = window.selectedPortal;
        var title = window.portals[guid].options.data.title;
        var ll = window.portals[guid].getLatLng();

        var taskObj = {
            check: 0,
            action: curr.action,
            nick: curr.player,
            to: {
                guid: guid,
                title: title,
                ll: ll
            }
        };

        if(curr.action !== 'link'){
            window.plugin.todolist.action.addTaskByObj(taskObj);
        }else{
            if(window.plugin.todolist.obj.linkMode['from'] === undefined){
                window.plugin.todolist.obj.linkMode['from'] = taskObj.to;
            }else{
                taskObj.from = window.plugin.todolist.obj.linkMode['from'];

                if(taskObj.from.guid == taskObj.to.guid){
                    window.plugin.todolist.dialog.openBoxMessage('You cannot link "from" and "to" the same portal. Select a different portal.');
                }else{
                    window.plugin.todolist.action.addTaskByObj(taskObj);
                    window.plugin.todolist.data.resetLinkMode();
                }
            }
            window.plugin.todolist.ui.updateLabelAddTask();
        }
    }
    window.plugin.todolist.action.addTaskByObj = function(taskObj){
        try{
            window.plugin.todolist.data.insertTask(taskObj);
            window.plugin.todolist.storage.save();

            var index = window.plugin.todolist.data.getTasksLength()-1;
            if(index+1 == 1){
                window.plugin.todolist.ui.redrawTasksList();
            }else{
                var task = window.plugin.todolist.data.getTask(index);
                window.plugin.todolist.ui.appendTask(task, index);
            }
            window.plugin.todolist.ui.updateCounter();

            if(taskObj.action === 'link'){
                if(window.plugin.todolist.data.isEnabledDrawMode() === true){
                    if(window.plugin.drawTools === undefined){
                        window.plugin.todolist.dialog.openBoxMessage('"DrawTools" plugin is required for draw the link');
                    }else{
                        ll1 = taskObj.from.ll;
                        ll2 = taskObj.to.ll;

                        var layer = L.geodesicPolyline([ll1, ll2], window.plugin.drawTools.lineOptions);
                        layerType = 'polyline';

                        map.fire('draw:created', {
                            layer: layer,
                            layerType: layerType
                        });
                    }
                }
            }
            window.plugin.todolist.ui.updateLabelAddTask();
        }catch(err){
            window.plugin.todolist.dialog.openBoxMessage('Not possible create this task');
        }
    }

    window.plugin.todolist.action.deleteTask = function(index){
        window.plugin.todolist.data.deleteTask(index);

        var len = window.plugin.todolist.data.getTasksLength();
        if(len == 0){
            window.plugin.todolist.ui.redrawTasksList();
        }else{
            window.plugin.todolist.ui.deleteTask(index);
        }

        window.plugin.todolist.storage.save();
        window.plugin.todolist.ui.updateLabelAddTask();
        window.plugin.todolist.ui.updateCounter();

        window.plugin.todolist.ui.redrawTasksList();
        window.plugin.todolist.layer.removeNoTaskPortal();
    }
    window.plugin.todolist.action.copyTask = function(index){
        var text = window.plugin.todolist.data.getTextTask(index);
        var text = window.plugin.todolist.data.getTextTask(index);
        window.plugin.todolist.copyInClipBoard(text);
    }
    window.plugin.todolist.copyInClipBoard = function(text){
        $('body').append('<textarea id="quickCopy-textarea">'+text+'</textarea>');
        var elem = $('#quickCopy-textarea');

        elem.select();
        document.execCommand('copy');
        elem.remove();

        var notifyStyle= 'display:none;width:200px;height:20px;height:auto;position:absolute;left:50%;margin-left:-100px;top:20px;z-index:10000;background-color: #383838;color: #F0F0F0;font-family: Calibri;font-size: 20px;padding:10px;text-align:center;border-radius: 2px;box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);}';
        var notifyDOM= '<div class="quickCopy_notify" style="'+notifyStyle+'">Text Copied</div>';

        $('body').append(notifyDOM);
        $('.quickCopy_notify')
            .fadeIn(200)
            .delay(1000)
            .fadeOut(200, function(){
                $('.quickCopy_notify').remove();
            });
    }

    window.plugin.todolist.action.checkTask = function(index){
        window.plugin.todolist.data.checkTask(index);
        window.plugin.todolist.ui.checkTask(index);
        window.plugin.todolist.storage.save();
        window.plugin.todolist.ui.updateCounter();
    }
    window.plugin.todolist.action.checkDrawMode = function(){
        window.plugin.todolist.data.checkDrawMode();
        window.plugin.todolist.storage.save();
    }
    window.plugin.todolist.action.checkCopyMode = function(){
        window.plugin.todolist.data.checkCopyMode();
        window.plugin.todolist.storage.save();
        window.plugin.todolist.action.reloadBox();
    }

    window.plugin.todolist.action.reloadBox = function(){
        window.plugin.todolist.ui.redrawSelectActions();
        window.plugin.todolist.ui.redrawSelectPlayers();
        window.plugin.todolist.ui.redrawTasksList();
        window.plugin.todolist.ui.updateCounter();
        window.plugin.todolist.ui.redrawSettings();
    }

	//------------------------------------------------------------------
	// DIALOG
	//------------------------------------------------------------------
    window.plugin.todolist.dialog.openBoxMain = function(){
        if($('.ui-dialog-todolist.main').length === 0){
            var html = '';
            html = window.plugin.todolist.getHTML.mainBox();

            dialog({
                title: 'To Do List',
                html: html,
                dialogClass: 'ui-dialog-todolist main',
                width: 400,
                buttons: {
                    'KEYS': function(){
                        window.plugin.todolist.dialog.openBoxKeys();
                    },
                    'SETTINGS': function(){
                        window.plugin.todolist.dialog.openBoxSettings();
                    }
                }
            });

            window.plugin.todolist.ui.updateCounter();
            window.plugin.todolist.action.sortInit();
            window.plugin.todolist.data.resetLinkMode();
            window.plugin.todolist.ui.updateLabelAddTask();
        }
    }
    window.plugin.todolist.dialog.openBoxSettings = function(){
        var html = '';
        html = window.plugin.todolist.getHTML.settingsBox();

        dialog({
            title: 'To Do List - Settings',
            html: html,
            width: 260,
            dialogClass: 'ui-dialog-todolist settings'
        });
    }
    window.plugin.todolist.dialog.openBoxMessage = function(html){
        dialog({
            title: 'To Do List - Message',
            html: '<div class="toDoList box message">'+html+'</div>',
            dialogClass: 'ui-dialog-todolist message'
        });
    }

    window.plugin.todolist.dialog.openBoxExport = function(strData){
        var html = '';
		html += '<p>';
            html += '<a onclick="$(this).parent().siblings(\'textarea\').select();">Select all</a>';
            html += ' and press CTRL+C to copy it.'
		html += '</p>';
		html += '<textarea style="height:100px;width:100%;resize:vertical;" onclick="$(this).select();" readonly>'+strData+'</textarea>';

        dialog({
            title: 'To Do List - Export',
            html: '<div class="toDoList box export">'+html+'</div>',
            dialogClass: 'ui-dialog-todolist export',
            width: 350
        });
    }
    window.plugin.todolist.dialog.import_storage = function(){
		var promptAction = prompt('Insert a ToDo List exported Storage', '');
		if(promptAction !== null && promptAction !== ''){
            try{
                var obj = JSON.parse(promptAction);
                if(obj.players && obj.tasks){
                    window.plugin.todolist.data.importMain(obj);
                    window.plugin.todolist.storage.save();
                    window.plugin.todolist.action.reloadBox();
                    window.plugin.todolist.dialog.openBoxMessage('Import succesful');
                }else{
                    window.plugin.todolist.dialog.openBoxMessage('Not possible import your string');
                }
            }catch(err){
                window.plugin.todolist.dialog.openBoxMessage('Not possible import your string');
            }
        }
    }

    window.plugin.todolist.dialog.export_storage = function(){
        var str = JSON.stringify(window.plugin.todolist.obj.main);
        window.plugin.todolist.dialog.openBoxExport(str);
    }
    window.plugin.todolist.dialog.export_simple = function(){
        var list = window.plugin.todolist.data.getTasks();
        var str = '';

        for(index in list){
            var task = list[index];
            var check = (task.check === 1)? '+' : '-';
            var player = (task.nick !== null)? task.nick+' ' : '';
            var action = task.action;
            var portalTo = task.to.title;

            str += check+' ';
            str += player;
            str += action+' ';

            if(task.from){
                str += 'from ';
                str += task.from.title;
                str += ' to ';
            }

            str += portalTo;
            str += ';\n';
        }

        window.plugin.todolist.dialog.openBoxExport(str);
    }
    window.plugin.todolist.dialog.export_tsv = function(){
        var list = window.plugin.todolist.data.getTasks();
        var str = '';

        for(index in list){
            var task = list[index];
            var check = (task.check === 1)? 'V' : '';
            var player = (task.nick !== null)? task.nick : '---';
            var action = task.action;
            var portalTo = task.to.title;
            var portalToLL = task.to.ll;

            str += check+'\t'+player+'\t'+action+'\t';

            if(task.from){
                var portalFrom = task.from.title;
                var portalFromLL = task.from.ll;

                str += portalFrom+'\t';
                str += '['+portalFromLL.lat+','+portalFromLL.lng+']\t';
                str += '=HYPERLINK("'+window.plugin.todolist.generateIntelByLatLng(portalFromLL, portalFrom)+'";"intel")\t';
                str += '=HYPERLINK("'+window.plugin.todolist.generateGmapsByLatLng(portalFromLL, portalFrom)+'";"gmaps")\t';

                str += 'to\t';
                str += portalTo+'\t';
                str += '['+portalToLL.lat+','+portalToLL.lng+']\t';
                str += '=HYPERLINK("'+window.plugin.todolist.generateIntelByLatLng(portalToLL, portalTo)+'";"intel")\t';
                str += '=HYPERLINK("'+window.plugin.todolist.generateGmapsByLatLng(portalToLL, portalTo)+'";"gmaps")\t';
            }else{
                str += portalTo+'\t';
                str += '['+portalToLL.lat+','+portalToLL.lng+']\t';
                str += '=HYPERLINK("'+window.plugin.todolist.generateIntelByLatLng(portalToLL, portalTo)+'";"intel")\t';
                str += '=HYPERLINK("'+window.plugin.todolist.generateGmapsByLatLng(portalToLL, portalTo)+'";"gmaps")\t';

                str += '\t';
                str += '\t\t';
                str += '\t\t';
            }
            str += '\n';

            var linkTo = (task.from !== null)? task.nick : '---';
        }

        window.plugin.todolist.dialog.openBoxExport(str);
    }

	window.plugin.todolist.dialog.reset = function(){
		var promptAction = confirm('Your ToDo List will be deleted. Are you sure?', '');
		if(promptAction === true){
            window.plugin.todolist.action.reset();
        }
	}
	window.plugin.todolist.dialog.addPlayer = function(){
		var promptAction = prompt('Insert a Player name', '');
		if(promptAction !== null && promptAction !== ''){
            window.plugin.todolist.action.addPlayer(promptAction);
        }
	}

	//------------------------------------------------------------------
	// KEYS LIST
	//------------------------------------------------------------------
	window.plugin.todolist.getHTML.keysListByPortal = function(){
        var mixLists = window.plugin.todolist.data.generateJsonKeysList();
        var keysByPortal = mixLists['byPortal'];
        var keysByPlayers = mixLists['byPlayer'];

        var myTeam = window.PLAYER.team.toLowerCase();
		var html = '';

        html += '<div class="toDoList box keys keysListByPortal">';
            html += '<h4>Keys by Portal</h4>';
            html += '<a class="btn btn-l" onclick="$(\'.keysListByPortal li ul\').toggle();return false;"><i class="fa fa-expand"></i> Expand/Reduce</a>';
            html += '<ol class="toDoList keysListList">';
            for(guid in keysByPortal['list']){
                var portal = keysByPortal['list'][guid];
                html += '<li>';
                    html += '<span><span class="keys-count">x'+portal.keys.total+'</span> ';
                    html += '<a onclick="map.setView(['+portal.ll.lat+','+portal.ll.lng+']); return false;">'+portal.title+'</a></span>';
                    html += '<ul>';
                    for(nick in portal['keys']['players']){
                        html += '<li>';
                            html += '<span>x'+portal['keys']['players'][nick]+'</span> ';
                            html += '<span class="nick '+myTeam+'">'+nick+'</span>';
                        html += '</li>';
                    }
                    html += '</ul>';
                html += '</li>';
            }
            html += '</ol>';
        html += '</div>'

        return html;
    }
	window.plugin.todolist.getHTML.keysListByPlayer = function(){
        var mixLists = window.plugin.todolist.data.generateJsonKeysList();
        var keysByPortal = mixLists['byPortal'];
        var keysByPlayers = mixLists['byPlayer'];

        var myTeam = window.PLAYER.team.toLowerCase();
		var html = '';

        html += '<div class="toDoList box keys keysListByPlayer">';
            html += '<h4>Keys by Player</h4>';
            html += '<ol class="toDoList keysListList">';
            for(nick in keysByPlayers['list']){
                var player = keysByPlayers['list'][nick];
                html += '<li>';
                    html += '<span class="nick '+myTeam+'">'+nick+'</span>';
                    html += '<ul>';
                    for(guid in player['keys']['portals']){
                        var portal = player['keys']['portals'][guid];
                        html += '<li>';
                        html += '<span><span class="keys-count">x'+portal.keys+'</span> ';
                            html += '<a onclick="map.setView(['+portal.ll.lat+','+portal.ll.lng+']); return false;">'+portal.title+'</a></span>';
                        html += '</li>';
                    }
                    html += '</ul>';
                html += '</li>';
            }
            html += '</ol>';
        html += '</div>';

        return html;
    }

	window.plugin.todolist.getHTML.keysBox = function(){
        var mixLists = window.plugin.todolist.data.generateJsonKeysList();
        var keysByPortal = mixLists['byPortal'];
        var keysByPlayers = mixLists['byPlayer'];

        var colorFaction = (window.PLAYER.team === 'ENL')? '#27f527' : 'blue';
		var html = '';

        html += '<div class="toDoList box keys"">';
            html += '<ul style="display:none;">';
                html += '<li><a href="#keysTabs1">by Portal</a></li>';
                html += '<li><a href="#keysTabs2">by Player</a></li>';
            html += '</ul>';
            html += '<div id="keysTabs1">';
                html += window.plugin.todolist.getHTML.keysListByPortal();
            html += '</div>';
            html += '<div id="keysTabs2">';
                html += window.plugin.todolist.getHTML.keysListByPlayer();
            html += '</div>';
        html += '</div>';

        return html;
    }
    window.plugin.todolist.ui.refreshKeysList = function(){
        var html_1 = window.plugin.todolist.getHTML.keysListByPortal();
        var html_2 = window.plugin.todolist.getHTML.keysListByPlayer();

        $('.toDoList.box.keys.keysListByPortal').html(html_1).children().unwrap();
        $('.toDoList.box.keys.keysListByPlayer').html(html_2).children().unwrap();
    }
    window.plugin.todolist.dialog.openBoxKeys = function(){
        var html = '';
        html = window.plugin.todolist.getHTML.keysBox();

        dialog({
            title: 'To Do List - Keys',
            html: '<div class="toDoList keys tabs">'+html+'</div>',
            dialogClass: 'ui-dialog-todolist keys',
            buttons: {
                'Read': function(){
                    var msg = '<p style="width:90%;display:block;margin:15px auto 0;text-align:center;">The list is generated through the <i>"get key"</i> and <i>"link (to)"</i> tasks.</p>';
                    window.plugin.todolist.dialog.openBoxMessage(msg);
                },
                'EXPORT': function(){
                    var str1 = '';

                    str1 += '';
                    str1 += '<h3>as TSV</h3>';
                    str1 += '<a class="btn btn-l" onclick="window.plugin.todolist.action.copyKeysListAsTsv();return false;"><i class="fa fa-upload"></i> Export as TSV for gSheet</a>';

                    str1 += '<h3>as text by Portal</h3>';
                    str1 += '<a class="btn btn-l" onclick="window.plugin.todolist.action.copyKeysListByPortalAsText(0);return false;"><i class="fa fa-upload"></i> Export as text (simple)</a>';
                    str1 += '<a class="btn btn-l" onclick="window.plugin.todolist.action.copyKeysListByPortalAsText(1);return false;"><i class="fa fa-upload"></i> Export as text (with nick)</a>';

                    str1 += '<h3>as text by Player</h3>';
                    str1 += '<a class="btn btn-l" onclick="window.plugin.todolist.action.copyKeysListByPlayerAsText();return false;"><i class="fa fa-upload"></i> Export as text</a>';

                    window.plugin.todolist.dialog.openBoxMessage(str1);
                },
                'REFRESH': function(){
                    window.plugin.todolist.ui.refreshKeysList();
                },
            }
        });

        $('.toDoList.keys.tabs').tabs({active: 0});
    }

	window.plugin.todolist.layer.drawKeysMarkers = function(){
        var list = window.plugin.todolist.data.generateJsonKeysList();
        for(guid in list['byPortal']['list']){
            var portal = list['byPortal']['list'][guid];
            var ll = portal.ll;
            L.marker(portal.ll).addTo(map);
        }
    }
	window.plugin.todolist.data.generateJsonKeysList = function(){
        var tasks = window.plugin.todolist.data.getTasks();

        var obj = {};
        obj['totKeys'] = 0;
        obj['byPortal'] = {count:0,list:{}};
        obj['byPlayer'] = {count:0,list:{}};

        for(i in tasks){
            var task = tasks[i];

            if(task.action == 'link' || task.action == 'get key'){
                if(task.to){
                    var portal = task.to;
                    var guid = portal.guid;
                    var nick = (task.nick !== null)? task.nick : '{{undefined}}';

                    //-----------

                    obj['totKeys']++;

                    //-----------

                    if(!obj['byPortal']['list'][guid]){
                        obj['byPortal']['list'][guid] = JSON.parse(JSON.stringify(portal));
                        obj['byPortal']['list'][guid]['keys'] = {};
                        obj['byPortal']['list'][guid]['keys']['total'] = 0;
                        obj['byPortal']['list'][guid]['keys']['players'] = {};
                        obj['byPortal']['count']++;
                    }
                    obj['byPortal']['list'][guid]['keys']['total']++;

                    if(!obj['byPortal']['list'][guid]['keys']['players'][nick]){
                        obj['byPortal']['list'][guid]['keys']['players'][nick] = 0;
                    }
                    obj['byPortal']['list'][guid]['keys']['players'][nick]++;

                    //-----------

                    if(!obj['byPlayer']['list'][nick]){
                        obj['byPlayer']['list'][nick] = {};
                        obj['byPlayer']['list'][nick]['keys'] = {};
                        obj['byPlayer']['list'][nick]['keys']['total'] = 0;
                        obj['byPlayer']['list'][nick]['keys']['portals'] = {};
                        obj['byPlayer']['count']++;
                    }
                    obj['byPlayer']['list'][nick]['keys']['total']++;

                    if(!obj['byPlayer']['list'][nick]['keys']['portals'][guid]){
                        obj['byPlayer']['list'][nick]['keys']['portals'][guid] = JSON.parse(JSON.stringify(portal));
                        obj['byPlayer']['list'][nick]['keys']['portals'][guid]['keys'] = 0;
                    }
                    obj['byPlayer']['list'][nick]['keys']['portals'][guid]['keys']++;
                }
            }
        }

        return obj;
	}

    window.plugin.todolist.action.copyKeysListAsTsv = function(){
        var lists = window.plugin.todolist.data.generateJsonKeysList();
        var list_1 = lists['byPlayer']['list'];
        var list_2 = lists['byPortal']['list'];
        var str = '';

        str += ' \t \t \t \t ';

        for(nick in list_1){
            str += '\t '+nick+'';
        }
        str += '\n';

        for(guid in list_2){
            var portal = list_2[guid];
            var portalTitle = portal.title;
            var ll = portal.ll;

            str += '['+ll.lat+','+ll.lng+']\t';
            str += '=HYPERLINK("'+window.plugin.todolist.generateIntelByLatLng(ll, portalTitle)+'";"intel")\t';
            str += '=HYPERLINK("'+window.plugin.todolist.generateGmapsByLatLng(ll, portalTitle)+'";"gmaps")\t';
            str += portalTitle+'\t';
            str += portal.keys.total+'';

            for(nick in list_1){
                var keys = (list_1[nick].keys.portals[guid] !== undefined)? list_1[nick].keys.portals[guid].keys : '';
                str += '\t '+keys;
            }
            str += '\n';
        }
        window.plugin.todolist.dialog.openBoxExport(str);
    }
    window.plugin.todolist.action.copyKeysListByPlayerAsText = function(){
        var lists = window.plugin.todolist.data.generateJsonKeysList();
        var list = lists['byPlayer']['list'];
        var str = '';

        for(nick in list){
            str += '- '+nick+':\n';
            for(guid in list[nick].keys.portals){
                var portal = list[nick].keys.portals[guid];
                str += '---- [x'+portal.keys+'] '+portal.title+'\n';
            }
        }
        window.plugin.todolist.dialog.openBoxExport(str);
    }
    window.plugin.todolist.action.copyKeysListByPortalAsText = function(exportNick){
        var lists = window.plugin.todolist.data.generateJsonKeysList();
        var list = lists['byPortal']['list'];
        var str = '';

        for(guid in list){
            var portal = list[guid];
            str += '- [x'+portal.keys.total+'] '+portal.title+'\n';

            if(exportNick === 1 || exportNick === true){
                for(nick in portal.keys.players){
                    str += '---- [x'+portal.keys.players[nick]+'] '+nick+'\n';
                }
            }

        }
        window.plugin.todolist.dialog.openBoxExport(str);
    }

    //------------------------------------------------------------------
	// LAYERS
	//------------------------------------------------------------------
	window.plugin.todolist.data.generatePortalsList = function(){
        var tasks = window.plugin.todolist.data.getTasks();
        var obj = {count:0,list:{}};

        for(i in tasks){
            var task = tasks[i];

            if(task.from){
                var portal = JSON.parse(JSON.stringify(task.from));
                var guid = portal.guid;
                if(!obj['list'][guid]){
                    obj['list'][guid] = portal;
                    obj['count']++;
                }
            }
            if(task.to){
                var portal = JSON.parse(JSON.stringify(task.to));
                var guid = portal.guid;
                var nick = task.nick;
                if(!obj['list'][guid]){
                    obj['list'][guid] = portal;
                    obj['count']++;
                }
            }
        }
        return obj;
	}

	window.plugin.todolist.data.getPortalTask = function(guid){
        var lists = window.plugin.todolist.data.generateJsonActionsList();
        var listByPortal = lists['byPortal'];
        var portal = listByPortal[guid];
        return portal;
	}

    window.plugin.todolist.layer.removeNoTaskPortal = function(){
        var list = window.plugin.todolist.data.generatePortalsList();
		window.plugin.todolist.layer.layerGroup.eachLayer(function(layer){
            var guid = layer.options.guid;

            if(list['list'][guid] === undefined){
                window.plugin.todolist.layer.layerGroup.removeLayer(layer);
            }
		});
    }

	window.plugin.todolist.layer.drawPortalsMarkers = function(){
        window.plugin.todolist.layer.layerGroup.clearLayers();
        var list = window.plugin.todolist.data.generatePortalsList();

        for(guid in list['list']){
            var portal = list['list'][guid];
            var ll = portal.ll;

            var options = {
                title: portal.title,
                guid: portal.guid,
                icon: L.divIcon({
                    popupAnchor:L.point(0, -40),
                    iconAnchor: [15,40],
                    iconSize: [30,30],
                    className: 'toDoList toDoListMarker toDoListPin',
                    html: '<div class="diamond"><div><i class="fa fa-check"></i></div></div>'
                })

            };
            var marker = L.marker(portal.ll, options);

            window.registerMarkerForOMS(marker);
            marker.addEventListener('spiderfiedclick', window.plugin.todolist.layer.openPopup(marker));
            window.plugin.todolist.layer.layerGroup.addLayer(marker);
        }
    }
    window.plugin.todolist.layer.openPopup = function(marker){
        return function(){
            var html = '';

            var guid = marker.options.guid;
            var portal = window.plugin.todolist.data.getPortalTask(guid);
            var myTeam = window.PLAYER.team.toLowerCase();

            html += '<div class="toDoList box actions portal portal-actions tasks">';
            html += '<div class="toDoList tasksList">';
            if(portal['actions'] !== undefined){
                for(i in portal['actions']){
                    var task = portal['actions'][i];
                    html += window.plugin.todolist.getHTML.task(task, task.i);
                }
            }
            html += '</div>';
            html += '</div>';

            //pre-create for reference and display popup
            var popup = L.popup({
                maxWidth:400,
                closeButton: false,
                className:'toDoList toDoList-PopUp popup',
                offset:[0,-40]
            })
                .setLatLng(marker.getLatLng()) //(assuming e.latlng returns the coordinates of the event)
                .setContent(html)
                .openOn(map);
        };
    }

	window.plugin.todolist.data.generateJsonActionsList = function(){
        var tasks = window.plugin.todolist.data.getTasks();

        var obj = {};
        obj['tot'] = window.plugin.todolist.data.getTasksLength();
        obj['byPortal'] = {};

        for(i in tasks){
            var task = tasks[i];

            if(task.to){
                var portal = task.to;
                var guid = portal.guid;
                var nick = (task.nick !== null)? task.nick : '{{undefined}}';
                var action = JSON.parse(JSON.stringify(task));
                action['i'] = parseInt(i);

                //-----------

                if(!obj['byPortal'][guid]){
                    obj['byPortal'][guid] = JSON.parse(JSON.stringify(portal));
                    obj['byPortal'][guid]['actions'] = [];
                }
                obj['byPortal'][guid]['actions'].push(action);
            }

            if(task.from){
                var portal = task.from;
                var guid = portal.guid;
                var nick = (task.nick !== null)? task.nick : '{{undefined}}';
                var action = JSON.parse(JSON.stringify(task));
                action['i'] = parseInt(i);

                //-----------

                if(!obj['byPortal'][guid]){
                    obj['byPortal'][guid] = JSON.parse(JSON.stringify(portal));
                    obj['byPortal'][guid]['actions'] = [];
                }
                obj['byPortal'][guid]['actions'].push(action);
            }
        }

        return obj;
	}

	//------------------------------------------------------------------
	// MPE
	//------------------------------------------------------------------
	window.plugin.todolist.mpe.initMPE = function(){
		if(window.plugin.mpe !== undefined){
			window.plugin.mpe.setMultiProjects({
				namespace: 'todolist',
				title: 'ToDo List',
				fa: 'fa-check-square-o',
				defaultKey: 'plugin-todolist',
				func_setKey: function(newKey){
					window.plugin.todolist.storage.NAME = newKey;
				},
				func_pre: function(){},
				func_post: function(){
                    window.plugin.todolist.obj.main = {settings:{drawMode:0,copyMode:0}, players:[], tasks:[]};
					window.plugin.todolist.storage.check();
                    window.plugin.todolist.obj.curr = {player:null, action:window.plugin.todolist.obj.actions[0]};
                    window.plugin.todolist.data.resetLinkMode();
                    window.plugin.todolist.action.reloadBox();
				}
			});
		}
	}


	//------------------------------------------------------------------
	window.plugin.todolist.setupCSS = function(){
		$('<style>').prop('type', 'text/css').html(''
            +'.ui-dialog-todolist .ui-dialog-content.ui-widget-content{overflow:hidden;padding:0;}'
            +'.ui-dialog-todolist.main .ui-dialog-buttonpane button{margin-left:5px;}'
            +'.ui-dialog-todolist.main .ui-dialog-content.ui-widget-content{min-height:0!important;}'
            +'.ui-dialog-todolist.main .ui-dialog-buttonpane .ui-dialog-buttonset button:first-child{background:0 0;border:none;text-decoration:none;margin-left:15px;float:left;width:50px;}'

            +'.toDoList,.toDoList *{box-sizing:border-box;font-size:12px;border-style:solid;border-color:#20a8b1;border-width:0;}'
            +'.toDoList .clear{clear:both;width:0;height:0!important;}'
            +'.toDoList.box{color:#fff;border-top-width:1px}.toDoList.box.main{overflow:hidden;}'

            +'.toDoList.box .padCommand{padding:0 0 7px;background:rgba(0,0,0,.5);}'
            +'.toDoList.box .padCommand>*{display:inline-block;text-align:center;}'
            +'.toDoList.box .padCommand>*,.toDoList.box .tasksList .task .delete,.toDoList.box .tasksList .task .copy{-webkit-user-select:none;-moz-user-select:none;user-select:none;}'
            +'.toDoList.box .padCommand>.fa{width:7%;}'
            +'.toDoList.box select.select{width:31%;background:rgba(8,48,78,.9);border:1px solid #ffce00;padding:3px 0 2px;color:#ffce00;}'
            +'.toDoList.box .padCommand .addTask{background:rgba(8,48,78,.9);width:18%;padding:4px 5px 2px;margin:7px 2.5% 0 3.5%;border:1px solid #ffce00;}'

            +'.toDoList.box .tasksList{border-top-width:0;max-height:301px;overflow:hidden;overflow-y:auto;}'
            +'.toDoList.box .tasksList .task{display:flex;height:25px;/*border-top-width:1px;*/box-shadow:0 1px 0 #20a8b1,inset 0 1px 0 #20a8b1;}'
            +'.toDoList.box .tasksList .task.checked .content *{opacity:.5;text-decoration:line-through !important;}'
            +'.toDoList.box .tasksList .task.noTask{box-shadow:none;}'
            +'.toDoList.box .tasksList .task.noTask .content{text-align:center;width:100%;}'
            +'.toDoList.box .tasksList .task>*{display:inline-block;display:block;height:25px;float:left;}'
            +'.toDoList.box .tasksList .task a{color:#ffce00;}'
            +'.toDoList.box .tasksList .task .delete,.toDoList.box .tasksList .task .copy{text-align:center;width:8%;padding:6px 7px 0;border-right-width:1px;}'
            +'.toDoList.box .tasksList .task .copy{border-right-width:0px;border-left-width:1px;}'
            +'.toDoList.box .tasksList .task .delete:hover,.toDoList.box .tasksList .task .copy:hover{background:#ffce00;color:#000;text-decoration:none;}'
            +'.toDoList.box .tasksList .task .checkbox{font-size:14px;text-align:center;width:4%;height:auto;margin:6px 0 0 2%;cursor:pointer;}'
            +'.toDoList.box .tasksList .task .content{flex:1;padding:6px 6px 0;/*width:86%;*/height:25px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'

            +'.toDoList.box .tasksList .task .content *{position:static;display:inline-block;overflow:hidden;text-overflow:ellipsis;word-wrap:break-word;}'
            +'.toDoList.box .tasksList .task .content .player{font-style:oblique;}'

            +'.toDoList.box .tasksList .task .content .player{max-width:100px;padding-right:2px;}'
            +'.toDoList.box .tasksList .task .content .portal{max-width:180px;}'
            +'.toDoList.box .tasksList .task .content.link .player{max-width:70px;}'
            +'.toDoList.box .tasksList .task .content.link .portal{max-width:98px;}'

            +'.toDoList.box .tasksList .task.copyMode .content .player{max-width:100px;}'
            +'.toDoList.box .tasksList .task.copyMode .content .portal{max-width:154px;}'
            +'.toDoList.box .tasksList .task.copyMode .content.link .player{max-width:65px;}'
            +'.toDoList.box .tasksList .task.copyMode .content.link .portal{max-width:84px;}'
            +'.toDoList.box .tasksList .task .content.link *{position:relative;top:0px;}'

            +'.toDoList .nick{cursor:pointer;}'
            +'.toDoList .nick.enlightened{color:#03DC03 !important;}'
            +'.toDoList .nick.resistance{color:#0088FF !important;}'

            +'.ui-dialog-todolist.keys .ui-dialog-buttonpane .ui-dialog-buttonset button{margin-left:5px;}'
            +'.ui-dialog-todolist.keys .ui-dialog-buttonpane .ui-dialog-buttonset button:first-child{display:none;}'
            +'.toDoList.box.keys h4{text-align:center;}'
            +'.toDoList.keysListList{margin-left:4%;}'
            +'.toDoList.keysListList > li > span{background:rgba(0,0,0,.4);padding:4px 0px;display:block;}'
            +'.toDoList.keysListByPortal li ul{display:none;}'
            +'.toDoList.keysListList, .toDoList.keysListList ul{list-style:none;padding-left:0px;width:91%;}'
            +'.toDoList.keysListList .keys-count{display:inline-block;background:#a5a5a5;padding:0px 3px 0px;color:black;border-radius:2px;font-weight:bold;font-size:11px;line-height:0.85rem;}'
            +'.toDoList.keys.tabs.ui-tabs h4{display:none;}'
            +'.toDoList.keys.tabs.ui-tabs .ui-tabs-nav{display:block !important;text-align:center;}'
            +'.toDoList.keys.tabs.ui-tabs .ui-tabs-nav li{display:inline-block;width:50%;margin:0 0;border:none;opacity:.5;border:0px solid #20a8b1;border-bottom-width:1px;}'
            +'.toDoList.keys.tabs.ui-tabs .box{border:none;}'
            +'.toDoList.keys.tabs.ui-tabs .ui-tabs-nav li:hover, .toDoList.keys.tabs.ui-tabs .ui-tabs-nav li.ui-tabs-active{opacity:1;background:none;}'
            +'.toDoList.keys.tabs.ui-tabs .ui-tabs-nav li.ui-tabs-active{border-bottom-width:3px;}'
            +'.toDoList.keys.tabs.ui-tabs .ui-tabs-nav li a{display:block;padding:8px 2px 7px;}'
            +'.toDoList.keys.tabs.ui-tabs .ui-tabs-nav li.ui-tabs-active a{padding-bottom:6px;}'

            // MARKER
			+'.toDoList.toDoListPin .diamond{transform:scaleX(0.5) scaleY(0.9);transform-origin:50% 100%;}'
			+'.toDoList.toDoListPin .diamond div{transform:rotate(45deg);height:30px;width:30px;background:red;border:1px solid #153F54;box-shadow:0 0 10px rgba(0,0,0,.5);background:#ab5555;}'
			+'.toDoList.toDoListPin .diamond div .fa{font-size:19px;color:#fff;transform:scaleX(1) scaleY(1) rotate(-45deg);transform-origin:95% 28%;text-shadow:0 0 6px #000;}'

            // POPUP CSS
            +'.toDoList.popup .leaflet-popup-content{margin:0 !important;padding:0px;}'
            +'.toDoList.popup .leaflet-popup-content{width:400px !important;}'
            +'.toDoList.popup .leaflet-popup-content-wrapper{padding:0 !important;}'
            +'.toDoList.popup .leaflet-popup-content .toDoList.box{border-top-width:0;}'
            +'.toDoList.popup .leaflet-popup-content .toDoList.box .task:first-child{box-shadow:none;}'
            +'.toDoList.popup .leaflet-popup-content, .toDoList.popup .leaflet-popup-content *{font-size:12px;}'

            +'.toDoList.box h3{font-size:14px;margin:10px 0;text-align:center;height:auto;}'
            +'.toDoList.box label.btn{width:88%!important;cursor:pointer;}'
            +'.toDoList.box label.btn input{cursor:pointer;}'
            +'.toDoList.box .btn{display:inline-block;background:rgba(8,48,78,.9);border:1px solid #ffce00;padding:4px 10px 2px;color:#ffce00;text-align:center;}'
            +'.toDoList.box .btn.btn-l{display:block;width:66%;margin:8px auto;}'
            +'.toDoList.box.settings .managePlayers{text-align:center;width:90%;margin:0 auto;}'
            +'.toDoList.box.settings .managePlayers select.select{width:65%;margin:0 7px;}'
            +'.toDoList.box.export{padding:0 6%;margin:0 auto 8px;}'
            +'.toDoList.box.message{padding:20px 6%;font-size:inherit;}'
            +'.sortable-placeholder{background:0 0;}'
            +'.ui-sortable-handle.ui-sortable-helper{background:rgba(8,48,78,.9);}'
		).appendTo('head');
	}

	var setup = function(){
		window.plugin.todolist.setupCSS();
        window.plugin.todolist.storage.check();

        window.plugin.todolist.mpe.initMPE();

		$('#toolbox').append(window.plugin.todolist.getHTML.triggerBox());

        window.plugin.todolist.layer.layerGroup = new L.LayerGroup();
        window.addLayerGroup('ToDo List', window.plugin.todolist.layer.layerGroup, true);
        window.plugin.todolist.layer.drawPortalsMarkers();
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

