function addDays(d1, days) {
	d1.setDate(d1.getDate() + days);

	return d1;
}

function changeFarmDetails(id, farm_list) {
	if (farm_list.length == 0) {
		$('#farm_desc').html("None");
		$('#farm_desc').html("None");
		$('#land_type').html("None");
		$('#farm_area').html("None");
		$('#farm_area_cont').html("None");
	}

	else {
		var i = 0;
		while (farm_list[i].farm_id != id) {
			i++;
		}

		if (farm_list[i].farm_desc == null) {
			$('#farm_desc').html("None");
		}
		else {
			$('#farm_desc').html(farm_list[i].farm_desc);
		}

		$('#land_type').html(farm_list[i].land_type);
		$('#farm_area').html(`${farm_list[i].farm_area} ha`);

		$('#farm_area_cont').html(`${farm_list[i].farm_area} ha`);
	}
}

function setElementAttributes(ele, obj_arr) {
	for (var i = 0; i < obj_arr.prop.length; i++) {
		if (obj_arr.prop[i] == 'inner_HTML')
			ele.innerHTML = obj_arr.val[i]
		else
			ele.setAttribute(obj_arr.prop[i], obj_arr.val[i]);
	}

	return ele;
}

function appendForecastDetails(data) {
	$('#icon_detail').html(data.icon);
	$('#temp_detail').html(data.max_temp);
	$('#precipitation_detail').html(data.data[0].pressure);
	$('#humidity_detail').html(data.data[0].humidity);
	$('#rainfall_detail').html(data.data[0].rainfall);
	$('#weather_day_detail').html(data.date);
	$('#weather_desc_detail').html('');
}

function dateDiff(d1, d2) {
	var diff = new Date(d1) - new Date(d2);
	diff /= 86400000;

	return diff;
}

function appendRecommendation(obj) {
	$('#weather_outlook').html(obj.risk_lvl);
	$('#weather_summary').html(obj.msg);
}

function generateRecommendation(arr) {
	var obj = {};
	var good_obj = {};
	var stats = {
		good: [], bad: [], risk_lvl: 0, msg: ''
	};
	var avg_rainfall = 0;
	var counter = 0;

	var start_date, end_date, good_start, good_end;
	var chain = false, good_chain = false;
	var push = false, good_push = false;


	for (var i = 0; i < arr.length; i++) {
		var count = arr[i].data.filter(data => data.desc == 'light rain').length;
		console.log(arr[i].date+' - '+count);

		// Start bad day cycle if rainfall happens thrice in a day
		if (count >= 3) {

			if (!chain) {
				start_date = arr[i].date;
				chain = true;

				obj['start'] = start_date;
				
				avg_rainfall = count;
				counter = 1;
			}
			else {
				avg_rainfall += count;
				counter++;
			}

			if (good_chain) {
				good_end = arr[i-1].date;
				good_chain = false;

				good_obj['end'] = good_end;

				var diff = dateDiff(good_obj.end, good_obj.start);

				if (diff >= 3) {
					good_push = true;
				}
			}
		}
		// 
		else {
			avg_rainfall = 0;
			counter = 0;

			if (chain) {
				end_date = arr[i-1].date;
				chain = false;

				obj['end'] = end_date;


				var diff = dateDiff(obj.end, obj.start);

				if (diff >= 3) {
					push = true;
				}
			}

			if (!good_chain) {
				good_start = arr[i].date;
				good_chain = true;

				good_obj['start'] = good_start;
			}
			
		}

		// Check for ongoing bad or good days on the last index
		if (i == arr.length - 1) {
			if (obj.start != undefined) {
				end_date = arr[i].date;
				obj['end'] = end_date;

				push = true;

			}

			if (good_obj.start != undefined) {
				good_end = arr[i].date;
				good_obj['end'] = good_end;

				good_push = true;
			}
		}

		if (push) {
			stats.bad.push(obj);
			obj = {};
			push = false;
		}

		if (good_push) {
			stats.good.push(good_obj);
			good_obj = {};
			good_push = false;
		}
	}
	console.log('-------------------');
	console.log(stats.good);
	console.log(stats.bad);

	for (var i = 0; i < stats.bad.length; i++) {
		var diff = dateDiff(stats.bad[i].start, stats.bad[i].end);

		if (diff >= 5) {
			stats.risk_lvl += 3;
		}

		stats.risk_lvl += 1.5;
	}

	if (stats.risk_lvl >= 8) {
		stats.risk_lvl = 'High Risk';
	}
	else if (stats.risk_lvl < 8 && stats.risk_lvl >= 6) {
		stats.risk_lvl = 'Moderately Risky';
	}
	else {
		stats.risk_lvl = 'Low Risk';
	}

	if (stats.bad.length == 1) {
		stats.msg += 'Continuous rainfall is expected from '+stats.bad[0].start+' to '+stats.bad[0].end+' with fairly low risks of seed damages. The recommended date of planting is ';

		if (stats.good.length == 2) {
			stats.msg += 'from between '+stats.good[0].start+' until '+stats.good[0].end+' or '+stats.good[1].start+' until '+stats.good[1].end+'.';
		}
		else {
			stats.msg += 'from '+stats.good[0].start+' onwards.';
		}
	}
	else if (stats.bad.length >= 2) {
		var date_diff = dateDiff(stats.bad[0].end, stats.bad[1].start);
		stats.msg += 'Multiple cycles of rainfall is expected within the next two weeks with the first rainfall expecting to hit by '+stats.bad[0].start+' which would last until '+stats.bad[0].end+' and the second cycle is expected to start '+date_diff+' days after the end of the first cycle on '+stats.bad[1].start+' and is expected to last until '+stats.bad[1].end+'.With this, the recommended date of planting is between '+stats.good[0].start+' and '+stats.good[0].end+'.';


	}

	appendRecommendation(stats);
}

