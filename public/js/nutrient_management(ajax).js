var opts = '';
$.get("/ajaxGetMaterials", {type : "Fertilizer"}, function(result){
    var i;
    for(i = 0; i < result.length; i++){
    	opts += `<option value="${result[i].id}">${result[i].name}</option>`;
    }
});

function appendDetails(obj_details, target_arr, planting_details) {
	var obj_keys = ['n_lvl', 'p_lvl', 'k_lvl', 'n_val', 'p_val', 'k_val', 'pH_lvl'];
	for (var i = 0; i < target_arr.length; i++) {
		$(target_arr[i]).html(obj_details[obj_keys[i]]);
	}

	if (!obj_details.default_soil) {
		$('#soil_test_date').html(formatDate(new Date(obj_details.date_taken), 'YYYY-MM-DD'));
		$('#default_soil').addClass('hide');
	}
	else {
		$('#soil_test_date').html('N/A');
		$('#soil_test_date').addClass('text-danger');
		$('#default_soil').removeClass('hide');
	}

	$('#seed_name').html(planting_details.seed_name);
	$('#method_detail').html(planting_details.method);
}

function createDOM(obj) {
	var ele;

	ele = document.createElement(obj.type);
	ele.setAttribute('class', obj.class);
	ele.setAttribute('style', obj.style);
	ele.innerHTML = obj.html;

	for (prop in obj.attr) {
		if (Object.prototype.hasOwnProperty.call(obj.attr, prop)) {
			if (prop == 'data_href') {
				new_prop = 'data-href';
			}
			else {
				new_prop = prop;
			}
			ele.setAttribute(new_prop, obj.attr[prop]);
	    }
	}

	return ele;
}

function getNDVI(farm_name, dat, N_recommendation, sowing_date, system_date, ndvi_cont) {
	console.log(farm_name);
	var farm_area
	$.get('/get_farm_list', {}, function(farm_list) {
		farm_area = farm_list.filter(e => e.farm_name, farm_name)[0].farm_area;
	});
	console.log('Farm area: '+farm_area);
	var result_arr = [];
	var temp_dat;

	if (dat == null || isNaN(dat))
		temp_dat = 0
	else {
		temp_dat = dat;
	}

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

		var n_date = new Date(system_date);
		n_date.setDate(n_date.getDate() - 30);
		var n = new Date(system_date);
		var query = { polygon_id: polygon_id, start: n_date, end: n };

		options = {
			center: center,
			coordinates: coordinates
		}

		// Visualize plot
		$.get('/agroapi/ndvi/imagery', query, function(imagery) {
			var leaf_color_chart = {
				1: { val: 1, min: -.031, max: .04 },
				2: { val: 2, min: .05, max: .15 },
				3: { val: 3, min: .16, max: .24 },
				4: { val: 4, min: .25, max: .29 },
				5: { val: 5, min: .30, max: .34 },
				6: { val: 6, min: .35, max: .39 },
				7: { val: 7, min: .40, max: .44 },
				8: { val: 8, min: .45, max: .49 },
				9: { val: 9, min: .5, max: .54 },
				10: { val: 10, min: .55, max: .59 },
				11: { val: 11, min: .60, max: .64 },
				12: { val: 12, min: .65, max: .69 },
				13: { val: 13, min: .70, max: .74 },
				14: { val: 14, min: .75, max: .79 },
				15: { val: 15, min: .80, max: 1 },
			};
			var lcc_conversion = {
				5: { val: 'Surplus', range: [14, 15] },
				4: { val: 'Optimal', range: [11, 12, 13] },
				3: { val: 'Optimal', range: [9, 10] },
				2: { val: 'Deficient', range: [1, 8] }
			}
			var split_pattern = {
				Basal: { 
					dat_range: [0, 13],
					reqs: [0, 0, 0, 20]
				},
				Tillering: {
					dat_range: [14, 20],
					reqs: [20, 25, 35, 35]
				},
				Midtillering: { 
					dat_range: [20, 35],
					reqs: [0, 25, 40, 45]
				},
				Panicle: { 
					dat_range: [40, 50],
					reqs: [20, 30, 45, 50]
				},
				Flowering: { 
					dat_range: [60, 70],
					reqs: [0, 0, 0, 15]
				}
			}
			var pattern_arr = ['Basal', 'Tillering', 'Midtillering', 'Panicle', 'Flowering'];

			if (imagery.length != 0) {
				console.log('Last clear satellite image: '+imagery[imagery.length-1].dt);
				var stats_url = imagery[imagery.length-1].stats.ndvi;
				var ndvi_reading;
				var stage;
				$.get(imagery[imagery.length-1].stats.ndvi, {}, function(stats) {
					var ndvi = Math.round(stats.max * 100) / 100;
					console.log('NDVI Value: '+ndvi);
					ndvi_cont = ndvi;
					for (prop in leaf_color_chart) {
						if (ndvi >= leaf_color_chart[prop].min && leaf_color_chart[prop].max >= ndvi) {
							ndvi_reading = leaf_color_chart[prop].val
						}
					}
					var range_start, range_end;
					var N = null;

					for (prop in lcc_conversion) {
						range_start = lcc_conversion[prop].range[0];
						range_end = lcc_conversion[prop].range[lcc_conversion[prop].range.length-1];
						if (ndvi_reading >= range_start && ndvi_reading <= range_end) {
							N = lcc_conversion[prop].val;
						}

					}

					var N_amount;
					var N_date;
					var index;
					var stage;
					var stages_arr = [];
					var stage_index = null;

					for (prop in split_pattern) {
						range_start = split_pattern[prop].dat_range[0];
						range_end = split_pattern[prop].dat_range[1];
						if (temp_dat >= range_start && temp_dat <= range_end) {
							stage = prop;
						}
					}

					if (N_recommendation <= 40) {
						index = 0;
					}
					else if (N_recommendation > 40 && N_recommendation <= 80) {
						index = 1;
					}
					else if (N_recommendation > 80 && N_recommendation <= 120) {
						index = 2;
					}
					else if (N_recommendation > 120 && N_recommendation <= 160) {
						index = 3;
					}
					else {
						index = 3
					}

					for (var i = 0; i < pattern_arr.length; i++) {
						if (stage == pattern_arr[i]) {
							stage_index = i;
						}

						if (stage_index != null && i < pattern_arr.length) {
							stages_arr.push(pattern_arr[i]);
						}
					}

					var obj;
					for (var i = 0; i < stages_arr.length; i++) {
						var now = new Date(system_date);

						stage = stages_arr[i];
						N_amount = split_pattern[stages_arr[i]].reqs[index];
						if (N == 'Surplus' && stage == 'Midtillering' 
							|| stage == 'Panicle') {
							console.log(`Surplus nutrient subtract recommendation for ${stage} stage`)
							N_amount -= 10;
						}
						else if (N == 'Deficient' && stage == 'Midtillering' 
							|| stage == 'Panicle') {
							console.log(`Deficient nutrient subtract recommendation for ${stage} stage`)
							N_amount += 10;
						}

						if (dat == null) {
							dat = 0;
						}

						var diff = (split_pattern[stages_arr[i]].dat_range[0] - dat);

						if (dat != null && sowing_date < 0) {
							diff -= sowing_date;	
						}

						obj = {
							desc: stage,
							date: formatDate(new Date(now.setDate(now.getDate() + ( diff < 0 ? 1 : diff ) )), 'YYYY-MM-DD'),
							amount: N_amount*farm_area,
							nutrient: 'N'
						};
						

						result_arr.push(obj);
					}
					// return { result_arr: result_arr, ndvi: ndvi };
				});
			}
			else {
				console.log('No sufficient data from API!!');
				// return null;
			}
		});
	});

	return { result_arr: result_arr, ndvi: ndvi_cont };
}

