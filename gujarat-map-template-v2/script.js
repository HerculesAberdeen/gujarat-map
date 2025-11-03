// Basic Leaflet map that loads GeoJSONs from /data
const map = L.map('map', { center: [22.5, 72.5], zoom: 7, minZoom: 5, maxZoom: 18 });

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const overlays = {};
const styleGradient = { color: 'orange', weight: 1, fillOpacity: 0.15 };
const styleBoundary = { color: 'gray', weight: 1, fillOpacity: 0.05 };
const styleLines = { color: 'blue', weight: 2 };
const styleCity = { radius: 3, color: 'black', fillColor: 'yellow', fillOpacity: 0.9 };
const styleSS = { radius: 4, color: 'red', fillColor: 'red', fillOpacity: 0.9 };
const styleHot = { radius: 5, color: 'purple', fillColor: 'purple', fillOpacity: 0.8 };

function loadPolygon(url, style, name) {
  return fetch(url).then(r => r.json()).then(geo => {
    const layer = L.geoJSON(geo, { style });
    overlays[name] = layer; layer.addTo(map); return layer;
  });
}
function loadPoints(url, markerStyle, name, popupFields=[]) {
  return fetch(url).then(r => r.json()).then(geo => {
    const layer = L.geoJSON(geo, {
      pointToLayer: (f, latlng) => L.circleMarker(latlng, markerStyle),
      onEachFeature: (feature, layer) => {
        if (popupFields.length) {
          const props = feature.properties || {};
          const html = popupFields.map(k => `<div><b>${k}</b>: ${props[k] ?? ''}</div>`).join('');
          layer.bindPopup(html || 'Info');
        }
      }
    });
    overlays[name] = layer; layer.addTo(map); return layer;
  });
}

Promise.all([
  loadPolygon('./data/gujarat_boundary.geojson', styleBoundary, 'Gujarat Boundary'),
  loadPolygon('./data/gradient_zones.geojson', styleGradient, 'Gradient Zones'),
  loadPoints('./data/substations_132kv.geojson', styleSS, '132 kV Substations', ['name','voltage_kv']),
  loadPolygon('./data/transmission_lines.geojson', styleLines, 'Transmission Lines'),
  loadPoints('./data/cities.geojson', styleCity, 'Cities', ['name']),
  loadPoints('./data/hot_springs.geojson', styleHot, 'Hot Springs', ['name'])
]).then(layers => {
  const boundary = layers[0];
  if (boundary) {
    try { map.fitBounds(boundary.getBounds(), { padding: [20,20] }); } catch(e) {}
  } else {
    const group = L.featureGroup(layers.filter(Boolean));
    if (group.getLayers().length) map.fitBounds(group.getBounds(), { padding: [20,20] });
  }
  L.control.layers(null, overlays, { collapsed: false }).addTo(map);
}).catch(err => {
  console.error('Error loading layers:', err);
  alert('Could not load one or more layers. Check file names and paths in /data.');
});