function autocomplete(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function(e) {
      var a, b, i, val = this.value;
      /*close any already open lists of autocompleted values*/
      closeAllLists();
      if (!val) { return false;}
      currentFocus = -1;
      /*create a DIV element that will contain the items (values):*/
      a = document.createElement("DIV");
      a.setAttribute("id", this.id + "autocomplete-list");
      a.setAttribute("class", "autocomplete-items");
      /*append the DIV element as a child of the autocomplete container:*/
      this.parentNode.appendChild(a);
      /*for each item in the array...*/
      for (i = 0; i < arr.length; i++) {
        /*check if the item starts with the same letters as the text field value:*/
        if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
          /*create a DIV element for each matching element:*/
          b = document.createElement("DIV");
          /*make the matching letters bold:*/
          b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
          b.innerHTML += arr[i].substr(val.length);
          /*insert a input field that will hold the current array item's value:*/
          b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
          /*execute a function when someone clicks on the item value (DIV element):*/
              b.addEventListener("click", function(e) {
              /*insert the value for the autocomplete text field:*/
              inp.value = this.getElementsByTagName("input")[0].value;
              /*close the list of autocompleted values,
              (or any other open lists of autocompleted values:*/
              closeAllLists();
          });
          a.appendChild(b);
        }
      }
  });
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function(e) {
      var x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode == 40) {
        /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
        currentFocus++;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 38) { //up
        /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
        currentFocus--;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 13) {
        /*If the ENTER key is pressed, prevent the form from being submitted,*/
        e.preventDefault();
        if (currentFocus > -1) {
          /*and simulate a click on the "active" item:*/
          if (x) x[currentFocus].click();
        }
      }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
      x[i].parentNode.removeChild(x[i]);
    }
  }
}
/*execute a function when someone clicks in the document:*/
document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});
}

