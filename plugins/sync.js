// @author         xelio
// @name           Sync
// @category       Misc
// @version        0.4.2
// @description    Sync data between clients via Google Drive API. Only syncs data from specific plugins (currently: Keys, Bookmarks, Uniques). Sign in via the 'Sync' link. Data is synchronized every 3 minutes.


////////////////////////////////////////////////////////////////////////
// Notice for developers:
//
// You should treat the data stored on Google Drive API as volatile.
// Because if there are change in Google API client ID, Google will
// treat it as another application and could not access the data created
// by old client ID. Store any important data locally and only use this
// plugin as syncing function.
//
// Google Drive API reference
// https://developers.google.com/drive/api/v3/about-sdk
////////////////////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.sync = function() {};

window.plugin.sync.parentFolderID = null;
window.plugin.sync.parentFolderIDrequested = false;
window.plugin.sync.KEY_UUID = {key: 'plugin-sync-data-uuid', field: 'uuid'};

// Each client has an unique UUID, to identify remote data is updated by other clients or not
window.plugin.sync.uuid = null;

window.plugin.sync.dialogHTML = null;
window.plugin.sync.authorizer = null;

// Store registered CollaborativeMap
window.plugin.sync.registeredPluginsFields = null;
window.plugin.sync.logger = null;

window.plugin.sync.checkInterval = 3 * 60 * 1000;   // update data every 3 minutes

// Other plugin call this function to push update to Google Drive API
// example:
// plugin.sync.updateMap('keys', 'keysdata', ['guid1', 'guid2', 'guid3'])
// Which will push plugin.keys.keysdata['guid1'] etc. to Google Drive API
window.plugin.sync.updateMap = function(pluginName, fieldName, keyArray) {
  var registeredMap = plugin.sync.registeredPluginsFields.get(pluginName, fieldName);
  if(!registeredMap) return false;
  registeredMap.updateMap(keyArray);
};

// Other plugin call this to register a field as CollaborativeMap to sync with Google Drive API
// example: plugin.sync.registerMapForSync('keys', 'keysdata', plugin.keys.updateCallback, plugin.keys.initializedCallback)
// which register plugin.keys.keysdata
//
// updateCallback function format: function(pluginName, fieldName, null, fullUpdated)
// updateCallback will be fired when local or remote pushed update to Google Drive API
// fullUpdated is true when remote update occur during local client offline, all data is replaced by remote data
// the third parameter is always null for compatibility
//
// initializedCallback function format: function(pluginName, fieldName)
// initializedCallback will be fired when the storage finished initialize and good to use
window.plugin.sync.registerMapForSync = function(pluginName, fieldName, updateCallback, initializedCallback) {
  var options, registeredMap;
  options = {'pluginName': pluginName,
               'fieldName': fieldName,
               'callback': updateCallback,
               'initializedCallback': initializedCallback,
               'authorizer': plugin.sync.authorizer,
               'uuid': plugin.sync.uuid};
  registeredMap = new plugin.sync.RegisteredMap(options);   // create a new datasructure 
                                                            // for the calling plugin and
  plugin.sync.registeredPluginsFields.add(registeredMap);   // add it to the main structure
};



//// RegisteredMap *************************************************************************
// Create a file named pluginName[fieldName] in folder specified by authorizer
// The file use as document with JSON to store the data and uuid of last update client
// callback will called when any local/remote update happen
// initializedCallback will called when storage initialized and good to use.
window.plugin.sync.RegisteredMap = function(options) {
  this.pluginName = options['pluginName'];
  this.fieldName = options['fieldName'];
  this.callback = options['callback'];
  this.initializedCallback = options['initializedCallback'];
  this.authorizer = options['authorizer'];

  this.uuid = options['uuid'];                              // local UUID
  this.lastUpdateUUID = null;                               // the UUID that we think
                                                            // did last Update (can be us)
  this.remoteUUID = null;                                   // the remote UUID in drive

  this.intervalID = null;
  this.map = null;
  this.dataStorage = null;

  this.forceFileSearch = false;
  this.initializing = false;
  this.initialized = false;
  this.failed = false;
  this.doSync = 'remote';                                   // normal 'sync'
                                                            // 'no' sync needed
                                                            // force 'remote' (1st sync)
                                                            // force 'local'
                                                            // sync is on 'stop'
  
  this.initialize = this.initialize.bind(this);
  this.loadDocument = this.loadDocument.bind(this);
};

