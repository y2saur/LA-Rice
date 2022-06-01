// ADD FARM PAGE

// DRAW POLYGON
mapboxgl.accessToken = 'pk.eyJ1IjoiaW1hcnRpbjAwMjMiLCJhIjoiY2t2NmJ1a2JsM3dldzJwcDZyeXp6bDlsYSJ9.8VlCX1xsLOIxjGiGO8X3Pg';

let coordinate_arr = [];

const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/satellite-v9', // style URL
    center: [121.3856, 13.07316], // starting position [lng, lat]
    zoom: 15.5 // starting zoom
});

map.addControl(new mapboxgl.FullscreenControl());

// map.on('load', function() {
//         map.resize(); 
//     });

const draw = new MapboxDraw({
	displayControlsDefault: false,
	// Select which mapbox-gl-draw control buttons to add to the map.
	controls: {
		polygon: true,
		trash: true
	},
	// Set mapbox-gl-draw to draw by default.
	// The user does not have to click the polygon control button first.
	defaultMode: 'draw_polygon'
});

map.addControl(draw);
 
map.on('draw.create', updateArea);
map.on('draw.delete', updateArea);
map.on('draw.update', updateArea);
 
function updateArea(e) {
	const data = draw.getAll();
	const size = document.getElementById('calculated-area');
    const coords = document.getElementById('show-coords');
    var string = '';
    $('#show-coords').html(string);
    $('#polygon_area').val(0);
    $('#coordinate_lbl').addClass('hide');
   	coordinate_arr = turf.meta.coordAll(data);
    // const polyCoord = turf.meta.cordAll(data); // has to be constant to load on innerHTML

	if (data.features.length > 0) {
		// console.log(data.geometry.coordinates);
		// coords.innerHTML = data.geometry.coordinates;
	const area = turf.area(data);
	// Restrict the area to 2 decimal points.
	const rounded_area = Math.round(((Math.round(area * 100) / 100) / 10000) * 100) / 100;
	size.innerHTML = `<p><strong>${rounded_area}</strong> ha </p>`;
	$('#polygon_area').val(rounded_area);

	for (var i = 0; i < coordinate_arr.length; i++) {
		string += '[ '
		for (var y = 0; y < coordinate_arr[i].length; y++) {
			string += (Math.round(coordinate_arr[i][y] * 1000) / 1000).toString();
			coordinate_arr[i][y] = parseFloat(coordinate_arr[i][y]);
			if (y == 0)
				string += ', ';
		}
		string += ' ]\n'
	}

	//alert(string);

	$('#show-coords').html(string);
	$('#coordinate_lbl').removeClass('hide');
    // coords.innerHTML =`<p><strong>${polyCoord}</strong></p>`; // temporary
    
	} 
	else {
	size.innerHTML = '<p>Click the map to draw a polygon.</p';

	if (e.type !== 'draw.delete')
	alert('Click the map to draw a polygon.');
	}
    
}

// This function resizes the mapbox div (fixes the "Leaflet and Mapbox in modal not displaying properly" bug)
function checkContainer() {
    if ($('#map').is(':visible')) { //if the container is visible on the page
    map.resize(); //Adds a grid to the html
    } else {
    setTimeout(checkContainer, 50); //wait 50 ms, then try again
    }
}

// Add the control to the map.
map.addControl(
    new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    placeholder: 'Search for address', // Placeholder text for the search bar

    })
    );
// END OF ADD FARM PAGE

// SHOW POLYGONS FROM AGRO API
$(document).ready(function() {

    if (view == 'add_farm') {
		jQuery.ajaxSetup({async: false });
        var geojson;
        var coordinates = [];

        // GET FARMS AJAX kept incase pushing of polygons to coordinates array
            // need to be filtered with current list of farms (compared to agro api's list)
            // Ideally, it should be the same once (delete functionalities are added next time?)
        $.get('/get_farm_list', { group: 'farm_id' }, function(farms) {
			
        // Start getting list of polygons
        $.get('/agroapi/polygon/readAll', {}, function(polygons) {

            // Initialize geojson object that stores an array of features
                geojson = {
                    "name":"MyPolygons",
                    "type":"FeatureCollection",
                    "features":[]
                };

                // Loop through polygons and push coordinates to the array of features (One feature object per farm)
                for (var i = 0; i < farms.length; i++) {
                for (var j = 0; j < polygons.length; j++) {

                    
                    if (polygons[j].name == farms[i].farm_name) {        
                    
                    // Get other farm details
                    $.get("/ajax_farm_detailsDashboard", {farm_id : farms[i].farm_id}, function(farm_details){

                    for (var k = 0; k < farm_details.length; k++) {

                    var farm_manager = farm_details[k].first_name + " " + farm_details[k].last_name;

                    coordinates.push(polygons[j].geo_json.geometry.coordinates[0]);
                 
                    geojson.features.push   ({ "type": "Feature",
                                            "geometry": {
                                                "type": "Polygon","coordinates": coordinates
                                            },
                                            'properties': {
                                                'name': '<strong>' + farms[i].farm_name + "</strong>", //alternative html text
                                                'description': 
                                                '<strong style="color: #939C1F; font-size: 16px">' + farms[i].farm_name+ '</strong><br>'
                                                    + '<strong> Area Size: </strong>' + farms[i].farm_area + 'ha<br>'
                                                    + '<strong> Land Type: </strong>' + farms[i].land_type + '<br>'
                                                    + '<strong> Farm Manager: </strong>' + farm_manager,
                                                },
                                            
                                            });

                    // Empty coordinates array at the end of the loop to filter coordinates per farm and feature on every push
                    coordinates = [];
                }

                });
                // END OF GET FARM DETAILS AJAX
                    
                }
               
                        
                }     
            
                }
                   //alert(geojson.features);

    });

    // END OF GET POLYGONS AJAX

    });
    // END OF GET FARMS AJAX

    // ADD POLYGON SOURCE AND LAYERS ON MAP LOAD
    map.on('load', function () {

    // Add the features to the Mapbox source
    map.addSource('polygon', {
        type: 'geojson',
        data: {
        type: 'FeatureCollection',
        features: geojson.features // get array of features 
    },
    });

    map.addLayer({
        'id': 'polygon',
        'type': 'fill',
        'source': 'polygon', // reference the data source
        "layout": {
        'visibility': 'visible',
        },
        'paint': {
        'fill-color': '#9370db', //color fill
        'fill-opacity': 0.5,
        }
        });

    //Add a black outline around the polygon.
    map.addLayer({
        'id': 'outline',
        'type': 'line',
        'source': 'polygon',
        "layout": {
        'visibility': 'visible',
        },
        'paint': {
        'line-color': '#663399',
        'line-width': 2,
        }
        });

    // When a click event occurs on a feature in the places layer, open a popup at the
    // location of the feature, with description HTML from its properties.
    map.on('click', 'polygon', (e) => {
        new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(e.features[0].properties.description)
        .addTo(map);
    });
        
    // Change the cursor to a pointer when the mouse is over the places layer.
    map.on('mouseenter', 'polygon', () => {
        map.getCanvas().style.cursor = 'pointer';
        });
        
    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'polygon', () => {
        map.getCanvas().style.cursor = '';
        });

    });
    // END OF ADD POLYGON SOURCE AND LAYERS

    }
    // END OF IF STATEMENT FOR PAGE VIEW
 
});
// END OF SHOW POLYGONS FROM AGRO API