function adjustDates(seed_list, event) {
	var selected_seed_dat = seed_list[$('#seed_id').prop('selectedIndex')].maturity_days;
	var land_prep_start = new Date(formatDate(new Date($('#land_prep_date_start').val()), 'YYYY-MM-DD'));
	var land_prep_end = addDays(land_prep_start, 21);
	$('#land_prep_date_end').val(formatDate(land_prep_end, 'YYYY-MM-DD'));

	//Get planting method
	var planting_method;
	planting_method = $("#method").val();
	var sow_start_var;
	if (event == 'sow_date') {
		var sowing_start = new Date($('#sowing_date_start').val());
	}
	else if (event == 'seed') {
		var sowing_start = new Date($('#sowing_date_start').val());
	}
	else if (event == 'land_prep' || event == 'planting_method') {
		var sowing_start = land_prep_end;

		if(planting_method == "Transplanting")
			sow_start_var = -15;
		else if(planting_method == "Direct Seeding")
			sow_start_var = 1;

		sowing_start = addDays(sowing_start, sow_start_var);
	}

	$('#sowing_date_start').val(formatDate(sowing_start, 'YYYY-MM-DD'));

	var sowing_end = sowing_start;
	//Adjust
	var sowing_days;

	if(planting_method == "Transplanting")
		sowing_days = 18;
	else if(planting_method == "Direct Seeding")
		sowing_days = 3;
	sowing_end = addDays(sowing_end, sowing_days);
	$('#sowing_date_end').val(formatDate(sowing_end, 'YYYY-MM-DD'));

	//Adjust
	var seed_id;
	seed_id = $("#seed_id").val();
	var harvest_start = sowing_end;
	harvest_start = addDays(harvest_start, selected_seed_dat + 65);
	$('#harvest_date_start').val(formatDate(harvest_start, 'YYYY-MM-DD'));

	var harvest_end = harvest_start;
	harvest_end = addDays(harvest_end, 7);
	$('#harvest_date_end').val(formatDate(harvest_end, 'YYYY-MM-DD'));
}

function processSeedRate(seed_list, farm_list) {
	if ($('#seed_rate').val() != '') {
		var seed_qty;
		var seed_details = seed_list[$('#seed_id').prop('selectedIndex')];
		var farm_area = farm_list[$('#farm_id').prop('selectedIndex')].farm_area;
		var conversion = 2.205;
		var seed_rate = $('#seed_rate').val();
		$('#seed_rate_cont').html(seed_rate+' kg/ha');
		
		seed_rate = ((seed_rate / conversion) * farm_area);
		console.log(seed_rate);
		seed_rate = Math.ceil((seed_rate/seed_details.amount));
		console.log(seed_details);
		$('#seed_qty').html(seed_rate+' bags');
		
		$('#num_seed_bags').val(seed_rate);

		$('#seed_maturity_days').val(seed_details.maturity_days);
	}
}

function consolidateFRItems(wo_arr, frp_id) {
	var checkboxes = [];
	var checkbox_state = [];
	$("input:checkbox[name='fr_checkbox']").each(function() {
	   checkboxes.push($($(this)).val());
	   checkbox_state.push($(this).prop('checked'));
	});
	wo_arr = [];

	if (checkboxes.length != 0) {
		var index = [];
		var rows = $('#fertilizer_recommendation_table').children().filter('tbody').children().filter('.fr_item');
		var selected;
		var wo_obj;

		for (var i = 0; i < checkboxes.length; i++) {
			selected = $($(rows)[checkboxes[i]]).children().filter('input:hidden');

			var str = $(selected[4]).prop('value');

			str = str.replace(' bags', '');
			wo_obj  = {
				fr_plan_id: frp_id,
				target_application_date: $(selected[0]).prop('value'),
				fertilizer_id: $(selected[1]).prop('value'),
				nutrient: $(selected[2]).prop('value'),
				description: $(selected[3]).prop('value'),
				amount: str,
				isCreated: checkbox_state[i],
				wo_id: null,
			};

			wo_arr.push(wo_obj);
		}

	}

	return wo_arr;
}

