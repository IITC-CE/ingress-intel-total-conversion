// import/export/sharing API

// misc. utilities to facilitate files handling in environment-independed way
// see https://github.com/IITC-CE/ingress-intel-total-conversion/issues/244

function saveAs (data,filename,dataType) {
  if (!(data instanceof Array)) { data = [data]; }
  var file = new Blob(data, {type: dataType});
  var objectURL = URL.createObjectURL(file);

  var link = document.createElement('a');
  link.href = objectURL;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectURL);
} // alternative: https://github.com/eligrey/FileSaver.js/blob/master/src/FileSaver.js

// @function saveFile(data: String, filename?: String, dataType? String)
// Save data to file with given filename, using generic browser routine,
// or  IITCm file chooser (overwritten in android.js).
// `dataType` can be set to filter IITCm file chooser filetypes.
window.saveFile = saveAs;

/*
 * @class L.FileReader
 * @inherits L.Evented
 *
 * Leaflet wrapper over [`FileReader`](https://w3c.github.io/FileAPI/#APIASynch) Web API,
 * to make it compatible with Leaflet event system.
 *
 * @example
 *
 * ```js
 * L.fileReader(file)
 *   .on('load',function (e) {
 *      console.log(e.file.name,e.reader.result)
 *    });
 * ```
 */
L.FileReader = L.Evented.extend({
  options: {
    // encoding: 'utf-8' // todo

    // @option readAs: String = 'readAsText'
    // [Function](https://w3c.github.io/FileAPI/#reading-a-file) to use for file reading.
    readAs: 'readAsText'
  },

  initialize: function (file, options) {
    this._setOptions(options);
    if (file) { this.read(file); }
  },

  _setOptions: function (options) {
    if (typeof options === 'string') {
      options = {readAs: options};
    }
    return L.Util.setOptions(this, options);
  },

  // _events = {}, // this property can be useful when extending class

  _setupReader: function () {
    var reader = new FileReader();
    this._eventTypes.forEach(function (type) {
      reader.addEventListener(type,this._fire.bind(this,type));
    },this);
    if (this._events) { this.on(this._events); }
    if (this._onerror) {
      this.once('loadstart',function () {
        if (!this.listens('error',true)) { this.on('error',this._onerror); }
      });
    }
    return reader;
  },

  // @method read(file?, options?: Object or String): this
  // Starts reading the contents of the `file` using [reader method](https://w3c.github.io/FileAPI/#reading-a-file) specified in `options`.
  // `file` argument is optional only if already specified (in constructor, or in previous call of the method).
  // `options` argument has the same meaning as in constructor.
  // Note: all 'init*' event handlers expected to be already attached **before** this method call.
  read: function (file, options) {
    if (options) { this._setOptions(options); }
    if (file) {
      this.file = file;
      try {
        // @event init: Event
        // Fired before reading a file.
        // `Event` object has additional property `file` with [`File`](https://w3c.github.io/FileAPI/#dfn-file) object.
        // Note: in order to stop further processing of the file
        // handler may throw error (is's safe as errors are caught)
        this.fire('init',{file:file},true);
      } catch (e) {

        // @event init:error: Event
        // Fired on errors arised in 'init' handler(s).
        // `Event` object has following additional properties:
        // `file`: [`File`](https://w3c.github.io/FileAPI/#dfn-file) object.
        // `error`: `Error` object.
        // Note: if no handlers found for `error:init` then default one will be attached (`console.warn`)
        var data = { file:file, error:e };
        if (this._onerror && !this.listens('init:error', true)) {
          this._onerror(data);
        } else {
          this.fire('init:error', data, true);
        }
        return this;
      }
    } else if (!this.file) {
      throw new Error('`file` arg required');
    }
    this.reader = this.reader || this._setupReader();
    this.reader[this.options.readAs](this.file);
    return this;
  },

  _onerror: function (e) {
    console.warn('Error loading file: ', e.file.name,'\n', e.error || e.reader.error.message); // eslint-disable-line no-console
  },

  // @event [abort, error, load, loadstart, loadend, progress](https://w3c.github.io/FileAPI/#events): Event
  // `Event` object has following additional properties:
  // `reader`: raw instance of [`FileReader`](https://w3c.github.io/FileAPI/#APIASynch) interface
  // `file`: raw instance of [`File`/`Blob`](https://w3c.github.io/FileAPI/#dfn-file)
  // `originalEvent`: raw [event](https://w3c.github.io/FileAPI/#events)
  // Note: if no handlers found for `error` then default one will be attached (`console.warn`)
  _eventTypes: ['abort','error','load','loadstart','loadend','progress'],

  _fire: function (type,event) {
    if (!this.listens(type,true)) { return; }
    this.fire(type,Object.assign({originalEvent: event},this),true);
  }
});

