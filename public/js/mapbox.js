
$(document).on("click", ".farm_li", function(){
	$('.loader').css('visibility', 'hidden'); //to show
	
});
function update_color_meter2(){
    $(".probability_value").each(function(){
        var value = $(this).text().slice(0,-1);
		var meter;
		var text_val;
		if(parseInt(value) <= 35){
			meter = 5;
			text_val = "Low";
		}
		else if(parseInt(value) <= 65){
			text_val = "Medium";
			meter = 40;
		}
		else{
			meter = 90;
			text_val = "High";
		}
        var val = 214 - (meter * 2);
        var rgb = "color : rgb(214, " + val + ", 19)";
        $(this).attr("style",rgb);
        if(value != ""){
            $(this).text(parseInt(value) + " %");
            // $(this).text(text_val);
        }
    });
}

function getFarmDetails(obj) {
	var query = obj;

	$.get('/filter_farm_details', query, function(details) {
		console.log(details);
		$('#monitor_land_type').html(details.details[0].land_type);
		$('#monitor_farm_area').html(details.details[0].farm_area);
		$('#monitor_desc').html(details.details[0].farm_desc);

		query['status'] = 'Active';
		query['position'] = 'Farm Manager'

		// $.get('/filter_farmers', query, function(farmers) {
		// 	$('#monitor_farm_mngr').html(farmers[0].last_name+', '+farmers[0].first_name);
		// });

		// query['position'] = 'Farmer'

		// $.get('/filter_farmers', query, function(farmers) {
		// 	//console.log(farmers);
		// 	var tr, td, append = false;
		// 	for (var i = 0; i < farmers.length; i++) {
		// 		if (i % 3 == 0) {
		// 			tr = '<tr>'
		// 		}

		// 		td = '<td>'+farmers[i].last_name+', '+farmers[i].first_name+'</td>';
		// 		tr += td;
					
		// 		if (i == farmers.length-1) {
		// 			append = true;
		// 		}

		// 		if (append) {
		// 			tr += '</tr>';

		// 			$('#monitor_farmers_table').append(tr);
		// 			append = false;
		// 		}
		// 	}

		// });

		$.get("/get_crop_plans", { status: ['Active', 'In-Progress',"Completed"], where : {key : "farm_name", val : details.details[0].farm_name}}, function(result){
			$("#crop_calendar_list").empty();
			for(i = 0; i < result.length; i++)
				if(result[result.length - 1 - i].crop_plan != null && result[result.length - 1 - i].farm_name == details.details[0].farm_name)
					$("#crop_calendar_list").append('<option value="' + result[result.length - 1 - i].calendar_id + '">' + result[result.length - 1 - i].crop_plan + '</option>');
		});
	});
}

function unixToDate(timestamp) {
	return new Date(timestamp * 1000);
}

function getGeoData(farm_name) {
	var image_url;
	var coordinates = [];
	var center = [];

	toggleStatistics();

	$.get('/agroapi/polygon/readAll', {}, function(polygons) {
		var polygon_id;
		var options = {};
		for (var i = 0; i < polygons.length; i++) {
			if (farm_name == polygons[i].name) {
				polygon_id = polygons[i].id;
				coordinates = polygons[i].geo_json.geometry.coordinates[0];

				center = polygons[i].center;
			}
		}
		console.log(polygons)
		var n_date = new Date();
		n_date.setDate(n_date.getDate() - 30);
		var n = new Date();
		var query = { polygon_id: polygon_id, start: n_date, end: n };

		options = {
			center: center,
			coordinates: coordinates
		}

		// Visualize plot
		$.get('/agroapi/ndvi/imagery', query, function(imagery) {
			console.log(imagery);
			console.log(imagery.length == 0);

			if (imagery.length != 0) {
				console.log(imagery);
				image_url = imagery[imagery.length-1].image.ndvi;

				options['url'] = image_url;
				// for (var i = 0; i < imagery.length; i++) {
				// 	console.log(unixToDate(imagery[i].dt));
				// }

				$.get(imagery[imagery.length-1].stats.ndvi, {}, function(stats) {
					$('#ndvi_date').html(imagery[imagery.length-1].dt);
					$('#statistics_max').html(Math.round(stats.max * 100) / 100);
					$('#statistics_mean').html(Math.round(stats.mean * 100) / 100);
					$('#statistics_median').html(Math.round(stats.median * 100) / 100);
					$('#statistics_min').html(Math.round(stats.min * 100) / 100);
					$('#statistics_deviation').html(Math.round(stats.std * 100) / 100);
				});
			}
			else {
				
			}

			loadGeoMap(options);
		});

		// Load environment details
		$.get('/agroapi/soil/current', { polyid: polygon_id }, function(soil) {
			$('#monitor_surface_temp').html(soil.t0);
			$('#monitor_ground_temp').html(soil.t10);
			$('#monitor_soil_moisture').html(soil.moisture == 'N/A' ? soil.moisture : Math.round(soil.moisture * 100) / 100 + '%');
		});
		$.get('/agroapi/weather/current', { polyid: polygon_id }, function(weather) {
			//console.log(weather);

			$('#monitor_icon').attr('src', `http://openweathermap.org/img/wn/${weather.weather[0].icon}.png`);
			$('#monitor_icon').removeClass('hide');
			$('#monitor_temp').html(weather.main.temp);
			$('#monitor_desc').html(weather.weather[0].description);
		});

	});
}