// this function updates the registered map (copy of the plugin's data)
// and finally saves it to google drive
// it includes this clients UUID so that a reading client can see if 
// if an other clinet did the last update or if it was this client
window.plugin.sync.RegisteredMap.prototype.updateMap = function(keyArray) {
  var _this = this;
  try {
    this.lastUpdateUUID = this.uuid;                        // use this clients uuid
    $.each(keyArray, function(ind, key) {                   // find all changed elements from the array
      var value = window.plugin[_this.pluginName][_this.fieldName][key]; 
      if(typeof(value) !== 'undefined') {                  
        _this.map[key] = value;                             // replace element in the array
      } else {                                              // or
        delete _this.map[key];                              // remove it from the array
      }
    });
  } finally {
    _this.dataStorage.saveFile(_this.prepareFileData());    // save data and UUID to drive
  }
};

// concatenate a the filename for the drive "pluginName[fieldName]"
window.plugin.sync.RegisteredMap.prototype.getFileName = function() {
  return this.pluginName + '[' + this.fieldName + ']'
};

// initialize access to the sync-file on drive
//   callback (optional) - to be performed on success
window.plugin.sync.RegisteredMap.prototype.initFile = function(callback) {
  var assignIdCallback, failedCallback, _this;
  _this = this;                                             // have _this point to this Object

  // file access granted, perform callback-function
  assignIdCallback = function(id) {                         // where does this id come from?
    _this.forceFileSearch = false;
    if(callback) callback();                                // do the callback passed to .initfile
  };

  // file access not possible
  failedCallback = function(resp) {
    _this.initializing = false;
    _this.failed = true;
    plugin.sync.logger.log(_this.getFileName(), 'Could not create file. If this problem persist, delete this file in IITC-SYNC-DATA-V3 in your Google Drive and try again.');
  };

  this.dataStorage = new plugin.sync.DataManager(           // create a new dataStorage with
    { 
      'fileName': this.getFileName(),                       
      'description': 'IITC plugin data for ' + this.getFileName()
    }
  );
  
  this.dataStorage.initialize(                              // initalize the dataStorage to gain 
    this.forceFileSearch,                                   // find the related file on drive
    assignIdCallback,                                       // onSuccess: 
    failedCallback                                          // onFailed: 
  );
};

window.plugin.sync.RegisteredMap.prototype.initialize = function(callback) {
  this.initFile(this.loadDocument);
};
// prepend UUID to data
window.plugin.sync.RegisteredMap.prototype.prepareFileData = function() {
  return {'map': this.map, 'last-update-uuid': this.uuid};
};

