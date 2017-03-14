'use strict';

// global variables
var map;
var dragRotateHandler;
var currentExportBounds;
var currentExportScreenBounds;
var mableAPIDomain = 'https://dev.mable.me';
var gotStreets = false;

// props to initialize this app
var mapProps = {
  container: 'map',
  //style: 'mapbox://styles/mapbox/dark-v9',
  style: 'mapbox://styles/mapbox/light-v9',
  center: [139.692101, 35.689634],
  zoom: 12.5,
  dragRotate: false
};
var streetsLayerProps = {
  id: 'osm2png'
};
var tableImageProps = {
  id: 'table-bg',
  url: 'img/table-bg.png',
  opacity: 0.85
};
var minDownloadableZoom = 11;

// token for Mapbox GL JS
mapboxgl.accessToken = 'pk.eyJ1Ijoic2hhbmVjYXZhbGllcmUiLCJhIjoib0VGcnZCOCJ9.RY2Dhob09djoIsObhsJMvA';

console.log('%c□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□\r\n□■□□□□□■□□□□□□□□□□□■■□□□□□□□□■■■■□□□□□□□□□□□□\r\n□■■□□□■■□□□□□□□□□□□□■□□□□□□□□□□□■□□□□□□□□□□□□\r\n□■□■□■□■□□□□□□□□□□□□■□□□□□□□□□□□■□□□□□□□□□□□□\r\n□■□■□■□■□□□□□□□□□□□□■□□□□□□□□□□□■□□□□□□□□□□□□\r\n□■□■□■□■□□□□■■■■□□□□■■■■□□□□□□□□■□□□□□□■■■□□□\r\n□■□□■□□■□□□■□□□□■□□□■□□□■□□□□□□□■□□□□□■□□□■□□\r\n□■□□■□□■□□□□□□□□■□□□■□□□□■□□□□□□■□□□□■□□□□□■□\r\n□■□□■□□■□□□□■■■■■□□□■□□□□■□□□□□□■□□□□■■■■■■■□\r\n□■□□□□□■□□□■□□□□■□□□■□□□□■□□□□□□■□□□□■□□□□□□□\r\n□■□□□□□■□□■□□□□□■□□□■□□□□■□□□□□□■□□□□■□□□□□□□\r\n□■□□□□□■□□■□□□□□■□□□■□□□□■□□□□□□■□□□□■□□□□□■□\r\n□■□□□□□■□□■□□□□■■□□□■□□□■□□□□□□□■□□□□□■□□□□■□\r\n□■■□□□■■□□□■■■■□■■□□■■■■□□□□■■■■■■■■□□□■■■■□□\r\n□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□\r\n\r\nJoin us? mable.proj@gmail.com', 'font-family:Catamaran,Helvetica,Arial,sans-serif;font-size:12px;color:#54d08e;');

////////////////////////// Map View //////////////////////////

// [Get Streets] button onclick event
document.getElementById('export-btn').onclick = function () {
  var currentExportAreaBounds = getExportBounds();
  var zoom = map.getZoom();

  document.getElementById('export-area-inner').classList.add('loading');

  if (currentExportAreaBounds._ne.lng >= -180 || currentExportAreaBounds._sw.lng <= 180 || zoom < minDownloadableZoom) {
    currentExportBounds = getExportBounds();
    currentExportScreenBounds = map.getBounds();
    updateTableImage(currentExportBounds);
    if (gotStreets === false) {
      gotStreets = true;
      getStreetsPNGInBounds(currentExportBounds);
    } else {
      updateStreetsPNGInBounds(currentExportBounds);
    }
    showBasemap();
  }
};

// [SWITCH VIEW] button onclick event
document.getElementById('switch-view-btn').onclick = function () {
  var visibility = map.getLayoutProperty(tableImageProps.id, 'visibility');
  // switch a view (map <=> table)
  if (visibility === 'visible') {
    setMapView();
  } else {
    setTableView();
  }
};