function toggleStatistics() {
	if (type == 'Weather') {
		$('#statistics_ndvi').addClass('hide');
		$('#statistics_weather').removeClass('hide');
	}
	else if (type == 'NDVI') {
		$('#statistics_ndvi').removeClass('hide');
		$('#statistics_weather').addClass('hide');

	}
}

function createMap(token, options) {
	var map = new mapboxgl.Map({
        container: 'monitor_map',
        zoom: 15,
        center: options.center,
        style: 'mapbox://styles/mapbox/satellite-v9',
        transition: {
        	duration: 300,
        	delay: 0
        }
    });

    return map;
}

function addRasterImage(map, options) {
	map.on('load', () => {
        map.addSource('radar', {
            'type': 'image',
            'url': options.url,
            'coordinates': options.coordinates
        });
        map.addLayer({
            id: 'radar-layer',
            'type': 'raster',
            'source': 'radar',
            'paint': {
                'raster-fade-duration': 0
            }
        });
    });

    return map;
}

function addPolygon(map, options) {
	console.log(options);
	let temp_arr = [];
	temp_arr.push(options.coordinates);
	options.coordinates = temp_arr;

	map.on('load', () => {
		map.addSource('polygon', {
			'type': 'geojson',
			'data': {
				'type': 'Feature',
				'geometry': {
					'type': 'Polygon',
					'coordinates': options.coordinates
				}
			}
		});
		 
		// Add a new layer to visualize the polygon.
		map.addLayer({
			'id': 'polygon',
			'type': 'fill',
			'source': 'polygon', // reference the data source
			'layout': {},
			'paint': {
				'fill-color': '#9370db', //color fill
				'fill-opacity': 0.5
			}
		});
		// Add a black outline around the polygon.
		map.addLayer({
			'id': 'outline',
			'type': 'line',
			'source': 'polygon',
			'layout': {},
			'paint': {
				'line-color': '#663399',
				'line-width': 2
			}
		});
	});
	return map;
}

function loadGeoMap(options) {
	mapboxgl.accessToken = 'pk.eyJ1IjoiaW1hcnRpbjAwMjMiLCJhIjoiY2t2NmJ1a2JsM3dldzJwcDZyeXp6bDlsYSJ9.8VlCX1xsLOIxjGiGO8X3Pg';
    const map = createMap(mapboxgl.accessToken, options);


    if (type == 'NDVI') {
    	addRasterImage(map, options);
    }
    else if (type == 'Weather') {
    	addPolygon(map, options);
    }
	
	$('.loader').css('visibility', 'hidden'); //to show
}