window.plugin.sync.RegisteredMap.prototype.loadDocument = function(callback) {
  this.initializing = true;
  var initializeFile, onFileLoaded, handleError, _this;
  _this = this;

  // this function called when the document is created first time
  // and the JSON file is populated with data in plugin field
  initializeFile = function() {
    _this.map = {};                                         // create an empty map

    // copy all elements from the plugin's data to the new map
    $.each(window.plugin[_this.pluginName][_this.fieldName], function(key, val) {
      _this.map[key] = val;
    });

    _this.dataStorage.saveFile(_this.prepareFileData());    // save the map to drive
    plugin.sync.logger.log(_this.getFileName(), 'Model initialized');
    setTimeout(function() {_this.loadDocument();}, window.plugin.sync.checkInterval);
  };

  // this function gets called when the document is loaded
  onFileLoaded = function(data) {
    
    if (!_this.intervalID) {                        // if the DL-interval is not set
      _this.intervalID = setInterval(function() {   // create a new timer to load
        _this.loadDocument();                       // the file from drive
      }, window.plugin.sync.checkInterval);         // every <checkInterval> ms
    }

    /* Sync only checks the drive every 3 mins. But changes to local data get pushed
       immediately. Two or more clients that do changes might might store data, that the 
       other is not aware of. We are trying to identify crititcal changes. Following 
       situations have been identified and should be coverd by the logic:
       
       Status-table:
       0: init, first start, always load from remote
       1: lastUUID and remoteUUID show the same UUID, load from remote
       2: lastUUID and remoteUUID show local UUID, no load needed
       3: lastUUID and remoteUUID show different, not local UUIDs, load remote
       4: lastUUID is local and remoteUIID is different, CONFLICT! Stop sync and ask user
    */
    _this.remoteUUID = data['last-update-uuid'];    // get the UUID of the data on drive 
// -----------------------------------------------------------------------------------------    
    // the initial value for doSync is 'remote', so initially loading from drive 
    if (_this.doSync == 'sync') {
      let conflict = true;                                   // 
      // check for conflict
      if (_this.remoteUUID == _this.lastUpdateUUID) {       // last Update was done on drive
        conflict = false;                                   // so there is not a conflict
      }; 
      if (_this.remoteUUID != _this.lastUpdateUUID &&       // 3rd client modified the drive
          _this.lastUpdateUUID != _this.uuid) {
        // maybe issue a warning
        console.log ('SYNC detected a 3rd client that modified the drive');
        conflict = false;                                   // but not a conflict here
      };
      
      if (conflict) {                                       // some other client changed the
        _this.doSync = 'stop';                              // data on the drive, after we
                                                            // did a change. So we need
        _this.conflictHandler();                            // to stop sync and ask the user
        plugin.sync.logger.log(_this.getFileName(), 'SYNC detected a conflict caused by '+ _this.lastRemoteUUID); 
      } else {                                              // ELSE no conflict found: 
        if (_this.remoteUUID == _this.uuid) {               // local data still is on drive?
          _this.doSync = 'sync';                            // no need to do anything
        } else {                                            // otherwise
          _this.doSync = 'remote';                          // load remote data 
        };                                                  // (it might have changed)
      };      
    };
// -----------------------------------------------------------------------------------------    
    if (_this.doSync == 'remote') {
      // load the remote data to the plugin's dataobject
      _this.lastUpdateUUID = _this.remoteUUID;      // remember last client on drive
      _this.map = data['map'];                      // map from the loaded data

      window.plugin[_this.pluginName][_this.fieldName] = {};// clear the plugin's dataobject
      $.each(_this.map, function(key, value) {      // fill the dataobject with data from drive
        window.plugin[_this.pluginName][_this.fieldName][key] = _this.map[key]; 
      });

      // execute the callback functions             
      if(_this.callback) _this.callback(            // execute the callback functions with
        _this.pluginName,                           //    pluginName
        _this.fieldName,                            //    fieldName
        null,                                       //    null (for backwards compatibility)
        true                                        //    true = full file load from Drive
      );
    
      if (_this.initializing) {
        _this.initialized = true;                   // connection to drive is "initalized"
        _this.initializing = false;                 // remove semaphore
        if(_this.initializedCallback) _this.initializedCallback( 
          _this.pluginName, 
          _this.fieldName
        );
      }
      plugin.sync.logger.log(_this.getFileName(), 'Data loaded from: '+ _this.lastUpdateUUID); 
      _this.doSync = 'sync';                        // return to normal sync
    };
// -----------------------------------------------------------------------------------------    
    if (_this.doSync == 'local') {                  // User decided for 'local' data.
      _this.lastUpdateUUID = _this.uuid;            // 
      _this.updateMap({});                          // push local data to drive
      _this.doSync = 'sync';                        // resume normal sync
    };
// -----------------------------------------------------------------------------------------     
    if (_this.doSync == 'stop') {
      // do nothing
      console.log('SYNC stopped synching data for plugin '+_this.pluginName);
    };
  };

  // Stop the sync if any error occur and try to re-authorize
  handleError = function(e) {
    var isNetworkError = e.type;
    var errorMessage = (e.error !== undefined) ? e.error.message : e.result.error.message;

    if(errorMessage === "A network error occurred, and the request could not be completed.") {
      isNetworkError = true;
    }

    plugin.sync.logger.log(_this.getFileName(), errorMessage);
    if(isNetworkError === true) {
      setTimeout(function() {_this.authorizer.authorize();}, 50*1000);
    } else if(e.status === 401) {                   // Unauthorized
      _this.authorizer.authorize();
    } else if(e.status === 404) {                   // Not found
      _this.forceFileSearch = true;
      _this.initFile();
      setTimeout(function() {_this.loadDocument();}, window.plugin.sync.checkInterval);
    }
  };

  // finally execute readFile
  this.dataStorage.readFile(initializeFile, onFileLoaded, handleError);
};

