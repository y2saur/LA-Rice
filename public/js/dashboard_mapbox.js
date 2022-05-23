// MAPBOX ACCESS TOKEN
mapboxgl.accessToken = 'pk.eyJ1IjoiaW1hcnRpbjAwMjMiLCJhIjoiY2t2NmJ1a2JsM3dldzJwcDZyeXp6bDlsYSJ9.8VlCX1xsLOIxjGiGO8X3Pg';

// CREATE MAP
const map = new mapboxgl.Map({
    container: 'dashboard-map', // container ID
    style: 'mapbox://styles/mapbox/satellite-v9', // style URL
    center: [121.3856, 13.07316], // starting position [lng, lat]
    zoom: 13.2, // starting zoom
    transition: {
        duration: 300,
        delay: 0
    }
});

map.addControl(new mapboxgl.FullscreenControl());

// Return Reported Symptoms for the last 7 days
function getReportedSymptoms(){
    var total = 0;
    $.get("/get_reported_symptoms", {}, function(num){
        for(var i = 0; i < num.symptoms.length; i++){
            total++;
        }
    });
    return total;
}


// Return number of farms
function getNumFarms() {
    var numFarms = 0;
    $.get('/get_farm_list', { group: 'farm_id' }, function(farms) {
        for (var i = 0; i < farms.length; i++) {
            numFarms++;
        }
    });

    return numFarms;
}

// Return number of active farms
function getNumActiveFarms() {
    var numActive = 0;
    $.get('/get_crop_plans', { status: ['Active', 'In-Progress'], unique: true}, function(plans) {
        for (var i = 0; i < plans.length; i++) {
            numActive++;
        }
    });

    return numActive;
}

// Return number of low stock items
function getNumLowStocks() {
    var numLowStocks = 0;
    $.get('/get_low_stocks', null, function(lowStocks) {
        for (var i = 0; i < lowStocks.length; i++) {
            numLowStocks++;
        }
    });

    return numLowStocks;
}

// SHOW POLYGONS FROM AGRO API
$(document).ready(function() {

    if (view == 'home') {
		jQuery.ajaxSetup({async: false });
        var geojson;
        var coordinates = [];

        // Get number of reported symptoms for the last 7 days
        document.getElementById("reported_symptoms").innerHTML = getReportedSymptoms();

        // Get Number of Farms
        document.getElementById("numFarms").innerHTML = getNumFarms();

        // Get Number of Active Farms
        document.getElementById("numActive").innerHTML = getNumActiveFarms();

        // Get Number of Low Stocks
        document.getElementById("numLowStocks").innerHTML = getNumLowStocks();

        // GET FARMS AJAX kept incase pushing of polygons to coordinates array
            // need to be filtered with current list of farms (compared to agro api's list)
            // Ideally, it should be the same once (delete functionalities are added next time?)
        $.get('/get_farm_list', { group: 'farm_id' }, function(farms) {
            // Start getting list of polygons
            $.get('/agroapi/polygon/readAll', {}, function(polygons) {
    	       console.log(polygons);
                // Initialize geojson object that stores an array of features
                if (polygons.length != 0) {
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
                                                            '<strong style="color: #939C1F; font-size: 16px">' + farms[i].farm_name + '</strong><br>'
                                                                + '<strong> Area Size: </strong>' + farms[i].farm_area + 'ha<br>'
                                                                + '<strong> Land Type: </strong>' + farms[i].land_type + '<br>'
                                                                + '<strong> Farm Manager: </strong>' + farm_manager + '<br>'
                                                            },
                                                        
                                                        });

                                // Empty coordinates array at the end of the loop to filter coordinates per farm and feature on every push
                                coordinates = [];
                            }

                            // // Load environment details
                            // $.get('/agroapi/soil/current', { polyid: polygons[j].id }, function(soil) {
                                
                            //     for (var k = 0; k < farm_details.length; k++) {

                            //         var farm_manager = farm_details[k].first_name + " " + farm_details[k].last_name;

                            //         coordinates.push(polygons[j].geo_json.geometry.coordinates[0]);
                                 
                            //         geojson.features.push   ({ "type": "Feature",
                            //                                 "geometry": {
                            //                                     "type": "Polygon","coordinates": coordinates
                            //                                 },
                            //                                 'properties': {
                            //                                     'name': '<strong>' + farms[i].farm_name + "</strong>", //alternative html text
                            //                                     'description': 
                            //                                     '<strong style="color: #939C1F; font-size: 16px">' + farms[i].farm_name + '</strong><br>'
                            //                                         + '<strong> Area Size: </strong>' + farms[i].farm_area + 'ha<br>'
                            //                                         + '<strong> Land Type: </strong>' + farms[i].land_type + '<br>'
                            //                                         + '<strong> Farm Manager: </strong>' + farm_manager + '<br>'
                            //                                         + '<strong> Soil Moisture: </strong>' + Math.round(soil.moisture * 100) / 100 + '%' + '<br>',
                            //                                     },
                                                            
                            //                                 });

                            //         // Empty coordinates array at the end of the loop to filter coordinates per farm and feature on every push
                            //         coordinates = [];
                            //     }

                            // });
                    // END OF GET FARM DETAILS AJAX

                    });
                    // END OF ENVIRONMENT DETAILS AJAX
                        
                    }
                   
                            
                    }     
                
                    }
                    //alert(geojson.features);
                }
                else {
                    console.log('err');
                }

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
