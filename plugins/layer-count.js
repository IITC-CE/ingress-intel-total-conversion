// @author         fkloft
// @name           Layer count
// @category       Info
// @version        0.2.0
// @description    Allow users to count nested fields


// use own namespace for plugin
plugin.layerCount = {}

plugin.layerCount.onBtnClick = function(ev) {
	var btn = plugin.layerCount.button,
		tooltip = plugin.layerCount.tooltip,
		layer = plugin.layerCount.layer;

	if(btn.classList.contains("active")) {
		map.off("click", plugin.layerCount.calculate);
		btn.classList.remove("active");
	} else {
		map.on("click", plugin.layerCount.calculate);
		btn.classList.add("active");
		setTimeout(function(){
			tooltip.textContent = "Click on map";
		}, 10);
	}
};

plugin.layerCount.latLngE6ToGooglePoint = function(point) {
	return new google.maps.LatLng(point.latE6/1E6, point.lngE6/1E6);
}

/*
pnpoly Copyright (c) 1970-2003, Wm. Randolph Franklin

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

  1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
     disclaimers.
  2. Redistributions in binary form must reproduce the above copyright notice in the documentation and/or other
     materials provided with the distribution.
  3. The name of W. Randolph Franklin may not be used to endorse or promote products derived from this Software without
     specific prior written permission.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
plugin.layerCount.pnpoly = function(latlngs, point) {
	var length = latlngs.length, c = false;

	for(var i = 0, j = length - 1; i < length; j = i++) {
		if(((latlngs[i].lat > point.lat) != (latlngs[j].lat > point.lat)) &&
		  (point.lng < latlngs[i].lng
		  + (latlngs[j].lng - latlngs[i].lng) * (point.lat - latlngs[i].lat)
		  / (latlngs[j].lat - latlngs[i].lat))) {
			c = !c;
		}
	}

	return c;
}

/***********************************************************************
 * Code for calculating the area of a triangle on the surface of a
 * sphere.  See in-line comments for references.
 **********************************************************************/
// Compute hav(theta), as per https://en.wikipedia.org/wiki/Haversine_formula
plugin.layerCount.havTheta = function(theta) {
	return (1 - Math.cos(theta)) / 2;
};

plugin.layerCount.deg2Radians= function(degrees) {
	return degrees / 360 * 2 * Math.PI;
};

// Compute hav(Theta) (NB: Capital theta!) as per https://en.wikipedia.org/wiki/Haversine_formula
plugin.layerCount.haversine = function(LatLngPair) {
  let havLat = plugin.layerCount.havTheta(plugin.layerCount.deg2Radians(LatLngPair[1]['lat'] - LatLngPair[0]['lat']));
  let cosPoint1 = Math.cos(plugin.layerCount.deg2Radians(LatLngPair[0]['lat']));
  let cosPoint2 = Math.cos(plugin.layerCount.deg2Radians(LatLngPair[1]['lat']));
  let havLng = plugin.layerCount.havTheta(plugin.layerCount.deg2Radians(LatLngPair[1]['lng'] - LatLngPair[0]['lng']));
	return havLat + cosPoint1 * cosPoint2 * havLng;
};


/*
 * Calculate the Great Circle Distance (not Greatest Common Denominator!)
 * of a pair of Latitude/Longitude points.
 * Ref: https://en.wikipedia.org/wiki/Haversine_formula
 */
plugin.layerCount.calcGCD= function(LatLngPair) {
	let haverSine = plugin.layerCount.haversine(LatLngPair);
	return 2 * Math.asin(Math.sqrt(haverSine));
};

/*
 * For a set of three Latitude/Longitude points calculate the area of
 * the enclosed triangle.
 * Ref: https://en.wikipedia.org/wiki/Spherical_trigonometry#Area_and_spherical_excess
 *
 * We're using an average value of the Earth's radius, and treating the
 * Earth as a perfect sphere. Thus this calculation will only yield an
 * approximation, with the error varying by latitude.
 */