// conflict handler to decide between remote or local data
//   results: 'remote', 'local', 'stop'
window.plugin.sync.RegisteredMap.prototype.conflictHandler = function () {
  var _this;
  _this = this;
  
  window.dialog ({
    title: "SYNC Conflict Handling",
    html: "<div>SYNC found a conflict. The remote data stored on the drive "
        + "was changed while you did local changes . "
        + "Please decide which data shall be used. <br>"
        + "Your decission will overwrite the other changes. "
        + "It is impossible to merge the data!</div><br>"
        + "",
    buttons: [
      { text: "remote",
        click: function() {
          _this.doSync = 'remote';
          $( this ).dialog( "close" );
        }
      },
      { text: "local",
        click: function() {
          _this.doSync = 'local';
          $( this ).dialog( "close" );
        }
      },
      { text: "STOP SYNC",
        click: function() {
          _this.doSync = 'stop';
          $( this ).dialog( "close" );
        }
      }
    ],
    closeCallback: function() {
       _this.loadDocument(); 
    },
    maxHeight: 300
  });
  
};


//// end RegisteredMap




//// RegisteredPluginsFields ***************************************************************
// Store RegisteredMap and handle initialization of RegisteredMap
window.plugin.sync.RegisteredPluginsFields = function(options) {
  this.authorizer = options['authorizer'];                  // 
  this.pluginsfields = {};
  this.waitingInitialize = {};                              // queue for fields that need initialization

  this.anyFail = false;                                     // anything failed ?

  this.initializeRegistered = this.initializeRegistered.bind(this);
  this.cleanWaitingInitialize = this.cleanWaitingInitialize.bind(this);
  this.initializeWorker = this.initializeWorker.bind(this);

  this.authorizer.addAuthCallback(this.initializeRegistered);
};

window.plugin.sync.RegisteredPluginsFields.prototype.add = function(registeredMap) {
  var pluginName, fieldName;
  pluginName = registeredMap.pluginName;
  fieldName = registeredMap.fieldName;
  this.pluginsfields[pluginName] = this.pluginsfields[pluginName] || {};

  if(this.pluginsfields[pluginName][fieldName]) return false;

  this.pluginsfields[pluginName][fieldName] = registeredMap;
  this.waitingInitialize[registeredMap.getFileName()] = registeredMap;

  this.initializeWorker();                                  // start the regular check on drive
};

window.plugin.sync.RegisteredPluginsFields.prototype.get = function(pluginName, fieldName) {
  if(!this.pluginsfields[pluginName]) return;
  return this.pluginsfields[pluginName][fieldName];
};

// try to initialize remaining entries in the queue
window.plugin.sync.RegisteredPluginsFields.prototype.initializeRegistered = function() {
  var _this = this;
  if(this.authorizer.isAuthed()) {
    $.each(this.waitingInitialize, function(key, map) {
      if(!map.initializing && !map.initialized) {           // if not alraedy in process
        map.initialize(_this.cleanWaitingInitialize);       // initialize the map
      }
    });
  }
};

// cleanup the initialization queue
window.plugin.sync.RegisteredPluginsFields.prototype.cleanWaitingInitialize = function() {
  var newWaitingInitialize, _this;
  _this = this;

  newWaitingInitialize = {};
  $.each(this.waitingInitialize, function(key,map) {        // test queue if all data is ready
    if(map.failed) _this.anyFail = true;                    // at least one failed ?
    if(map.initialized || map.failed) return true;          // next map
    newWaitingInitialize[map.getFileName()] = map;          // copy remaining maps
  });
  this.waitingInitialize = newWaitingInitialize;            // to the queue
};

// Try to initialize all registerd fields with a timeout of 10 sec
window.plugin.sync.RegisteredPluginsFields.prototype.initializeWorker = function() {
  var _this = this;

  this.cleanWaitingInitialize();                            // clean up the initialization queue
  plugin.sync.toggleDialogLink();                           // set the color of the menu entry
  this.initializeRegistered();                              // try initialize remaining entries 
                                                            //   in the queue
  clearTimeout(this.timer);                                 // reset the timer
  if(Object.keys(this.waitingInitialize).length > 0) {      // if queue still not empty
    this.timer = setTimeout(
      function() {_this.initializeWorker()}, 10000          // retry in 10 sec
    );
  }
};
//// end RegisteredPluginsFields




//// DataManager ***************************************************************************
// is providing the actual save and load routines as well as initializing folder and files
// if they do not exist.
//
// assignIdCallback function format: function(id)
// allow you to assign the file/folder id elsewhere
//
// failedCallback function format: function()
// call when the file/folder couldn't create
//
// options = {'fileName':string ,'description':string}
window.plugin.sync.DataManager = function(options) {
  this.fileName = options['fileName'];
  this.description = options['description'];

  this.force = false;
  this.fileId = null;
  this.retryCount = 0;
  this.loadFileId();

  this.instances[this.fileName] = this;
}

