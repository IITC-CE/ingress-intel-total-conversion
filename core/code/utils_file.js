/**
 * @file This file provides utilities for handling files in an environment-independent way, including
 * functions to save files and wrappers around the FileReader API to integrate with Leaflet's event system.
 *
 * @see https://github.com/IITC-CE/ingress-intel-total-conversion/issues/244
 * @module utils_file
 */

/**
 * Saves data as a file with a specified filename and data type.
 *
 * @private
 * @function saveAs
 * @param {string|BlobPart|BlobPart[]} data - The data to be saved.
 * @param {string} [filename] - The name of the file to save.
 * @param {string} [dataType] - The MIME type of the file, used to specify the file format.
 */
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

/**
 * Saves data to a file with the given filename. This function is an alias to the `saveAs` function.
 * or it can use the IITC Mobile file chooser (overwritten in app.js). The `dataType` parameter can be used to filter
 * file types in the IITCm file chooser.
 *
 * @function saveFile
 * @param {string|BlobPart|BlobPart[]} data - The data to be saved.
 * @param {string} [filename] - The name of the file to save.
 * @param {string} [dataType] - The MIME type of the file, used to specify the file format.
 */
window.saveFile = saveAs;

/**
 * Leaflet wrapper over [FileReader](https://w3c.github.io/FileAPI/#APIASynch) Web API,
 * making it compatible with the Leaflet event system.
 * This class extends `L.Evented`.
 *
 * @memberof L
 * @class FileReader
 * @extends L.Evented
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

  /**
   * Starts reading the contents of the specified file
   * using [reader method](https://w3c.github.io/FileAPI/#reading-a-file) specified in `options`.
   * Note: all 'init*' event handlers expected to be already attached **before** this method call.
   *
   * @method
   * @memberof L.FileReader
   * @param {Blob} [file] - The file or blob to be read. Optional if already set.
   * @param {Object|string} [options] - Options for file reading. Same as in constructor.
   * @returns {L.FileReader} Returns the `L.FileReader` instance for chaining.
   */
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

/**
 * Factory function to instantiate a `L.FileReader` object.
 * Instantiates a `L.FileReader` object given the [`File`/`Blob`](https://w3c.github.io/FileAPI/#dfn-file)
 * and optionally an object literal with `options`.
 * Note: it's possible to specify `readAs` directly instead of full `options` object.
 *
 * @memberof L
 * @function fileReader
 * @param {Blob} [file] - The file or blob to be read. Optional.
 * @param {Object|string} [options] - Options for file reading or a string representing the read method.
 * @returns {L.FileReader} A new instance of `L.FileReader`.
 * @example
 * var reader = L.fileReader(file, { readAs: 'readAsText' });
 */
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

/**
 * Instantiates a `L.FileReader` object and initiates a file chooser dialog.
 * This function simulates a click on a hidden file input element created with the given options.
 * The `read` method is called with the file chosen by the user.
 *
 * @function loadFile
 * @memberof L.FileReader
 * @param {Object} [options] - Options for the file input element.
 * @returns {L.FileReader} A new instance of `L.FileReader` with the file to be read.
 */
L.FileReader.loadFile = function (options) {
  var reader = new this;
  this._chooseFiles(function (fileList) {
    reader.read(fileList[0]);
  },options);
  return reader;
};

/**
 * A class for handling a list of files (`FileList`), processing each file with `L.FileReader`.
 * It extends `L.Evented` to use event handling.
 *
 * @class L.FileListLoader
 * @extends L.Evented
 * @param {FileList} fileList - The list of files to be processed.
 * @param {Object} [options] - Options for file reading.
 * @example
 * L.FileListLoader(fileList)
 *   .on('load', function(e) {
 *     console.log(e.file.name, e.reader.result);
 *   })
 *   .on('loaded', function() {
 *     console.log('All files processed');
 *   })
 *   .load();
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

/**
 * A factory function that instantiates a `FileListLoader` object given the `FileList` and options.
 *
 * @memberof L
 * @function fileListLoader
 * @param {FileList} [fileList] - The list of files to load.
 *                                See [FileList](https://w3c.github.io/FileAPI/#filelist-section).
 *                                If `fileList` argument is specified, then `load` method is called immediately.
 * @param {Object} [options] - Options for file reading.
 * @returns {L.FileListLoader} A new FileListLoader instance.
 */
L.fileListLoader = function (fileList, options) {
  return new L.FileListLoader(fileList, options);
};

/**
 * Instantiates a `L.FileListLoader` object and initiates a file chooser dialog.
 * This simulates a click on a hidden `input` HTML element created using the specified `options`.
 * It then calls the `load` method with the list of files chosen by the user.
 *
 * @memberof L.FileListLoader
 * @function loadFiles
 * @param {Object} [options] - Options for the file input, like `accept`, `multiple`, `capture`.
 * @returns {L.FileListLoader} A new instance of `L.FileListLoader`.
 */
L.FileListLoader.loadFiles = function (options) {
  var loader = new this();
  L.FileReader._chooseFiles(loader.load.bind(loader), options);
  return loader;
};
