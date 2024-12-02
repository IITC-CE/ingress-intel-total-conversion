// ==UserScript==
// @author         BlancLapin
// @id             advanced_player_tracker@BlancLapin
// @name           Advanced Tracker Player
// @category       Misc
// @version        0.0.1
// @namespace      https://tempuri.org/iitc/advanced-player-tracker
// @description    Advanced version of Player Tracker
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/BlancLapin/advanced_player_tracker.meta.js
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/BlancLapin/advanced_player_tracker.user.js
// @depends        player-activity-tracker@breunigs
// @include        http://www.ingress.com/intel*
// @include        https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @grant          none
// ==/UserScript==


// Wrapper function that will be stringified and injected
// into the document. Because of this, normal closure rules
// do not apply here.
function wrapper(plugin_info) {
  // Make sure that window.plugin exists. IITC defines it as a no-op function,
  // and other plugins assume the same.
  if(typeof window.plugin !== 'function') window.plugin = function() {};

  window.plugin.advancedPlayerTracker = function() {};

  // Refresh interval (don't spam)
  window.plugin.advancedPlayerTracker.refreshInterval = 600000; // 10min, in ms

  // Local Storage Player List Key
  window.plugin.advancedPlayerTracker.LSPlayerListKey = 'IITCWatchPlayerList';

  // Local Storage Player Data Key
  window.plugin.advancedPlayerTracker.LSPlayerDataKey = 'IITCWatchPlayerData';

  // List of players to track (should be moved to Local Storage)
  window.plugin.advancedPlayerTracker.playerList = [];

  // List of visible players at the moment
  window.plugin.advancedPlayerTracker.visiblePlayers = [];

  // Store data
  window.plugin.advancedPlayerTracker.playerData = [];

  // Name of the IITC build for first-party plugins
  plugin_info.buildName = 'AdvancedPlayerTracker';

  // Datetime-derived version of the plugin
  plugin_info.dateTimeVersion = '20220208103500';

  // ID/name of the plugin
  plugin_info.pluginId = 'AdvancedPlayerTracker';

  // The entry point for this plugin.
  function setup() {
      
  }

  window.plugin.advancedPlayerTracker.setupHook = function() {
    // Get player list from local storage
    var playerListLocalStorage = localStorage.getItem(window.plugin.advancedPlayerTracker.LSPlayerListKey);
    if (playerListLocalStorage){
      window.plugin.advancedPlayerTracker.playerList = JSON.parse(playerListLocalStorage)['WatchedPlayers'];
    }

    // Load previous data from local storage if existing
    var playerDataLocalStorage = localStorage.getItem(window.plugin.advancedPlayerTracker.LSPlayerDataKey);
    if (playerDataLocalStorage){
      window.plugin.advancedPlayerTracker.playerData = JSON.parse(playerDataLocalStorage);
    }

    // Add a refresh timer to refresh map at regular interval (don't spam)
    window.setInterval(window.plugin.advancedPlayerTracker.refreshMap, window.plugin.advancedPlayerTracker.refreshInterval);
  }

  // Refresh map
  window.plugin.advancedPlayerTracker.refreshMap = function(){
    window.mapDataRequest.start();
  }

  // Update Player List (updated via interface)
  window.plugin.advancedPlayerTracker.updatePlayerList = function(updatedPlayerList){
    window.plugin.advancedPlayerTracker.playerList = updatedPlayerList.split('\n');

    // Save to Local Storage
    localStorage.setItem(window.plugin.advancedPlayerTracker.LSPlayerListKey, JSON.stringify({WatchedPlayers: window.plugin.advancedPlayerTracker.playerList}));
  }

  // Hook Map Refreshed
  window.plugin.advancedPlayerTracker.mapRefreshEnded = function(){
    
    // Check visible players on the map
    window.plugin.advancedPlayerTracker.visiblePlayers = [];
    $.each(window.plugin.playerTracker.stored, function(pguid, playerData) {
        if(!playerData || playerData.events.length === 0) {
          console.warn('broken player data for pguid=' + pguid);
        }else{
          window.plugin.advancedPlayerTracker.visiblePlayers.push(playerData)
        }
    });

    // Export data to csv
    window.plugin.advancedPlayerTracker.exportData = function(){
      var csvData = 'Player, Team, Latitude, Longitude, Portal Hit, Timestamp' + "\n";
      $.each(window.plugin.advancedPlayerTracker.playerData, function(key, value){
        csvData += (value.Player + ',' + value.Team + "," + value.Lat + "," + value.Long + ',' + value.PortalHit + ',' + value.timestamp + "\n");
      });

      var link = document.createElement("a");
      link.download = 'AdvandedPlayerTracker_Export.csv';
      link.href = "data:text/csv," + escape(csvData);
      link.click();
    }

    // Check if visible player is on the watch list
    $.each(window.plugin.advancedPlayerTracker.visiblePlayers, function(index, playerData){
      if (window.plugin.advancedPlayerTracker.playerList.includes(playerData.nick)) {
        //console.log(playerData.nick + ' is visible and on watch list');
        //console.log(playerData);

        // For each watched player, check events
        $.each(playerData.events, function(index, event){

          // If not prior events, add the first one
          if (!window.plugin.advancedPlayerTracker.playerData.length){
            window.plugin.advancedPlayerTracker.playerData.push({Player: playerData.nick, Team: playerData.team, Lat: event.latlngs[0][0], Long: event.latlngs[0][1], PortalHit: event.name, timestamp: event.time});
          }

          // Check if events are posterior to already logged data (don't add otherwise)  
          var filteredData = window.plugin.advancedPlayerTracker.playerData.filter(function(elem) {
            return (elem.Player == playerData.nick && elem.timestamp >= event.time)
          });

          // If events is posterior to logged data, add it
          if (!filteredData.length){
            window.plugin.advancedPlayerTracker.playerData.push({Player: playerData.nick, Team: playerData.team, Lat: event.latlngs[0][0], Long: event.latlngs[0][1], PortalHit: event.name, timestamp: event.time});
          }
        });
      }
    });

    // Save data to local storage
    localStorage.setItem(window.plugin.advancedPlayerTracker.LSPlayerDataKey, JSON.stringify(window.plugin.advancedPlayerTracker.playerData));
  }

  window.plugin.advancedPlayerTracker.showDialog = function(){

      var data = `
        <i>Watch List:</i><br>
        <form name='playerlist' action='#' method='post' target='_blank'>
            <div class="row">
                <div id='playerListArea' class="column" style="float:left;width:100%;box-sizing: border-box;padding-right: 5px;">
                    <textarea 
                        id='listPlayers'
                        rows='15'
                        placeholder='List of players you want to watch. One per line.'
                        style="width: 100%; white-space: nowrap;">${window.plugin.advancedPlayerTracker.playerList.join("\n")}</textarea>
                </div>
            </div>
        <button type="submit" form="maxfield" value="Save" onclick='window.plugin.advancedPlayerTracker.updatePlayerList(document.getElementById("listPlayers").value)'>Save Watch List</button>
        <button type="submit" form="maxfield" value="Export Data" onclick='window.plugin.advancedPlayerTracker.exportData()'>Export Tracking Data</button>
        </form>
        `;

        var dia = window.dialog({
            title: "Tracked Player List",
            html: data
        }).parent();
  }

  window.plugin.advancedPlayerTracker.setup = function() {
      if (window.plugin.playerTracker === undefined) {
          console.log("This plugin requires player tracker");
          return;
      }


     $('#toolbox').append(' <a onclick="window.plugin.advancedPlayerTracker.showDialog()">Advanced Player Tracker</a>');
    // Ensure this hook gets run after player tracker's
    addHook('iitcLoaded', window.plugin.advancedPlayerTracker.setupHook);

    // interesting hook
    addHook('mapDataRefreshEnd', window.plugin.advancedPlayerTracker.mapRefreshEnded);
  };

  var setup = window.plugin.advancedPlayerTracker.setup;

  // Add an info property for IITC's plugin system
  setup.info = plugin_info;

  // Make sure window.bootPlugins exists and is an array
  if (!window.bootPlugins) window.bootPlugins = [];
  // Add our startup hook
  window.bootPlugins.push(setup);
  // If IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup();
}

// Create a script element to hold our content script
var script = document.createElement('script');
var info = {};

// GM_info is defined by the assorted monkey-themed browser extensions
// and holds information parsed from the script header.
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };


 
}

// Create a text node and our IIFE inside of it
var textContent = document.createTextNode('('+ wrapper +')('+ JSON.stringify(info) +')');
// Add some content to the script element
script.appendChild(textContent);
// Finally, inject it... wherever.
(document.body || document.head || document.documentElement).appendChild(script);