window.plugin.sync.DataManager.prototype.instances = {};
window.plugin.sync.DataManager.prototype.RETRY_LIMIT = 2;
window.plugin.sync.DataManager.prototype.MIMETYPE_FOLDER = 'application/vnd.google-apps.folder';
window.plugin.sync.DataManager.prototype.parentName = 'IITC-SYNC-DATA-V3';
window.plugin.sync.DataManager.prototype.parentDescription = 'Store IITC sync data';

window.plugin.sync.DataManager.prototype.initialize = function(force, assignIdCallback, failedCallback) {
  this.force = force;
  // throw error if too many retry
  if(this.retryCount >= this.RETRY_LIMIT) {
    plugin.sync.logger.log(this.fileName, 'Too many file operation');
    failedCallback();
    return;
  }
  if(this.force) this.retryCount++;

  this.initParent(assignIdCallback, failedCallback);
};

window.plugin.sync.DataManager.prototype.initFile = function(assignIdCallback, failedCallback) {
  // If not force search and have cached fileId, return the fileId
  if(!this.force && this.fileId) {
    assignIdCallback(this.fileId);
    return;
  }

  var searchCallback, createCallback, handleFileId, handleFailed, _this;
  _this = this;

  handleFileId = function(id) {
    _this.fileId = id;
    _this.saveFileId();
    assignIdCallback(id);
  };

  handleFailed = function(resp) {
    _this.fileId = null;
    _this.saveFileId();
    plugin.sync.logger.log(_this.fileName, 'File operation failed: ' + (resp.error || 'unknown error'));
    failedCallback(resp);
  };

  createCallback = function(response) {
    if(response.result.id) {
      handleFileId(response.result.id);                     // file created
    } else {
      handleFailed(response)                                // could not create file
    }
  };

  searchCallback = function(resp) {
    if(resp.result.files.length !== 0) {
      handleFileId(resp.result.files[0].id);                // file found
    } else if(resp.result.files.length === 0) {
      _this.createFile(createCallback);                     // file not found, create file
    } else {
      handleFailed(resp);                                   // Error
    }
  };
  this.searchFile(searchCallback);
};