function processCNRItems(calendar_id) {
	var obj, start_date, due_date, arr = [];
	var dates = $("input[name='cnr_item_target_date").map(function(){return $(this).val();}).get();
	var fertilizers = $("select[name='cnr_item_fertilizer']").map(function(){return $(this).val();}).get();
	var desc = $("textarea[name='cnr_item_desc']").map(function(){return $(this).val();}).get();
	var amt = $("input[name='cnr_item_amount").map(function(){return $(this).val();}).get();
	var checkbox = $("input[name='cnr_fr_checkbox").map(function(){return $(this).val();}).get();
	
	for (var i = 0; i < checkbox.length; i++) {
		start_date = new Date(dates[i]);
		due_date = new Date(start_date.setDate(start_date.getDate() + 7));
		obj = {
			wo_type: 'Fertilizer Application',
			crop_calendar_id: calendar_id,
			start_date: start_date,
			due_date: due_date,
			notes: desc[i],
			resources: {
				ids: [fertilizers[i]],
				qty: [amt[i]]
			}
		}

		arr.push(obj);
	}
	console.log(arr);
	return arr;
}

function processManualWO(calendar_id) {
	var obj, start_date, due_date, arr = [];
	var dates = $("input[name='manual_date").map(function(){return $(this).val();}).get();
	var fertilizers = $("select[name='manual_fertilizer']").map(function(){return $(this).val();}).get();
	var desc = $("textarea[name='manual_desc']").map(function(){return $(this).val();}).get();
	var amt = $("input[name='manual_amt").map(function(){return $(this).val();}).get();
	
	for (var i = 0; i < dates.length; i++) {
		start_date = new Date(dates[i]);
		due_date = new Date(start_date.setDate(start_date.getDate() + 7));
		obj = {
			wo_type: 'Fertilizer Application',
			crop_calendar_id: calendar_id,
			start_date: start_date,
			due_date: due_date,
			notes: desc[i],
			resources: {
				ids: [fertilizers[i]],
				qty: [amt[i]]
			}
		}
		arr.push(obj);
	}

	return arr;
}

function processCustomFR(calendar_id) {
	var obj, start_date, due_date, arr = [], temp_arr;
	var cont = [];
	var checked_item_rows = $('input[name="cnr_fr_checkbox"]:checked').each(function() {
		temp_arr = $(this).parent().parent().find('input').map(function() {
			return $(this).val();
		}).get();
		cont.push(temp_arr);
	});

	cont.forEach(function(item) {
		start_date = new Date(item[0]);
		due_date = new Date(start_date.setDate(start_date.getDate() + 7));
		obj = {
			wo_type: 'Fertilizer Application',
			crop_calendar_id: calendar_id,
			start_date: start_date,
			due_date: due_date,
			notes: item[2],
			resources: {
				ids: [item[1]],
				qty: [item[3]]
			}
		}

		arr.push(obj);
	});

	return arr;
}

function processFRtoDB(arr, item_list, calendar_id) {
	item_list = item_list.filter(e => e.isCreated == true);

	var obj = { };
	var start_date;
	var due_date;
	for (var i = 0; i < item_list.length; i++) {
		start_date = new Date(item_list[i].target_application_date);
		due_date = new Date(start_date.setDate(start_date.getDate() + 7));

		obj = {
			wo_type: 'Fertilizer Application',
			crop_calendar_id: calendar_id,
			start_date: item_list[i].target_application_date,
			due_date: due_date,
			notes: item_list[i].description,
			resources: {
				ids: [item_list[i].fertilizer_id],
				qty: [Math.round(item_list[i].amount * 100) / 100]
			}
		}
		arr.push(obj);
	}

	return arr;
}