//MODIFIED: Only NOT created recommendations are added
function appendConsolidatedRecommendations(obj, calendar_details , probability, workorders) {
	console.log(obj);
	var string, isCreated;
	
	$('#recommendation_table').empty();
	
	for (var i = 0; i < obj.disasters.length; i++) {
		string = `<tr class="clickable"> <td colspan="2" class="text-left">Disaster Warning</td> <td colspan="3" class="text-left">${obj.disasters[i].description}</td> <td colspan="4" class="text-left"> `;
		for (var x = 0; x < obj.disasters[i].recommendation.length; x++) {
			string += `${obj.disasters[i].recommendation[x]}`;
		}
		string += `</td> <td colspan="1" class="text-center">N/A</td> </tr>`;
		$('#recommendation_table').append(string);
	}

	for (var i = 0; i < obj.nutrients.length; i++) {
		if (obj.nutrients[i].isCreated) {
			isCreated = 'Yes';
		}
		else {
			isCreated = 'No';
			string = `<tr class="clickable"> <td colspan="2" class="text-left">Nutrient Recommendation</td> <td colspan="3" class="text-left">Recommended ${obj.nutrients[i].description}</td> <td colspan="4" class="text-left"> Apply ${obj.nutrients[i].amount} bags of ${obj.nutrients[i].fertilizer_name} on ${obj.nutrients[i].target_application_date} </td> <td colspan="1" class="text-center"> ${isCreated} </td> </tr>`;
			$('#recommendation_table').append(string);
		}
		
	}

	
	$.get('/ajaxGetDiagnoses', {farm_id : $("#farm_id").val()}, function(diagnoses){
		//Get Probabilities from DB
		$.get("/ajaxGetPastProbabilities", {farm_id : $("#farm_id").val()}, function(probabilities){
			var i, x;
			var possibilities = [];
			for(i = 0; i < probability.length; i++){
				// console.log(probabilities[i]);
				for(x = 0; x < diagnoses.length; x++){
					if(diagnoses[x].pd_id == probability[i].pd_id && diagnoses[x].type == probability[i].type){
						// probability[i].probability = probability[i].probability * 1.1;
					}
				}
				if(probability[i].probability >= 30){
					possibilities.push(probability[i]);
				}
			}
			$.get('/ajaxGetDiagnosisStageFrequency',{farm_id : $("#farm_id").val()}, function(frequency){
				for(i = 0; i < possibilities.length; i++){
					var freq_stage = "N/A", stage_count = 0;
					for(x = 0; x < frequency.length; x++){
						if(possibilities[i].type == frequency[x].type && possibilities[i].pd_id == frequency[x].pd_id){
							if(frequency[x].count > stage_count){
								stage_count = frequency[x].count;
								freq_stage = frequency[x].stage_diagnosed;
							}
						}
						possibilities[i]["frequent_stage"] = freq_stage;
					}
				}
			});
			for(i = 0; i < possibilities.length; i++){
				//Add to pesticide application plan
				$.get("/getPDPreventions", {type : possibilities[i].type, id : possibilities[i].pd_id, possibilities : possibilities[i], land_prep_date : calendar_details.land_prep_date, seed_id : calendar_details.seed_planted, sowing_date : calendar_details.sowing_date, vegetation_date : calendar_details.sowing_date_end}, function(preventions){
					for(x = 0 ; x < preventions.length; x++){
						var existing_preventions = document.getElementsByClassName("preventions");
						var q;
						var cont = true;
						for(q = 0; q < $(".preventions").length; q++){
							console.log(document.getElementsByClassName("preventions")[q].textContent);
							console.log(preventions[x].detail_name);
							if(document.getElementsByClassName("preventions")[q].textContent == preventions[x].detail_name){
								cont = false;
							}
						}
						if(cont){
							preventions[x]["generated"] = "No";
							var y;
							for(y = 0; y < workorders.length; y++){
								var for_what = workorders[y].wo_notes.split(":");
								// console.log( preventions[x].detail_name + " - " + workorders[y].type);
								// console.log( preventions[x].date + " - " + workorders[y].date_start);
								if(preventions[x].detail_name == workorders[y].type){
									preventions[x].generated = "Yes";
								}
							}
							
							//Append
							string = '<tr class="clickable"> <td colspan="2" class="text-left">Pest/Disease</td> <td colspan="3" class="text-left preventions">' + preventions[x].detail_name + '</td> <td colspan="4" class="text-left"> ' + preventions[x].detail_desc + ' </td> <td colspan="1" class="text-center"> ' + preventions[x].generated + ' </td> </tr>';
							if(preventions[x].generated == "No")
								$('#recommendation_table').append(string);
						}
					}
					//Check and add to reco table
					

					// var row = '<div class="row"> <div class="col-lg-5 col-xxl-4"> <div class="card shadow mb-4"> <div class="card-header mini py-3" style="background: #212529;"> <h6 class="fw-bold m-0" style="color: #FFFFFF;">Pest/Disease ' + (i + 1) + '<br></h6> </div> <div class="card-body" style="height: 250px;"> <div class="table-responsive" style="border-style: none;"> <table class="table" style="height : 250px;"> <thead> </thead> <tbody> <tr style="border-style: none;"> <td style="border-style: none;"><span class="d-xxl-flex justify-content-xxl-start" style="font-weight: bold;">Name<br></span> <span class="d-xxl-flex justify-content-xxl-start" id="">' + possibilities[i].pest_name + '<br></span></td> <td style="border-style: none;"><span class="d-xxl-flex justify-content-xxl-start" style="font-weight: bold;">Type<br></span><span class="d-xxl-flex justify-content-xxl-start" id="">' + possibilities[i].pd_type + '<br></span></td> </tr> <tr style="border-style: none;"> <td style="border-style: none;"><span class="d-xxl-flex justify-content-xxl-start" style="font-weight: bold;">Frequent Stage<br></span><span class="d-xxl-flex justify-content-xxl-start"  id="">' + possibilities[i].frequent_stage + '<br></span></td><td style="border-style: none;"><span class="d-xxl-flex justify-content-xxl-start" style="font-weight: bold;">Avg Probability<br></span><span class="d-xxl-flex justify-content-xxl-start"  id="">' + parseFloat(possibilities[i].probability).toFixed(2) + '%<br></span></td> </tr> </tbody> </table> </div> </div> </div> </div> <div class="col-lg-7 col-xxl-8"> <div class="card shadow mb-4"> <div class="card-header mini py-3" style="background: #212529;height: auto;"> <h6 class="fw-bold m-0" style="color: #FFFFFF;">Pesticide Application Plan ' + (i + 1) + ' Information<br></h6> </div> <div class="card-body table-responsive" style="height : 250px; padding-left : 1.5rem; padding-right : 1.5rem;"> <table class="table" id="pd_recommendation_table" style="width: 100%;"> <thead> <tr> <th style="text-align: left; width : 25%">Date</th> <th style="text-align: left; width : 30%">Prevention</th> <th style="text-align: left; width : 40%">Description</th> <th style="text-align: left; width : 5%"></th> </tr> </thead> <tbody style="overflow: auto;"> ';
					// $("#body_step4").append();
					// for(x = 0; x < preventions.length; x++){
					// 	row = row + '<tr> <td style="text-align: left;">' + preventions[x].date + '</td> <td style="text-align: left;overflow: hidden;white-space: nowrap; text-overflow: ellipsis;">' + preventions[x].detail_name + '</td> <td style="text-align: left; overflow: hidden;white-space: nowrap; text-overflow: ellipsis;">' + preventions[x].detail_desc + '</td> <td style="text-align: left;"><input checked class="prevention_wo" type="checkbox" form="" id="" value="' + preventions[x].date + "|" + preventions[x].detail_name + "|" + possibilities[i].pest_name + ": " +  preventions[x].detail_desc + '"></td> </tr>';
					// }
					// row = row + '</tbody> </table> </div> </div> </div> </div>'
					// $("#body_step4").append(row);
				});
			}
		});
	});
	
}