plugin.layerCount.fieldarea = function(LatLngs) {
	if (LatLngs.length !== 3) {
		return 0.0;
	}
	let radiusEarth = 6371.0 * 1000.0; // In metres
	// NB: All initial work is done on a unit sphere, radius = 1
	//     We'll multiply up versus the surface area of the Earth
	//     at the end.
	// Use Haversine
	// https://en.wikipedia.org/wiki/Haversine_formula
	// to calculate the lengths of the sides of the field, storing
	// them in d[]
	//
	// As per https://en.wikipedia.org/wiki/Spherical_trigonometry#Notation
	// [A,B,C] are the angles in the triangle. These correspdond to
	// [u,v,w] the vertices at the corners.
	// [a,b,c] are the edges, where:
	// 	a = v - u
	// 	b = u - w
	// 	c = w - v
	//
	// d[0] = a = v - u
	// d[1] = b = u - w
	// d[2] = c = w - v
	let d = [];
	for (let gcd = 0; gcd < 3 ; gcd++) {
		let p2 = (4 - gcd) % 3;
    let p1 = (3 - gcd) % 3;

		d[gcd] = plugin.layerCount.calcGCD([LatLngs[p1], LatLngs[p2]]);
	}
	
	// Now we need the internal angle, using the GCDs, between
	// side a and side b, which is the angle C.
	// https://en.wikipedia.org/wiki/Spherical_law_of_cosines#Rearrangements
	let cosC = ( Math.cos(d[2]) - (Math.cos(d[0]) * Math.cos(d[1])) ) / ( Math.sin(d[0]) * Math.sin(d[1]) );
  let C = Math.acos(cosC);

	// From this we calculate the Spherical Excess 'E', which is directly
	// related to the area of the enclosed triangle.
	let E = 2 * Math.atan(
			(Math.tan(d[0]/2)
			 * Math.tan(d[1]/2)
			 * Math.sin(C)
			) / (1
			 + Math.tan(d[0]/2)
			  * Math.tan(d[1]/2)
			  * Math.cos(C)
			)
		);
	
	// https://en.wikipedia.org/wiki/Spherical_trigonometry#Area_and_spherical_excess
	//
	// 1) E = A + B + C - pi
	// 2) A + B + C  = pi + (4 * pi * areaTriangle) / areaSphere
	//
	// Pull the pi to the left in #2:
	//
	// 3) A + B + C - pi = (4 * pi * areaTriangle) / areaSphere
	//
	// LHS is now the same as RHS in #1, so = E:
	//
	//    E = (4 * pi * areaTriangle) / areaSphere
	//    E * areaSphere = 4 * pi * areaTriangle
	//    (E * areaSphere) / (4 * pi) = areaTriangle
	//    areaTriangle = (E * areaSphere) / (4 * pi)
	//
	// So, using Earth's surface area as areaSphere
	//
	//    areaOnEarth = E * (4 * pi * Earth['radius']^2) / (4 * pi)
	//
	// and the "4 * pi" cancels out either side:
	//
	//    areaOnEarth = E * Earth['radius']
  return E * Math.pow(radiusEarth, 2)
};

// Take an area in m² and output a not-too long string
// Mostly to avoid things like "235239856 m²" for large fields
plugin.layerCount.prettyAreaString = function(area) {
	// 1million because we're using parseInt. If we try to go to
	// km² before this we'll just display "0 km²"
	if (area < 1000000.0) {
		return parseInt(area).toLocaleString() + " m²";
	} else {
		let a = parseInt(area * 100) / 100;
		return (a / 1000.0 / 1000.0).toLocaleString() + " km²";
	}
};
/***********************************************************************
 * End triangle area code
 **********************************************************************/

plugin.layerCount.calculate = function(ev) {
	var point = ev.latlng;
	var fields = window.fields;
	var layersRes = layersEnl = layersDrawn = 0;
	let areaFields = areaDrawn = 0.0;

	for(var guid in fields) {
		var field = fields[guid];

		// we don't need to check the field's bounds first. pnpoly is pretty simple math.
		// Checking the bounds is about 50 times slower than just using pnpoly
		if(plugin.layerCount.pnpoly(field.getLatLngs(), point)) {
			if(field.options.team == TEAM_ENL) {
				layersEnl++;
        areaFields += plugin.layerCount.fieldarea(field.getLatLngs());
			}
			else if(field.options.team == TEAM_RES) {
				layersRes++;
        areaFields += plugin.layerCount.fieldarea(field.getLatLngs());
			}
		}
	}

	if (window.plugin.drawTools) {
		for(var layerId in window.plugin.drawTools.drawnItems._layers) {
			var field = window.plugin.drawTools.drawnItems._layers[layerId];
			if(field instanceof L.GeodesicPolygon && plugin.layerCount.pnpoly(field.getLatLngs(), point)) {
				layersDrawn++;
				areaDrawn += plugin.layerCount.fieldarea(field.getLatLngs());
			}
		}
	}

	if(layersRes != 0 && layersEnl != 0)
		var content = "Res: " + layersRes + " + Enl: " + layersEnl + " = " + (layersRes + layersEnl) + " fields";
	else if(layersRes != 0)
		var content = "Res: " + layersRes + " field(s) (Area: " + plugin.layerCount.prettyAreaString(areaFields) + ")";
	else if(layersEnl != 0)
		var content = "Enl: " + layersEnl + " field(s) (Area: " + plugin.layerCount.prettyAreaString(areaFields) + ")";
	else
		var content = "No fields";

	if (layersDrawn != 0)
		content += "; draw: " + layersDrawn + " polygon(s) (Triangles Area: " + plugin.layerCount.prettyAreaString(areaDrawn) + ")";

	plugin.layerCount.tooltip.innerHTML = content;

	return false;
};

var setup = function() {
	$('<style>').prop('type', 'text/css').html('@include_string:layer-count.css@').appendTo('head');

	var parent = $(".leaflet-top.leaflet-left", window.map.getContainer());

	var button = document.createElement("a");
	button.className = "leaflet-bar-part";
	button.addEventListener("click", plugin.layerCount.onBtnClick, false);
	button.title = 'Count nested fields';

	var tooltip = document.createElement("div");
	tooltip.className = "leaflet-control-layer-count-tooltip";
	button.appendChild(tooltip);

	var container = document.createElement("div");
	container.className = "leaflet-control-layer-count leaflet-bar leaflet-control";
	container.appendChild(button);
	parent.append(container);

	plugin.layerCount.button = button;
	plugin.layerCount.tooltip = tooltip;
	plugin.layerCount.container = container;
}
