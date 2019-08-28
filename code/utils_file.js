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
// Save data to file with given filename, using IITCm file chooser, or generic browser routine.
// `dataType` can be set to filter IITCm file chooser filetypes.
window.saveFile = typeof android === 'undefined' || !android.saveFile
  ? saveAs
  : function (data,filename,dataType) {
      android.saveFile(filename || '', dataType || '*/*', data);
    };