function switchView(view) {
	if (view) {
		$("#mntr_card_body").children().children().not('#soil_data, #farm_information').addClass('hide');;

	}
	else {
		$("#mntr_card_body").children().children().not('#soil_data, #farm_information').removeClass('hide');;
	}
}

$(document).ready(function() {
	
	console.log('GIS Map Loader!!');
	console.log(view);

	if (view == 'farm_monitoring') {
		//Loading Icon
		$('.loader').css('visibility', 'visible'); //to show



		var viewed_farm_id;
		var viewed_farm_name;
		jQuery.ajaxSetup({async: false });
		var active_calendar;

		$.get('/get_farm_list', { group: 'farm_id' }, function(farms) {
			console.log(farms);
			var li, style = 'border: 1px solid rgba(0,0,0,.125)';
			

			for (var i = 0; i < farms.length; i++) {
				li = '';
				
				// Append active class if first li
				if (farms[i].farm_id == selected_farm_id) {
					viewed_farm_id = farms[i].farm_id;
					viewed_farm_name = farms[i].farm_name;
					var query = farms[i].farm_name;
					li = '<li style="'+style+'" class="farm_li list-group-item active_farm" data="'+farms[i].farm_id+'"><span>'+farms[i].farm_name+'</span><span class="float-end">'+farms[i].farm_area+'ha'+'</span></li>';
					$('#monitor_farm_list').append(li);
				}

				// Append default class
				else {
					li = '<li style="'+style+'" class="farm_li list-group-item" data="'+farms[i].farm_id+'"><span>'+farms[i].farm_name+'</span><span class="float-end">'+farms[i].farm_area+'ha'+'</span></li>';
					$('#monitor_farm_list').append(li);
				}
			}
			

			getFarmDetails({ farm_id: viewed_farm_id, calendar_id : viewed_farm_id});
			getGeoData(query);
		});

		// console.log("viewed_farm_id");
		// console.log(viewed_farm_name);
		
		var coordinates = [];
		var center = [];

		$.get('/agroapi/polygon/readAll', {}, function(polygons) {
			var polygon_id;
			var options = {};
			for (var i = 0; i < polygons.length; i++) {
				if (viewed_farm_name == polygons[i].name) {
					polygon_id = polygons[i].id;
					coordinates = polygons[i].geo_json.geometry.coordinates[0];

					center = polygons[i].center;
				}
			}
			var n_date = new Date();
			n_date.setDate(n_date.getDate() - 30);

			options = {
				center: center,
				coordinates: coordinates
			}

			//Get Crop calendar id
			var calendar_id = parseInt($("#crop_calendar_list").val());
			var active_calendar = parseInt($("#crop_calendar_list").val());
			console.log("CALENDAR ID");
			console.log(calendar_id);
			$(".calendar_based").removeAttr('hidden');
			if($("#crop_calendar_list").children('option').length == 0){
				$(".calendar_based").prop("hidden", !this.checked);
			}

				
			// If a crop calendar record exists
			if (calendar_id != null && !Number.isNaN(calendar_id)) {
				switchView(false);
				
				$.get("/ajax_farm_details", {farm_id : viewed_farm_id, center : center, coordinates : coordinates, calendar_id : calendar_id}, function(farm_details){

					// Get disaster and nutrient recommendations on load
					$.get('/get_recommendations', { calendar_id: calendar_id }, function(recommendation) {
						appendConsolidatedRecommendations(recommendation, farm_details.crop_calendar_details, farm_details.probability, farm_details.workorders);
					});

					$("#farm_id").text(farm_details.details[0].farm_id);
					$("#farm_name").text(farm_details.details[0].farm_name);
					$("#farm_type").text(farm_details.details[0].land_type);
					$("#farm_manager").text(farm_details.details[0].first_name + " " + farm_details.details[0].last_name);
					$("#farm_desc").text(farm_details.details[0].farm_desc);
					$("#farm_area").text(farm_details.details[0].farm_area + " sqm");
					
					$("#view_more_pd").attr("href", "/pest_and_disease/frequency");
					$("#vmore_resources").attr("href", "/farm_resources?farm_id=" + farm_details.details[0].farm_id);
					
					$(".calendar_name").text(farm_details.crop_calendar_details.crop_plan);
					$(".farm_name").text(farm_details.crop_calendar_details.farm_name);
					$(".calendar_seed").text(farm_details.crop_calendar_details.seed_name);
					$(".calendar_planting").text(farm_details.crop_calendar_details.method);
					$(".calendar_status").text(farm_details.crop_calendar_details.status);
					$(".calendar_status").addClass(farm_details.crop_calendar_details.status);
					$(".calendar_start").text(farm_details.crop_calendar_details.land_prep_date);
					$(".calendar_harvest").text(farm_details.crop_calendar_details.expected_harvest);
					
					$.get("/ajaxGetSoilData", {farm_name : farm_details.details[0].farm_name, calendar_id: calendar_id }, function(soil_data){
						
						$("#ph_lvl").text(soil_data.pH_lvl);
						$("#n_lvl").text(soil_data.n_val);
						$("#p_lvl").text(soil_data.p_val);
						$("#k_lvl").text(soil_data.k_val);
						
						$("#soil-data-btn").attr("href", "/nutrient_management/" + farm_details.details[0].farm_name+'/'+active_calendar);
					});
		
					var i;
					//UPDATE ROUSEOURCES
					$("#seed-table").empty();
					$("#fertilizer-table").empty();
					$("#pesticide-table").empty();
					for(i = 0; i < 5; i++){
						if(farm_details.seed[i].item_name == null)
							$("#seed-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;"></td><td style="padding: 2px;text-align: center;"> <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
						else
							$("#seed-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;">' + farm_details.seed[i].item_name + '</td><td style="padding: 2px;text-align: center;">' + farm_details.seed[i].current_amount + " " + farm_details.seed[i].units +' <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
					}
					for(i = 0; i < 5; i++){
						if(farm_details.fertilizer[i].item_name == null)
							$("#fertilizer-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;"></td><td style="padding: 2px;text-align: center;"><i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
						else
							$("#fertilizer-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;">' + farm_details.fertilizer[i].item_name + '</td><td style="padding: 2px;text-align: center;">' + farm_details.fertilizer[i].current_amount + " " + farm_details.fertilizer[i].units + ' <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
					}
					for(i = 0; i < 5; i++){
						if(farm_details.pesticide[i].item_name == null)
							$("#pesticide-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;"></td><td style="padding: 2px;text-align: center;"><i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
						else
							$("#pesticide-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;">' + farm_details.pesticide[i].item_name + '</td><td style="padding: 2px;text-align: center;">' + farm_details.pesticide[i].current_amount + " " + farm_details.pesticide[i].units + ' <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
					}

					
					//UPDATE PEST AND DISEASE CARD
					for(i = 0; i < 3; i++){
						if(farm_details.probability[i].pd_name == null)
							$("#probability_table").append('<tr class="clickable"><td style="text-align: left;"></td><td class="probability_value"></td></tr>');
						else
							$("#probability_table").append('<tr class="clickable"><td style="text-align: left;">' + farm_details.probability[i].pd_name + '</td><td>' + farm_details.probability[i].type + '</td><td class="probability_value">' + farm_details.probability[i].probability + '%</td></tr>');
					}
					update_color_meter2();

					for(i = 0; i < farm_details.workorders.length; i++){
						$("#land-prep-table").append('<tr class="clickable"><td style="text-align: left;">' + farm_details.workorders[i].status +'</td><td>' + farm_details.workorders[i].type +'</td><td>' + farm_details.workorders[i].date_start +'</td><td>' + farm_details.workorders[i].date_completed +'</td><td>' + farm_details.workorders[i].wo_notes +'</td></tr>');
						var tag_id = "#";
						if(farm_details.workorders[i].stage == "Land Preparation")
							tag_id = tag_id + "landprep-wo";
						else if(farm_details.workorders[i].stage == "Sowing")
							tag_id = tag_id + "sowing-wo";
						else if(farm_details.workorders[i].stage == "Vegetation")
							tag_id = tag_id + "vegetation-wo";
						else if(farm_details.workorders[i].stage == "Harvest")
							tag_id = tag_id + "harvest-wo";
						else if(farm_details.workorders[i].stage == "Reproductive")
							tag_id = tag_id + "reproduction-wo";
						else if(farm_details.workorders[i].stage == "Ripening")
							tag_id = tag_id + "ripening-wo";
						$(tag_id).append('<div class="card-body ' + farm_details.workorders[i].current +' card aos-init mini-card wo-card details" data-aos="flip-left" data-aos-duration="350"><div class="row" style="height: 40px; margin-top : 0px;"><div class="col card-title"><h5 class="card-title">' + farm_details.workorders[i].type +'</h5></div><div class="col">' + farm_details.workorders[i].status +'</div></div><div class="row" style="height: 30px;"><div class="col">START DATE</div><div class="col">COMPLETE DATE</div></div><div class="row" style="height: 30px;"><div class="col">' + farm_details.workorders[i].date_start +'</div><div class="col">' + farm_details.workorders[i].date_completed +'</div></div><div class="row" style="height: 30px;"><div class="col">' + farm_details.workorders[i].wo_notes +'</div></div></div>');
					}
				});
			}
			else {
				console.log('Error handling!!');
				$('#forecast_yield').html('N/A');
				switchView(true);
			}
		});



		$('#detailed_cont').on('change', '#crop_calendar_list', function() {
			console.log('!!');
			active_calendar = $("#crop_calendar_list").val();
			var calendar_id = $("#crop_calendar_list").val();
				active_calendar = $("#crop_calendar_list").val();
				$(".calendar_based").removeAttr('hidden');
				if($("#crop_calendar_list").children('option').length == 0){
					$(".calendar_based").prop("hidden", !this.checked);
				}
				$.get("ajax_farm_details", {farm_id : viewed_farm_id, center : center, calendar_id : calendar_id}, function(farm_details){
					$("#farm_id").text(farm_details.details[0].farm_id);
					$("#farm_name").text(farm_details.details[0].farm_name);
					$("#farm_type").text(farm_details.details[0].land_type);
					$("#farm_manager").text(farm_details.details[0].first_name + " " + farm_details.details[0].last_name);
					$("#farm_desc").text(farm_details.details[0].farm_desc);
					$("#farm_area").text(farm_details.details[0].farm_area + " sqm");
					
					$("#view_more_pd").attr("href", "/pest_and_disease/frequency");
					$("#vmore_resources").attr("href", "/farm_resources?farm_id=" + farm_details.details[0].farm_id);

					$(".calendar_name").text(farm_details.crop_calendar_details.crop_plan);
					$(".farm_name").text(farm_details.crop_calendar_details.farm_name);
					$(".calendar_seed").text(farm_details.crop_calendar_details.seed_name);
					$(".calendar_planting").text(farm_details.crop_calendar_details.method);
					$(".calendar_status").text(farm_details.crop_calendar_details.status);
					$(".calendar_status").addClass(farm_details.crop_calendar_details.status);
					$(".calendar_start").text(farm_details.crop_calendar_details.land_prep_date);
					$(".calendar_harvest").text(farm_details.crop_calendar_details.expected_harvest);

					$("#soil-data-btn").attr("href", "/nutrient_management/" + farm_details.details[0].farm_name+'/'+calendar_id);
					
					var i;
					//UPDATE ROUSEOURCES
					$("#seed-table").empty();
					$("#fertilizer-table").empty();
					$("#pesticide-table").empty();
					for(i = 0; i < 5; i++){
						if(farm_details.seed[i].item_name == null)
							$("#seed-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;"></td><td style="padding: 2px;text-align: center;"> <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
						else
							$("#seed-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;">' + farm_details.seed[i].item_name + '</td><td style="padding: 2px;text-align: center;">' + farm_details.seed[i].current_amount + " " + farm_details.seed[i].seeds + ' <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
					}
					for(i = 0; i < 5; i++){
						if(farm_details.fertilizer[i].item_name == null)
							$("#fertilizer-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;"></td><td style="padding: 2px;text-align: center;"><i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
						else
							$("#fertilizer-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;">' + farm_details.fertilizer[i].item_name + '</td><td style="padding: 2px;text-align: center;">' + farm_details.fertilizer[i].current_amount + " " +  farm_details.fertilizer[i].seeds +' <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
					}
					for(i = 0; i < 5; i++){
						if(farm_details.pesticide[i].item_name == null)
							$("#pesticide-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;"></td><td style="padding: 2px;text-align: center;"><i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
						else
							$("#pesticide-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;">' + farm_details.pesticide[i].item_name + '</td><td style="padding: 2px;text-align: center;">' + farm_details.pesticide[i].current_amount + " " +  farm_details.pesticide[i].seeds +' <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
					}
					//UPDATE PEST AND DISEASE CARD
					for(i = 0; i < 3; i++){
						if(farm_details.probability[i].pd_name == null)
							$("#probability_table").append('<tr class="clickable"><td style="text-align: left;"></td><td class="probability_value"></td></tr>');
						else
							$("#probability_table").append('<tr class="clickable"><td style="text-align: left;">' + farm_details.probability[i].pd_name + '</td><td>' + farm_details.probability[i].type + '</td><td class="probability_value">' + farm_details.probability[i].probability + '%</td></tr>');
						

					}
					update_color_meter2();

					$.get("/ajaxGetSoilData", {farm_name : farm_details.details[0].farm_name, calendar_id: calendar_id}, function(soil_data){
				
						$("#ph_lvl").text(soil_data.pH_lvl);
						$("#n_lvl").text(soil_data.n_val);
						$("#p_lvl").text(soil_data.p_val);
						$("#k_lvl").text(soil_data.k_val);
						
						$("#soil-data-btn").attr("href", "/nutrient_management/" + farm_details.details[0].farm_name+'/'+active_calendar);
					});

					$("#landprep-wo, #sowing-wo, #vegetation-wo, #harvest-wo, #reproduction-wo, #ripening-wo").empty();
					for(i = 0; i < farm_details.workorders.length; i++){
						$("#land-prep-table").append('<tr class="clickable"><td style="text-align: left;">' + farm_details.workorders[i].status +'</td><td>' + farm_details.workorders[i].type +'</td><td>' + farm_details.workorders[i].date_start +'</td><td>' + farm_details.workorders[i].date_completed +'</td><td>' + farm_details.workorders[i].wo_notes +'</td></tr>');
						var tag_id = "#";
						if(farm_details.workorders[i].stage == "Land Preparation")
							tag_id = tag_id + "landprep-wo";
						else if(farm_details.workorders[i].stage == "Sowing")
							tag_id = tag_id + "sowing-wo";
						else if(farm_details.workorders[i].stage == "Vegetation")
							tag_id = tag_id + "vegetation-wo";
						else if(farm_details.workorders[i].stage == "Harvest")
							tag_id = tag_id + "harvest-wo";
						else if(farm_details.workorders[i].stage == "Reproductive")
							tag_id = tag_id + "reproduction-wo";
						else if(farm_details.workorders[i].stage == "Ripening")
							tag_id = tag_id + "ripening-wo";
						
						$(tag_id).append('<div class="card-body ' + farm_details.workorders[i].current +' card aos-init mini-card wo-card details" data-aos="flip-left" data-aos-duration="350"><div class="row" style="height: 40px; margin-top : 0px;"><div class="col card-title"><h5 class="card-title">' + farm_details.workorders[i].type +'</h5></div><div class="col">' + farm_details.workorders[i].status +'</div></div><div class="row" style="height: 30px;"><div class="col">START DATE</div><div class="col">COMPLETE DATE</div></div><div class="row" style="height: 30px;"><div class="col">' + farm_details.workorders[i].date_start +'</div><div class="col">' + farm_details.workorders[i].date_completed +'</div></div><div class="row" style="height: 30px;"><div class="col">' + farm_details.workorders[i].wo_notes +'</div></div></div>');
						
						}

					
				});
		});


		
		//ONCLICK
		$('#monitor_farm_list').on('click', '.farm_li', function() {
			//alert("hi");
			
			// Add active class to the current li (highlight it)
			var current = document.getElementsByClassName("active_farm");
			current[0].className = current[0].className.replace(" active_farm", "");
			this.className += " active_farm";

			viewed_farm_id = $(this).attr('data');
			viewed_farm_name = $($(this).children()[0]).html();

			$('#monitor_farmers_table').empty();

			//To be removed
			var query = viewed_farm_name;
			console.log(query);
			getFarmDetails({ farm_id: viewed_farm_id ,  calendar_id : viewed_farm_id});
			getGeoData(query);

			//Y2 Add Farm Monitoring Ajax
			//UPDATE FARM DETAILS
			$(".table-details").empty();
			$.get('/agroapi/polygon/readAll', {}, function(polygons) {
				var center = [];
				for (var i = 0; i < polygons.length; i++) {
					if (viewed_farm_name == polygons[i].name) {
						center = polygons[i].center;
					}
				}

				//GET DETAILS OF NEW FARM

				var calendar_id = parseInt($("#crop_calendar_list").val());
				active_calendar = parseInt($("#crop_calendar_list").val());
				console.log(calendar_id+' - '+active_calendar);
				$(".calendar_based").removeAttr('hidden');
				if($("#crop_calendar_list").children('option').length == 0){
					$(".calendar_based").prop("hidden", !this.checked);
				}

				// If no crop calendars exist
				if (calendar_id != null && !Number.isNaN(calendar_id)) {
					switchView(false);
					
					$.get("ajax_farm_details", {farm_id : viewed_farm_id, center : center, calendar_id : calendar_id}, function(farm_details){

						// Get disaster and nutrient recommendations on change farm selected
						$.get('/get_recommendations',  { calendar_id: calendar_id }, function(recommendation) {
							appendConsolidatedRecommendations(recommendation, farm_details.crop_calendar_details, farm_details.probability, farm_details.workorders);
						});


						$("#farm_id").text(farm_details.details[0].farm_id);
						$("#farm_name").text(farm_details.details[0].farm_name);
						$("#farm_type").text(farm_details.details[0].land_type);
						$("#farm_manager").text(farm_details.details[0].first_name + " " + farm_details.details[0].last_name);
						$("#farm_desc").text(farm_details.details[0].farm_desc);
						$("#farm_area").text(farm_details.details[0].farm_area + " sqm");
						
						$("#view_more_pd").attr("href", "/pest_and_disease/frequency");
						$("#vmore_resources").attr("href", "/farm_resources?farm_id=" + farm_details.details[0].farm_id);
						
						$(".calendar_name").text(farm_details.crop_calendar_details.crop_plan);
						$(".farm_name").text(farm_details.crop_calendar_details.farm_name);
						$(".calendar_seed").text(farm_details.crop_calendar_details.seed_name);
						$(".calendar_planting").text(farm_details.crop_calendar_details.method);
						$(".calendar_status").text(farm_details.crop_calendar_details.status);
						$(".calendar_status").addClass(farm_details.crop_calendar_details.status);
						$(".calendar_start").text(farm_details.crop_calendar_details.land_prep_date);
						$(".calendar_harvest").text(farm_details.crop_calendar_details.expected_harvest);

						$("#soil-data-btn").attr("href", "/nutrient_management/" + farm_details.details[0].farm_name+'/'+calendar_id);
						
						var i;
						//UPDATE ROUSEOURCES
						$("#seed-table").empty();
						$("#fertilizer-table").empty();
						$("#pesticide-table").empty();
						for(i = 0; i < 5; i++){
							if(farm_details.seed[i].item_name == null)
								$("#seed-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;"></td><td style="padding: 2px;text-align: center;"> <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
							else
								$("#seed-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;">' + farm_details.seed[i].item_name + '</td><td style="padding: 2px;text-align: center;">' + farm_details.seed[i].current_amount + " " + farm_details.seed[i].units +' <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
						}
						for(i = 0; i < 5; i++){
							if(farm_details.fertilizer[i].item_name == null)
								$("#fertilizer-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;"></td><td style="padding: 2px;text-align: center;"><i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
							else
								$("#fertilizer-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;">' + farm_details.fertilizer[i].item_name + '</td><td style="padding: 2px;text-align: center;">' + farm_details.fertilizer[i].current_amount + " " + farm_details.fertilizer[i].units +' <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
						}
						for(i = 0; i < 5; i++){
							if(farm_details.pesticide[i].item_name == null)
								$("#pesticide-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;"></td><td style="padding: 2px;text-align: center;"><i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
							else
								$("#pesticide-table").append('<tr style="min-height: 50px;"><td class="text-center" style="padding: 2px;">' + farm_details.pesticide[i].item_name +  '</td><td style="padding: 2px;text-align: center;">' + farm_details.pesticide[i].current_amount + " " + farm_details.pesticide[i].units + ' <i class="fa fa-warning" data-toggle="tooltip" data-bss-tooltip="" style="margin-left: 5px;color: var(--orange);" title="Low in Stock. Replenish now."></i>&nbsp;</td></tr>');
						}
						//UPDATE PEST AND DISEASE CARD
						for(i = 0; i < 3; i++){
							if(farm_details.probability[i].pd_name == null)
								$("#probability_table").append('<tr class="clickable"><td style="text-align: left;"></td><td class="probability_value"></td></tr>');
							else
								$("#probability_table").append('<tr class="clickable"><td style="text-align: left;">' + farm_details.probability[i].pd_name + '</td><td>' + farm_details.probability[i].type + '</td><td class="probability_value">' + farm_details.probability[i].probability + '%</td></tr>');
							

						}
						update_color_meter2();

						$.get("/ajaxGetSoilData", {farm_name : farm_details.details[0].farm_name, calendar_id: calendar_id}, function(soil_data){
					
							$("#ph_lvl").text(soil_data.pH_lvl);
							$("#n_lvl").text(soil_data.n_val);
							$("#p_lvl").text(soil_data.p_val);
							$("#k_lvl").text(soil_data.k_val);
							
							$("#soil-data-btn").attr("href", "/nutrient_management/" + farm_details.details[0].farm_name+'/'+active_calendar);
						});

						$("#landprep-wo, #sowing-wo, #vegetation-wo, #harvest-wo, #reproduction-wo, #ripening-wo").empty();
						for(i = 0; i < farm_details.workorders.length; i++){
							$("#land-prep-table").append('<tr class="clickable"><td style="text-align: left;">' + farm_details.workorders[i].status +'</td><td>' + farm_details.workorders[i].type +'</td><td>' + farm_details.workorders[i].date_start +'</td><td>' + farm_details.workorders[i].date_completed +'</td><td>' + farm_details.workorders[i].wo_notes +'</td></tr>');
							var tag_id = "#";
							if(farm_details.workorders[i].stage == "Land Preparation")
								tag_id = tag_id + "landprep-wo";
							else if(farm_details.workorders[i].stage == "Sowing")
								tag_id = tag_id + "sowing-wo";
							else if(farm_details.workorders[i].stage == "Vegetation")
								tag_id = tag_id + "vegetation-wo";
							else if(farm_details.workorders[i].stage == "Harvest")
								tag_id = tag_id + "harvest-wo";
							else if(farm_details.workorders[i].stage == "Reproductive")
								tag_id = tag_id + "reproduction-wo";
							else if(farm_details.workorders[i].stage == "Ripening")
								tag_id = tag_id + "ripening-wo";
							
							$(tag_id).append('<div class="card-body ' + farm_details.workorders[i].current +' card aos-init mini-card wo-card details" data-aos="flip-left" data-aos-duration="350"><div class="row" style="height: 40px; margin-top : 0px;"><div class="col card-title"><h5 class="card-title">' + farm_details.workorders[i].type +'</h5></div><div class="col">' + farm_details.workorders[i].status +'</div></div><div class="row" style="height: 30px;"><div class="col">START DATE</div><div class="col">COMPLETE DATE</div></div><div class="row" style="height: 30px;"><div class="col">' + farm_details.workorders[i].date_start +'</div><div class="col">' + farm_details.workorders[i].date_completed +'</div></div><div class="row" style="height: 30px;"><div class="col">' + farm_details.workorders[i].wo_notes +'</div></div></div>');
						}
					});
				}
				else {
					console.log('Error handle no crop calendar!');
					$('#forecast_yield').html('N/A');
					switchView(true);
				}	
			});	
		});

		$('#toggle_ndvi').on('click', function() {
			type = 'NDVI';
			//To be removed
			var query = viewed_farm_name;

			getGeoData(query);
		});

		$('#toggle_weather').on('click', function() {
			type = 'Weather';
			
			//To be removed
			var query = viewed_farm_name;

			getGeoData(query);
		});

	}
	else if (view == '') {

	}
	else if (view == undefined) {

	}	

});