window.plugin.sync.DataManager.prototype.initParent = function(assignIdCallback, failedCallback) {
  var parentAssignIdCallback, parentFailedCallback, _this;
  _this = this;

  // If not force search and have cached parentFolderID, skip this step
  if(plugin.sync.parentFolderID) {
    return _this.initFile(assignIdCallback, failedCallback);
  }

  parentAssignIdCallback = function(id) {
    plugin.sync.parentFolderID = id;
    plugin.sync.logger.log('all', 'Parent folder success initialized');
    if (plugin.sync.parentFolderIDrequested) {
      plugin.sync.parentFolderIDrequested = false;
      return;
    }
    _this.initFile(assignIdCallback, failedCallback);
  };

  parentFailedCallback = function(resp) {
    plugin.sync.parentFolderID = null;
    plugin.sync.parentFolderIDrequested = false;
    plugin.sync.logger.log('all', 'Create folder operation failed: ' + (resp.error || 'unknown error'));
    failedCallback(resp);
  };

  // Several plugins at the same time has requested to create a folder
  if (!plugin.sync.parentFolderID && plugin.sync.parentFolderIDrequested) {
    return;
  }

  plugin.sync.parentFolderIDrequested = true;

  gapi.client.load('drive', 'v3').then(function() {

    gapi.client.drive.files.list(
      { q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false" }
    ).then(function(files) {
      var directory = files.result.files;

      if(!directory.length) {
        gapi.client.drive.files.create({
          resource: { name: _this.parentName, description: _this.parentDescription, mimeType: _this.MIMETYPE_FOLDER }
        }).then(function(res) {
          parentAssignIdCallback(res.result.id);
        });
      } else {
        parentAssignIdCallback(directory[ 0 ].id);
      }
    });

  }, function(reason) {
    parentFailedCallback(reason);
  });
};

window.plugin.sync.DataManager.prototype.createFile = function(callback) {
  var _this = this;

  gapi.client.load('drive', 'v3').then(function () {
    gapi.client.drive.files.create({
        fields  : 'id',
        resource: { name: _this.fileName, description: _this.description, parents: [ plugin.sync.parentFolderID ] }
      })
      .then(callback);
  });
};

// readFile
//   needInitializedFileCallback - function to handle no response. 
//                                 result usually the requested data
//   onFileLoadedCallback        - function to handle success  
//   handleError                 - function to handle Error
window.plugin.sync.DataManager.prototype.readFile = function(needInitializeFileCallback,
           onFileLoadedCallback,
           handleError)   {
  var _this = this;

  // gapi.client.load is a depricated routine
  //   .then(opt_onFulfilled, opt_onRejected)
  gapi.client.load('drive', 'v3').then(             // depricated, needs replacement
    // gapi.client.drive.files.get
    //   .then(opt_onFulfilled, opt_onRejected)
    function ()                                     // opt_onFulfilled for .load
      {gapi.client.drive.files.get({                // Gets a file's metadata by ID
        fileId: _this.fileId,                       //   fileId
        alt: 'media'                                //   respond with the file contents in 
                                                    //   the response body
      }) 
      .then(
        function (response) {                       // opt_onFulfilled for drive.files.get
          var res = response.result;
          if (res) {
            onFileLoadedCallback(res);              // perform provided routine
          } else {
            needInitializeFileCallback();           // no result (data) returned
          }
        },
        function(reason){                           // opt_onRejected for drive.files.get
          handleError(reason);
        }
      );
    },
    function(reason){                               // opt_onRejected for .load
      handleError(reason);
    }
  );
};

// saveFile
//   data - the data to be saved
window.plugin.sync.DataManager.prototype.saveFile = function(data) {
  var _this = this;
  
  gapi.client.load('drive', 'v3').then(
    function () {        
      gapi.client.request({
        path: '/upload/drive/v3/files/'+_this.fileId,
        method: 'PATCH',                                    // why patch? 
        params: { uploadType: 'media' },
        body: JSON.stringify(data)
      }).execute();                                         // write (patch) the file on drive
    }
                                                            // no errorhandling here?!
  );
};

window.plugin.sync.DataManager.prototype.searchFile = function(callback) {
  var _this = this;
  gapi.client.load('drive', 'v3').then(function () {
    gapi.client.drive.files.list(_this.getSearchOption()).execute(callback);
  });
};

window.plugin.sync.DataManager.prototype.getSearchOption = function() {
  var q = 'name = "' + this.fileName +'" and trashed = false and "' + plugin.sync.parentFolderID + '" in parents';
  return {'q': q};
};

window.plugin.sync.DataManager.prototype.localStorageKey = function() {
  return 'sync-file-' + this.fileName;
};

window.plugin.sync.DataManager.prototype.saveFileId = function() {
  if(this.fileId) {
    localStorage[this.localStorageKey()] = this.fileId;
  } else {
    localStorage.removeItem(this.localStorageKey());
  }
};

window.plugin.sync.DataManager.prototype.loadFileId = function() {
  var storedFileId = localStorage[this.localStorageKey()];
  if(storedFileId) this.fileId = storedFileId;
};
//// end DataManager




//// Authorizer ****************************************************************************
// authorize user's google account
// options: (type: object)
//    'authCallback' - array of functions to execute after sucessfull authorization
//    
window.plugin.sync.Authorizer = function(options) {
  this.authCallback = options['authCallback'];
  this.authorizing = false;
  this.authorized = false;
  this.isAuthed = this.isAuthed.bind(this);
  this.isAuthorizing = this.isAuthorizing.bind(this);
  this.authorize = this.authorize.bind(this);
};
// values that are static at the moment
window.plugin.sync.Authorizer.prototype.CLIENT_ID = '1099227387115-osrmhfh1i6dto7v7npk4dcpog1cnljtb.apps.googleusercontent.com';
window.plugin.sync.Authorizer.prototype.SCOPES = 'https://www.googleapis.com/auth/drive.file';

// method to tell if SYNC is authorized
window.plugin.sync.Authorizer.prototype.isAuthed = function() {
  return this.authorized;
};

// method to tell if authorization is in progress
window.plugin.sync.Authorizer.prototype.isAuthorizing = function() {
  return this.authorizing;
};

// (external) method to add an other authCallback function 
window.plugin.sync.Authorizer.prototype.addAuthCallback = function(callback) {
  if(typeof(this.authCallback) === 'function') this.authCallback = [this.authCallback];
  this.authCallback.push(callback);
};

// (internal) function that will execute all enregistered authCallback functions 
window.plugin.sync.Authorizer.prototype.authComplete = function() {
  this.authorizing = false;
  if(this.authCallback) {
    if(typeof(this.authCallback) === 'function') this.authCallback();
    if(this.authCallback instanceof Array && this.authCallback.length > 0) {
      $.each(this.authCallback, function(ind, func) {
        func();
      });
    }
  }
};

// (external) function that will initiate the authorization
// redirect: (type: boolean) 
//   true: call from dialog
window.plugin.sync.Authorizer.prototype.authorize = function() {
  this.authorizing = true;
  this.authorized = false;

  const doAuth = prompt => gapi.auth2.authorize({
    client_id: this.CLIENT_ID,
    scope: this.SCOPES,
    prompt,
  }, response => {
      if (response.error) {
          if (response.error === 'user_logged_out' || response.error === 'immediate_failed') {
              doAuth('select_account')
          } else {
            const error = (authResult && authResult.error) ? authResult.error : 'not authorized';

            plugin.sync.logger.log('all', 'Authorization error: ' + error);

            if (error === "idpiframe_initialization_failed") {
              plugin.sync.logger.log('all', 'You need enable 3rd-party cookies in your browser or allow [*.]google.com');
            }
          }

          this.authorizing = false;
          this.authorized = false;

          return;
      }

      this.authorizing = false;
      this.authorized = true;

      plugin.sync.logger.log('all', 'Authorized');

      this.authComplete();
  });

  doAuth('none');
};


//// end Authorizer




//// Logger ********************************************************************************
window.plugin.sync.Logger = function(options) {
  this.logLimit = options['logLimit'];
  this.logUpdateCallback = options['logUpdateCallback'];
  this.logs = {};
  this.log = this.log.bind(this);
  this.getLogs = this.getLogs.bind(this);
};

window.plugin.sync.Logger.prototype.log = function(filename, message) {
  var entity = {'time': new Date(), 'message': message};

  if (filename === 'all') {
    Object.keys(this.logs).forEach((key) => {
      this.logs[key] = entity;
    });
  } else {
    this.logs[filename] = entity;
  }

  if(this.logUpdateCallback) this.logUpdateCallback(this.getLogs());
};

window.plugin.sync.Logger.prototype.getLogs = function() {
  var allLogs = '';
  Object.keys(this.logs).forEach((key) => {
    var value = this.logs[key];
    allLogs += '<div class="sync-log-block"><p class="sync-log-file">'+key+':</p><p class="sync-log-message">' + value.message+' ('+value.time.toLocaleTimeString("en-GB")+')</p></div>';
  });

  return allLogs;
};


//// end Logger



// generate a GUID that identifies this client
// http://stackoverflow.com/a/8809472/2322660
// http://stackoverflow.com/a/7221797/2322660
// With format fixing: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y in [8,9,a,b]
window.plugin.sync.generateUUID = function() {
  if(window.crypto && window.crypto.getRandomValues) {
    var buf = new Uint16Array(8);
    window.crypto.getRandomValues(buf);
    var S4 = function(num) {
      var ret = num.toString(16);
      return '000'.substring(0, 4-ret.length) + ret;
    };
    var yxxx = function(num) {
      return num&0x3fff|0x8000;
    }
    return (S4(buf[0])+S4(buf[1])+'-'+S4(buf[2])+'-4'+S4(buf[3]).substring(1)+'-'+S4(yxxx(buf[4]))+'-'+S4(buf[5])+S4(buf[6])+S4(buf[7]));
  } else {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
  }
};

// save the Drive file-ID that relates to [pluginname].[field]
window.plugin.sync.storeLocal = function(mapping) {
  if(typeof(plugin.sync[mapping.field]) !== 'undefined' && plugin.sync[mapping.field] !== null) {
    localStorage[mapping.key] = JSON.stringify(plugin.sync[mapping.field]);
  } else {
    localStorage.removeItem(mapping.key);
  }
};

// load the Drive file-ID that relates to [pluginname].[field]
window.plugin.sync.loadLocal = function(mapping) {
  var objectJSON = localStorage[mapping.key];
  if(!objectJSON) return;
  try {
    var obj = JSON.parse(objectJSON);
  } catch (e) {
    console.warn("[sync] Error parsing local data. Ignore");
    console.warn(objectJSON);
    return;
  }
  plugin.sync[mapping.field] = mapping.convertFunc
                          ? mapping.convertFunc(obj)
                          : obj;
};

//load a previously generated UUID (or generate a new one)
window.plugin.sync.loadUUID = function() {
  plugin.sync.loadLocal(plugin.sync.KEY_UUID);
  if(!plugin.sync.uuid) {
    plugin.sync.uuid = plugin.sync.generateUUID();
    plugin.sync.storeLocal(plugin.sync.KEY_UUID);
  }
};


window.plugin.sync.updateLog = function(messages) {
  $('#sync-log').html(messages);
};

// AuthButon that shows IN the dialog
window.plugin.sync.toggleAuthButton = function() {
  var authed, authorizing;
  authed = plugin.sync.authorizer.isAuthed();
  authorizing = plugin.sync.authorizer.isAuthorizing();

  $('#sync-authButton').html(authed ? 'Authorized' : 'Authorize');

  $('#sync-authButton').attr('disabled', (authed || authorizing));
  $('#sync-authButton').toggleClass('sync-authButton-dimmed', authed || authorizing);
};

// Sync menuitem in the toolbox
window.plugin.sync.toggleDialogLink = function() {
  var authed, anyFail;
  authed = plugin.sync.authorizer.isAuthed();
  anyFail = plugin.sync.registeredPluginsFields.anyFail;

  $('#sync-show-dialog').toggleClass('sync-show-dialog-error', !authed || anyFail);
};

// open the dialog
window.plugin.sync.showDialog = function() {
  window.dialog({html: plugin.sync.dialogHTML, title: 'Sync', modal: true, id: 'sync-setting'});
  plugin.sync.toggleAuthButton();
  plugin.sync.toggleDialogLink();
  plugin.sync.updateLog(plugin.sync.logger.getLogs());
};

// create the dialog
window.plugin.sync.setupDialog = function() {
  plugin.sync.dialogHTML = '<div id="sync-dialog">'
                         + '<button id="sync-authButton" class="sync-authButton-dimmed" '
                         + 'onclick="setTimeout(function(){window.plugin.sync.authorizer.authorize(true)}, 1)" '
                         + 'disabled="disabled">Authorize</button>'
                         + '<div id="sync-log"></div>'
                         + '</div>';
  $('#toolbox').append('<a id="sync-show-dialog" onclick="window.plugin.sync.showDialog();">Sync</a> ');
};

// add some CSS for the changing buttons
window.plugin.sync.setupCSS = function() {
  $("<style>")
    .prop("type", "text/css")
    .html(".sync-authButton-dimmed {\
            opacity: 0.5;\
          }\
          .sync-show-dialog-error {\
            color: #FF2222;\
          }\
          #sync-log {\
            height: 300px;\
            white-space: pre-wrap;\
            white-space: -moz-pre-wrap;\
            white-space: -o-pre-wrap;\
            word-wrap: break-word;\
            overflow-y: auto;\
          }\
          .sync-log-block {\
            background: #ffffff1a;\
            padding: 5px;\
            margin: 0.5em 0;\
          }\
          .sync-log-file {\
            margin: 0;\
          }\
          .sync-log-message {\
            margin: 0;\
            text-align: right;\
          }")
  .appendTo("head");
};

////////////////////////////////////////////////////
//// Main **********************************************************************************
var setup = function() {
  window.plugin.sync.logger = new plugin.sync.Logger(
    {'logLimit':10, 'logUpdateCallback': plugin.sync.updateLog}
  );
  window.plugin.sync.loadUUID();
  window.plugin.sync.setupCSS();
  window.plugin.sync.setupDialog();
// create an authorizer structure
  window.plugin.sync.authorizer = new window.plugin.sync.Authorizer(
    {
    'authCallback': [plugin.sync.toggleAuthButton,          // functions to execute after 
                     plugin.sync.toggleDialogLink           // successfull authorization
                    ]
    }
  );
  // create base structure
  window.plugin.sync.registeredPluginsFields = new window.plugin.sync.RegisteredPluginsFields({
    'authorizer': window.plugin.sync.authorizer
  });
  // load the Google API and authorize.
  var GOOGLEAPI = 'https://apis.google.com/js/api.js';
  $.getScript(GOOGLEAPI).done(function () {
    gapi.load('client:auth2', window.plugin.sync.authorizer.authorize);
  });
};
// start this plugin with high priority during IITCs boot
setup.priority = 'high';