// [DOWNLOAD] button onclick event
document.getElementById('download-img-btn').onclick = function () {
  getTablePNG();
};

// get map props from URL hash
function getMapPropsfromUrl() {
  var center = [];
  var zoom = null;
  var urlParams = location.hash.substring(1).split('&');
  var hasMapHash = false;
  var hasPreviewHash = false;
  for (var i=0; urlParams[i]; i++) {
      var param = urlParams[i].split('=');
      if (param[0] === 'map') {
          var mapParamsArray = param[1].split('/');
          mapProps.center = [mapParamsArray[2], mapParamsArray[1]];
          mapProps.zoom = mapParamsArray[0];
          hasMapHash = true;
      }
      if (param[0] === 'preview') {
        hasPreviewHash = true;
      }
  }
  if (hasMapHash === false) {
    getUserLocation();
  } else {
    initMap(hasPreviewHash);
  }
}

function setMapView() {
  map.setLayoutProperty(tableImageProps.id, 'visibility', 'none');
  activateGetStreetsViews();
  document.getElementById('export-area').style.display = 'flex';
  document.getElementById('export-btn').style.display = 'flex';
  document.getElementById('download-img-btn').classList.add('disabled');
  showBasemap();
  map.dragRotate.disable();
  map.setBearing(0);
  map.setPitch(0);
  map.fitBounds(currentExportScreenBounds, {
    linear: true
  });
}

function setTableView() {
  map.fitBounds(currentExportScreenBounds, {
    linear: true
  });
  setTimeout(function () {
    updateUrlMapProps(true);
    map.setLayoutProperty(tableImageProps.id, 'visibility', 'visible');
    deactivateGetStreetsViews();
    document.getElementById('export-area').style.display = 'none';
    document.getElementById('export-btn').style.display = 'none';
    document.getElementById('download-img-btn').classList.remove('disabled');
    hideBasemap();
    map.dragRotate.enable();
  }, 1000);
}

function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (pos) {
      console.log(pos.coords);
      mapProps.center = [pos.coords.longitude, pos.coords.latitude];
      initMap(false);
    }, function () {
      alert('現在地を取得できませんでした');
      initMap(false);
    });
  } else {
    alert('現在地を取得できませんでした');
    initMap(false);
  }
}

// update URL hash
function updateUrlMapProps(isPreview) {
  if (map.getLayoutProperty(tableImageProps.id, 'visibility') !== 'visible') {
    var center = map.getCenter();
    var zoom = map.getZoom();
    location.hash= 'map=' + zoom + '/' + center.lat + '/' + center.lng;
  }
  if (isPreview === true) {
    location.hash= 'map=' + zoom + '/' + center.lat + '/' + center.lng + '&preview';
  }
}

// check longitude if not exceeded |180|
function checkLngOver180andZoom() {
  if (map.getLayoutProperty(tableImageProps.id, 'visibility') !== 'visible') {
    var currentExportAreaBounds = getExportBounds();
    var zoom = map.getZoom();
    if (currentExportAreaBounds._ne.lng < -180 || currentExportAreaBounds._sw.lng > 180 || zoom < minDownloadableZoom) {
      deactivateGetStreetsViews();
      return false;
    } else {
      activateGetStreetsViews();
      return true;
    }
  } else {
    return false;
  }
}

// initialize controls
function initControls() {
  var geocoder = new MapboxGeocoder({ accessToken: mapboxgl.accessToken, flyTo: false });

  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
  map.addControl(geocoder, 'bottom-left');

  geocoder.on('result', function(e) {
    console.log('result: ', e.result.center);
    map.panTo(e.result.center);
  });
}