// @factory L.fileReader(file?: Blob, options?: Object or String)
// Instantiates a `L.FileReader` object given the [`File`/`Blob`](https://w3c.github.io/FileAPI/#dfn-file)
// and optionally an object literal with `options`.
// If `file` argument is specified, then `read` method is called immediately.
// Note: it's possible to specify `readAs` directly instead of full `options` object.
L.fileReader = function (file, options) {
  return new L.FileReader(file, options);
};


L.FileReader._chooseFiles = function (callback,options) {
  // assert callback
  var input = document.createElement('input');
  input.type='file';
  input.style.display = 'none';
  L.extend(input,options); // optional attributes: accept, multiple, capture
  input.addEventListener('change', function () {
    callback(this.files);
  }, false);
  document.body.appendChild(input);
  input.click();
  input.remove();
};

// @function loadFile(options?: Object): Object (L.FileReader instance)
// Instantiates a `L.FileReader` object, and initiates file chooser dialog
// simulating click on hidden `input` HTML element, created using given `options`.
// Calls `read` method with file chosen by user.
L.FileReader.loadFile = function (options) {
  var reader = new this;
  this._chooseFiles(function (fileList) {
    reader.read(fileList[0]);
  },options);
  return reader;
};

/*
 * @aka L.FileListLoader
 * @inherits L.Evented
 *
 * Used to handle [FileList](https://w3c.github.io/FileAPI/#filelist-section), processing it as whole.
 * Each `File` will be loaded with `L.FileReader` using common event handlers,
 * including propagated from underlying `L.FileReader`.
 *
 * @example
 *
 * ```js
 * L.FileListLoader(fileList)
 *   .on('load',function (e) {
 *      console.log(e.file.name,e.reader.result)
 *    });
 *   .on('loaded',function (e) {
 *      console.log('All done!')
 *    });
 *   .load();
 * ```
 */
L.FileListLoader = L.Evented.extend({
  options: {
    // @option readAs: String = 'readAsText'
    // Function to use for file reading.
    readAs: 'readAsText'
  },

  initialize: function (fileList, options) {
    L.Util.setOptions(this, options);
    this.once('loadstart',function () {
      if (this.listens('loaded')) {
        this.on('loadend',this._loaded);
      }
    });
    this.once('init',function () {
      if (this.listens('init')) {
        this.on('init:error',this._loaded);
      }
    });
    if (fileList) { this.load(fileList); }
  },

  _readerConstructor: L.FileReader,

  // @method load(fileList: FileList)
  // Starts loading files listed in `fileList` argument.
  // Note: all 'init*' event handlers expected to be already attached **before** this method call.
  load: function (fileList) {
    if (!fileList) {
      throw new Error('`fileList` arg required');
    }
    this._toload = fileList.length;
    this._readers = Array.prototype.map.call(fileList,function (file) {
      return new this._readerConstructor()
        .addEventParent(this)
        .read(file,this.options);
    },this);
    return this;
  },

   // @event loaded: Event
   // Fired after all files are processed (either with success or with error).
  _loaded: function () {
    this._toload--;
    if (this._toload === 0) { this.fire('loaded'); }
  }
});

// @factory L.fileListLoader(fileList?: FileList, options?: Object)
// Instantiates a `FileListLoader` object given the [`FileList`](https://w3c.github.io/FileAPI/#filelist-section)
// and optionally an object literal with `options`.
// If `fileList` argument is specified, then `load` method is called immediately.
L.fileListLoader = function (fileList, options) {
  return new L.FileListLoader(fileList, options);
};

// @function loadFiles(options?: Object): Object (L.FileListLoader instance)
// Instantiates a `L.FileListLoader` object, and initiates file chooser dialog
// simulating click on hidden `input` HTML element, created using specified `options`.
// Calls `load` method with list of files, chosen by user.
L.FileListLoader.loadFiles = function (options) {
  var loader = new this();
  L.FileReader._chooseFiles(loader.load.bind(loader), options);
  return loader;
};
