// decode the on-network array entity format into an object format closer to that used before
// makes much more sense as an object, means that existing code didn't need to change, and it's what the
// stock intel site does internally too (the array format is only on the network)


window.decodeArray = function(){};


function parseMod(arr) {
  if (!arr) { return null; }
  return {
    owner: arr[0],
    name: arr[1],
    rarity: arr[2],
    stats: arr[3],
  };
}
function parseResonator(arr) {
  if (!arr) { return null; }
  return {
    owner: arr[0],
    level: arr[1],
    energy: arr[2],
  };
}
function parseArtifactBrief(arr) {
  if (!arr) { return null; }

  // array index 0 is for fragments at the portal. index 1 is for target portals
  // each of those is two dimensional - not sure why. part of this is to allow for multiple types of artifacts,
  // with their own targets, active at once - but one level for the array is enough for that

  // making a guess - first level is for different artifact types, second index would allow for
  // extra data for that artifact type

  function decodeArtifactArray(arr) {
    var result = {};
    for (var i=0; i<arr.length; i++) {
      // we'll use the type as the key - and store any additional array values as the value
      // that will be an empty array for now, so only object keys are useful data
      result[arr[i][0]] = arr[i].slice(1);
    }
    return result;
  }

  return {
    fragment: decodeArtifactArray(arr[0]),
    target: decodeArtifactArray(arr[1]),
  };
}

function parseArtifactDetail(arr) {
  if (!arr) { return null; }
  // empty artifact data is pointless - ignore it
  if (arr.length === 3 && arr[0] === '' && arr[1] === '' && arr[2].length === 0) {
    return null;
  }
  return {
    type: arr[0],
    displayName: arr[1],
    fragments: arr[2],
  };
}

function parseHistoryDetail(bitarray) {
  return {
    _raw: bitarray,
    visited:  !!(bitarray & 1),
    captured: !!(bitarray & 2),
    scoutControlled:  !!(bitarray & 4),
  };
}


//there's also a 'placeholder' portal - generated from the data in links/fields. only has team/lat/lng

var CORE_PORTAL_DATA_LENGTH = 4;
function corePortalData(a) {
  return {
    // a[0] == type (always 'p')
    team:          a[1],
    latE6:         a[2],
    lngE6:         a[3]
  }
}

var SUMMARY_PORTAL_DATA_LENGTH = 14;
var DETAILED_PORTAL_DATA_LENGTH = SUMMARY_PORTAL_DATA_LENGTH+4;
var EXTENDED_PORTAL_DATA_LENGTH = DETAILED_PORTAL_DATA_LENGTH+1;
function summaryPortalData(a) {
  return {
    level:         a[4],
    health:        a[5],
    resCount:      a[6],
    image:         a[7],
    title:         a[8],
    ornaments:     a[9],
    mission:       a[10],
    mission50plus: a[11],
    artifactBrief: parseArtifactBrief(a[12]),
    timestamp:     a[13]
  };
}

function detailsPortalData(a) {
  return {
    mods:           a[SUMMARY_PORTAL_DATA_LENGTH+0].map(parseMod),
    resonators:     a[SUMMARY_PORTAL_DATA_LENGTH+1].map(parseResonator),
    owner:          a[SUMMARY_PORTAL_DATA_LENGTH+2],
    artifactDetail: parseArtifactDetail(a[SUMMARY_PORTAL_DATA_LENGTH+3])
  }
}

function extendedPortalData(a) {
  return {
    history: parseHistoryDetail(a[DETAILED_PORTAL_DATA_LENGTH] || 0),
  }
}


var dataLen = {
  core: [CORE_PORTAL_DATA_LENGTH],
  summary: [SUMMARY_PORTAL_DATA_LENGTH],
  detailed: [DETAILED_PORTAL_DATA_LENGTH],
  extended: [EXTENDED_PORTAL_DATA_LENGTH, SUMMARY_PORTAL_DATA_LENGTH]
};

window.decodeArray.portal = function(a, details) {
  if (!a) {
    log.warn('Argument not specified');
    return;
  }

  if (a[0] !== 'p') {
    throw new Error('decodeArray.portal: not a portal');
  }

  if (details) {
    var expected = dataLen[details];
    if (expected.indexOf(a.length) === -1) {
      log.warn('Unexpected portal data length: ' + a.length + ' (' + details + ')');
      debugger;
    }
  }

  var data = corePortalData(a);

  if (a.length >= SUMMARY_PORTAL_DATA_LENGTH) {
    $.extend(data, summaryPortalData(a));
  }

  if (a.length >= DETAILED_PORTAL_DATA_LENGTH) {
    if (a[SUMMARY_PORTAL_DATA_LENGTH]) {
      $.extend(data, detailsPortalData(a));
    } else if (details !== 'extended') {
      log.warn('Portal details missing');
      debugger;
    }
  }

  if (a.length >= EXTENDED_PORTAL_DATA_LENGTH || details === 'extended') {
    $.extend(data, extendedPortalData(a));
  }

  return data;
};

window.decodeArray.portalSummary = function(a) { // deprecated!!
  return window.decodeArray.portal(a, 'summary');
};

window.decodeArray.portalDetail = function(a) { // deprecated!!
  return window.decodeArray.portal(a, 'detailed');
};