// create a map
function initMap(isPreview) {
  map = new mapboxgl.Map(mapProps);

  map.touchZoomRotate.disableRotation();

  initControls();

  map.on('load', function () {
    currentExportBounds = getExportBounds();
    currentExportScreenBounds = map.getBounds();
    getTableImage(currentExportBounds);
    checkLngOver180andZoom();
    /*if (checkLngOver180andZoom() === true) {
      getStreetsPNGInBounds(currentExportBounds);
    };*/

    // initialize a tooltip for [GET STREETS] button
    $('#export-btn').tooltip({
      placement: 'bottom',
      title: 'Click it for clipping streets!'
    });
    $('#export-btn').tooltip('show');
    /*setTimeout(function () {
      $('#export-btn').tooltip('destroy');
    }, 5000);*/
    $('#export-btn').on('mouseover', function () {
      $('#export-btn').tooltip('destroy');
    });

    if (isPreview === true) {
      gotStreets = true;
      getStreetsPNGInBounds(currentExportBounds);
      $('#export-btn').tooltip('destroy');
      setTableView();
    }
  });

  /*map.on('dragend', updateUrlMapProps);
  map.on('zoomend', updateUrlMapProps);*/
  map.on('move', function () {
    checkLngOver180andZoom();
  });
  map.on('moveend', function () {
    updateUrlMapProps(false);
  });
}

// calculate coordinates of bounds
function getExportBounds() {
  var boundsElem = document.getElementById('export-area-inner');
  var rect = boundsElem.getBoundingClientRect();

  // pixel to lnglat
  var ne = map.unproject([rect.left + rect.width, rect.top]);
  var sw = map.unproject([rect.left, rect.top + rect.height]);

  return new mapboxgl.LngLatBounds(sw, ne);
}

// add streets into map with our OSM API
function getStreetsPNGInBounds(bounds) {
  document.getElementById('export-area-inner').classList.remove('loading');
  document.getElementById('export-area-inner').classList.add('shutter');
  document.getElementById('switch-view-btn').style.display = 'block';

  var bboxParamText = 'bbox=' + bounds._sw.lng + ',' + bounds._sw.lat + ',' + bounds._ne.lng + ',' + bounds._ne.lat;
  var bboxCoordinates = [[bounds._sw.lng, bounds._ne.lat], [bounds._ne.lng, bounds._ne.lat], [bounds._ne.lng, bounds._sw.lat], [bounds._sw.lng, bounds._sw.lat]];

  map.addSource(streetsLayerProps.id, {
    'type': 'image',
    'url': mableAPIDomain + '/osm2svg?' + bboxParamText + '&width=800&style=road&format=png',
    'coordinates': bboxCoordinates
  });
  map.addLayer({
    'id': streetsLayerProps.id,
    'type': 'raster',
    'source': streetsLayerProps.id
  });

  setTimeout(function () {
    document.getElementById('export-area-inner').classList.remove('shutter');
  }, 800);
}

// re-add streets into map with our OSM API
function updateStreetsPNGInBounds() {
  var bounds = getExportBounds();
  map.removeLayer(streetsLayerProps.id);
  map.removeSource(streetsLayerProps.id);
  getStreetsPNGInBounds(bounds);
}

// add a table image into map
function getTableImage(bounds) {
  var bboxParamText = 'bbox=' + bounds._sw.lng + ',' + bounds._sw.lat + ',' + bounds._ne.lng + ',' + bounds._ne.lat;
  var bboxCoordinates = [[bounds._sw.lng, bounds._ne.lat], [bounds._ne.lng, bounds._ne.lat], [bounds._ne.lng, bounds._sw.lat], [bounds._sw.lng, bounds._sw.lat]];

  map.addSource(tableImageProps.id, {
    'type': 'image',
    'url': tableImageProps.url,
    'coordinates': bboxCoordinates
  });
  map.addLayer({
    'id': tableImageProps.id,
    'type': 'raster',
    'source': tableImageProps.id,
    'layout': {
      'visibility': 'none'
    },
    'paint': {
      'raster-opacity': tableImageProps.opacity
    }
  });
}

// re-add a table image into map
function updateTableImage() {
  var bounds = getExportBounds();
  map.removeLayer(tableImageProps.id);
  map.removeSource(tableImageProps.id);
  getTableImage(bounds);
}