$(document).ready(function() {
	jQuery.ajaxSetup({async: false });

	var farm_select = $('#farm_id'), seed_select = $('#seed_id');
	var farm_list, seed_list;
	var wo_arr = [];
	var calendar_id;
	var now = new Date();
	var first_season_range = [new Date('2022-06-01'), new Date('2022-10-01')];
	var season_name;

	console.log(first_season_range[0].getMonth() >= now.getMonth());
	if (first_season_range[0].getMonth() >= now.getMonth() && now.getMonth() < first_season_range[1].getMonth()) {
		season_name = `Early ${now.getFullYear()}`;
	}
	else {
		season_name = `Late ${now.getFullYear()+1}`;
	}

	console.log(season_name);
	$('#crop_plan').val(season_name);

	//Event listeners
	$("#method").on("change", function(){
		adjustDates(seed_list, 'planting_method');
	});

	$('#land_prep_date_start').on('change', function() {
		adjustDates(seed_list, 'land_prep');
	});

	$('#seed_id').on('change', function() {
		adjustDates(seed_list, 'seed');

		processSeedRate(seed_list, farm_list);

	});

	$('#sowing_date_start').on('change', function() {
		adjustDates(seed_list, 'sow_date');
	});

	$('#seed_rate').on('change', function() {
		processSeedRate(seed_list, farm_list);
	});




	$('#crop_calendar_form').on('submit', function(e) {
		e.preventDefault();

		var form_data = $('#crop_calendar_form').serializeJSON();
		//console.log(form_data);

		$.post('/create_crop_plan', form_data, function(crop_plan) {
			var wo_data = [];
			var wo_obj;
			var fr_items;
			var wo_fr_items = [];
			var fr_plan_id;

			form_data['manual_wo'] = processManualWO(crop_plan.insertId);
			form_data['manual_wo'] = form_data['manual_wo'].concat(processCustomFR(crop_plan.insertId));
			console.log(form_data.manual_wo);
			//Create forecast record
			var forecast_val = form_data.seed_expected_yield;;
			if (forecast_val == 'Insufficient historical data to make forecast') {
				forecast_val = -1;
			}

			$.get('/create_forecast_record', { calendar_id: crop_plan.insertId, seed_id: form_data.seed_id, forecast: forecast_val }, function(forecast_record) {

			});

			// Check if FR Plan already exists!
			$.get('/get_nutrient_plan_details', { farm_id: form_data.farm_id }, function(fr_plans) {

				if (fr_plans.length != 0) {
					if (fr_plans[0].calendar_id == null) {
						$.post('/update_nutrient_plan', { update: { calendar_id: crop_plan.insertId, last_ndvi: 0 }, filter: { fr_plan_id: fr_plans[0].fr_plan_id } }, function(fr_plan_update) {
							fr_items = consolidateFRItems(wo_arr, fr_plans[0].fr_plan_id);
						});
					}
					else {
						$.post('/create_nutrient_plan', { farm_id: form_data.farm_id ,calendar_id: crop_plan.insertId, last_updated: formatDate(new Date(), 'YYYY-MM-DD'), last_ndvi: 0 }, function(nutrient_plan) {
							fr_items = consolidateFRItems(wo_arr, nutrient_plan.insertId);
						});
					}
				}
				else {
					$.post('/create_nutrient_plan', { farm_id: form_data.farm_id ,calendar_id: crop_plan.insertId, last_updated: formatDate(new Date(), 'YYYY-MM-DD'), last_ndvi: 0 }, function(nutrient_plan) {
						fr_items = consolidateFRItems(wo_arr, nutrient_plan.insertId);
					});
				}
			});

			// Check Soil Test Special Case w/ null calendar_id
			$.get('/get_soil_records', { farm_id: form_data.farm_id }, function(soil_records) {
				if (soil_records.length != 0 && soil_records[0].calendar_id == null) {
					$.post('/update_soil_records', { update: { calendar_id: crop_plan.insertId }, filter: { soil_quality_id: soil_records[0].soil_quality_id } }, function(soil_update) {
					
					});
				} 
			});

			// Generate work orders
			wo_obj = {
				wo_type: 'Land Preparation',
				crop_calendar_id: crop_plan.insertId,
				due_date: form_data.land_prep_date_end,
				start_date: form_data.land_prep_date_start,
				resources: { name: [''], ids: [''], qty: [''] },
				notes: 'Generated Land Preparation Work Order'
			}
			wo_data.push(wo_obj);

			var wo_obj;
			wo_obj = {
				wo_type: 'Sow Seed',
				crop_calendar_id: crop_plan.insertId,
				due_date: form_data.sowing_date_end,
				start_date: form_data.sowing_date_start,
				resources: { name: [''], ids: [form_data.seed_id], qty: [parseFloat(form_data.num_seed_bags)] },
				notes: 'Generated Sow Seed Work Order'
			}
			wo_data.push(wo_obj);

			var wo_obj;
			wo_obj = {
				wo_type: 'Harvest',
				crop_calendar_id: crop_plan.insertId,
				due_date: form_data.harvest_date_end,
				start_date: form_data.harvest_date_start,
				resources: { name: [''], ids: [''], qty: [''] },
				notes: 'Generated Harvest Work Order'
			}
			wo_data.push(wo_obj);

			for (var i = 0; i < wo_data.length; i++) {
				$.post('/upload_wo', wo_data[i], function(wo) {
							
				});
			}

			$(".prevention_wo:checkbox:checked").each(function(){
				var values = $(this).val().split("|");
				var temp_date = new Date(values[0]);
				temp_date.setDate(temp_date.getDate() + 7);
				var temp_wo = {
					type : values[1],
					notes : values[2],
					date_created : moment(new Date()).format('YYYY-MM-DD'),
					date_start : moment(values[0]).format('YYYY-MM-DD'),
					date_due : moment(temp_date).format('YYYY-MM-DD'),
					crop_calendar_id : crop_plan.insertId
				}
				$.post('/create_wo', {wo : temp_wo}, function(wo) {
					wo = wo.replace('/farms/work_order&id=', '');
					fr_items[i].wo_id = wo;
				});

			});

			//Create work order for manual FR items and CNR items
			for (var i = 0; i < form_data.manual_wo.length; i++) {
				$.post('/upload_wo', form_data.manual_wo[i], function(manual_wo) {
					console.log('Success manual wo!');
				});
			}

			//Create work order for FR items
				// Insert FK with work_order_id for generated fr_items
			wo_fr_items = processFRtoDB([], fr_items, crop_plan.insertId);

			for (var i = 0; i < fr_items.length; i++) {
				for (var x = 0; x < wo_fr_items.length; x++) {
					if (wo_fr_items[x].notes == fr_items[i].description) {
						$.post('/upload_wo', wo_fr_items[x], function(wo) {
							wo = wo.replace('/farms/work_order&id=', '');
							fr_items[i].wo_id = wo;
						});
					}
				}
				$.post('/create_nutrient_item', fr_items[i], function(nutrient_item) {
						if (i == fr_items.length - 1) {
							window.location.href = '/crop_calendar';
						}
				});
			}
		});
	});

	// Create auto complete dropdown for crop plan name
	$.get('/get_crop_plans', { status: ['Active', 'In-Progress'], unique: true}, function(plans) {

		var plan_arr = [];
		for (var i = 0; i < plans.length; i++) {
			plan_arr.push(plans[i].crop_plan);
		} 
		autocomplete(document.getElementById("crop_plan"), plan_arr);

	});

	// Dynamically load farm list
	$.get('/get_farm_list', { where: { key: 't1.farm_id', value: 'not in (SELECT farm_id FROM capstone_agriculture_db.crop_calendar_table where status != "Completed")', type: 'Data validation' } }, function(result) {
		farm_list = result;

		if (result.length != 0) {
			for (var i = 0; i < result.length; i++) {
				farm_select.append("<option value='"+result[i].farm_id+"'>"+result[i].farm_name+"</option>");
			}
			changeFarmDetails(result[0].farm_id, farm_list);
		}
		else {
			$('#farm_id').attr('disabled', true);
			$($('#farm_id').parent()).append('<label class="text-danger">All farms have existing crop calendar. Unable to create new crop calendar</label>')
		}
	});

	$('#farm_id').on('change', function(e) {
		changeFarmDetails($(this).val(), farm_list);
	});

	$.get('/get_materials', { type: 'Seed' }, function(result) {
		seed_list = result;
		for (var i = 0; i < result.length; i++) {
			seed_select.append("<option value='"+result[i].id+"'>"+result[i].name+"</option>");
		}
		$('#seed_maturity_days').val(result[0].maturity_days);
	});
});