function mapFertilizertoSchedule(obj, materials, applied, recommendation) {
	var result_arr = [];
	var temp_obj;
	var fertilizer_cont = {
		n_fertilizer: { strongest: { name: null, val: null, id: null }, arr: [] },
		p_fertilizer: { strongest: { name: null, val: null, id: null }, arr: [] },
		k_fertilizer: { strongest: { name: null, val: null, id: null }, arr: [] }
	};

	materials = materials.sort((a,b) => (b.N - a.N));

	var empty = true;
	for (var i = 0; i < materials.length; i++) {
		if (recommendation.hasOwnProperty(materials[i].fertilizer_name)) {
			if (materials[i].N != 0) {
				fertilizer_cont.n_fertilizer.arr.push(materials[i]);
			}
			if (materials[i].P != 0) {
				fertilizer_cont.p_fertilizer.arr.push(materials[i]);
			}
			if (materials[i].K != 0) {
				fertilizer_cont.k_fertilizer.arr.push(materials[i]);
			}
		}
		if (empty) {
			fertilizer_cont.n_fertilizer.strongest.name = materials[i].fertilizer_name;
			fertilizer_cont.p_fertilizer.strongest.name = materials[i].fertilizer_name;
			fertilizer_cont.k_fertilizer.strongest.name = materials[i].fertilizer_name;

			fertilizer_cont.n_fertilizer.strongest.val = materials[i].N;
			fertilizer_cont.p_fertilizer.strongest.val = materials[i].P;
			fertilizer_cont.k_fertilizer.strongest.val = materials[i].K;

			fertilizer_cont.n_fertilizer.strongest.id = materials[i].fertilizer_id;
			fertilizer_cont.p_fertilizer.strongest.id = materials[i].fertilizer_id;
			fertilizer_cont.k_fertilizer.strongest.id = materials[i].fertilizer_id;

			empty = false;
		}
		else {
			if (fertilizer_cont.n_fertilizer.strongest.val < materials[i].N) {
				fertilizer_cont.n_fertilizer.strongest.name = materials[i].fertilizer_name;
				fertilizer_cont.n_fertilizer.strongest.val = materials[i].N;
				fertilizer_cont.n_fertilizer.strongest.id = materials[i].fertilizer_id;
			}
			if (fertilizer_cont.p_fertilizer.strongest.val < materials[i].P) {
				fertilizer_cont.p_fertilizer.strongest.name = materials[i].fertilizer_name;
				fertilizer_cont.p_fertilizer.strongest.val = materials[i].P;
				fertilizer_cont.p_fertilizer.strongest.id = materials[i].fertilizer_id;
			}
			if (fertilizer_cont.k_fertilizer.strongest.val < materials[i].K) {
				fertilizer_cont.k_fertilizer.strongest.name = materials[i].fertilizer_name;
				fertilizer_cont.k_fertilizer.strongest.val = materials[i].K;
				fertilizer_cont.k_fertilizer.strongest.id = materials[i].fertilizer_id;
			}
		}
	}
	console.log(recommendation);
	console.log(obj);
	console.log(fertilizer_cont);
	//Create obj for P recommendation
	if (fertilizer_cont.p_fertilizer.arr.length != 0) {
		temp_obj = {
			fertilizer: fertilizer_cont.p_fertilizer.strongest.name,
			fertilizer_id: fertilizer_cont.p_fertilizer.strongest.id,
			amount: Math.ceil(recommendation[fertilizer_cont.p_fertilizer.strongest.name])+' bags',
			desc: obj.P[0].desc,
			date: obj.P[0].date,
			nutrient: 'P'
		}
		result_arr.push(temp_obj);
	}
	//Create obj for K recommendation
	if (fertilizer_cont.k_fertilizer.arr.length != 0) {
		var first, second, k_amt;
		var single_f_amt = materials.filter(ele => ele.fertilizer_name == fertilizer_cont.k_fertilizer.strongest.name)[0].K;
		if (obj.K.length != 1) {
			var K_reco_total = materials.filter(ele => ele.fertilizer_name == fertilizer_cont.k_fertilizer.strongest.name)[0].K;
			K_reco_total *= recommendation[fertilizer_cont.k_fertilizer.strongest.name];
			var applied_K;


			if (fertilizer_cont.p_fertilizer.arr.length != 0) {
				applied_K = materials.filter(ele => ele.fertilizer_name == fertilizer_cont.p_fertilizer.strongest.name)[0].K;
			applied_K *= recommendation[fertilizer_cont.p_fertilizer.strongest.name];
			}
			else {
				applied_K = 0;
			}
			
			first = (K_reco_total - applied_K) / 2;
			second = K_reco_total / 2;
		}
		else {
			first = recommendation[fertilizer_cont.p_fertilizer.strongest.name];
			second = first;
		}

		for (var i = 0; i < obj.K.length; i++) {
			if (i == 0) {
				k_amt = first;
			}
			else if (i == 1) {
				k_amt = second;
			}

			temp_obj = {
				fertilizer: fertilizer_cont.k_fertilizer.strongest.name,
				fertilizer_id: fertilizer_cont.k_fertilizer.strongest.id,
				amount: Math.ceil(k_amt / single_f_amt)+' bags',
				desc: obj.K[i].desc,
				date: obj.K[i].date,
				nutrient: 'K'
			}
			result_arr.push(temp_obj);
		}
	}
		

	//Create obj for N recommendation
	var n_fertilizer_amt;
	console.log(obj);
	obj.N = obj.N.filter(ele => ele.amount != 0);
	console.log(obj.N);
	for (var i = 0; i < obj.N.length; i++) {
		n_fertilizer_amt = obj.N[i].amount / fertilizer_cont.n_fertilizer.strongest.val;
		temp_obj = {
			fertilizer: fertilizer_cont.n_fertilizer.strongest.name,
			fertilizer_id: fertilizer_cont.n_fertilizer.strongest.id,
			amount: Math.ceil(n_fertilizer_amt)+' bags',
			desc: obj.N[i].desc+' Nitrogen Application (N)',
			date: obj.N[i].date,
			nutrient: 'N'
		}
		result_arr.push(temp_obj);
	}

	result_arr.sort((a,b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));

	return result_arr;
}

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function createSchedule(materials, recommendation, applied, farm_id, N_recommendation, details, crop_calendar, work_order_list, ndvi_cont) {
	var schedule_arr = [];
	var fertilizer = {  };
	var fertilizer_arr = [];
	for (var i = 0; i < applied.length; i++) {
		if (recommendation.hasOwnProperty(applied[i].fertilizer_name)) {
			fertilizer = {
				name: applied[i].fertilizer_name,
				N: applied[i].N,
				P: applied[i].P,
				K: applied[i].K,
				recommendation: (Math.round((recommendation[applied[i].fertilizer_name] - applied[i].resources_used) * 100)/100)
			};
			fertilizer_arr.push(fertilizer);
		}
	}
	console.log("Farm ID: "+farm_id);
	var query = {
		where: {
			key: ['farm_id'],
			value: [farm_id]
		},
		order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
	}

	var land_prep = work_order_list.filter(ele => ele.type == 'Land Preparation')[0];
	var sowing = work_order_list.filter(ele => ele.type == 'Sow Seed')[0];


	var target_date;
	var N_val, P, K = [];
	var method;
	var DAT;
	var active_calendar = crop_calendar;
	var method = active_calendar.method;
	var obj;
	var temp_d;
	console.log(method);

	if (method == 'Transplanting') {
		sowing.date_completed = sowing.date_completed == null || sowing.date_completed == undefined ? addDays(sowing.date_due, 0) : addDays(sowing.date_completed, 0);
		temp_d = sowing.date_completed = sowing.date_completed == null || sowing.date_completed == undefined ? addDays(sowing.date_due, 0) : addDays(sowing.date_completed, 0);
		target_date = new Date(temp_d);
	}
	else if (method == 'Direct Seeding') {
		temp_d = sowing.date_completed == null || sowing.date_completed == undefined ? addDays(sowing.date_due, 0) : addDays(sowing.date_completed, 0);
		target_date = new Date(temp_d);
		// target_date = target_date.setDate(target_date.getDate() + 12);
	}

	//var temp_date = sowing.date_completed == null || sowing.date_completed == undefined ? sowing.date_due : sowing.date_completed;
	var temp_date = temp_d;
	var now = new Date(system_date);
	console.log(temp_date);
	var diffTime = (now - temp_date);
	var DAT = Math.ceil(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
	var sowing_ndvi = DAT;

	if (DAT < 0) {
		DAT = null;
		if (method == 'Transplanting') {
			DAT = 15;
		}
	}

	console.log('DAT: '+DAT);
	
	//target_date = formatDate(target_date, 'YYYY-MM-DD');
	//K Fertilizer changes depending on K requirement
	var k_date, k_stage, temp_add;
	if (details.k_lvl >= 30) {
		for (var i = 0; i < 2; i++) {
			if (i == 0) {
				if (method == 'Transplanting') {
					k_date = new Date(land_prep.date_completed != null || land_prep.date_completed != undefined ? land_prep.date_completed : land_prep.date_due);
				}
				else {
					k_date = new Date(sowing.date_completed != null || sowing.date_completed != undefined ? sowing.date_completed : sowing.date_due);
					k_date = new Date(k_date.setDate(k_date.getDate() + 10));
				}
				k_stage = 'Basal Potassium Application (K)';
			}
			else {
				if (method == 'Transplanting') {
					k_date = new Date(sowing.date_completed != null || sowing.date_completed != undefined ? sowing.date_completed : sowing.date_due);
					k_date = new Date(k_date.setDate(k_date.getDate() + 25));
				}
				else {
					k_date = new Date(sowing.date_completed != null || sowing.date_completed != undefined ? sowing.date_completed : sowing.date_due);
					k_date = new Date(k_date.setDate(k_date.getDate() + 40));
				}
					
				k_stage = 'Early Panicle Potassium Application (K)';
			}

			K.push({
				desc: k_stage,
				date: formatDate(new Date(k_date),'YYYY-MM-DD'),
				amount: details.k_lvl/2,
				nutrient: 'K'
			});
		}
	}
	else {
		k_date = new Date(sowing.date_completed != null || sowing.date_completed != undefined ? sowing.date_completed : sowing.date_due);
		if (method == 'Direct Seeding')
			k_date = new Date(k_date.setDate(k_date.getDate() + 15));
		K.push({
			desc: 'Potassium Application (K)',
			date: formatDate(new Date(target_date),'YYYY-MM-DD'),
			amount: details.k_lvl,
			nutrient: 'K'
		});
	}
	//P Fertilizer 100% always
	var p_date;
	if (method == 'Direct Seeding') {
		p_date = new Date(sowing.date_completed != null || sowing.date_completed != undefined ? sowing.date_completed : sowing.date_due);
		p_date = new Date(k_date.setDate(p_date.getDate() + 15));
	}
	else {
		p_date = new Date(land_prep.date_completed != null || land_prep.date_completed != undefined ? land_prep.date_completed : land_prep.date_due);
	}
	
	P = [{
		desc: 'Phosphorous Application (P)',
		date: formatDate(new Date(p_date),'YYYY-MM-DD'),
		amount: details.p_lvl,
		nutrient: 'P'
	}];

	//N Need-Based Approach
	N_val = getNDVI(crop_calendar.farm_name, DAT, N_recommendation, sowing_ndvi, system_date, ndvi_cont);

	obj = { N: N_val.result_arr, P: P, K: K};
	console.log(obj);
	schedule_arr = mapFertilizertoSchedule(obj, materials, applied, recommendation);

	return { schedule_arr: schedule_arr, ndvi: N_val.ndvi };
}

function calculateDeficientN(reqs, applied) {
	var N = reqs.n_lvl;

	for (var i = 0; i < applied.length; i++) {
		if (applied[i].resources_used != 0) {
			N -= applied[i].resources_used * applied[i].N;
		}
	}
	return N;
}

function normalizeSchedule(arr, origin, material_list, isChecked) {
	var row_obj = {};
	var cont_arr = [];

	if (origin == 'js') {
		const unique = [...new Map(arr.map(ele =>
	  	[ele.date, ele])).values()];
	  	var unique_arr = [];
	  	var selected_fertilizer;
	  	var nutrient;
		for (var i = 0; i < unique.length; i++) {
			unique_arr = arr.filter(e => e.date == unique[i].date);

			for (var y = 0; y < unique_arr.length; y++) {
				row_obj = {
					date: { val: unique_arr[0].date, style: 1 },
					fertilizer: { val: null, id_val: null, nutrient: null, style: 1 },
					description: { val: null, style: 1 },
					amount: { val: null, style: 1 },
					checkbox: { val: null, style: 1 }
				};
				selected_fertilizer = material_list.filter(e => e.fertilizer_name == unique_arr[y].fertilizer)[0];
				
				nutrient = selected_fertilizer.N
				if (nutrient < selected_fertilizer.P) {
					nutrient = 'P';
				}
				else if (nutrient < selected_fertilizer.K) {
					nutrient = 'K';
				}
				else {
					nutrient = 'N';
				}
				row_obj.fertilizer.val = (unique_arr[y].fertilizer);
				row_obj.fertilizer.id_val = selected_fertilizer.fertilizer_id;
				row_obj.fertilizer.nutrient = nutrient;
				row_obj.description.val = (unique_arr[y].desc);
				row_obj.amount.val = (unique_arr[y].amount);
				row_obj.checkbox.val = isChecked;

				// if (unique_arr.length > 1 && y != 0) {
				// 	delete row_obj.date;
				// 	delete row_obj.description;
				// 	delete row_obj.checkbox;
				// }

				cont_arr.push(row_obj);
				row_obj = {};
			}
		}
	}
	else if (origin == 'db') {

	}
	return cont_arr;
}

function appendCustomPlans(tnr, farm_id, sow_end, target) {
	$.get('/load_cnr_plans', { farm_id: farm_id, sow_end: sow_end, tnr: tnr }, function(result) {
		console.log(result);
		var str = ``;
		result.forEach(function(item) {
			str += `<tr class="fr_item"> <td class="cnr_lbl" colspan="4"> ${item.cnr_name} <input type="hidden" name="cnr_name" value="${item.cnr_name}"> </td></tr>`;
			item.cnr_items.forEach(function(cnr_items, index) {
				str += `<tr class="fr_item"> <td> ${cnr_items.target_date} <input type="hidden" name="cnr_item_target_date" value="${cnr_items.target_date}"> </td> <td> ${cnr_items.fertilizer.name} <input type="hidden" name="cnr_item_fertilizer" value="${cnr_items.fertilizer.id}"> </td> <td> ${cnr_items.desc} <input type="hidden" name="cnr_item_desc" value="${cnr_items.desc}"> </td> <td> ${cnr_items.amount} bags <input type="hidden" name="cnr_item_amount" value="${cnr_items.amount}"> </td> <td> <input class="form-check-input" style="margin-top: 10px;" type="checkbox" name="cnr_fr_checkbox" value="${index+1}" rowspan="1" checked="true"> </td> </tr>`;
			});
		});
		$(target).find('tbody').append(str);
	});
}

function appendManualWO(target, type) {
	if (type) {
		$(target).find('tbody').append(`<tr> <td colspan="4"><div class="d-flex w-100"> <div class="w-100 text-muted text-center" style="margin-left: 105px;"> or manually create work order: </div><button type="button" onclick="appendManualWO('#fertilizer_recommendation_table', 0)" class="btn btn-primary float-right" id="add_order">Add Order</button> <div class="float-right"> </div> </div></td></tr>`);
	}
	else
		$(target).find('tbody').append(`<tr> <td class="align-top"> <div class=""> <input class="form-control" type="date" name="manual_date" id="manual_date"> </div> </td> <td class="align-top"> <div class=""> <select class="form-select" name="manual_fertilizer" id="manual_fertilizer"> ${opts} </select> </div> </td> <td class="align-top"> <div class=""> <textarea type="text" class="form-control" id="manual_desc" name="manual_desc" rows="3" style="resize: none;" placeholder="User generated work order..."></textarea> </div> </td> <td class="align-top"> <div class="d-flex"> <div class=""> <input class="form-control mr-3" type="number" name="manual_amt" id="manual_amt" min="1" step="1" value="1" style="width: 100px;"> </div> <button type="button" onclick="removeManualWO(this)" class="icon-btn-trash"><i class="fas fa-trash"></i></button> </div> </td> </tr>`);
}

function removeManualWO(target) {
	$(target).parent().parent().parent().remove();
}

function appendScheduleTable(schedule_arr, target) {
	$(target).find('tbody').empty();
	var schedule_arr_keys = ['date', 'fertilizer', 'desc', 'amount'];
	var tr, td;
	var hidden_atr = {
		type: 'hidden',
		name: '',
		value: '',
	};
	var checkbox_attr = {
		type: 'checkbox',
		name: 'fr_checkbox',
		value: ''
	};
	
	for (var i = 0; i < schedule_arr.length; i++) {
		tr = createDOM({ type: 'tr', class: 'fr_item', style: '', html: '' });

		if (schedule_arr[i].hasOwnProperty('date')) {
			tr.appendChild(createDOM({ 
				type: 'td', 
				class: '', 
				style: '',
				html: schedule_arr[i].date.val,
				attr: { rowspan: schedule_arr[i].date.style }
			}));

			hidden_atr.name = 'fr_item_date';
			hidden_atr.value = schedule_arr[i].date.val;

			tr.appendChild(createDOM({ 
				type: 'input', 
				class: '', 
				style: '',
				html: '',
				attr: hidden_atr
			}));
		}

		tr.appendChild(createDOM({ 
			type: 'td', 
			class: '', 
			style: '',
			html: schedule_arr[i].fertilizer.val,
			attr: { rowspan: schedule_arr[i].fertilizer.style }
		}));

		hidden_atr.name = 'fr_item_fertilizer';
		hidden_atr.value = schedule_arr[i].fertilizer.id_val;

		tr.appendChild(createDOM({ 
			type: 'input', 
			class: '', 
			style: '',
			html: '',
			attr: hidden_atr
		}));

		hidden_atr.name = 'fr_item_Nutrient';
		hidden_atr.value = schedule_arr[i].fertilizer.nutrient;

		tr.appendChild(createDOM({ 
			type: 'input', 
			class: '', 
			style: '',
			html: '',
			attr: hidden_atr
		}));

		if (schedule_arr[i].hasOwnProperty('description')) {
			tr.appendChild(createDOM({ 
				type: 'td', 
				class: '', 
				style: '',
				html: schedule_arr[i].description.val,
				attr: { rowspan: schedule_arr[i].description.style }
			}));	

			hidden_atr.name = 'fr_item_desc';
			hidden_atr.value = schedule_arr[i].description.val;

			tr.appendChild(createDOM({ 
				type: 'input', 
				class: '', 
				style: '',
				html: '',
				attr: hidden_atr
			}));
		}

		tr.appendChild(createDOM({ 
			type: 'td', 
			class: '', 
			style: '',
			html: schedule_arr[i].amount.val,
			attr: { rowspan: schedule_arr[i].amount.style }
		}));

		hidden_atr.name = 'fr_item_amt';
		hidden_atr.value = schedule_arr[i].amount.val;

		tr.appendChild(createDOM({ 
			type: 'input', 
			class: '', 
			style: '',
			html: '',
			attr: hidden_atr
		}));

		if (schedule_arr[i].hasOwnProperty('checkbox')) {
			checkbox_attr['rowspan'] = schedule_arr[i].checkbox.style;
			if (!schedule_arr[i].checkbox.val) {
				checkbox_attr['disabled'] = true;
			}
			else {
				checkbox_attr['checked'] = true;
				if (checkbox_attr.hasOwnProperty('disabled'))
					delete checkbox_attr.disabled
			}
			//Checkbox
			checkbox_attr.value = i;

			td = (createDOM({ 
				type: 'td', 
				class: '', 
				style: '',
				html: '',
				attr: { rowspan: schedule_arr[i].checkbox.style }
			}));

			td.appendChild(createDOM({
				type: 'input', 
				class: 'form-check-input', 
				style: 'margin-top: 10px;',
				attr: checkbox_attr
			}));

			tr.appendChild(td);
		}

		$(target).append(tr);
	}
}

function consolidateUniqueWO(arr) {
	const unique = [...new Map(arr.map(ele =>
	  [ele.date, ele])).values()];
	var unique_ele;
	var wo_obj;
	var wo_arr = [];
	var adjusted_date;

	for (var i = 0; i < unique.length; i++) {
		adjusted_date = new Date(unique[i].date);
		adjusted_date = adjusted_date.setDate(adjusted_date.getDate() + 3);

		unique_ele = arr.filter(ele => ele.date == unique[i].date);

		wo_obj = {
			wo_type: 'Fertilizer Application',
			crop_calendar_id: calendar_id,
			due_date: formatDate(new Date(adjusted_date), 'YYYY-MM-DD'),
			start_date: unique[i].date,
			resources: { name: [], ids: [], qty: [] },
			notes: ''
		}
		for (var y = 0; y < unique_ele.length; y++) {
			if (y != 0) {
				wo_obj.notes += ' and ';
			}
			wo_obj.notes += unique_ele[y].desc
			wo_obj.resources.ids.push(unique_ele[y].fertilizer);
			wo_obj.resources.qty.push(Math.round(unique_ele[y].amount));

		}
		wo_obj.notes += ' (Recommendation)';
		wo_arr.push(wo_obj);
	}

	return wo_arr;
}

function createInitialFRItem() {
	$()
}

function dateDiff(date1, date2) {
	const diffTime = Math.abs(date2 - date1);
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
	return diffDays;
}

function processFRItems(arr, frp_id, origin) {
	var wo_arr = [];
	var wo_obj = {};
	console.log(origin);
	for (var i = 0; i < arr.length; i++) {
		arr[i].amount.val = arr[i].amount.val.replace(' bags', '')
		wo_obj  = {
			fr_plan_id: frp_id,
			target_application_date: arr[i].date.val,
			fertilizer_id: arr[i].fertilizer.id_val,
			nutrient: arr[i].fertilizer.nutrient,
			description: arr[i].description.val,
			amount: arr[i].amount.val,
			wo_id: null,
		};

		if (origin == 'Dynamic') {
			wo_obj['isCreated'] = arr[i].checkbox.val;
		}
		else if (origin == 'Single') {
			wo_obj['isCreated'] = false;
		}

		wo_arr.push(wo_obj);
	}

	return wo_arr;
}

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

function reduceDynamicFRItems(arr, db_arr) {
	arr.sort(dynamicSort('amount'));
	db_arr.sort(dynamicSort('amount'));
	
	for(var i = 0; i < arr.length; i++) {
        for (var x = 0; x < db_arr.length; x++) {
        	if (arr[i].description == db_arr[x].description && arr[i].amount == db_arr[x].amount) {
        		arr.splice(i, 1);
        		i--;
        		if (i < 0)
        			i = 0;

        		if (arr.length == 0)
        			x = db_arr.length;        		
        	}
        }
    }

	return arr;
}

// Create recommended N-P-K values from input
function processSoilTest(obj) {
	var keys = ['n_test','p_test', 'k_test'];
	var db_keys = ['n_lvl', 'p_lvl', 'k_lvl'];
	var temp_obj = { };
	var obj_result = {
		Depleted: [14.0, 8.25, 13.5],
		Deficient: [7.75, 4.0, 8.75],
		Adequate: [3.75, 1.0, 4.75],
		Sufficient: [3.75, 1.0, 4.75],
		Surplus: [0, 0, 0]
	};
	var indicator;
	var db_key;
	var index;
	for (var i = 0; i < keys.length; i++) {

		switch(keys[i]) {
			case 'n_test':
			index = 0;
			db_key = 'n_lvl';
			break;
			case 'p_test':
			index = 1;
			db_key = 'p_lvl';
			break;
			case 'k_test':
			index = 2;
			db_key = 'k_lvl';
			break;
		}

		obj[db_key] = obj_result[obj[keys[i]]][index];
		console.log(keys[i]+'-'+'-'+index+'-'+obj[keys[i]]);
	}

	obj['farm_name'] = $('#farm_id').find(':selected').text();

	return obj;
}

$(document).ready(function() {
	jQuery.ajaxSetup({async: false });
	var ndvi_cont = 0;
	var farm_name = '';

	// setInterval(function() {
	// 	$.get('/get_farm_list', {  }, function(farm_list) {
	// 		for (var i = 0; i < farm_list.length; i++) {
	// 			$.get('/get_active_calendar', { farm_id: farm_list[i].farm_id }, function(calendar) {
	// 				if (calendar.length != 0) {
	// 					$.get('/get_nutrient_plan_details', { calendar_id: calendar[0].calendar_id}, function(plan) {
	// 						if (dateDiff(new Date(), new Date(plan[0].last_updated)) >= 7) {
	// 							var detailed_nutrient_query = {
	// 								farm_name: farm_list[i].farm_name,
	// 								calendar_id: calendar[0].calendar_id,
	// 								type: 'Fertilizer',
	// 								filter: farm_list[i].farm_id
	// 							};
	// 							//*********** Update fertilizer recommendation items START ***********//

	// 							$.get('/filter_nutrient_mgt', detailed_nutrient_query, function(details) {
									
	// 								$.get('/get_crop_plans', { status: ['Active','In-Progress'], where: { key: 'calendar_id', val: calendar[0].calendar_id } }, function(curr_calendar) {

	// 									$.get('/getAll_materials', { type: 'Fertilizer', filter: farm_list[i].farm_id }, function(materials) {
	// 										material_list = materials;
	// 										$.get('/get_cycle_resources_used', { type: 'Fertilizer', farm_id: farm_list[i].farm_id }, function(list) {
												
	// 											var query = {
	// 												where: {
	// 													key: ['farm_id'],
	// 													value: [farm_list[i].farm_id]
	// 												},
	// 												order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
	// 											}
	// 											$.get('/get_work_orders', query, function(work_order_list) {
	// 												var schedule_arr = createSchedule(materials, details.recommendation, list, farm_list[i].farm_id, calculateDeficientN(details, list), details, curr_calendar[0], work_order_list);
	// 												var recommendation_list = [];
													
	// 												schedule_arr = normalizeSchedule(schedule_arr, 'js', materials, false);
	// 												schedule_arr = schedule_arr.filter(e => e.fertilizer.nutrient == 'N');

	// 												var fr_db_items = processFRItems(schedule_arr, plan[0].fr_plan_id, 'Dynamic');
													
	// 												$.get('/get_nutrient_plan_items', { frp_id: plan[0].fr_plan_id }, function(fr_items) {
	// 													var db_arr = reduceDynamicFRItems(fr_db_items, fr_items);
														
	// 													$.post('/update_nutrient_plan', { update: { last_updated: formatDate(new Date(), 'YYYY-MM-DD') }, filter: { fr_plan_id: plan[0].fr_plan_id } }, function(update_status) {
	// 														console.log(update_status);
	// 													});

	// 													for (var i = 0; i < db_arr.length; i++) {
	// 														$.post('/create_nutrient_item', db_arr[i], function(nutrient_item) {
	// 															if (i == db_arr.length - 1) {
	// 																console.log('Updated fr_items for frp_id: '+plan[0].fr_plan_id);
	// 															}
	// 														});
	// 													}
	// 												});
														
	// 											});
													
	// 										});
	// 									});
	// 								});
										
	// 							});

	// 							//*********** Update fertilizer recommendation items END ***********//
	// 						}

	// 					});
	// 				}
	// 			});
	// 		}
	// 	});
	// }, 10000);

		$.get('/get_farm_list', {  }, function(farm_list) {
			for (var i = 0; i < farm_list.length; i++) {
				$.get('/get_active_calendar', { farm_id: farm_list[i].farm_id }, function(calendar) {
			
					if (calendar.length != 0) {
						console.log(calendar);
						$.get('/get_nutrient_plan_details', { calendar_id: calendar[0].calendar_id}, function(plan) {

							if (dateDiff(new Date(system_date), new Date(plan[0].last_updated)) >= 7) {
								var detailed_nutrient_query = {
									farm_name: farm_list[i].farm_name,
									calendar_id: calendar[0].calendar_id,
									type: 'Fertilizer',
									filter: farm_list[i].farm_id
								};
								//*********** Update fertilizer recommendation items START ***********//

								$.get('/filter_nutrient_mgt', detailed_nutrient_query, function(details) {

									$.get('/get_crop_plans', { status: ['Active','In-Progress'], where: { key: 'calendar_id', val: calendar[0].calendar_id } }, function(curr_calendar) {

										$.get('/getAll_materials', { type: 'Fertilizer', filter: farm_list[i].farm_id }, function(materials) {
											material_list = materials;
											$.get('/get_cycle_resources_used', { type: 'Fertilizer', farm_id: farm_list[i].farm_id, calendar_id: calendar[0].calendar_id }, function(list) {
												
												var query = {
													where: {
														key: ['farm_id'],
														value: [farm_list[i].farm_id]
													},
													order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
												}
												$.get('/get_work_orders', query, function(work_order_list) {
													var schedule_arr = createSchedule(materials, details.recommendation, list, farm_list[i].farm_id, calculateDeficientN(details, list), details, curr_calendar[0], work_order_list, ndvi_cont);
													var recommendation_list = [];
													var ndvi_cont = schedule_arr.ndvi;
													schedule_arr = schedule_arr.schedule_arr;

													schedule_arr = normalizeSchedule(schedule_arr, 'js', materials, false);
													schedule_arr = schedule_arr.filter(e => e.fertilizer.nutrient == 'N');

													var fr_db_items = processFRItems(schedule_arr, plan[0].fr_plan_id, 'Single');
													
													$.get('/get_nutrient_plan_items', { frp_id: plan[0].fr_plan_id }, function(fr_items) {
														var db_arr = reduceDynamicFRItems(fr_db_items, fr_items);

														$.post('/update_nutrient_plan', { update: { last_updated: formatDate(new Date(system_date), 'YYYY-MM-DD'), last_ndvi: ndvi_cont }, filter: { fr_plan_id: plan[0].fr_plan_id } }, function(update_status) {
															console.log(update_status);
														});

														for (var i = 0; i < db_arr.length; i++) {
															$.post('/create_nutrient_item', db_arr[i], function(nutrient_item) {
																if (i == db_arr.length - 1) {
																	console.log('Updated fr_items for frp_id: '+plan[0].fr_plan_id);
																}
															});
														}
													});
														
												});
													
											});
										});
									});
										
								});

								//*********** Update fertilizer recommendation items END ***********//
							}

						});
					}
				});
			}
		});

	if (view == 'add_crop_calendar') {

		$('.next_step').on('click', function() {
			if (currentTab == 2 && loaded == 0) {
				loaded = 1;
				//Create fertilizer recommendation schedule
				$.get('/filter_nutrient_mgt', { farm_id: $('#farm_id').val(), type: 'Fertilizer', filter: $('#farm_id').val(), calendar_id: null }, function(nutrient_details) {
					console.log(nutrient_details);
					var target_arr = ['#n_lvl', '#p_lvl', '#k_lvl', '#n_val', '#p_val', '#k_val', '#ph_lvl'];
					var planting_details = { seed_name: $('#seed_id').find(':selected').text(), method: $('#method').find(':selected').text() };
					
					//Append significant details
					appendDetails(nutrient_details, target_arr, planting_details);

					//Create fertilizer schedule
					$.get('/getAll_materials', { type: 'Fertilizer', filter: $('#farm_id').val() }, function(materials) {
						$.get('/get_cycle_resources_used', { type: 'Fertilizer', farm_id: $('#farm_id').val(), calendar_id: null }, function(list) {
							var crop_calendar = {
								harvest_date: $('#harvest_date_start').val(),
								land_prep_date: $('#land_prep_date_start').val(),
								maturity_days: $('#seed_maturity_days').val(),
								method: $('#method').val(),
								seed_name: $('#sowing_date_start').val(),
								sowing_date: $('#sowing_date_start').val(),
								farm_name: $('#farm_id').find(':selected').text()
							};
							var work_order_list = [
								{
									type: 'Land Preparation',
									date_due: $('#land_prep_date_end').val(),
								},
								{
									type: 'Sow Seed',
									date_due: $('#sowing_date_end').val(),
								}
							];
							//console.log(crop_calendar);
							var schedule_arr = createSchedule(materials, nutrient_details.recommendation, list, $('#farm_id').val(), calculateDeficientN(nutrient_details, list), nutrient_details, crop_calendar, work_order_list, ndvi_cont);
							var recommendation_list = [];
							var ndvi_cont = schedule_arr.ndvi;
							schedule_arr = schedule_arr.schedule_arr;
							
							schedule_arr = normalizeSchedule(schedule_arr, 'js', materials, true);
							//console.log(schedule_arr);
							appendScheduleTable(schedule_arr, '#fertilizer_recommendation_table');

							// Append custom recommandation list
							var sow_end = $('#sowing_date_end').val();
							if ($('#method').val()) {
								sow_end = addDays(sow_end, -15);
							}
							appendCustomPlans(nutrient_details, $('#farm_id').val(), sow_end, '#fertilizer_recommendation_table');

							appendManualWO('#fertilizer_recommendation_table', 1);
						});
					});
				});

			}

		});
	}
	else if (view == 'Soil Detailed') {
		// Soil Test Form

		$('#date_taken').val(formatDate(new Date(system_date), 'YYYY-MM-DD'));

		$.get('/get_farm_list', {  }, function(result) {
			farm_list = result;
			var extra;
			for (var i = 0; i < result.length; i++) {
				console.log(farm_id);

				if (result[i].farm_id == farm_id) {
					extra = 'selected';
					$('#farm_id').append("<option value='"+result[i].farm_id+"'"+extra+">"+result[i].farm_name+"</option>");
				}	
				// else {
				// 	extra = 'disabled';
				// }
			}
		});

		$('#soil_data_form').on('submit', function(e) {
			e.preventDefault();
			var form_data = $('#soil_data_form').serializeJSON();
			form_data = processSoilTest(form_data);
			console.log(form_data);

			// Check for most recent fr_plan -> delete fr_items
				// If no current crop calendar exist -> create fr_plan
			$.post('/prepareFRPlan', { farm_id: form_data.farm_id }, function(item_status) {
				
				// Create new fr_items
				$.get('/get_active_calendar', { farm_id: form_data.farm_id }, function(calendar) {
					if (calendar.length != 0) {
						form_data['calendar_id'] = calendar[0].calendar_id;

						$.post('/nutrient_management/add_record', form_data, function(record) {
							console.log('Successfully added soil record');

							$.get('/get_nutrient_plan_details', { calendar_id: calendar[0].calendar_id}, function(plan) {
								var detailed_nutrient_query = {
									farm_name: form_data.farm_name,
									calendar_id: calendar[0].calendar_id,
									type: 'Fertilizer',
									filter: form_data.farm_id
								};
								//*********** Update fertilizer recommendation items START ***********//

								$.get('/filter_nutrient_mgt', detailed_nutrient_query, function(details) {
									
									$.get('/get_crop_plans', { status: ['Active','In-Progress'], where: { key: 'calendar_id', val: calendar[0].calendar_id } }, function(curr_calendar) {

										$.get('/getAll_materials', { type: 'Fertilizer', filter: form_data.farm_id }, function(materials) {
											material_list = materials;
											$.get('/get_cycle_resources_used', { type: 'Fertilizer', farm_id: form_data.farm_id, calendar_id: calendar[0].calendar_id }, function(list) {
												
												var query = {
													where: {
														key: ['farm_id'],
														value: [form_data.farm_id]
													},
													order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
												}
												$.get('/get_work_orders', query, function(work_order_list) {
													var schedule_arr = createSchedule(materials, details.recommendation, list, form_data.farm_id, calculateDeficientN(details, list), details, curr_calendar[0], work_order_list, ndvi_cont);
													var recommendation_list = [];
													var ndvi_cont = schedule_arr.ndvi;
													schedule_arr = schedule_arr.schedule_arr;
													
													schedule_arr = normalizeSchedule(schedule_arr, 'js', materials, false);

													var fr_db_items = processFRItems(schedule_arr, plan[0].fr_plan_id, 'Single');
													
													$.get('/get_nutrient_plan_items', { frp_id: plan[0].fr_plan_id }, function(fr_items) {
														var db_arr = reduceDynamicFRItems(fr_db_items, fr_items);
														
														$.post('/update_nutrient_plan', { update: { last_updated: formatDate(new Date(system_date), 'YYYY-MM-DD'), last_ndvi: ndvi_cont }, filter: { fr_plan_id: plan[0].fr_plan_id } }, function(update_status) {
															console.log(update_status);
														});

														for (var i = 0; i < db_arr.length; i++) {
															$.post('/create_nutrient_item', db_arr[i], function(nutrient_item) {
																if (i == db_arr.length - 1) {
																	console.log('Updated fr_items for frp_id: '+plan[0].fr_plan_id);
																	window.location.href = '/nutrient_management/'+form_data.farm_name+'/'+calendar[0].calendar_id;
																}
															});
														}
													});
														
												});
													
											});
										});
									});
										
								});

								//*********** Update fertilizer recommendation items END ***********//

							});
						});
					}
					else {
						form_data['calendar_id'] = null;
						$.post('/nutrient_management/add_record', form_data, function(record) {
							console.log('Successfully added soil record');
						});
						window.location.href = '/farms';
					}
				});
			});
		});

		// Detailed Nutrient Mgt
		var wo_arr = [];

		$('#schedule_table').on('click', '.form-check-input', function() {
			var checkboxes = [];
			$("input:checkbox[name='fr_item']:checked").each(function() {
			   checkboxes.push($($(this)).val());
			});
			wo_arr = [];
			if (checkboxes.length != 0) {
				var index = [];
				var rows = $('#schedule_table .fr_item');

				var selected;
				var wo_obj;
				var adjusted_date;
				$('#generate_wo').removeClass('hide');

				for (var i = 0; i < checkboxes.length; i++) {
					selected = $($(rows)[checkboxes[i]]).children().filter('input:hidden');

					wo_obj  = {
						date: $(selected[0]).prop('value'),
						fertilizer: $(selected[1]).prop('value'),
						desc: $(selected[2]).prop('value'),
						amount: $(selected[3]).prop('value')
					};

					wo_arr.push(wo_obj);
				}
			}
			else {
				$('#generate_wo').addClass('hide');
			}
		});

		$('#generate_wo').on('click', function() {
			var data = consolidateUniqueWO(wo_arr);

			for (var i = 0; i < data.length; i++) {
				console.log(data[i]);
				$.post('/upload_wo', data[i], function(result) {
					if (i == data.length - 1) {
						console.log(result);
						window.location = result;
					}
				});
			}
		});
	}

});