// show a basemap
function showBasemap() {
  var layers = map.style._layers;
  for (var key in layers) {
    if (key !== streetsLayerProps.id && key !== tableImageProps.id) {
      map.setLayoutProperty(key, 'visibility', 'visible');
    }
  }
}

// hide a basemap
function hideBasemap() {
  var layers = map.style._layers;
  for (var key in layers) {
    if (key !== streetsLayerProps.id && key !== tableImageProps.id) {
      map.setLayoutProperty(key, 'visibility', 'none');
    }
  }
}

// show elements as bbox and button to get streets
function activateGetStreetsViews() {
  //document.getElementById('export-area').style.display = 'flex';
  //document.getElementById('export-btn').style.display = 'block';
  document.getElementById('export-area-inner').classList.remove('disabled');
  document.getElementById('export-btn').classList.remove('disabled');
}

// hide elements as bbox and button to get streets
function deactivateGetStreetsViews() {
  //document.getElementById('export-area').style.display = 'none';
  //document.getElementById('export-btn').style.display = 'none';
  document.getElementById('export-area-inner').classList.add('disabled');
  document.getElementById('export-btn').classList.add('disabled');
}

getMapPropsfromUrl();
//initMap();


////////////////////////// Table View //////////////////////////



////////////////////////// Console Tools //////////////////////////

// getSVG(): download SVG file within selected bounds.

// add streets into map with our OSM API
function getSVG() {
  var bounds = currentExportBounds;
  var bboxParamText = 'bbox=' + bounds._sw.lng + ',' + bounds._sw.lat + ',' + bounds._ne.lng + ',' + bounds._ne.lat;
  var bboxCoordinates = [[bounds._sw.lng, bounds._ne.lat], [bounds._ne.lng, bounds._ne.lat], [bounds._ne.lng, bounds._sw.lat], [bounds._sw.lng, bounds._sw.lat]];
  var requestUrl = mableAPIDomain + '/osm2svg?' + bboxParamText + '&width=800&style=road&format=svg';
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    switch ( xhr.readyState ) {
      case 0:
        console.log('uninitialized!');
        break;
      case 1:
        console.log('loading...');
        break;
      case 2:
        console.log('loaded.');
        break;
      case 3:
        console.log('interactive... '+xhr.responseText.length+' bytes.');
        break;
      case 4:
        if( xhr.status == 200 || xhr.status == 304 ) {
          var data = xhr.responseText;
          downloadImage(data, requestUrl, 'image/svg+xml');
          console.log('COMPLETE!');
          //console.log(data);
        } else {
          console.log('Failed. HttpStatus: ' + xhr.statusText);
        }
        break;
    }
  };
  xhr.open('GET', requestUrl, false);
  xhr.send();
  //xhr.abort();
}

// add streets into map with our OSM API
function getTablePNG() {
  document.getElementById('download-img-btn').innerHTML = '<img src="img/download.svg" style="height:11px;width:13.78px;"> Download';
  var imgSrc;
  var bounds = currentExportBounds;
  var bboxParamText = 'bbox=' + bounds._sw.lng + ',' + bounds._sw.lat + ',' + bounds._ne.lng + ',' + bounds._ne.lat;
  var bboxCoordinates = [[bounds._sw.lng, bounds._ne.lat], [bounds._ne.lng, bounds._ne.lat], [bounds._ne.lng, bounds._sw.lat], [bounds._sw.lng, bounds._sw.lat]];
  var requestUrl = mableAPIDomain + '/osm2svg?' + bboxParamText + '&width=709&style=road&format=png&bg=http://mable.me/preview/img/table-bg.png';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', requestUrl, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function() {
    document.getElementById('download-img-btn').innerHTML = '<i class="fa fa-cloud-download" aria-hidden="true"></i> Download';
    downloadImage(this.response, requestUrl, 'image/png');
  };
  xhr.send();
}

// create and download SVG file
function downloadImage(content, url, type) {
  var fileName = 'mable';
  var blob = new Blob([content], { 'type': type });
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}