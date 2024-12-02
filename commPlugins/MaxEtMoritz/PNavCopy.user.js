// ==UserScript==
// @author          MaxEtMoritz
// @id              PNavCopy@MaxEtMoritz
// @name            Copy PokeNav Command
// @category        Misc
// @downloadURL     https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/MaxEtMoritz/PNavCopy.user.js
// @version         1.7.6
// @namespace       https://github.com/MaxEtMoritz/PNavCopy
// @description     Copy portal info to clipboard or send it to Discord in the format the PokeNav Discord bot needs.
// @updateURL       https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/MaxEtMoritz/PNavCopy.meta.js
// @issueTracker    https://github.com/MaxEtMoritz/PNavCopy/issues
// @homepageURL     https://github.com/MaxEtMoritz/PNavCopy
// @antiFeatures    export
// @recommends      s2check@Alfonso_M
// @include         http://intel.ingress.com/*
// @include         https://intel.ingress.com/*
// @grant           none
// ==/UserScript==


/* globals $, GM_info, L */

// original Plug-In is from https://gitlab.com/ruslan.levitskiy/iitc-mobile/-/tree/master, the License of this project is provided below:

/*
 * ISC License
 *
 * Copyright © 2013 Stefan Breunig
 *
 * Permission to use, copy, modify, and/or distribute this software for
 * any purpose with or without fee is hereby granted, provided that the
 * above copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL
 * WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
 * AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL
 * DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA
 * OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 * TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */

