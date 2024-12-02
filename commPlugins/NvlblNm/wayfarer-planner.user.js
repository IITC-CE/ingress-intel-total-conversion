// ==UserScript==
// @author         NvlblNm
// @id             wayfarer-planner@NvlblNm
// @name           Wayfarer Planner
// @category       Layer
// @version        1.181
// @namespace      https://gitlab.com/NvlblNm/wayfarer/
// @downloadURL    https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/NvlblNm/wayfarer-planner.user.js
// @updateURL      https://raw.githubusercontent.com/IITC-CE/Community-plugins/master/dist/NvlblNm/wayfarer-planner.meta.js
// @homepageURL    https://gitlab.com/NvlblNm/wayfarer/
// @description    Place markers on the map for your candidates in Wayfarer.
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

/* forked from https://github.com/Wintervorst/iitc/raw/master/plugins/totalrecon/ */

/* eslint-env es6 */
/* eslint no-var: "error" */
/* globals L, map */
/* globals GM_info, $, dialog */

function wrapper(pluginInfo) {
    // eslint-disable-line no-extra-semi
    'use strict'

    // PLUGIN START ///////////////////////////////////////////////////////

    let editmarker = null
    let isPlacingMarkers = false

    let markercollection = []
    let plottedmarkers = {}
    let plottedtitles = {}
    let plottedsubmitrange = {}
    let plottedinteractrange = {}
    let plottedcells = {}

    // Define the layers created by the plugin, one for each marker status
    const mapLayers = {
        potential: {
            color: 'grey',
            title: 'Potential'
        },
        held: {
            color: 'yellow',
            title: 'On hold'
        },
        submitted: {
            color: 'orange',
            title: 'Submitted'
        },
        voting: {
            color: 'brown',
            title: 'Voting'
        },
        NIANTIC_REVIEW: {
            color: 'pink',
            title: 'Niantic Review'
        },
        live: {
            color: 'green',
            title: 'Accepted'
        },
        rejected: {
            color: 'red',
            title: 'Rejected'
        },
        appealed: {
            color: 'black',
            title: 'Appealed'
        },
        potentialedit: {
            color: 'cornflowerblue',
            title: 'Potential location edit'
        },
        sentedit: {
            color: 'purple',
            title: 'Sent location edit'
        }
    }

    const defaultSettings = {
        showTitles: true,
        showRadius: false,
        showInteractionRadius: false,
        showVotingProximity: false,
        scriptURL: '',
        disableDraggingMarkers: false,
        enableCoordinatesEdit: true,
        enableImagePreview: true,

        // Default settings for map displays.
        // Colors are in hexadecimal for compatibiltiy with color picker
        submitRadiusColor: '#000000',
        submitRadiusOpacity: 1.0,
        submitRadiusFillColor: '#808080',
        submitRadiusFillOpacity: 0.4,
        interactRadiusColor: '#808080',
        interactRadiusOpacity: 1.0,
        interactRadiusFillColor: '#000000',
        interactRadiusFillOpacity: 0.0,
        votingProximityColor: '#000000',
        votingProximityOpacity: 0.5,
        votingProximityFillColor: '#FFA500',
        votingProximityFillOpacity: 0.3,

        // Creates arrays containing the marker types and radius settings.
        // This prevents needing code for checking whether marker arrays exist throughout.
        // Color is not included in settings by default unless the user changes color.
        markers: {
            potential: {
                submitRadius: true,
                interactRadius: true
            },
            held: {
                submitRadius: true,
                interactRadius: true
            },
            submitted: {
                submitRadius: true,
                interactRadius: true
            },
            voting: {
                submitRadius: true,
                interactRadius: true
            },
            NIANTIC_REVIEW: {
                submitRadius: true,
                interactRadius: true
            },
            live: {
                submitRadius: true,
                interactRadius: true
            },
            rejected: {
                submitRadius: true,
                interactRadius: true
            },
            appealed: {
                submitRadius: true,
                interactRadius: true
            },
            potentialedit: {
                submitRadius: true,
                interactRadius: true
            },
            sentedit: {
                submitRadius: true,
                interactRadius: true
            }
        }
    }

    let settings = defaultSettings

    function saveSettings() {
        localStorage.wayfarer_planner_settings = JSON.stringify(settings)
    }

    function loadSettings() {
        const tmp = localStorage.wayfarer_planner_settings
        if (!tmp) {
            upgradeSettings()
            return
        }

        try {
            settings = Object.assign({}, settings, JSON.parse(tmp))
        } catch (e) {
            // eslint-disable-line no-empty
        }
    }

    // importing from totalrecon_settings will be removed after a little while
    function upgradeSettings() {
        const tmp = localStorage.totalrecon_settings
        if (!tmp) {
            return
        }

        try {
            settings = JSON.parse(tmp)
        } catch (e) {
            // eslint-disable-line no-empty
        }
        saveSettings()
        localStorage.removeItem('totalrecon_settings')
    }

    function getStoredData() {
        const url = settings.scriptURL
        if (!url) {
            markercollection = []
            drawMarkers()
            return
        }

        $.ajax({
            url,
            type: 'GET',
            dataType: 'text',
            success: function (data, status, header) {
                try {
                    markercollection = JSON.parse(data)
                } catch (e) {
                    console.log(
                        'Wayfarer Planner. Exception parsing response: ',
                        e
                    ) // eslint-disable-line no-console
                    alert('Wayfarer Planner. Exception parsing response.')
                    return
                }
                processCustomMarkers()
                initializeLayers()
                drawMarkers()
            },
            error: function (x, y, z) {
                console.log('Wayfarer Planner. Error message: ', x, y, z) // eslint-disable-line no-console
                alert(
                    "Wayfarer Planner. Failed to retrieve data from the scriptURL.\r\nVerify that you're using the right URL and that you don't use any extension that blocks access to google."
                )
            }
        })
    }

    function processCustomMarkers() {
        // Add any unexpected marker types to mapLayers
        const mapLayersSet = new Set(Object.keys(mapLayers))
        const newMarkers = markercollection.filter(
            (marker) => !mapLayersSet.has(marker.status)
        )
        for (const marker of newMarkers) {
            const markerStatus = marker.status
            mapLayers[markerStatus] = {
                title:
                    markerStatus.charAt(0).toUpperCase() + markerStatus.slice(1)
            }
        }

        // Define a list of default colors for new markers.
        const colorList = [
            '#27AE60',
            '#73C6B6',
            '#AEB6BF',
            '#EDBB99',
            '#AF601A',
            '#CB4335',
            '#F1948A',
            '#2874A6',
            '#D6EAF8',
            '#239B56',
            '#909497',
            '#FAE5D3',
            '#85C1E9',
            '#9B59B6',
            '#E67E22',
            '#2980B9',
            '#F2F3F4',
            '#F1C40F',
            '#BB8FCE',
            '#FAD7A0',
            '#C0392B',
            '#F6DDCC',
            '#1ABC9C',
            '#117A65',
            '#283747',
            '#B7950B',
            '#6C3483',
            '#D0ECE7',
            '#82E0AA'
        ]
        let colorListIndex = 0

        for (const markerId in mapLayers) {
            // Add custom markers to settings if they weren't already in there.
            if (!settings.markers[markerId]) {
                settings.markers[markerId] = {
                    submitRadius: true,
                    interactRadius: true
                }
            }

            // Assign a default color to each custom marker.
            if (!mapLayers[markerId].color) {
                if (colorListIndex === colorList.length) {
                    colorListIndex = 0
                }
                mapLayers[markerId].color = colorList[colorListIndex]
                colorListIndex++
            }

            // Overwrite default colors with saved color settings if they exist.
            mapLayers[markerId].color =
                settings.markers[markerId].color || mapLayers[markerId].color
        }
    }

    function initializeLayers() {
        Object.values(mapLayers).forEach((data) => {
            if (!data.initialized) {
                const layer = new L.featureGroup()
                data.layer = layer
                window.addLayerGroup('Wayfarer - ' + data.title, layer, true)
                layer.on('click', (e) => {
                    markerClicked(e)
                })
                data.initialized = true
            }
        })
    }

    function drawMarker(candidate) {
        if (
            candidate !== undefined &&
            candidate.lat !== '' &&
            candidate.lng !== ''
        ) {
            addMarkerToLayer(candidate)
            addTitleToLayer(candidate)
            addCircleToLayer(candidate)
            addVotingProximity(candidate)
        }
    }

    function addCircleToLayer(candidate) {
        if (
            settings.showInteractionRadius &&
            settings.markers[candidate.status].interactRadius
        ) {
            const latlng = L.latLng(candidate.lat, candidate.lng)

            const circleOptions = {
                color: settings.interactRadiusColor,
                opacity: settings.interactRadiusOpacity,
                fillColor: settings.interactRadiusFillColor,
                fillOpacity: settings.interactRadiusFillOpacity,
                weight: 1,
                clickable: false,
                interactive: false
            }
            const range = 80

            const circle = new L.Circle(latlng, range, circleOptions)
            const existingMarker = plottedmarkers[candidate.id]
            existingMarker.layer.addLayer(circle)
            plottedinteractrange[candidate.id] = circle
        }

        // Draw the 20 metre submit radius
        if (
            settings.showRadius &&
            settings.markers[candidate.status].submitRadius
        ) {
            const latlng = L.latLng(candidate.lat, candidate.lng)

            const circleOptions = {
                color: settings.submitRadiusColor,
                opacity: settings.submitRadiusOpacity,
                fillColor: settings.submitRadiusFillColor,
                fillOpacity: settings.submitRadiusFillOpacity,
                weight: 1,
                clickable: false,
                interactive: false
            }
            const range = 20

            const circle = new L.Circle(latlng, range, circleOptions)
            const existingMarker = plottedmarkers[candidate.id]
            existingMarker.layer.addLayer(circle)
            plottedsubmitrange[candidate.id] = circle
        }
    }

    function removeExistingCircle(guid) {
        const existingCircle = plottedsubmitrange[guid]
        if (existingCircle !== undefined) {
            const existingMarker = plottedmarkers[guid]
            existingMarker.layer.removeLayer(existingCircle)
            delete plottedsubmitrange[guid]
        }
        const existingInteractCircle = plottedinteractrange[guid]
        if (existingInteractCircle !== undefined) {
            const existingMarker = plottedmarkers[guid]
            existingMarker.layer.removeLayer(existingInteractCircle)
            delete plottedinteractrange[guid]
        }
    }

    function addTitleToLayer(candidate) {
        if (settings.showTitles) {
            const title = candidate.title
            if (title !== '') {
                const portalLatLng = L.latLng(candidate.lat, candidate.lng)
                const titleMarker = L.marker(portalLatLng, {
                    icon: L.divIcon({
                        className: 'wayfarer-planner-name',
                        iconAnchor: [100, 5],
                        iconSize: [200, 10],
                        html: title
                    }),
                    data: candidate
                })
                const existingMarker = plottedmarkers[candidate.id]
                existingMarker.layer.addLayer(titleMarker)

                plottedtitles[candidate.id] = titleMarker
            }
        }
    }

    function removeExistingTitle(guid) {
        const existingTitle = plottedtitles[guid]
        if (existingTitle !== undefined) {
            const existingMarker = plottedmarkers[guid]
            existingMarker.layer.removeLayer(existingTitle)
            delete plottedtitles[guid]
        }
    }

    function addVotingProximity(candidate) {
        if (settings.showVotingProximity && candidate.status === 'voting') {
            const cell = S2.S2Cell.FromLatLng(
                { lat: candidate.lat, lng: candidate.lng },
                17
            )
            const surrounding = cell.getSurrounding()
            surrounding.push(cell)

            for (let i = 0; i < surrounding.length; i++) {
                const cellId = surrounding[i].toString()
                if (!plottedcells[cellId]) {
                    plottedcells[cellId] = { candidateIds: [], polygon: null }
                    const vertexes = surrounding[i].getCornerLatLngs()
                    const polygon = L.polygon(vertexes, {
                        color: settings.votingProximityColor,
                        opacity: settings.votingProximityOpacity,
                        fillColor: settings.votingProximityFillColor,
                        fillOpacity: settings.votingProximityFillOpacity,
                        weight: 1
                    })
                    plottedcells[cellId].polygon = polygon
                    polygon.addTo(map)
                }
                if (
                    plottedcells[cellId].candidateIds.indexOf(candidate.id) ===
                    -1
                ) {
                    plottedcells[cellId].candidateIds.push(candidate.id)
                }
            }
        }
    }

    function removeExistingVotingProximity(guid) {
        Object.entries(plottedcells).forEach(
            ([cellId, { candidateIds, polygon }]) => {
                plottedcells[cellId].candidateIds = candidateIds.filter(
                    (id) => id !== guid
                )
                if (plottedcells[cellId].candidateIds.length === 0) {
                    map.removeLayer(polygon)
                    delete plottedcells[cellId]
                }
            }
        )
    }

    function removeExistingMarker(guid) {
        const existingMarker = plottedmarkers[guid]
        if (existingMarker !== undefined) {
            existingMarker.layer.removeLayer(existingMarker.marker)
            removeExistingTitle(guid)
            removeExistingCircle(guid)
            removeExistingVotingProximity(guid)
        }
    }

    function addMarkerToLayer(candidate) {
        removeExistingMarker(candidate.id)

        const portalLatLng = L.latLng(candidate.lat, candidate.lng)

        const layerData = mapLayers[candidate.status]
        const markerColor = layerData.color
        const markerLayer = layerData.layer
        let draggable = true
        if (settings.disableDraggingMarkers) {
            draggable = false
        }

        const marker = createGenericMarker(portalLatLng, markerColor, {
            title: candidate.title,
            id: candidate.id,
            data: candidate,
            draggable
        })

        marker.on('dragend', function (e) {
            const data = e.target.options.data
            const latlng = marker.getLatLng()
            data.lat = latlng.lat
            data.lng = latlng.lng

            drawInputPopop(latlng, data)
        })

        marker.on('dragstart', function (e) {
            const guid = e.target.options.data.id
            removeExistingTitle(guid)
            removeExistingCircle(guid)
        })

        markerLayer.addLayer(marker)
        plottedmarkers[candidate.id] = { marker, layer: markerLayer }
    }

    function clearAllLayers() {
        Object.values(mapLayers).forEach((data) => data.layer.clearLayers())
        Object.values(plottedcells).forEach((data) =>
            map.removeLayer(data.polygon)
        )

        /* clear marker storage */
        plottedmarkers = {}
        plottedtitles = {}
        plottedsubmitrange = {}
        plottedinteractrange = {}
        plottedcells = {}
    }

    function drawMarkers() {
        clearAllLayers()
        markercollection.forEach(drawMarker)
    }

    function onMapClick(e) {
        if (isPlacingMarkers) {
            if (editmarker != null) {
                map.removeLayer(editmarker)
            }

            const marker = createGenericMarker(e.latlng, 'pink', {
                title: 'Place your mark!'
            })

            editmarker = marker
            marker.addTo(map)

            drawInputPopop(e.latlng)
        }
    }

    function drawInputPopop(latlng, markerData) {
        const formpopup = L.popup()

        let title = ''
        let description = ''
        let id = ''
        let submitteddate = ''
        let nickname = ''
        let lat = ''
        let lng = ''
        let status = 'potential'
        let imageUrl = ''

        if (markerData !== undefined) {
            id = markerData.id
            title = markerData.title
            description = markerData.description
            submitteddate = markerData.submitteddate
            nickname = markerData.nickname
            status = markerData.status
            imageUrl = markerData.candidateimageurl
            lat = parseFloat(markerData.lat).toFixed(6)
            lng = parseFloat(markerData.lng).toFixed(6)
        } else {
            lat = latlng.lat.toFixed(6)
            lng = latlng.lng.toFixed(6)
        }

        formpopup.setLatLng(latlng)

        const options = Object.keys(mapLayers)
            .map(
                (id) =>
                    '<option value="' +
                    id +
                    '"' +
                    (id === status ? ' selected="selected"' : '') +
                    '>' +
                    mapLayers[id].title +
                    '</option>'
            )
            .join('')
        let coordinates = `<input name="lat" type="hidden" value="${lat}">
            <input name="lng" type="hidden" value="${lng}">`
        if (settings.enableCoordinatesEdit) {
            coordinates = `<label>Latitude
                <input name="lat" type="text" autocomplete="off" value="${lat}">
                </label>
                <label>Longitude
                <input name="lng" type="text" autocomplete="off" value="${lng}">
                </label>`
        }
        let image = ''
        let largeImageUrl = imageUrl
        if (imageUrl.includes('googleusercontent')) {
            largeImageUrl = largeImageUrl.replace(/(=.*)?$/, '=s0')
            imageUrl = imageUrl.replace(/(=.*)?$/, '=s200')
        }
        if (
            imageUrl !== '' &&
            imageUrl !== undefined &&
            settings.enableImagePreview
        ) {
            image = `<a href="${largeImageUrl}" target="_blank" class="imagePreviewContainer"><img class="imagePreview loading" src="${imageUrl}"></a>`
        }

        let formContent = `<div class="wayfarer-planner-popup"><form id="submit-to-wayfarer">
            <label>Status
            <select name="status">${options}</select>
            </label>
            <label>Title
            <input name="title" type="text" autocomplete="off" placeholder="Title (required)" required value="${title}">
            </label>
            <label>Description
            <input name="description" type="text" autocomplete="off" placeholder="Description" value="${description}">
            </label>
            ${image}
            <div class='wayfarer-expander' title='Click to expand additional fields'>»</div>
            <div class='wayfarer-extraData'>
            ${coordinates}
            <label>Submitter
            <input name="submitter" type="text" value="${nickname}" disabled>
            </label>
            <label>Submitted date
            <input name="submitteddate" type="text" autocomplete="off" placeholder="dd-mm-jjjj" value="${submitteddate}">
            </label>
            <label>Image URL
            <input name="candidateimageurl" type="text" autocomplete="off" placeholder="http://?.googleusercontent.com/***" value="${imageUrl}">
            </label>
            </div>
            <input name="id" type="hidden" value="${id}">
            <input name="nickname" type="hidden" value="${window.PLAYER.nickname}">
            <button type="submit" id='wayfarer-submit'>Send</button>
            </form>`

        if (id !== '') {
            formContent +=
                '<a style="padding:4px; display: inline-block;" id="deletePortalCandidate">Delete 🗑️</a>'
        }

        if (
            imageUrl !== '' &&
            imageUrl !== undefined &&
            !settings.enableImagePreview
        ) {
            formContent +=
                ' <a href="' +
                largeImageUrl +
                '" style="padding:4px; float:right;" target="_blank">Image</a>'
        }
        const align =
            id !== ''
                ? 'float: right'
                : 'box-sizing: border-box; text-align: right; display: inline-block; width: 100%'
        formContent += ` <a href="https://www.google.com/maps?layer=c&cbll=${lat},${lng}" style="padding:4px; ${align};" target="_blank">Street View</a>`

        formpopup.setContent(formContent + '</div>')
        formpopup.openOn(map)

        const deleteLink = formpopup._contentNode.querySelector(
            '#deletePortalCandidate'
        )
        if (deleteLink != null) {
            deleteLink.addEventListener('click', (e) =>
                confirmDeleteCandidate(e, id)
            )
        }
        const expander =
            formpopup._contentNode.querySelector('.wayfarer-expander')
        expander.addEventListener('click', function () {
            expander.parentNode.classList.toggle('wayfarer__expanded')
        })
        const previewImageElement = document.querySelector('.loading')
        previewImageElement.onload = function () {
            previewImageElement.classList.remove('loading')
        }
    }

    function confirmDeleteCandidate(e, id) {
        e.preventDefault()

        if (!confirm('Do you want to remove this candidate?')) {
            return
        }

        const formData = new FormData()
        formData.append('status', 'delete')
        formData.append('id', id)

        $.ajax({
            url: settings.scriptURL,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (data, status, header) {
                removeExistingMarker(id)
                for (let i = 0; i < markercollection.length; i++) {
                    if (markercollection[i].id === id) {
                        markercollection.splice(i, 1)
                        break
                    }
                }
                map.closePopup()
            },
            error: function (x, y, z) {
                console.log('Wayfarer Planner. Error message: ', x, y, z) // eslint-disable-line no-console
                alert('Wayfarer Planner. Failed to send data to the scriptURL')
            }
        })
    }

    function markerClicked(event) {
        // bind data to edit form
        if (editmarker != null) {
            map.removeLayer(editmarker)
            editmarker = null
        }
        drawInputPopop(event.layer.getLatLng(), event.layer.options.data)
    }

    function getGenericMarkerSvg(color, markerClassName) {
        const markerTemplate = `<?xml version="1.0" encoding="UTF-8"?>
            <svg xmlns="http://www.w3.org/2000/svg" baseProfile="full" viewBox="0 0 25 41" width="25" height="41" ${markerClassName}>
                <path d="M19.4,3.1c-3.3-3.3-6.1-3.3-6.9-3.1c-0.6,0-3.7,0-6.9,3.1c-4,4-1.3,9.4-1.3,9.4s5.6,14.6,6.3,16.3c0.6,1.2,1.3,1.5,1.7,1.5c0,0,0,0,0.2,0h0.2c0.4,0,1.2-0.4,1.7-1.5c0.8-1.7,6.3-16.3,6.3-16.3S23.5,7.2,19.4,3.1z M13.1,12.4c-2.3,0.4-4.4-1.5-4-4c0.2-1.3,1.3-2.5,2.9-2.9c2.3-0.4,4.4,1.5,4,4C15.6,11,14.4,12.2,13.1,12.4z" fill="%COLOR%" stroke="#fff"/>
                <path d="M12.5,34.1c1.9,0,3.5,1.5,3.5,3.5c0,1.9-1.5,3.5-3.5,3.5S9,39.5,9,37.5c0-1.2,0.6-2.2,1.5-2.9 C11.1,34.3,11.8,34.1,12.5,34.1z" fill="%COLOR%" stroke="#fff"/>
            </svg>`

        return markerTemplate.replace(/%COLOR%/g, color)
    }

    function getGenericMarkerIcon(color, className) {
        return L.divIcon({
            iconSize: new L.Point(25, 41),
            iconAnchor: new L.Point(12, 41),
            html: getGenericMarkerSvg(color, ''),
            className: className || 'leaflet-iitc-divicon-generic-marker'
        })
    }

    function createGenericMarker(ll, color, options) {
        options = options || {}

        const markerOpt = $.extend(
            {
                icon: getGenericMarkerIcon(color || '#a24ac3')
            },
            options
        )

        return L.marker(ll, markerOpt)
    }

    function editMarkerColors() {
        // Create the HTML code for the marker options.
        let html = ''

        const hideCheckboxes = !(
            settings.showRadius || settings.showInteractionRadius
        )
        const firstColumnWidth = hideCheckboxes ? '100px' : '70px'
        const boxWidth = hideCheckboxes ? '185px' : '300px'

        // Through all markers that have been loaded. Generate one row per marker.
        const keys = Object.keys(mapLayers)
        for (let i = 0; i < keys.length; i++) {
            const markerId = keys[i]
            const markerDetails = mapLayers[markerId]
            let colorValue = markerDetails.color
            const submitRadius = settings.markers[markerId].submitRadius
            const interactRadius = settings.markers[markerId].interactRadius

            // Make sure that the color is in #rrggbb format for color picker.
            const ctx = document.createElement('canvas').getContext('2d')
            ctx.fillStyle = colorValue
            colorValue = ctx.fillStyle

            html += `<p class="marker-colors">
            <div class="options-row">
                <div class="options-label-col" style="width: ${firstColumnWidth};">
                    <div class="label-title">${markerDetails.title}:
                </div>
            </div>
            <div class="options-marker-col">
                <div id='marker.${markerId}.color' class="marker-icon-container">
                    ${getGenericMarkerSvg(
                        colorValue,
                        `class = "marker-icon" id = "marker.${markerId}.svg"`
                    )}
                    <input type="color" class="marker-color-input" id="marker.${markerId}" value="${colorValue}">
                </div>
            </div>
            <div>
                <input type="color" class="options-color-input-box" id="marker.${markerId}.colorPicker" value="${colorValue}">
            </div>`
            if (!hideCheckboxes) {
                html += '<div class="options-checkbox-col">'
                if (settings.showRadius) {
                    html += `<div class="options-radius-row">
                            <input type='checkbox' id='${markerId}.submitRadius' ${
                        submitRadius ? 'checked' : ''
                    } value=true>
                            <span class='radius-label'> Submit Radius</span>

                        </div>`
                }
                if (settings.showInteractionRadius) {
                    html += `<div class="options-radius-row">
                            <input type='checkbox' id='${markerId}.interactRadius' ${
                        interactRadius ? 'checked' : ''
                    } value=true>
                            <span class='radius-label'> Interact Radius</span>
                        </div>`
                }
                html += '</div>'
            }
            html += '</div></p>'
        }

        const container = dialog({
            id: 'markerColors',
            width: boxWidth,
            html: html,
            title: 'Planner Marker Customisation'
        })

        const div = container[0]

        div.addEventListener('change', (event) => {
            const id = event.target.id
            const splitId = id.split('.')

            if (event.target.type === 'checkbox') {
                // Update the marker radius data and add to the settings
                const value = event.target.checked
                settings.markers[splitId[0]][splitId[1]] = value
            } else {
                const value = event.target.value
                const markerId = [splitId[1]]
                // Update the marker color data on the form
                document.getElementById(
                    `marker.${markerId}.colorPicker`
                ).value = value
                const svg = document.getElementById(`marker.${markerId}.svg`)
                svg.querySelectorAll('path, circle').forEach(
                    (path) => (path.style.fill = value)
                )
                // Update the marker color data on the map and in the settings
                mapLayers[markerId].color = value
                settings.markers[markerId].color = value
            }
            saveSettings()
            drawMarkers()
        })
    }

    function editMapFeatures() {
        // Create the HTML for the general map display options.
        let html = ''

        const optionSetting = [
            'submitRadius',
            'submitRadiusFill',
            'interactRadius',
            'interactRadiusFill',
            'votingProximity',
            'votingProximityFill'
        ]
        const optionTitle = [
            'Submit Radius Border',
            'Submit Radius Fill',
            'Interact Radius Border',
            'Interact Radius Fill',
            'Voting Proximity Border',
            'Voting Proximity Fill'
        ]

        // HTML template which is used for each row of the display.
        const optionHTML = `Color: <input type='color' id='idColor' value='colorValue'>
                            Opacity: <select id='idOpacity'>
                                <option value='0'>0.0</option>
                                <option value='0.1'>0.1</option>
                                <option value='0.2'>0.2</option>
                                <option value='0.3'>0.3</option>
                                <option value='0.4'>0.4</option>
                                <option value='0.5'>0.5</option>
                                <option value='0.6'>0.6</option>
                                <option value='0.7'>0.7</option>
                                <option value='0.8'>0.8</option>
                                <option value='0.9'>0.9</option>
                                <option value='1'>1.0</option>
                            </select>`

        // Loop through all of the option settings and insert their values into above template.
        for (let i = 0; i < optionSetting.length; i++) {
            const colorValue = settings[`${optionSetting[i]}Color`]
            const opacityValue = settings[`${optionSetting[i]}Opacity`]

            html += `<p class='planner-colors'>${optionTitle[i]}<br>
                     ${optionHTML
                         .replace('idColor', `${optionSetting[i]}Color`)
                         .replace('colorValue', colorValue)
                         .replace('idOpacity', `${optionSetting[i]}Opacity`)
                         .replace(
                             `value='${opacityValue}'`,
                             `value='${opacityValue}' selected`
                         )}
                      </p>`
        }

        const container = dialog({
            id: 'plannermMapFeatures',
            width: '220px',
            html: html,
            title: 'Planner Map Customisation'
        })

        const div = container[0]

        // If changes are made to settings, save the changes and update the map.
        div.addEventListener('change', (event) => {
            const id = event.target.id
            const value = event.target.value
            settings[id] = value
            saveSettings()
            drawMarkers()
        })
    }

    function showDialog() {
        if (window.isSmartphone()) {
            window.show('map')
        }

        const html = `<p><label for="txtScriptUrl">Url for the script</label><br><input type="url" id="txtScriptUrl" spellcheck="false" placeholder="https://script.google.com/macros/***/exec"></p>
             <p><a class='wayfarer-refresh'>Update candidate data</a></p>
             <p><input type="checkbox" id="chkShowTitles"><label for="chkShowTitles">Show titles</label></p>
             <p><input type="checkbox" id="chkShowRadius"><label for="chkShowRadius">Show submit radius</label></p>
             <p><input type="checkbox" id="chkShowInteractRadius"><label for="chkShowInteractRadius">Show interaction radius</label></p>
             <p><input type="checkbox" id="chkShowVotingProximity"><label for="chkShowVotingProximity">Show voting proximity</label></p>
             <p><input type="checkbox" id="chkEnableDraggingMarkers"><label for="chkEnableDraggingMarkers">Enable Dragging Markers</label></p>
             <p><input type="checkbox" id="chkEnableCoordinatesEdit"><label for="chkEnableCoordinatesEdit">Enable Coordinates Edit</label></p>
             <p><input type="checkbox" id="chkEnableImagePreview"><label for="chkEnableImagePreview">Enable Image Preview</label></p>
             <p><a id='plannerEditMapFeatures'>Customise Map Visuals</a></p>
             <p><a id='plannerEditMarkerColors'>Customise Marker Appearance</a></p>
            `

        const container = dialog({
            width: 'auto',
            html,
            title: 'Wayfarer Planner',
            buttons: {
                OK: function () {
                    const newUrl = txtInput.value
                    if (!txtInput.reportValidity()) {
                        return
                    }

                    if (newUrl !== '') {
                        if (
                            !newUrl.startsWith(
                                'https://script.google.com/macros/'
                            )
                        ) {
                            alert(
                                'The URL of the script seems to be wrong, please paste the URL provided after "creating the webapp".'
                            )
                            return
                        }

                        if (
                            newUrl.includes('echo') ||
                            !newUrl.endsWith('exec')
                        ) {
                            alert(
                                'You must use the short URL provided by "creating the webapp", not the long one after executing the script.'
                            )
                            return
                        }
                        if (newUrl.includes(' ')) {
                            alert(
                                "Warning, the URL contains at least one space. Check that you've copied it properly."
                            )
                            return
                        }
                    }

                    if (newUrl !== settings.scriptURL) {
                        settings.scriptURL = newUrl
                        saveSettings()
                        getStoredData()
                    }

                    container.dialog('close')
                }
            }
        })

        const div = container[0]
        const txtInput = div.querySelector('#txtScriptUrl')
        txtInput.value = settings.scriptURL

        const linkRefresh = div.querySelector('.wayfarer-refresh')
        linkRefresh.addEventListener('click', () => {
            settings.scriptURL = txtInput.value
            saveSettings()
            getStoredData()
        })

        const chkShowTitles = div.querySelector('#chkShowTitles')
        chkShowTitles.checked = settings.showTitles

        chkShowTitles.addEventListener('change', (e) => {
            settings.showTitles = chkShowTitles.checked
            saveSettings()
            drawMarkers()
        })

        const chkShowRadius = div.querySelector('#chkShowRadius')
        chkShowRadius.checked = settings.showRadius
        chkShowRadius.addEventListener('change', (e) => {
            settings.showRadius = chkShowRadius.checked
            saveSettings()
            drawMarkers()
        })
        const chkShowInteractRadius = div.querySelector(
            '#chkShowInteractRadius'
        )
        chkShowInteractRadius.checked = settings.showInteractionRadius
        chkShowInteractRadius.addEventListener('change', (e) => {
            settings.showInteractionRadius = chkShowInteractRadius.checked
            saveSettings()
            drawMarkers()
        })
        const chkShowVotingProximity = div.querySelector(
            '#chkShowVotingProximity'
        )
        chkShowVotingProximity.checked = settings.showVotingProximity
        chkShowVotingProximity.addEventListener('change', (e) => {
            settings.showVotingProximity = chkShowVotingProximity.checked
            saveSettings()
            drawMarkers()
        })
        const chkEnableDraggingMarkers = div.querySelector(
            '#chkEnableDraggingMarkers'
        )
        chkEnableDraggingMarkers.checked = !settings.disableDraggingMarkers
        chkEnableDraggingMarkers.addEventListener('change', (e) => {
            settings.disableDraggingMarkers = !chkEnableDraggingMarkers.checked
            saveSettings()
            drawMarkers()
        })
        const chkEnableCoordinatesEdit = div.querySelector(
            '#chkEnableCoordinatesEdit'
        )
        chkEnableCoordinatesEdit.checked = settings.enableCoordinatesEdit
        chkEnableCoordinatesEdit.addEventListener('change', (e) => {
            settings.enableCoordinatesEdit = chkEnableCoordinatesEdit.checked
            saveSettings()
        })
        const chkEnableImagePreview = div.querySelector(
            '#chkEnableImagePreview'
        )
        chkEnableImagePreview.checked = settings.enableImagePreview
        chkEnableImagePreview.addEventListener('change', (e) => {
            settings.enableImagePreview = chkEnableImagePreview.checked
            saveSettings()
        })

        txtInput.addEventListener('input', (e) => {
            if (txtInput.value) {
                try {
                    new URL(txtInput.value) // eslint-disable-line no-new
                    if (
                        txtInput.value.startsWith(
                            'https://script.google.com/macros/'
                        )
                    ) {
                        $('.toggle-create-waypoints').show()
                        return
                    }
                } catch (error) {}
            }
            $('.toggle-create-waypoints').hide()
        })
        const plannerEditMapFeatures = div.querySelector(
            '#plannerEditMapFeatures'
        )
        plannerEditMapFeatures.addEventListener('click', function (e) {
            editMapFeatures()
            e.preventDefault()
            return false
        })
        const plannerEditMarkerColors = div.querySelector(
            '#plannerEditMarkerColors'
        )
        plannerEditMarkerColors.addEventListener('click', function (e) {
            editMarkerColors()
            e.preventDefault()
            return false
        })
    }

    // Initialize the plugin
    const setup = function () {
        loadSettings()

        $('<style>')
            .prop('type', 'text/css')
            .html(
                `
            .wayfarer-planner-popup {
                width:200px;
            }
            .wayfarer-planner-popup a {
                color: #ffce00;
            }
            .wayfarer-planner-name {
                font-size: 12px;
                font-weight: bold;
                color: gold;
                opacity: 0.7;
                text-align: center;
                text-shadow: -1px -1px #000, 1px -1px #000, -1px 1px #000, 1px 1px #000, 0 0 2px #000;
                pointer-events: none;
            }
            #txtScriptUrl {
                width: 100%;
            }
            .wayfarer-planner__disabled {
                opacity: 0.8;
                pointer-events: none;
            }

            #submit-to-wayfarer {
                position: relative;
            }
            #submit-to-wayfarer input,
            #submit-to-wayfarer select {
                width: 100%;
            }
            #submit-to-wayfarer input {
                color: #CCC;
            }
            #submit-to-wayfarer label {
                margin-top: 5px;
                display: block;
                color: #fff;
            }
            #wayfarer-submit {
                height: 30px;
                margin-top: 10px;
                width: 100%;
            }

            .wayfarer-expander {
                cursor: pointer;
                transform: rotate(90deg) translate(-1px, 1px);
                transition: transform .2s ease-out 0s;
                position: absolute;
                right: 0;
            }

            .wayfarer-extraData {
                max-height: 0;
                overflow: hidden;
                margin-top: 1em;
            }

            .wayfarer__expanded .wayfarer-expander {
                transform: rotate(270deg) translate(1px, -3px);
            }

            .wayfarer__expanded .wayfarer-extraData {
                max-height: none;
                margin-top: 0em;
            }
            .toggle-create-waypoints{
                box-shadow: 0 0 5px;
                cursor:pointer;
                font-weight: bold;
                color: #000!important;
                background-color: #fff;
                border-bottom: 1px solid #ccc;
                width: 26px;
                height: 26px;
                line-height: 26px;
                display: block;
                text-align: center;
                text-decoration: none;
                border-radius: 4px;
                border-bottom: none;
            }
            .toggle-create-waypoints:hover{
                text-decoration:none;
            }
            .toggle-create-waypoints.active{
                background-color:#ffce00;
            }
            #submit-to-wayfarer .imagePreviewContainer{
                display:block;
                margin-top:5px;
                text-align:center;
            }
            #submit-to-wayfarer .imagePreview{
                max-width:100%;
                max-height:150px;
            }
            .options-row {
                display: flex;
                align-items: center;
            }
            .options-label-col {
                width: 70px;
                text-align: right;
                margin-right: 4px;
            }
            .options-marker-col {
                width: 30px;
                text-align: center;
                position: relative;
            }
            .marker-color-input {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                z-index: 1; /* Higher than the z-index of the marker SVG */
                opacity: 0;
            }
            .options-marker-col .marker-icon {
                z-index: 0; /* Lower than the z-index of the color input */
            }
            .options-checkbox-col {
                display: flex;
                flex-direction: column;
            }
            .options-radius-row {
                align-items: center;
                display: flex;
            }
            .radius-label {
                flex: 1;
                text-align: left;
            }
            .options-color-input-box {
                width: 30px;
                height: 30px;
                margin-left: 12px;
                margin-right: 12px;
            }
            .loading {
                visibility: hidden;
                height:150px;
            }

            `
            )
            .appendTo('head')

        $('body').on('submit', '#submit-to-wayfarer', function (e) {
            e.preventDefault()
            map.closePopup()
            $.ajax({
                url: settings.scriptURL,
                type: 'POST',
                data: new FormData(e.currentTarget),
                processData: false,
                contentType: false,
                success: function (data, status, header) {
                    drawMarker(data)
                    let markerAlreadyExists = false
                    for (let i = 0; i < markercollection.length; i++) {
                        if (markercollection[i].id === data.id) {
                            Object.assign(markercollection[i], data)
                            markerAlreadyExists = true
                            break
                        }
                    }
                    if (!markerAlreadyExists) {
                        markercollection.push(data)
                    }
                    if (editmarker != null) {
                        map.removeLayer(editmarker)
                        editmarker = null
                    }
                },
                error: function (x, y, z) {
                    console.log('Wayfarer Planner. Error message: ', x, y, z) // eslint-disable-line no-console
                    alert(
                        "Wayfarer Planner. Failed to send data to the scriptURL.\r\nVerify that you're using the right URL and that you don't use any extension that blocks access to google."
                    )
                }
            })
        })

        map.on('click', onMapClick)

        const toolbox = document.getElementById('toolbox')

        const toolboxLink = document.createElement('a')
        toolboxLink.textContent = 'Wayfarer'
        toolboxLink.title = 'Settings for Wayfarer Planner'
        toolboxLink.addEventListener('click', showDialog)
        toolbox.appendChild(toolboxLink)

        if (settings.scriptURL) {
            getStoredData()
        } else {
            showDialog()
        }
        L.Control.CreatePoints = L.Control.extend({
            onAdd: function (map) {
                const button = L.DomUtil.create('a')
                button.classList.add('toggle-create-waypoints')
                if (!settings.scriptURL) {
                    button.style.display = 'none'
                }

                button.href = '#'
                button.innerHTML = 'P+'
                return button
            },

            onRemove: function (map) {
                // Nothing to do here
            }
        })

        L.control.createpoints = function (opts) {
            return new L.Control.CreatePoints(opts)
        }

        L.control.createpoints({ position: 'topleft' }).addTo(map)
        $('.toggle-create-waypoints').on('click', function (e) {
            e.preventDefault()
            e.stopPropagation()
            $(this).toggleClass('active')
            isPlacingMarkers = !isPlacingMarkers
            if (!isPlacingMarkers && editmarker != null) {
                map.closePopup()
                map.removeLayer(editmarker)
                editmarker = null
            }
        })
    }

    /** S2 Geometry functions

     S2 extracted from Regions Plugin
     https:static.iitc.me/build/release/plugins/regions.user.js

     */

    const d2r = Math.PI / 180.0
    const r2d = 180.0 / Math.PI

    const S2 = {}

    function LatLngToXYZ(latLng) {
        const phi = latLng.lat * d2r
        const theta = latLng.lng * d2r
        const cosphi = Math.cos(phi)

        return [
            Math.cos(theta) * cosphi,
            Math.sin(theta) * cosphi,
            Math.sin(phi)
        ]
    }

    function XYZToLatLng(xyz) {
        const lat = Math.atan2(
            xyz[2],
            Math.sqrt(xyz[0] * xyz[0] + xyz[1] * xyz[1])
        )
        const lng = Math.atan2(xyz[1], xyz[0])

        return { lat: lat * r2d, lng: lng * r2d }
    }

    function largestAbsComponent(xyz) {
        const temp = [Math.abs(xyz[0]), Math.abs(xyz[1]), Math.abs(xyz[2])]

        if (temp[0] > temp[1]) {
            if (temp[0] > temp[2]) {
                return 0
            }
            return 2
        }

        if (temp[1] > temp[2]) {
            return 1
        }

        return 2
    }

    function faceXYZToUV(face, xyz) {
        let u, v

        switch (face) {
            case 0:
                u = xyz[1] / xyz[0]
                v = xyz[2] / xyz[0]
                break
            case 1:
                u = -xyz[0] / xyz[1]
                v = xyz[2] / xyz[1]
                break
            case 2:
                u = -xyz[0] / xyz[2]
                v = -xyz[1] / xyz[2]
                break
            case 3:
                u = xyz[2] / xyz[0]
                v = xyz[1] / xyz[0]
                break
            case 4:
                u = xyz[2] / xyz[1]
                v = -xyz[0] / xyz[1]
                break
            case 5:
                u = -xyz[1] / xyz[2]
                v = -xyz[0] / xyz[2]
                break
            default:
                throw { error: 'Invalid face' }
        }

        return [u, v]
    }

    function XYZToFaceUV(xyz) {
        let face = largestAbsComponent(xyz)

        if (xyz[face] < 0) {
            face += 3
        }

        const uv = faceXYZToUV(face, xyz)

        return [face, uv]
    }

    function FaceUVToXYZ(face, uv) {
        const u = uv[0]
        const v = uv[1]

        switch (face) {
            case 0:
                return [1, u, v]
            case 1:
                return [-u, 1, v]
            case 2:
                return [-u, -v, 1]
            case 3:
                return [-1, -v, -u]
            case 4:
                return [v, -1, -u]
            case 5:
                return [v, u, -1]
            default:
                throw { error: 'Invalid face' }
        }
    }

    function STToUV(st) {
        const singleSTtoUV = function (st) {
            if (st >= 0.5) {
                return (1 / 3.0) * (4 * st * st - 1)
            }
            return (1 / 3.0) * (1 - 4 * (1 - st) * (1 - st))
        }

        return [singleSTtoUV(st[0]), singleSTtoUV(st[1])]
    }

    function UVToST(uv) {
        const singleUVtoST = function (uv) {
            if (uv >= 0) {
                return 0.5 * Math.sqrt(1 + 3 * uv)
            }
            return 1 - 0.5 * Math.sqrt(1 - 3 * uv)
        }

        return [singleUVtoST(uv[0]), singleUVtoST(uv[1])]
    }

    function STToIJ(st, order) {
        const maxSize = 1 << order

        const singleSTtoIJ = function (st) {
            const ij = Math.floor(st * maxSize)
            return Math.max(0, Math.min(maxSize - 1, ij))
        }

        return [singleSTtoIJ(st[0]), singleSTtoIJ(st[1])]
    }

    function IJToST(ij, order, offsets) {
        const maxSize = 1 << order

        return [(ij[0] + offsets[0]) / maxSize, (ij[1] + offsets[1]) / maxSize]
    }

    // S2Cell class
    S2.S2Cell = function () {}

    // static method to construct
    S2.S2Cell.FromLatLng = function (latLng, level) {
        const xyz = LatLngToXYZ(latLng)
        const faceuv = XYZToFaceUV(xyz)
        const st = UVToST(faceuv[1])
        const ij = STToIJ(st, level)

        return S2.S2Cell.FromFaceIJ(faceuv[0], ij, level)
    }

    S2.S2Cell.FromFaceIJ = function (face, ij, level) {
        const cell = new S2.S2Cell()
        cell.face = face
        cell.ij = ij
        cell.level = level

        return cell
    }

    S2.S2Cell.prototype.toString = function () {
        return (
            'F' +
            this.face +
            'ij[' +
            this.ij[0] +
            ',' +
            this.ij[1] +
            ']@' +
            this.level
        )
    }

    S2.S2Cell.prototype.getLatLng = function () {
        const st = IJToST(this.ij, this.level, [0.5, 0.5])
        const uv = STToUV(st)
        const xyz = FaceUVToXYZ(this.face, uv)

        return XYZToLatLng(xyz)
    }

    S2.S2Cell.prototype.getCornerLatLngs = function () {
        const offsets = [
            [0.0, 0.0],
            [0.0, 1.0],
            [1.0, 1.0],
            [1.0, 0.0]
        ]

        return offsets.map((offset) => {
            const st = IJToST(this.ij, this.level, offset)
            const uv = STToUV(st)
            const xyz = FaceUVToXYZ(this.face, uv)

            return XYZToLatLng(xyz)
        })
    }

    S2.S2Cell.prototype.getSurrounding = function (deltas) {
        const fromFaceIJWrap = function (face, ij, level) {
            const maxSize = 1 << level
            if (
                ij[0] >= 0 &&
                ij[1] >= 0 &&
                ij[0] < maxSize &&
                ij[1] < maxSize
            ) {
                // no wrapping out of bounds
                return S2.S2Cell.FromFaceIJ(face, ij, level)
            }

            // the new i,j are out of range.
            // with the assumption that they're only a little past the borders we can just take the points as
            // just beyond the cube face, project to XYZ, then re-create FaceUV from the XYZ vector
            let st = IJToST(ij, level, [0.5, 0.5])
            let uv = STToUV(st)
            const xyz = FaceUVToXYZ(face, uv)
            const faceuv = XYZToFaceUV(xyz)
            face = faceuv[0]
            uv = faceuv[1]
            st = UVToST(uv)
            ij = STToIJ(st, level)
            return S2.S2Cell.FromFaceIJ(face, ij, level)
        }

        const face = this.face
        const i = this.ij[0]
        const j = this.ij[1]
        const level = this.level

        if (!deltas) {
            deltas = [
                { a: -1, b: 0 },
                { a: 0, b: -1 },
                { a: 1, b: 0 },
                { a: 0, b: 1 },
                { a: -1, b: -1 },
                { a: 1, b: 1 },
                { a: -1, b: 1 },
                { a: 1, b: -1 }
            ]
        }
        return deltas.map(function (values) {
            return fromFaceIJWrap(face, [i + values.a, j + values.b], level)
        })
    }

    // PLUGIN END //////////////////////////////////////////////////////////

    setup.info = pluginInfo // add the script info data to the function as a property
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded) {
        setup()
    } else {
        if (!window.bootPlugins) {
            window.bootPlugins = []
        }
        window.bootPlugins.push(setup)
    }
}
// wrapper end

;(function () {
    const pluginInfo = {}
    if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
        pluginInfo.script = {
            version: GM_info.script.version,
            name: GM_info.script.name,
            description: GM_info.script.description
        }
    }

    // Greasemonkey. It will be quite hard to debug
    if (
        typeof unsafeWindow !== 'undefined' ||
        typeof GM_info === 'undefined' ||
        GM_info.scriptHandler !== 'Tampermonkey'
    ) {
        // inject code into site context
        const script = document.createElement('script')
        script.appendChild(
            document.createTextNode(
                '(' + wrapper + ')(' + JSON.stringify(pluginInfo) + ');'
            )
        )
        ;(
            document.body ||
            document.head ||
            document.documentElement
        ).appendChild(script)
    } else {
        // Tampermonkey, run code directly
        wrapper(pluginInfo)
    }
})()