function wrapper (plugin_info) {
  'use strict';

  // ensure plugin framework is there, even if iitc is not yet loaded
  if (typeof window.plugin !== 'function') window.plugin = function () { };

  // PLUGIN START ////////////////////////////////////////////////////////

  // use own namespace for plugin
  window.plugin.pnav = function () { };

  // Language is set in setup() if not already present in localStorage.
  /* eslint-disable no-undefined */
  window.plugin.pnav.settings = {
    webhookUrl: null,
    name: window.PLAYER ? window.PLAYER.nickname : '', // if not yet logged in to Intel, window.PLAYER is undefined.
    radius: null,
    lat: null,
    lng: null,
    language: undefined,
    useBot: false
  };
  /* eslint-enable no-undefined */
  let selectedGuid = null;
  let pNavData = {
    pokestop: {},
    gym: {}
  };
  const request = new XMLHttpRequest();

  // both bots react to mentions, no need to fiddle around with prefixes!
  const pNavId = 428187007965986826n;
  const companionId = 806533005626572813n;

  /** @type {L.LayerGroup} */
  let lCommBounds;
  const wait = 2000; // Discord WebHook accepts 30 Messages in 60 Seconds.

  // #region strings
  const strings = {
    en: {
      alertAlreadyExported: 'This location has already been exported! If you are sure this is not the case, the creation command has been copied to clipboard for you. If this happens too often, try to reset the export state in the settings.',
      alertExportCopied: 'File download is not supported on this device / IITC version. Thus the data was copied to clipboard. Please save it as a .json file!',
      alertExportRunning: 'Settings not saved because Export was running. Pause the Export and then try again!',
      alertLanguageAfterReload: 'The new language settings will be fully in effect after a page reload.',
      alertNoModifications: 'No modifications detected!',
      alertOutsideArea: 'This location is outside the specified Community Area!',
      alertProblemPogoTools: 'There was a problem reading the Pogo Tools Data File.',
      botEditDialogTitle: 'Edit export',
      btnBulkExportGymsText: 'Export all Pogo Tools Gyms',
      btnBulkExportGymsTitle: 'Grab the File where all Gyms are stored by PoGo Tools and send them one by one via WebHook. This can take much time!',
      btnBulkExportStopsText: 'Export all Pogo Tools Stops',
      btnBulkExportStopsTitle: 'Grab the File where all Stops are stored by PoGo Tools and send them one by one via WebHook. This can take much time!',
      btnBulkModifyText: 'Check for Modifications',
      btnBulkModifyTitle: 'Check if the Pogo Tools Data was modified and start Upload process of modifications',
      btnEraseHistoryTextDefault: 'Delete Location Export History',
      btnEraseHistoryTextSuccess: 'Deleted!',
      btnEraseHistoryTitle: 'Delete all collected Export History.',
      btnExportText: 'Export Data',
      btnExportTitle: 'This will download a file containing all data exported to PokeNav.',
      btnImExportText: 'Import / Export data',
      btnImExportTitle: 'Opens a dialog where you can export the current data or import again.',
      btnImportText: 'Import Data',
      btnImportTitle: 'Import the exported data. ATTENTION: This will override the current data!',
      btnSkipText: 'Skip one',
      bulkExportProgressButtonText: 'Pause',
      bulkExportProgressButtonTitle: 'Store Progress locally and stop Exporting. If you wish to restart, go to Settings and click the Export Button again.',
      bulkExportProgressTitle: 'PokeNav Bulk Export Progress',
      exportDialogTitle: 'Export',
      exportProgressBarDescription: 'Progress:',
      exportStateTextExporting: 'Exporting...',
      exportStateTextReady: 'Export Ready!',
      exportTimeRemainingDescription: 'Time remaining: ',
      imExportDialogTitle: 'Import / Export',
      importInputText: 'Paste the data you exported in this text field!',
      importInvalidFormat: 'The Import has an invalid format! Make sure that you selected the right file!',
      lblErrorCnText: 'Invalid Coordinate Format! Please input them like 00.0...00, 00.0...00!',
      lblErrorRdText: 'Invalid Radius! Please check if it is a valid Number!',
      lblErrorWHText: 'Invalid URL! Please delete or correct it!',
      lCommBoundsName: 'PokeNav Community',
      Modification: 'Modification ',
      of: ' of ',
      pnavCenterDescription: 'Community Center:',
      pnavCenterTitle: `Paste the Center Coordinate of your Community here (you can view it typing @PokeNav show settings in Admin Channel)`,
      pNavChangesMadeDescription: 'The following has changed:',
      pnavCodenameDescription: 'Name:',
      pnavCodenameTitle: 'The Name that will be displayed if you send to the PokeNav channel. Default is your Ingess Codename.',
      PNavExDescription: 'Ex Gym',
      PNavGymDescription: 'Gym',
      pnavhookurlDescription: 'Discord WebHook URL:',
      pnavhookurlTitle: "Paste the URL of the WebHook you created in your Server's Admin Channel here. If left blank, the Commands are copied to Clipboard.",
      pnavLanguageDescription: 'Language:',
      pNavModCommandText: [
        {
          send: {
            false: 'Copy',
            true: 'Send'
          }
        },
        ' Modification Command'
      ],
      pNavModCommandTitleDisabled: [
        'You must input the PokeNav location ID before you can ',
        {
          send: {
            false: 'copy',
            true: 'send'
          }
        },
        ' the modification command!'
      ],
      pNavModCommandTitleEnabled: [
        {
          send: {
            false: 'Copies',
            true: 'Sends'
          }
        },
        ' the modification command.'
      ],
      pNavmodDialogTitle: 'PokeNav Modification(s)',
      PNavNoneDescription: 'None',
      pNavOldPoiNameDescription: 'The following POI was modified:',
      pNavPoiIdDescription: 'PokeNav ID:',
      pNavPoiInfoText: [
        {
          send: {
            false: 'Copy',
            true: 'Send'
          }
        },
        ' POI Info Command'
      ],
      pNavPoiInfoTitle: [
        {
          send: {
            false: 'Copies',
            true: 'Sends'
          }
        },
        ' the POI Information Command for the POI.'
      ],
      pnavRadiusDescription: 'Community Radius (Km):',
      pnavRadiusTitle: 'Enter the specified Community Radius in kilometers here.',
      pnavsettingsTitle: 'PokeNav Settings',
      PNavStopDescription: 'Stop',
      PogoButtonsText: [
        {
          send: {
            false: 'Copy',
            true: 'Send to'
          }
        },
        ' PokeNav'
      ],
      PogoButtonsTitle: [
        {
          send: {
            false: 'Copy',
            true: 'Send'
          }
        },
        ' the Location create Command to ',
        {
          send: {
            false: 'Clipboard',
            true: 'Discord via WebHook'
          }
        }
      ],
      pokeNavSettingsText: 'PokeNav Settings',
      pokeNavSettingsTitle: 'Configure PokeNav',
      portalHighlighterName: 'PokeNav State',
      requestAddressDescription: 'Request Address',
      useBotText: 'Use Companion Bot',
      useBotTitle: 'Tick this if you have invited the Companion Bot to your Server. This enables a faster bulk export. More Info on GitHub!'
    },
    de: {
      alertAlreadyExported: 'Dieser POI wurde schon exportiert! Wenn dies mit Sicherheit nicht der Fall ist, wurde das Kommando zum Erstellen in die Zwischenablage kopiert. Passiert dies zu häufig, versuche, den Export-Status in den Einstellungen zurückzusetzen.',
      alertExportCopied: 'Dateidownload auf diesem Gerät / dieser IITC-Version nicht unterstützt. Deshalb wurden die Daten in die Zwischenablage kopiert. Bitte als .json-Datei speichern!',
      alertExportRunning: 'Die Einstellungen wurden nicht gespeichert, da der Daten-Export läuft. Pausiere den Export und versuche es noch mal!',
      alertLanguageAfterReload: 'Die neuen Spracheinstellungen werden vollständig erst nach erneutem Laden der Seite wirksam!',
      alertNoModifications: 'Keine Änderungen gefunden!',
      alertOutsideArea: 'Dieser POI liegt nicht in den angegebenen Community-Grenzen!',
      alertProblemPogoTools: 'Es ist ein Problem beim Lesen der Pogo-Tools-Daten aufgetreten!',
      botEditDialogTitle: 'Bearbeitungs-Export',
      btnBulkExportGymsText: 'Exportiere alle Pogo Tools Arenen',
      btnBulkExportGymsTitle: 'Exportiere alle Arenen aus Pogo Tools eine nach der Anderen über den angegebenen WebHook. Dies kann eine Weile dauern!',
      btnBulkExportStopsText: 'Exportiere alle Pogo Tools Stops',
      btnBulkExportStopsTitle: 'Exportiere alle Pokestops aus Pogo Tools einer nach dem Anderen über den angegebenen WebHook. Dies kann eine Weile dauern!',
      btnBulkModifyText: 'Prüfe auf Änderungen',
      btnBulkModifyTitle: 'Prüft die Pogo-Tools-Daten auf Änderungen und beginnt den Upload-Prozess der Änderungen.',
      btnEraseHistoryTextDefault: 'Lösche Export-Historie',
      btnEraseHistoryTextSuccess: 'Gelöscht!',
      btnEraseHistoryTitle: 'Lösche die gesamte bisher gesammelte Export-Historie.',
      btnExportText: 'Exportiere Daten',
      btnExportTitle: 'Leitet das Herunterladen einer Datei mit allen nach PokeNav exportierten Daten ein.',
      btnImExportText: 'Importiere / Exportiere Daten',
      btnImExportTitle: 'Öffnet einen Dialog um die aktuellen Daten zu exportieren oder Daten wieder zu importieren.',
      btnImportText: 'Importiere Daten',
      btnImportTitle: 'Importiere exportierte Daten. ACHTUNG: Dies wird die aktuellen Daten überschreiben!',
      btnSkipText: 'Änderung überspringen',
      bulkExportProgressButtonText: 'Pause',
      bulkExportProgressButtonTitle: 'Speichert den Fortschritt lokal und beendet den Export. Starten Sie zum Fortsetzen des Exports diesen in den Einstellungen neu.',
      bulkExportProgressTitle: 'Fortschritt des PokeNav Massen-Exports',
      exportDialogTitle: 'Export',
      exportProgressBarDescription: 'Fortschritt:',
      exportStateTextExporting: 'Exportiere...',
      exportStateTextReady: 'Export Abgeschlossen!',
      exportTimeRemainingDescription: 'Verbleibende Zeit: ',
      imExportDialogTitle: 'Import / Export',
      importInputText: 'Fügen Sie die exportierten Daten in dieses Textfeld ein.',
      importInvalidFormat: 'Die importierten Daten haben ein ungültiges Format! Stellen Sie sicher, dass Sie die richtige Datei ausgewählt haben!',
      lblErrorCnText: 'Ungültiges Koordinaten-Format! Bitte geben Sie sie wie Folgt ein: 00.0...00, 0.0...00!',
      lblErrorRdText: 'Ungüliger Radius! Bitte überprüfen Sie, ob Sie eine gültige Zahl eingegeben haben!',
      lblErrorWHText: 'Ungültige URL! Bitte löschen oder korrigieren Sie sie!',
      Modification: 'Änderung ',
      of: ' von ',
      pnavCenterDescription: 'Community-Mittelpunkt:',
      pnavCenterTitle: `Fügen Sie die Mittelpunkt-Koordinate Ihrer Community hier ein. Sie können sie abrufen, indem Sie &quot;@PokeNav show settings&quot; in den PokeNav Administratoren-Kanal eigeben.`,
      pNavChangesMadeDescription: 'Folgendes wurde geändert:',
      pnavCodenameDescription: 'Name:',
      pnavCodenameTitle: 'Der Name, der beim Senden über den WebHook angezeigt wird. Standardmäßig ist es Ihr Ingress-Codename.',
      PNavExDescription: 'Ex-Arena',
      PNavGymDescription: 'Arena',
      pnavhookurlDescription: 'Discord WebHook URL:',
      pnavhookurlTitle: 'Geben Sie die URL des WebHooks, den Sie in Ihrem Administrations-Channel angelegt haben, hier ein. Ist dieses Feld leer, werden die Kommandos in die Zwischenablage kopiert.',
      pnavLanguageDescription: 'Sprache:',
      pNavModCommandText: [
        {
          send: {
            false: 'Kopiere',
            true: 'Sende'
          }
        },
        ' Änderungs-Befehl'
      ],
      pNavModCommandTitleDisabled: [
        'Sie müssen die PokeNav POI-ID eingeben bevor Sie den Änderungs-Befehl ',
        {
          send: {
            false: 'kopieren',
            true: 'senden'
          }
        },
        ' können!'
      ],
      pNavModCommandTitleEnabled: [
        {
          send: {
            false: 'Kopiert',
            true: 'Sendet'
          }
        },
        ' den Änderungs-Befehl.'
      ],
      pNavmodDialogTitle: 'PokeNav Änderung(en)',
      PNavNoneDescription: 'Nichts',
      pNavOldPoiNameDescription: 'Folgender POI wurde geändert:',
      pNavPoiIdDescription: 'PokeNav ID:',
      pNavPoiInfoText: [
        {
          send: {
            false: 'Kopiere',
            true: 'Sende'
          }
        },
        ' POI Informations-Befehl'
      ],
      pNavPoiInfoTitle: [
        {
          send: {
            false: 'Kopiert',
            true: 'Sendet'
          }
        },
        ' den POI Informations-Befehl für diesen POI.'
      ],
      pnavRadiusDescription: 'Community-Radius (Km):',
      pnavRadiusTitle: 'Geben Sie hier den Radius ihrer Community in Kilometern ein.',
      pnavsettingsTitle: 'PokeNav-Einstellungen',
      PNavStopDescription: 'Stop',
      PogoButtonsText: [
        {
          send: {
            false: 'Kopiere',
            true: 'An'
          }
        },
        ' PokeNav',
        {send: {true: ' senden',
          false: ''}}
      ],
      PogoButtonsTitle: [
        {
          send: {
            false: 'Kopiere',
            true: 'Sende'
          }
        },
        ' den POI-Befehl ',
        {
          send: {
            false: 'in die Zwischenablage.',
            true: 'an Discord über den WebHook.'
          }
        }
      ],
      pokeNavSettingsText: 'PokeNav-Einstellungen',
      pokeNavSettingsTitle: 'Konfigurieren Sie PokeNav',
      portalHighlighterName: 'PokeNav-Status',
      requestAddressDescription: 'Adresse abfragen',
      useBotText: 'Bot verwenden',
      useBotTitle: 'Setzen Sie den Haken, wenn Sie den Assistenz-Bot auf Ihren Server hinzugefügt haben. Dadurch kann der Massen-Export beschleunigt werden. Mehr Infos dazu auf GitHub!'
    }
  };
  // #endregion

  function detectLanguage () {
    let lang = navigator.language;
    lang = lang.split('-')[0].toLowerCase();
    if (Object.keys(strings).includes(lang)) {
      return lang;
    } else {
      return 'en';
    }
  }

  window.plugin.pnav.getString = getString;

  function getString (id, options) {
    if (window.plugin.pnav.settings.language && strings[window.plugin.pnav.settings.language] && (strings[window.plugin.pnav.settings.language])[id]) {
      let string = (strings[window.plugin.pnav.settings.language])[id];
      if (!(typeof string === 'string')) {
        return parseNestedString(string, options);
      } else {
        return string;
      }
    } else if (strings.en && strings.en[id]) {
      let string = strings.en[id];
      if (!(typeof string === 'string')) {
        return parseNestedString(string, options);
      } else {
        return string;
      }
    } else {
      return id;
    }
  }

  function parseNestedString (object, options) {
    if (typeof object === 'string' || object instanceof String) {
      if (object.length > 1 && object.startsWith('#')) {
        return getString(object.substring(1), options);
      } else {
        return object;
      }
    } else if (object instanceof Array) {
      let newString = '';
      object.forEach(function (entry) {
        newString += parseNestedString(entry, options);
      });
      return newString;
    } else if (typeof object === 'object' && Object.keys(object).length > 0) {
      const optionName = Object.keys(object)[0];
      let decision = object[optionName];
      if (options && Object.keys(options).includes(optionName) && Object.keys(decision).includes(String(options[optionName]))) {
        const optionValue = String(options[optionName]);
        return parseNestedString(decision[optionValue]);
      } else if (Object.keys(decision).includes('default')) {
        return parseNestedString(decision.default);
      } else if (Object.keys(decision).length > 0) {
        return parseNestedString(decision[Object.keys(decision)[0]]);
      } else {
        return '';
      }
    } else {
      return '';
    }
  }

  function isImportInputValid (data) {
    if (Object.keys(data).length > 2 || typeof data.pokestop !== 'object' || typeof data.gym !== 'object') {
      console.error('import data has more or less top-level nodes or different ones than "pokestop" and "gym".');
      return false;
    } else {
      let validGuid = /^[0-9|a-f]{32}\.1[126]$/; // TODO: What are valid Guid endings? seen .11, .12 and .16 so far. but are there more and what are the rules?
      let allValid = true;
      Object.keys(data.pokestop).forEach(function (guid) {
        if (allValid) {
          allValid = validGuid.test(guid);
          if (!allValid) {
            console.error(`the guid ${guid} is not a valid guid!`);
          }
          let entry = data.pokestop[guid];
          if (Object.keys(entry).length < 4 || !entry.guid || entry.guid != guid || typeof entry.lat === 'undefined' || typeof entry.lng === 'undefined' || typeof entry.name === 'undefined') {
            allValid = false;
            console.error(`the following pokestop has invalid data: ${JSON.stringify(entry)}`);
          }
        }
      });
      if (allValid) {
        Object.keys(data.gym).forEach(function (guid) {
          if (allValid) {
            allValid = validGuid.test(guid);
            if (!allValid) {
              console.error(`the guid ${guid} is not a valid guid!`);
            }
            let entry = data.gym[guid];
            if (Object.keys(entry).length < 4 || !entry.guid || entry.guid != guid || typeof entry.lat === 'undefined' || typeof entry.lng === 'undefined' || typeof entry.name === 'undefined' || (entry.isEx && typeof entry.isEx !== 'boolean')) {
              allValid = false;
              console.error(`the following gym has invalid data: ${JSON.stringify(entry)}`);
            }
          }
        });
      }
      return allValid;
    }
  }

  // Highlighter that will highlight Portals according to the data that was submitted to PokeNav. PokeStops in blue, Gyms in red, Ex Gyms maybe with a yellow circle, Not yet submitted portals in gray.
  window.plugin.pnav.highlight = function (data) {
    const guid = data.portal.options.guid;
    let color, fillColor;
    if (pNavData.pokestop[guid]) {
      color = '#00d8ff';
    } else if (pNavData.gym[guid]) {
      if (pNavData.gym[guid].isEx) {
        fillColor = '#eec13c';
      }
      color = '#ff0204';
    } else {
      color = '#808080';
    }
    let params = window.getMarkerStyleOptions({team: window.TEAM_NONE,
      level: 0});
    params.color = color;
    params.fillColor = fillColor;
    data.portal.setStyle(params);
  };

  window.plugin.pnav.copy = function () {
    let input = $('#copyInput');
    if (window.selectedPortal) {
      let portal = window.portals[selectedGuid];

      /** @type {string} */
      const prefix = `<@${pNavId}> `;

      /** @type {portalData} */
      let data;

      if (window.plugin.pogo && localStorage['plugin-pogo']) {
        let toolData = JSON.parse(localStorage['plugin-pogo']);
        if (toolData.pokestops && toolData.pokestops[selectedGuid]) {
          data = toolData.pokestops[selectedGuid];
          data.type = 'pokestop';
        } else if (toolData.gyms && toolData.gyms[selectedGuid]) {
          data = toolData.gyms[selectedGuid];
          data.type = 'gym';
        } else {
          data = {
            name: portal.options.data.title,
            lat: portal.getLatLng().lat,
            lng: portal.getLatLng().lng,
            guid: portal.options.guid,
            type: 'none'
          };
        }
      } else {
        data = {
          name: portal.options.data.title,
          lat: portal.getLatLng().lat,
          lng: portal.getLatLng().lng,
          guid: portal.options.guid
        };

        switch ($('input[name=type]:checked').val()) {
        case 'pokestop':
          data.type = 'pokestop';
          break;
        case 'gym':
          data.type = 'gym';
          break;
        case 'ex':
          data.type = 'gym';
          data.isEx = true;
          break;
        case 'none':
          data.type = 'none';
          break;
        default:
          break;
        }
      }

      if (
        window.plugin.pnav.settings.lat !== null &&
        window.plugin.pnav.settings.lng !== null &&
        window.plugin.pnav.settings.radius !== null &&
        checkDistance(data.lat, data.lng, window.plugin.pnav.settings.lat, window.plugin.pnav.settings.lng) >
        window.plugin.pnav.settings.radius
      ) {
        alert(getString('alertOutsideArea'));
      } else {
        let changes = checkForSingleModification(data);
        if (changes) {
          window.plugin.pnav.bulkModify([changes]);
        } else if (data.type !== 'none') {
          if (pNavData[data.type][selectedGuid]) {
            alert(getString('alertAlreadyExported'));
            input.show();
            input.val(`${prefix}create poi ${data.type} «${data.name}» ${data.lat} ${data.lng}${data.isEx ? ' "ex_eligible: 1"' : ''}`);
            copyfieldvalue('copyInput');
            input.hide();
          } else if (window.plugin.pnav.settings.webhookUrl) {
            if (window.plugin.pnav.settings.useBot) {
              let formData = new FormData();
              formData.append('content', `<@${companionId}> cm`);
              formData.append('username', window.plugin.pnav.settings.name);
              formData.append('file', new Blob([JSON.stringify(data)], {type: 'application/json'}), `creation.json`);
              $.ajax({
                method: 'POST',
                url: window.plugin.pnav.settings.webhookUrl,
                contentType: 'application/json',
                processData: false,
                data: formData,
                error (jgXHR, textStatus, errorThrown) {
                  console.error(`${textStatus} - ${errorThrown}`);
                }
              });
            } else {
              sendMessage(`${prefix}create poi ${data.type} «${data.name}» ${data.lat} ${data.lng}${data.isEx ? ' "ex_eligible: 1"' : ''}`);
            }
          } else {
            input.show();
            input.val(`${prefix}create poi ${data.type} «${data.name}» ${data.lat} ${data.lng}${data.isEx ? ' "ex_eligible: 1"' : ''}`);
            copyfieldvalue('copyInput');
            input.hide();
          }
          pNavData[data.type][selectedGuid] = data;
          saveToLocalStorage();
        }
      }
      // eslint-disable-next-line no-underscore-dangle
      if (window._current_highlighter === getString('portalHighlighterName')) {
        window.changePortalHighlights(getString('portalHighlighterName')); // re-validate highlighter if active
      }
    }
  };

  window.plugin.pnav.imExport = function () {

    /*
     * Methods to upload / download files inspired by PoGoTools Plugin by AlfonsoML on GitLab:
     * https://gitlab.com/AlfonsoML/pogo-s2/-/blob/master/s2check.user.js
     */

    let date = new Date();
    let html = `<button type="Button" id="exportBtn" title="${getString('btnExportTitle')}">${getString('btnExportText')}</button>
    <hr>`;
    if (typeof L.FileListLoader !== 'undefined' || typeof window.requestFile !== 'undefined') {
      html += `<button id="importBtn" type="Button" title="${getString('btnImportTitle')}">${getString('btnImportText')}</button>`;
    } else if (File && FileReader && Blob) {
      html += `<form id="importForm">
      <input type="file" id="importFile" name="import" accept="application/json"><br>
      <input type="submit" value="${getString('btnImportText')}" title="${getString('btnImportTitle')}" class="Button">
      </form>`;
    } else {
      html += `<textarea id="importInput" style="width:100%; height:auto" placeholder="${getString('importInputText')}"></textarea>
      <button type="Button" class="Button" id="importDialogButton" title="${getString('btnImportTitle')}">${getString('btnImportText')}</button>`;
    }
    const dialog = window.dialog({id: 'imExportDialog',
      width: 'auto',
      height: 'auto',
      title: getString('imExportDialogTitle'),
      html});

    $('#exportBtn').on('click', () => {
      if (typeof window.saveFile !== 'undefined') {
        window.saveFile(JSON.stringify(pNavData, null, 2), `IITCPokenavExport-${window.plugin.pnav.settings.name}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}.json`, 'application/json');
      } else if (typeof window.android !== 'undefined' && window.android.saveFile) {
        window.android.saveFile(`IITCPokenavExport-${window.plugin.pnav.settings.name}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}.json`, 'application/json', JSON.stringify(pNavData));
      } else {
        // Idea taken from https://stackoverflow.com/a/50230647 by User KeshavDulal
        const tmpTextarea = document.createElement('textarea');
        tmpTextarea.innerHTML = JSON.stringify(pNavData, null, 2);
        document.body.appendChild(tmpTextarea);
        tmpTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tmpTextarea);
        alert(getString('alertExportCopied'));
      }
    });
    if ($('#importBtn').length > 0) {
      $('#importBtn').on('click', () => {
        if (typeof L.FileListLoader !== 'undefined') {
          L.FileListLoader.loadFiles({accept: 'text/json'}).on('load', (e) => { // application/json did somehow not work for me on my smartphone...
            let data = JSON.parse(e.reader.result);
            if (isImportInputValid(data)) {
              pNavData = data;
              saveToLocalStorage();
              dialog.dialog('close');
              // re-validate the highlighter if it is active.
              // eslint-disable-next-line no-underscore-dangle
              if (window._current_highlighter === getString('portalHighlighterName')) {
                window.changePortalHighlights(getString('portalHighlighterName'));
              }
            } else {
              alert(getString('importInvalidFormat'));
            }
          });
        } else if (typeof window.requestFile !== 'undefined') {
          window.requestFile((name, content) => {
            let data = JSON.parse(content);
            if (isImportInputValid(data)) {
              pNavData = data;
              saveToLocalStorage();
              dialog.dialog('close');
              // re-validate the highlighter if it is active.
              // eslint-disable-next-line no-underscore-dangle
              if (window._current_highlighter === getString('portalHighlighterName')) {
                window.changePortalHighlights(getString('portalHighlighterName'));
              }
            } else {
              alert(getString('importInvalidFormat'));
            }
          });
        }
      });
    } else if (File && FileReader && Blob) {
      $('#importForm', dialog).on('submit', function (e) {
        e.preventDefault();
        console.debug('form submitted!');
        if ($('#importFile', dialog).prop('files').length == 1) {
          let fr = new FileReader();
          fr.onload = function () {
            console.debug('file text loaded!');
            const data = JSON.parse(fr.result);
            if (isImportInputValid(data)) {
              pNavData = data;
              saveToLocalStorage();
              dialog.dialog('close');
              // re-validate the highlighter if it is active.
              // eslint-disable-next-line no-underscore-dangle
              if (window._current_highlighter === getString('portalHighlighterName')) {
                window.changePortalHighlights(getString('portalHighlighterName'));
              }
            } else {
              alert(getString('importInvalidFormat'));
            }
          };
          fr.readAsText($('#importFile', dialog).prop('files')[0]);
        }
      });
    } else {
      $('#importDialogButton', dialog).on('click', function () {
        let data;
        try {
          data = JSON.parse($('#importInput', dialog).val());
        } catch (e) {
          alert(getString('importInvalidFormat'));
          console.error(`Parsing of import JSON Data failed: ${e.message}`);
          return;
        }
        if (isImportInputValid(data)) {
          pNavData = data;
          saveToLocalStorage();
          // re-validate the highlighter if it is active.
          // eslint-disable-next-line no-underscore-dangle
          if (window._current_highlighter === getString('portalHighlighterName')) {
            window.changePortalHighlights(getString('portalHighlighterName'));
          }
          dialog.dialog('close');
        } else {
          alert(getString('importInvalidFormat'));
        }
      });
    }
  };

  window.plugin.pnav.showSettings = function () {
    let html = /* html*/ `
        <div class="form-group">
          <label for="pnavLanguage">${getString('pnavLanguageDescription')}</label>
          <select id="pnavLanguage" onchange="window.plugin.pnav.settings.language = this.value;alert(window.plugin.pnav.getString('alertLanguageAfterReload'));"></select>
        </div>
        <div>
          <label for="webhookUrl" title="${getString('pnavhookurlTitle')}">${getString('pnavhookurlDescription')}</label>
          <input type="url" style="width:100%" id="webhookUrl" value="${window.plugin.pnav.settings.webhookUrl !== null ? window.plugin.pnav.settings.webhookUrl : ''}" pattern="https?://(?:ptb.|canary.)?discord(?:app)?.com/api/webhooks/[0-9]{1,20}/[^\\/]*"/>
          <div style="color: red; display:none;">${getString('lblErrorWHText')}</div>
        </div>
        <div class="form-group">
          <label for="useBot" title="${getString('useBotTitle')}">${getString('useBotText')}</label>
          <input type="checkbox" id="useBot"${window.plugin.pnav.settings.useBot ? ' checked' : ''}>
        </div>
        <div class="form-group">
          <Label for="name" title="${getString('pnavCodenameTitle')}">${getString('pnavCodenameDescription')}</label>
          <input id="name" type="text" placeholder="${window.PLAYER.nickname}" value="${window.plugin.pnav.settings.name}">
        </div>
        <div>
          <label id="center" for="latlng" title="${getString('pnavCenterTitle')}">${getString('pnavCenterDescription')}</label>
          <input id="latlng" size="17" type="text" pattern="^-?&#92;d?&#92;d(&#92;.&#92;d+)?, -?1?&#92;d?&#92;d(&#92;.&#92;d+)?$" value="${window.plugin.pnav.settings.lat !== null && window.plugin.pnav.settings.lng !== null ? `${window.plugin.pnav.settings.lat}, ${window.plugin.pnav.settings.lng}` : ''}">
          <div style="color:red;display:none;">${getString('lblErrorCnText')}</div>
        </div>
        <div class="form-group">
          <label for="radius" title="${getString('pnavRadiusTitle')}">${getString('pnavRadiusDescription')}</label>
          <input id="radius" style="width:41px;appearance:textfield;-moz-appearance:textfield;-webkit-appearance:textfield" type="number" min="0" step="0.001" value="${window.plugin.pnav.settings.radius !== null ? window.plugin.pnav.settings.radius : ''}">
          <div style="color:red;display:none">${getString('lblErrorRdText')}</div>
        </div>
        <div class="form-group"><button type="Button" id="btnEraseHistory" style="width:100%" title="${getString('btnEraseHistoryTitle')}" onclick="
          window.plugin.pnav.deleteExportState();
          $(this).css('color','green');
          $(this).css('border','1px solid green')
          $(this).text('${getString('btnEraseHistoryTextSuccess')}');
          setTimeout(function () {
            if($('#btnEraseHistory').length > 0){
              $('#btnEraseHistory').css('color', '');
              $('#btnEraseHistory').css('border', '');
              $('#btnEraseHistory').text('${getString('btnEraseHistoryTextDefault')}');
            }
          }, 1000);
          return false;
        ">${getString('btnEraseHistoryTextDefault')}</button></div>
        <div class="form-group">
          <button type="Button" id="btnImExport" style="width:100%" title="${getString('btnImExportTitle')}" onclick="window.plugin.pnav.imExport();return false;">${getString('btnImExportText')}</button>
        </div>
        `;
    if (window.plugin.pogo && window.plugin.pnav.settings.webhookUrl) {
      html += /* html */ `
            <div class="form-group"><button type="Button" id="btnBulkExportGyms" style="width:100%" title="${getString('btnBulkExportGymsTitle')}" onclick="window.plugin.pnav.bulkExport('gym');return false;">${getString('btnBulkExportGymsText')}</button></div>
            <div class="form-group"><button type="Button" id="btnBulkExportStops" style="width:100%" title="${getString('btnBulkExportStopsTitle')}" onclick="window.plugin.pnav.bulkExport('pokestop');return false;">${getString('btnBulkExportStopsText')}</button></div>
            `;
    }
    if (window.plugin.pogo) {
      html += /* html */`
      <div class="form-group"><button type="Button" id="btnBulkModify" style="width:100%" title="${getString('btnBulkModifyTitle')}" onclick="window.plugin.pnav.bulkModify(); return false;">
      ${getString('btnBulkModifyText')}</button></div>
      `;
    }

    const container = window.dialog({
      id: 'pnavsettings',
      width: 'auto',
      height: 'auto',
      html,
      title: getString('pnavsettingsTitle'),
      buttons: {
        OK () {
          if (!window.plugin.pnav.timer) {
            lCommBounds.clearLayers();
            if (window.plugin.pnav.settings.lat && window.plugin.pnav.settings.lng && window.plugin.pnav.settings.radius) {
              let circle = L.circle(L.latLng([
                window.plugin.pnav.settings.lat,
                window.plugin.pnav.settings.lng
              ]), {radius: window.plugin.pnav.settings.radius * 1000,
                interactive: false,
                fillOpacity: 0.1,
                color: '#000000'});
              lCommBounds.addLayer(circle);
            }
          } else {
            alert(getString('alertExportRunning'));
          }
          container.dialog('close');
        }
      }
    });

    let languageDropdown = $('#pnavLanguage', container);
    Object.keys(strings).forEach(function (key) {
      languageDropdown.append(`<option value="${key}">${key}</option>`);
    });
    languageDropdown.val(window.plugin.pnav.settings.language);
    $('input', container).on('blur', validateAndSaveSetting);
  };

  /**
   * Validates an input field and saves the corresponding setting if valid.
   * @param {JQuery.BlurEvent<HTMLElement, undefined, HTMLInputElement, HTMLElement>} e - the JQuery event
   */
  function validateAndSaveSetting (e) {
    console.log('blur');
    if (e.currentTarget.checkValidity()) {
      console.log('valid');
      // special handling of center input
      if (e.currentTarget.id === 'latlng') {
        let lat, lng;
        if (e.currentTarget.value) {
          let value = e.currentTarget.value?.split(',', 2);
          lat = parseFloat(value[0]);
          lng = parseFloat(value[1]);
          if (!(lat >= -90 &&
            lat <= 90) || !(lng >= -180 &&
            lng <= 180)) {
            if (e.currentTarget.nextElementSibling && e.currentTarget.nextElementSibling instanceof HTMLDivElement) {
              e.currentTarget.nextElementSibling.style.display = '';
            }
            return;
          }
        }
        window.plugin.pnav.settings.lat = lat;
        window.plugin.pnav.settings.lng = lng;
        if (e.currentTarget.nextElementSibling && e.currentTarget.nextElementSibling instanceof HTMLDivElement)e.currentTarget.nextElementSibling.style.display = 'none';
        localStorage.setItem(
          'plugin-pnav-settings',
          JSON.stringify(window.plugin.pnav.settings)
        );
      } else if (Object.getOwnPropertyNames(window.plugin.pnav.settings).includes(e.currentTarget.id)) {
        let value;
        switch (e.currentTarget.type) {
        case 'checkbox':
          value = e.currentTarget.checked;
          break;
        case 'number':
          value = e.currentTarget.valueAsNumber;
          break;
        default:
          value = e.currentTarget.value;
          break;
        }
        // if no value but placeholder, use placeholder
        if (!value && e.currentTarget.placeholder) {
          value = e.currentTarget.placeholder;
        }
        if (value === '') {
          value = null;
        }
        if (e.currentTarget.nextElementSibling && e.currentTarget.nextElementSibling instanceof HTMLDivElement)e.currentTarget.nextElementSibling.style.display = 'none';
        window.plugin.pnav.settings[e.currentTarget.id] = value;
        localStorage.setItem(
          'plugin-pnav-settings',
          JSON.stringify(window.plugin.pnav.settings)
        );
      }
    } else {
      console.log('invalid', e.currentTarget.nextSibling, e.currentTarget);
      // TODO: show error message
      if (e.currentTarget.nextElementSibling && e.currentTarget.nextElementSibling instanceof HTMLDivElement) {
        e.currentTarget.nextElementSibling.style.display = '';
      }
    }
  }

  window.plugin.pnav.deleteExportState = function () {
    if (localStorage['plugin-pnav-done-pokestop']) {
      localStorage.removeItem('plugin-pnav-done-pokestop');
    }
    if (localStorage['plugin-pnav-done-gym']) {
      localStorage.removeItem('plugin-pnav-done-gym');
    }
    pNavData.pokestop = {};
    pNavData.gym = {};
    // re-validate the highlighter if it is active.
    // eslint-disable-next-line no-underscore-dangle
    if (window._current_highlighter === getString('portalHighlighterName')) {
      window.changePortalHighlights(getString('portalHighlighterName'));
    }
  };

  /**
   * saves the State of the Bulk Export to local Storage.
   * @param {pogoToolsData[]} data
   * @param {string} type
   * @param {number} [index]
   */
  function saveState (data, type, index) {
    const addToDone = data.slice(0, index);
    addToDone.forEach(function (object) {
      (pNavData[type])[object.guid] = object;
    });
    saveToLocalStorage();
  }

  window.plugin.pnav.bulkModify = function (changes) {
    const changeList = (changes && changes instanceof Array) ? changes : checkForModifications();
    if (window.plugin.pnav.settings.useBot && window.plugin.pnav.settings.webhookUrl) {
      botEdit(changeList);
      return;
    }
    if (changeList && changeList.length > 0) {
      let i = 0;
      const send = Boolean(window.plugin.pnav.settings.webhookUrl);
      const html = `
        <label>${getString('Modification')}</label><label id=pNavModNrCur>1</label><label>${getString('of')}</label><label id="pNavModNrMax"></label>
        <h3>
          ${getString('pNavOldPoiNameDescription')}
        </h3>
        <h3 id="pNavOldPoiName"></h3>
        <p>
          <a id="address">${getString('requestAddressDescription')}</a>
          <span id="addressdetails" hidden></span>
        </p>
        <label>${getString('pNavChangesMadeDescription')}</label>
        <ul id="pNavChangesMade"></ul>
        <label>
          ${getString('pNavPoiIdDescription')}
          <input id="pNavPoiId" style="appearance:textfield;-moz-appearance:textfield;-webkit-appearance:textfield" type="number" min="0" step="1"/>
        </label>
        <br>
        <button type="Button" class="ui-button" id="pNavPoiInfo" title="${getString('pNavPoiInfoTitle', {send})}" style="margin-top:5px">
          ${getString('pNavPoiInfoText', {send})}
        </button>
        <button type="Button" class="ui-button" id="pNavModCommand" title="${getString('pNavModCommandTitleDisabled', {send})}" style="margin-top:5px;color:darkgray;text-decoration:none">
          ${getString('pNavModCommandText', {send})}
        </button>
      `;

      /** @type{JQuery<HTMLElement>}*/
      const modDialog = window.dialog({
        id: 'pNavmodDialog',
        title: getString('pNavmodDialogTitle'),
        html,
        width: 'auto',
        height: 'auto',
        buttons: {
          Skip: {
            id: 'btnSkip',
            text: getString('btnSkipText'),
            click () {
              i++;
              if (i == changeList.length) {
                modDialog.dialog('close');
              } else {
                poi = changeList[i];
                updateUI(modDialog, poi, i);
              }
            }
          }
        }
      });
      let poi = changeList[i];
      $('#pNavPoiInfo', modDialog).on('click', function () {
        if (window.plugin.pnav.settings.webhookUrl) {
          sendMessage(`<@${pNavId}> ${poi.oldType === 'pokestop' ? 'stop' : poi.oldType}-info ${poi.oldName}`);
        } else {
          const input = $('#copyInput');
          input.show();
          input.val(`<@${pNavId}> ${poi.oldType === 'pokestop' ? 'stop' : poi.oldType}-info ${poi.oldName}`);
          copyfieldvalue('copyInput');
          input.hide();
        }
      });
      $('#pNavPoiId', modDialog).on('input', function (e) {
        const valid = e.target.validity.valid;
        const value = e.target.valueAsNumber;
        if (valid && value && value > 0) {
          $('#pNavModCommand', modDialog).prop('style', 'margin-top:5px');
          $('#pNavModCommand', modDialog).prop('title', getString('pNavModCommandTitleEnabled', {send}));
        } else {
          $('#pNavModCommand', modDialog).css('color', 'darkgray');
          $('#pNavModCommand', modDialog).css('text-decoration', 'none');
          $('#pNavModCommand', modDialog).css('border', '1px solid darkgray');
          $('#pNavModCommand', modDialog).prop('title', getString('pNavModCommandTitleDisabled', {send}));
        }
      });
      $('#pNavModCommand', modDialog).on('click', function () {
        if ($('#pNavPoiId', modDialog).val() && (/^\d*$/).test($('#pNavPoiId', modDialog).val())) {
          sendModCommand($('#pNavPoiId', modDialog).val(), poi);
          updateDone([poi]);
          i++;
          if (i == changeList.length) {
            modDialog.dialog('close');
          } else {
            poi = changeList[i];
            updateUI(modDialog, poi, i);
          }
        }
      });
      $('#address').on('click', () => {
        $.ajax(`https://nominatim.openstreetmap.org/reverse?lat=${changeList[i].lat}&lon=${changeList[i].lng}&format=json&addressdetails=0`, {
          success: (data) => {
            if (data && data.display_name) {
              $('#addressdetails').text(data.display_name);
              $('#address').prop('hidden', true);
              $('#addressdetails').prop('hidden', false);
            }
          }
        });
      });
      console.log(modDialog);
      modDialog.css('width', `${modDialog[0].offsetWidth}px`);
      $('#pNavModNrMax', modDialog).text(changeList.length);
      updateUI(modDialog, poi, i);
    } else {
      alert(getString('alertNoModifications'));
    }
  };

  /**
   * updates the export state after an edit step.
   * @param {editData[]} changeList - list of changes that were made.
   */
  function updateDone (changeList) {
    const pogoData = localStorage['plugin-pogo'] ? JSON.parse(localStorage['plugin-pogo']) : {};
    const pogoGyms = pogoData.gyms ?? {};
    const pogoStops = pogoData.pokestops ?? {};
    changeList.forEach((change) => {
      if (Object.keys(pogoStops).includes(change.guid)) {
        pNavData.pokestop[change.guid] = pogoStops[change.guid];
        if (Object.keys(pNavData.gym).includes(change.guid)) {
          delete pNavData.gym[change.guid];
        }
      } else if (Object.keys(pogoGyms).includes(change.guid)) {
        pNavData.gym[change.guid] = pogoGyms[change.guid];
        if (Object.keys(pNavData.pokestop).includes(change.guid)) {
          delete pNavData.pokestop[change.guid];
        }
      } else {
        if (Object.keys(pNavData.pokestop).includes(change.guid)) {
          delete pNavData.pokestop[change.guid];
        } else {
          delete pNavData.gym[change.guid];
        }
      }
    });
    saveToLocalStorage();
  }

  function updateUI (dialog, poi, i) {
    $('#pNavOldPoiName', dialog).text(poi.oldName);
    $('#pNavModNrCur', dialog).text(i + 1);
    $('#pNavChangesMade', dialog).empty();
    $('#addressdetails').text('')
      .prop('hidden', true);
    $('#address').prop('hidden', false);
    for (const [
      key,
      value
    ] of Object.entries(poi.edits)) {
      $('#pNavChangesMade', dialog).append(`<li>${key} => ${value}</li>`);
    }
    $('#pNavPoiId', dialog).val('');
    $('#pNavModCommand', dialog).css('color', 'darkgray');
    $('#pNavModCommand', dialog).css('border', '1px solid darkgray');
    $('#pNavModCommand', dialog).css('cursor', 'default');
    $('#pNavModCommand', dialog).css('text-decoration', 'none');
    $('#pNavModCommand', dialog).prop('title', getString('pNavModCommandTitleDisabled', {send: Boolean(window.plugin.pnav.settings.webhookUrl)}));
  }

  function sendModCommand (poiId, changes) {
    let command = '';
    if (changes.edits.type && changes.edits.type === 'none') {
      command = `<@${pNavId}> delete poi ${poiId}`;
    } else {
      command = `<@${pNavId}> update poi ${poiId}`;
      for (const [
        key,
        value
      ] of Object.entries(changes.edits)) {
        command += ` «${key}: ${value}»`;
      }
    }
    if (window.plugin.pnav.settings.webhookUrl) {
      sendMessage(command);
    } else {
      const input = $('#copyInput');
      input.show();
      input.val(command);
      copyfieldvalue('copyInput');
      input.hide();
    }
  }

  /**
   * Checks for Modifications in PoGoTools Data.
   * @return {editData[]} returns a list of edits.
   */
  function checkForModifications () {
    const pogoData = localStorage['plugin-pogo'] ? JSON.parse(localStorage['plugin-pogo']) : {};
    const pogoStops = (pogoData && pogoData.pokestops) ? pogoData.pokestops : {};
    const keysStops = Object.keys(pogoStops);
    const pogoGyms = pogoData && pogoData.gyms ? pogoData.gyms : {};
    const keysGyms = Object.keys(pogoGyms);
    let changeList = [];
    if (pogoData) {
      Object.values(pNavData.pokestop).forEach(function (stop) {

        /** @type {editData}*/
        let detectedChanges = {edits: {}};
        let newData;
        if (!keysStops.includes(stop.guid)) {
          if (keysGyms.includes(stop.guid)) {
            detectedChanges.edits.type = 'gym';
            newData = pogoGyms[stop.guid];
            if (newData.isEx) {
              detectedChanges.edits.ex_eligible = 1;
            }
          } else {
            detectedChanges.edits.type = 'none';
          }
        } else {
          newData = pogoStops[stop.guid];
        }
        // compare data
        if (newData) {
          if (newData.name !== stop.name) {
            detectedChanges.edits.name = newData.name;
          }
          // not eqeqeq because sometimes the lat and lng were numbers for me, but most of the time they were strings in Pogo Tools. Maybe there's a bug with that...
          if (newData.lat != stop.lat) {
            detectedChanges.edits.latitude = newData.lat;
          }
          // not eqeqeq because sometimes the lat and lng were numbers for me, but most of the time they were strings in Pogo Tools. Maybe there's a bug with that...
          if (newData.lng != stop.lng) {
            detectedChanges.edits.longitude = newData.lng;
          }
        }
        if (Object.keys(detectedChanges.edits).length > 0) {
          detectedChanges.oldName = stop.name;
          detectedChanges.oldType = 'pokestop';
          detectedChanges.guid = stop.guid;
          detectedChanges.lat = stop.lat;
          detectedChanges.lng = stop.lng;
          changeList.push(detectedChanges);
        }
      });
      Object.values(pNavData.gym).forEach(function (gym) {

        /** @type {editData}*/
        let detectedChanges = {edits: {}};
        let newData;
        if (!keysGyms.includes(gym.guid)) {
          if (keysStops.includes(gym.guid)) {
            detectedChanges.edits.type = 'pokestop';
            newData = pogoStops[gym.guid];
          } else {
            detectedChanges.edits.type = 'none';
          }
        } else {
          newData = pogoGyms[gym.guid];
        }
        // compare data
        if (newData) {
          if (newData.name !== gym.name) {
            detectedChanges.edits.name = newData.name;
          }
          // not eqeqeq because sometimes the lat and lng were numbers for me, but most of the time they were strings in Pogo Tools. Maybe there's a bug with that...
          if (newData.lat != gym.lat) {
            detectedChanges.edits.latitude = newData.lat;
          }
          // not eqeqeq because sometimes the lat and lng were numbers for me, but most of the time they were strings in Pogo Tools. Maybe there's a bug with that...
          if (newData.lng != gym.lng) {
            detectedChanges.edits.longitude = newData.lng;
          }
          if (Boolean(newData.isEx) !== Boolean(gym.isEx)) { // that treats undefined as false, otherwise undefined and false would be unequal, even with != instead of !==.
            const newEx = newData.isEx ? newData.isEx : false;
            detectedChanges.edits.ex_eligible = newEx ? 1 : 0;
          }
        }
        if (Object.keys(detectedChanges.edits).length > 0) {
          detectedChanges.oldName = gym.name;
          detectedChanges.oldType = 'gym';
          detectedChanges.guid = gym.guid;
          detectedChanges.lat = gym.lat;
          detectedChanges.lng = gym.lng;
          changeList.push(detectedChanges);
        }
      });
    }
    return changeList;
  }

  function saveToLocalStorage () {
    localStorage['plugin-pnav-done-pokestop'] = JSON.stringify(pNavData.pokestop);
    localStorage['plugin-pnav-done-gym'] = JSON.stringify(pNavData.gym);
  }

  /**
   * Edit Data that lists what edits should be made.
   * @typedef {object} editData
   * @property {string} oldType - expected pokestop or gym
   * @property {string} oldName
   * @property {string} guid
   * @property {string} lat
   * @property {string} lng
   * @property {object} edits
   * @property {string} [edits.latitude]
   * @property {string} [edits.longitude]
   * @property {string} [edits.name]
   * @property {string} [edits.type] - expected pokestop, gym or none
   * @property {number} [edits.ex_eligible]
   */

  /**
   * data about portals
   * @typedef {object} portalData
   * @property {string} type
   * @property {string} guid
   * @property {string} name
   * @property {string} lat
   * @property {string} lng
   * @property {boolean} [isEx]
   */

  /**
   * data like it is stored in PoGoTools Plugin (mainly portalData without type field).
   * @external
   * @typedef {object} pogoToolsData
   * @property {string} guid
   * @property {string} name
   * @property {string} lat
   * @property {string} lng
   * @property {boolean} [isEx]
   */

  /**
   * Checks if a single Poi has been modified
   * @param {portalData} currentData
   * @return {editData | null} returns the found changes or null if none were found or a problem occurred.
   */
  function checkForSingleModification (currentData) {

    /** @type {editData} */
    let changes = {edits: {}};

    /** @type {portalData} */
    let savedData;
    if (pNavData.pokestop[currentData.guid]) {
      savedData = pNavData.pokestop[currentData.guid];
      savedData.type = 'pokestop';
    } else if (pNavData.gym[currentData.guid]) {
      savedData = pNavData.gym[currentData.guid];
      savedData.type = 'gym';
    } else {
      return null;
    }
    if (currentData.type !== savedData.type) {
      changes.edits.type = currentData.type;
    }
    if (currentData.lat != savedData.lat) {
      changes.edits.latitude = currentData.lat.toString();
    }
    if (currentData.lng != savedData.lng) {
      changes.edits.longitude = currentData.lng.toString();
    }
    if (currentData.name != savedData.name) {
      changes.edits.name = currentData.name;
    }
    if (Boolean(currentData.isEx) !== Boolean(savedData.isEx)) { // to cope with undefined == false etc.
      changes.edits.ex_eligible = currentData.isEx ? 1 : 0;
    }
    if (Object.keys(changes.edits).length > 0) {
      changes.oldName = savedData.name;
      changes.oldType = savedData.type;
      changes.guid = savedData.guid;
      changes.lat = savedData.lat;
      changes.lng = savedData.lng;
      return changes;
    } else {
      return null;
    }
  }

  /**
   * fetch previous data from local storage and add
   * @param {string} type - expected values pokestop or gym
   * @return {pogoToolsData[] | null} returns the data to export or null if Pogo Tools Data was not found.
   */
  function gatherExportData (type) {

    /** @type {pogoToolsData[]}*/
    let pogoData = localStorage['plugin-pogo'] ? JSON.parse(localStorage['plugin-pogo']) : {};
    if (pogoData[`${type}s`]) {
      pogoData = Object.values(pogoData[`${type}s`]);
      const doneGuids = (Object.keys(pNavData.pokestop).concat(Object.keys(pNavData.gym)));
      const distanceNotCheckable =
        window.plugin.pnav.settings.lat === null ||
        window.plugin.pnav.settings.lng === null ||
        window.plugin.pnav.settings.radius === null;

      /** @type {pogoToolsData[]} */
      let exportData = pogoData.filter(function (object) {
        return (
          !doneGuids.includes(object.guid) &&
          (distanceNotCheckable ||
            checkDistance(object.lat, object.lng, window.plugin.pnav.settings.lat, window.plugin.pnav.settings.lng) <= window.plugin.pnav.settings.radius)
        );
      });
      return exportData;
    }
    return null;
  }

  /**
   * @param {string} type - the type of locations to export (expected values pokestop or gym)
   */
  window.plugin.pnav.bulkExport = function (type) {
    if (!window.plugin.pnav.timer) {
      let data = gatherExportData(type);
      if (!data) {
        alert(getString('alertProblemPogoTools'));
        return;
      }
      if (window.plugin.pnav.settings.useBot) {
        botExport(data, type); // jump to BotExport immediately before opening the dialog, this is not needed!
        return;
      }
      let i = 0;
      window.onbeforeunload = function () {
        saveState(data, type, i);
        return null;
      };

      window.plugin.pnav.timer = setInterval(() => {
        if (i < data.length && data.length > 0) {
          normalExport(data, type, thisDialog, i).then((result) => {
            i = result;
          });
        } else {
          saveState(data, type, i);
          clearInterval(window.plugin.pnav.timer);
          window.plugin.pnav.timer = null;
          window.onbeforeunload = null;
        }
      }, wait);

      let dialog = window.dialog({
        id: 'bulkExportProgress',
        html: `
              <h3 id="exportState">${getString('exportStateTextExporting')}</h3>
              <p>
                <label>
                  ${getString('exportProgressBarDescription')}
                  <progress id="exportProgressBar" value="0" max="${data.length}"/>
                </label>
              </p>
              <label id="exportNumber">0</label>
              <label>${getString('of')} ${data.length}</label>
              <br>
              <label>${getString('exportTimeRemainingDescription')}</label>
              <label id="exportTimeRemaining">???</label>
              <label>s</label>
        `,
        width: 'auto',
        title: getString('bulkExportProgressTitle'),
        buttons: {
          OK: {
            text: getString('bulkExportProgressButtonText'),
            title: getString('bulkExportProgressButtonTitle'),
            click () {
              saveState(data, type, i);
              clearInterval(window.plugin.pnav.timer);
              window.plugin.pnav.timer = null;
              // eslint-disable-next-line no-underscore-dangle
              if (window._current_highlighter === getString('portalHighlighterName')) { // re-validate highlighter if it is enabled.
                window.changePortalHighlights(getString('portalHighlighterName'));
              }
              dialog.dialog('close');
            }
          }
        }
      });
      let thisDialog = dialog.parent();

      $('.ui-button.ui-dialog-titlebar-button-close', thisDialog).on(
        'click',
        function () {
          saveState(data, type, i);
          clearInterval(window.plugin.pnav.timer);
          window.plugin.pnav.timer = null;
        }
      );
      if (data.length > 0) {
        normalExport(data, type, dialog, 0).then((result) => {
          i = result;
        }); // start immediately instead of waiting 2 seconds.
      } else {
        updateExportDialog(thisDialog, 0, 0, 0);
      }
    } else {
      console.error('Bulk Export already running!');
    }
  };

  /**
   * One Export step when the Companion Discord bot should be used.
   * @param {pogoToolsData[]} data all locations that need exporting
   * @param {string} type the location type of the given data
   */
  function botExport (data, type) {

    /** @type {portalData[]} */
    let exportdata = [...data];
    exportdata.forEach((element) => {
      element.type = type; // convert pogoToolsData to portalData
    });
    let formData = new FormData();
    let date = new Date();
    formData.append('content', `<@${companionId}> cm`);
    formData.append('username', window.plugin.pnav.settings.name);
    formData.append('file', new Blob([JSON.stringify(exportdata, null, 2)], {type: 'application/json'}), `creations-${window.plugin.pnav.settings.name}-${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}_${date.getUTCHours()}:${date.getUTCMinutes()}.json`);
    $.ajax({
      method: 'POST',
      url: window.plugin.pnav.settings.webhookUrl,
      contentType: false,
      processData: false,
      data: formData,
      error (jgXHR, textStatus, errorThrown) {
        console.error(`${textStatus} - ${errorThrown}`);
      },
      success () {
        saveState(data, type);
        // eslint-disable-next-line no-underscore-dangle
        if (window._current_highlighter === getString('portalHighlighterName')) { // re-validate highlighter if it is enabled.
          window.changePortalHighlights(getString('portalHighlighterName'));
        }
      }
    });
  }

  /**
   * One Export step when only the WebHook should be used.
   * @async
   * @param {object} data all locations that need exporting
   * @param {string} type the location type of the given data
   * @param {HTMLElement} dialog the dialog of the bulk export
   * @param {number} i the current index
   * @return {number} the new index after the export step (normally old index + 1).
   */
  async function normalExport (data, type, dialog, i) {
    if (i % 10 == 0) {
      saveState(data, type, i); // sometimes save the state in case someone exits IITC Mobile without using the Back Button
    }
    let entry = data[i];
    let lat = entry.lat;
    let lng = entry.lng;
    // escaping Hyphens in Portal Names
    let name = entry.name;
    let prefix = `<@${pNavId}> `;
    let ex = Boolean(entry.isEx);
    let options = ex ? ' "ex_eligible: 1"' : '';
    let content = `${prefix}create poi ${type} «${name}» ${lat} ${lng}${options}`;
    const params = {
      username: window.plugin.pnav.settings.name,
      avatar_url: '',
      content
    };
    let success = await fetch(window.plugin.pnav.settings.webhookUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(params)
    })
      .then((response) => {
        if (!response.ok) {
          console.error(`HTTP Error: ${response.status} - ${response.statusText}${response.bodyUsed ? `; body: ${response.body}` : ''}`);
        }
        return response.ok;
      })
      .catch((error) => {
        console.error(error);
        return false;
      });
    if (success) {
      updateExportDialog(dialog, i + 1, Object.keys(data).length, (Object.keys(data).length - (i + 1)) * (wait / 1000));
      return i + 1; // return the new i (old i + 1)!
    } else {
      return i;
    }
  }

  /**
   * assembles the edit data for the companion bot and sends it.
   * @param {editData[]} [changes] - optional list of changes that should be transferred.
   */
  function botEdit (changes) {
    if (window.plugin.pnav.settings.webhookUrl === null) {
      console.error('no Webhook URL present!');
      return;
    }
    if (typeof changes == 'undefined') {
      changes = checkForModifications();
    }
    if (changes.length == 0) {
      console.log('nothing to export!');
      return;
    }
    let data = new FormData();
    let date = new Date();
    data.append('content', `<@${companionId}> e`);
    data.append('username', window.plugin.pnav.settings.name);
    data.append('file', new Blob([JSON.stringify(changes, null, 2)], {type: 'application/json'}), `edits-${window.plugin.pnav.settings.name}-${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}_${date.getUTCHours()}:${date.getUTCMinutes()}.json`);
    $.ajax({
      method: 'POST',
      url: window.plugin.pnav.settings.webhookUrl,
      contentType: false,
      processData: false,
      data,
      error (jgXHR, textStatus, errorThrown) {
        console.error(`${textStatus} - ${errorThrown}`);
      },
      success () {
        updateDone(changes);
        // eslint-disable-next-line no-underscore-dangle
        if (window._current_highlighter === getString('portalHighlighterName')) { // re-validate highlighter if it is enabled.
          window.changePortalHighlights(getString('portalHighlighterName'));
        }
      }
    });
  }

  /**
   * updates the bulk export dialog (called by the specific export functions).
   * @param {HTMLElement} dialog the export dialog
   * @param {number} cur current export state
   * @param {number} max count of all elements that need exporting
   * @param {number} time remaining time
   */
  function updateExportDialog (dialog, cur, max, time) {
    if ($('#exportProgressBar', dialog)) {
      $('#exportProgressBar', dialog).val(cur);
    }
    if ($('#exportNumber', dialog)) {
      $('#exportNumber', dialog).text(cur);
    }
    if ($('#exportTimeRemaining', dialog)) {
      $('#exportTimeRemaining', dialog).text(time);
    }
    if (cur >= max) {
      $('#exportState', dialog).text(getString('exportStateTextReady'));
      const okayButton = $('.ui-button', dialog.parentElement).not('.ui-dialog-titlebar-button');
      okayButton.text('OK');
      okayButton.prop('title', '');
    }
  }

  /*
   *the idea of the following function was taken from https://stackoverflow.com/a/14561433
   *by User talkol (https://stackoverflow.com/users/1025458/talkol).
   *The License is CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)
   *The Code was slightly adapted.
   */
  /**
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @return {number}
   */
  function checkDistance (lat1, lon1, lat2, lon2) {
    const R = 6371;
    let x1 = lat2 - lat1;
    let dLat = (x1 * Math.PI) / 180;
    let x2 = lon2 - lon1;
    let dLon = (x2 * Math.PI) / 180;
    let a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let d = R * c;
    return d;
  }

  /**
   * @param {string} id - the id of the input field to copy from
   * @return {bool} - returns if copying was successful
   */
  function copyfieldvalue (id) {
    let field = document.getElementById(id);
    field.focus();
    field.setSelectionRange(0, field.value.length);
    field.select();
    return copySelectionText();
  }

  function copySelectionText () {
    let copysuccess;
    try {
      copysuccess = document.execCommand('copy');
    } catch (e) {
      copysuccess = false;
    }
    return copysuccess;
  }

  // source: Oscar Zanota on Dev.to (https://dev.to/oskarcodes/send-automated-discord-messages-through-webhooks-using-javascript-1p01)
  function sendMessage (msg) {
    let params = {
      username: window.plugin.pnav.settings.name,
      avatar_url: '',
      content: msg
    };
    request.open('POST', window.plugin.pnav.settings.webhookUrl);
    request.setRequestHeader('Content-type', 'application/json');
    request.send(JSON.stringify(params), false);
  }

  function modifyPortalDetails (data) {
    const detailsObserver = new MutationObserver(waitForPogoButtons);
    const statusObserver = new MutationObserver(waitForPogoStatus);
    const send = Boolean(window.plugin.pnav.settings.webhookUrl);
    console.log(data);
    let guid = data.guid;
    selectedGuid = guid;
    if (!window.plugin.pogo) {
      window.removeHook('portalDetailsUpdated', modifyPortalDetails);
      setTimeout(function () {
        $('#portaldetails').append(`
        <div id="PNav" style="color:#fff">
          <Label>
            <input type="radio" checked name="type" value="none" id="PNavNone"/>
            ${getString('PNavNoneDescription')}
          </label>
          <Label>
            <input type="radio" name="type" value="pokestop" id="PNavStop"/>
            ${getString('PNavStopDescription')}
          </label>
          <Label>
            <input type="radio" name="type" value="gym" id="PNavGym"/>
            ${getString('PNavGymDescription')}
          </label>
          <Label>
            <input type="radio" name="type" value="ex" id="PNavEx"/>
            ${getString('PNavExDescription')}
          </label>
          <a style="${window.isSmartphone() ? ';padding:5px;margin-top:3px;margin-bottom:3px;border:2px outset #20A8B1' : ''}" title="${getString('PogoButtonsTitle', {send})}" onclick="window.plugin.pnav.copy();return false;" accesskey="p">
            ${getString('PogoButtonsText', {send})}
          </a>
        </div>
      `);
        if (pNavData.pokestop[selectedGuid]) {
          $('#PNavStop').prop('checked', true);
        } else if (pNavData.gym[selectedGuid]) {
          if (pNavData.gym[selectedGuid].isEx) {
            $('#PNavEx').prop('checked', true);
          } else {
            $('#PNavGym').prop('checked', true);
          }
        }
        window.addHook('portalDetailsUpdated', modifyPortalDetails);
      }, 0);
    } else {
      // wait for the Pogo Buttons to get added
      detailsObserver.observe($('#portaldetails')[0], {'childList': true});
      // if running on mobile, also wait for the Buttons in Status bar to get added and add it there.
      if (window.isSmartphone()) {
        statusObserver.observe($('.PogoStatus')[0], {'childList': true});
      }
    }
  }

  function waitForPogoButtons (mutationList, invokingObserver) {
    mutationList.forEach(function (mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.className == 'PogoButtons') {
            $(node).after(`
             <a style="position:absolute;right:5px" title="${getString('PogoButtonsTitle', {send: Boolean(window.plugin.pnav.settings.webhookUrl)})}" onclick="window.plugin.pnav.copy();return false;" accesskey="p">${getString('PogoButtonsText', {send: Boolean(window.plugin.pnav.settings.webhookUrl)})}</a>
             `);
            $(node).css('display', 'inline');
            // we don't need to look for the class anymore because we just found what we wanted ;-)
            invokingObserver.disconnect();
          }
        });
      }
    });
  }

  function waitForPogoStatus (mutationList, invokingObserver) {
    mutationList.forEach(function (mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        $('.PogoStatus').append(`<a style="position:absolute;right:5px" onclick="window.plugin.pnav.copy();return false;">${getString('PogoButtonsText', {send: Boolean(window.plugin.pnav.settings.webhookUrl)})}</a>`);
        invokingObserver.disconnect();
      }
    });
  }

  let setup = function () {
    $('head').append(/* html */`<style>
      .Button {
        border: 1px solid #FFCE00;
        padding: 2px;
        background-color: rgba(8, 48, 78, 0.9);
        min-width: 40px;
        color: #FFCE00;
        text-decoration: none!important;
        cursor: default;
      }
      .form-group {
        margin-bottom: 10px;
      }
    </style>`);
    if (localStorage['plugin-pnav-settings']) {
      let savedSettings = JSON.parse(localStorage.getItem('plugin-pnav-settings'));
      Object.keys(window.plugin.pnav.settings).forEach((key) => {
        if (typeof (savedSettings[key]) !== 'undefined') {
          window.plugin.pnav.settings[key] = savedSettings[key];
        }
      });
      localStorage['plugin-pnav-settings'] = JSON.stringify(window.plugin.pnav.settings);
      // window.plugin.pnav.settings = JSON.parse(localStorage.getItem('plugin-pnav-settings'));
    }
    if (!window.plugin.pnav.settings.language) {
      window.plugin.pnav.settings.language = detectLanguage();
      localStorage['plugin-pnav-settings'] = JSON.stringify(window.plugin.pnav.settings);
    }
    if (localStorage['plugin-pnav-done-pokestop']) {
      pNavData.pokestop = JSON.parse(localStorage.getItem('plugin-pnav-done-pokestop'));
    }
    if (localStorage['plugin-pnav-done-gym']) {
      pNavData.gym = JSON.parse(localStorage.getItem('plugin-pnav-done-gym'));
    }
    $('#toolbox').append(`<a title="${getString('pokeNavSettingsTitle')}" onclick="if(!window.plugin.pnav.timer){window.plugin.pnav.showSettings();}return false;" accesskey="s">${getString('pokeNavSettingsText')}</a>`);
    $('body').prepend('<input id="copyInput" style="position: absolute;"></input>');
    lCommBounds = new L.LayerGroup();
    if (window.plugin.pnav.settings.lat && window.plugin.pnav.settings.lng && window.plugin.pnav.settings.radius) {
      let commCircle = L.circle(L.latLng([
        window.plugin.pnav.settings.lat,
        window.plugin.pnav.settings.lng
      ]), {radius: window.plugin.pnav.settings.radius * 1000,
        interactive: false,
        fillOpacity: 0.1,
        color: '#000000'});
      lCommBounds.addLayer(commCircle);
    }
    window.addLayerGroup(getString('lCommBoundsName'), lCommBounds);
    window.addPortalHighlighter(getString('portalHighlighterName'), window.plugin.pnav.highlight);
    let isLinksDisplayed = window.isLayerGroupDisplayed('Links', false);
    let isFieldsDisplayed = window.isLayerGroupDisplayed('Fields', false);
    $('#portal_highlight_select').on('change', function () {
      // eslint-disable-next-line no-underscore-dangle
      if (window._current_highlighter === getString('portalHighlighterName')) {
        isLinksDisplayed = window.isLayerGroupDisplayed('Links', false);
        isFieldsDisplayed = window.isLayerGroupDisplayed('Fields', false);
        // eslint-disable-next-line no-underscore-dangle
        const layers = window.layerChooser._layers;
        const layerIds = Object.keys(layers);
        layerIds.forEach(function (id) {
          const layer = layers[id];
          if (layer.name === 'Links' || layer.name === 'Fields') {
            window.map.removeLayer(layer.layer);
          } else if (((/Level . Portals/).test(layer.name) ||
                      layer.name === 'Resistance' ||
                      layer.name === 'Enlightened' ||
                      layer.name === 'Unclaimed/Placeholder Portals') &&
                      !window.isLayerGroupDisplayed(layer.name, false)) {
            window.map.addLayer(layer.layer);
          }
        });
      } else if (!window.isLayerGroupDisplayed('Links', false) && !window.isLayerGroupDisplayed('Fields', false)) {
        // eslint-disable-next-line no-underscore-dangle
        const layers = window.layerChooser._layers;
        const layerIds = Object.keys(layers);
        layerIds.forEach(function (id) {
          const layer = layers[id];
          if ((layer.name === 'Links' && isLinksDisplayed) || (layer.name === 'Fields' && isFieldsDisplayed)) {
            window.map.addLayer(layer.layer);
          }
        });
        isLinksDisplayed = false;
        isFieldsDisplayed = false;
      }
    });
    window.addHook('portalDetailsUpdated', modifyPortalDetails);
  };

  /* eslint-disable no-var*/

  // PLUGIN END //////////////////////////////////////////////////////////

  // add the script info data to the function as a property
  setup.info = plugin_info;
  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  // if IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup();
}

/*
 * wrapper end
 * inject code into site context
 */
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };
}
script.appendChild(document.createTextNode(`(${wrapper})(${JSON.stringify(info)});`));
(document.body || document.head || document.documentElement).appendChild(script);
