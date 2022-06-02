const brain = require('brain.js');
const DecisionTree = require('decision-tree');

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
}

exports.smoothFP = function(arr) {
	for (var i = 0; i < arr.length; i++) {
		arr[i]['forecast_yield'] = arr[i]['forecast_yield'] == 'N/A' || arr[i].forecast_yield == null ? 'N/A' : arr[i]['forecast_yield'].toFixed(2)+' cavans/ha';
		arr[i]['current_yield'] = arr[i]['current_yield'] == 'N/A' || arr[i].current_yield == null  ? 'N/A' : arr[i]['current_yield'].toFixed(2)+' cavans/ha';
		arr[i]['total_harvest'] = arr[i]['total_harvest'] == 0 || arr[i].total_harvest == null ?   'N/A' : arr[i]['total_harvest'].toFixed(2)+' cavans';
		arr[i]['net_spend'] = numberWithCommas(arr[i]['net_spend'].toFixed(2));
	}
	return arr;
}

function smoothRadarChartData(obj) {
	var highest, higher;
	var highest_key, higher_key;
	var i = 0;
	for (const key in obj) {
		if (obj.hasOwnProperty(key) && typeof(obj[key]) == 'number') {
			if (i == 0) {
				highest = obj[key];
				higher = obj[key];
				highest_key = key;
				higher_key = key;
			}

			if (obj[key] > highest) {
				higher = highest;
				higher_key = highest_key;

				highest = obj[key];
				highest_key = key;
			}
			i++;
		}
	}
	obj['modifier'] = obj[highest_key] / obj[higher_key];
	obj[highest_key] = obj[higher_key];

	return obj;
}

// data: {
//     datasets: [{
//             label: 'Population', // Name the series
//             data: [{
// 			        x: 5,
// 			        y: 4
// 			    }, {
// 			        x: 2,
// 			        y: 14
// 			    },
// 			    {
// 			        x: 4,
// 			        y: 12
// 			    },
// 			    {
// 			        x: 2,
// 			        y: 10
// 			    },
// 			    {
// 			        x: 3,
// 			        y: 4
// 			    },
// 			    {
// 			        x: 3,
// 			        y: 5
// 			    },
// 			    {
// 			        x: 3,
// 			        y: 8
// 			    },
// 			    {
// 			        x: 6,
// 			        y: 12

// 			 }]; // Specify the data values array
//       borderColor: '#2196f3', // Add custom color border            
//       backgroundColor: '#2196f3', // Add custom color background (Points and Fill)
//         }]
// },

exports.processNutrientChart = function(nutrients, pd) {
	var type = ['Applied', 'Recommended'];
	var nutrient_arr = ['N', 'P', 'K'];
	var datasets = ['Applied - N', 'Recommended - N', 'Applied - P', 'Recommended - P', 'Applied - K', 'Recommended - K'];
	var color_arr = ['#bdecff', '#0b86ba', '#aee8ae', '#0ea149', '#f7d6ff', '#b418de'];
	var color_index = 0;
	var filtered;
	var dataset = [];
	var data_arr = [];
	var coords = [];
	var max = 0, min = 0;
	var legends = [];

	for (var x = 0; x < nutrient_arr.length; x++) {
		for (var i = 0; i < type.length; i++) {
			data_arr = [];
			filtered = nutrients.filter(e => e.nutrient_type == nutrient_arr[x] && e.application_type == type[i]);
			for (var n = 0; n < filtered.length; n++) {
				data_arr.push({
					x: filtered[n].dat, y: filtered[n].qty * filtered[n][nutrient_arr[x]]
				});
				if (filtered[n].qty * filtered[n][nutrient_arr[x]] > max) {
					max = filtered[n].qty * filtered[n][nutrient_arr[x]];
				}

				if (filtered[n].qty * filtered[n][nutrient_arr[x]] < min || n == 0) {
					min = filtered[n].qty * filtered[n][nutrient_arr[x]];
				}
			}
			for (var y = 0; y < datasets.length; y++) {
				if (`${type[i]} - ${nutrient_arr[x]}` == datasets[y]) {
					legends.push({ color: color_arr[color_index], lbl: datasets[y] });
					dataset.push({
						label: datasets[y],
						borderColor: color_arr[color_index],
						backgroundColor: color_arr[color_index],
						pointRadius: 10,
						data: data_arr
					});
					color_index++;
				}
			}
				
		}
	}

	var type = ['Pest', 'Disease'];
	var pd_color = ['#d64700', '#cfc800',];
	color_index = 0;
	
	for (var x = 0; x < type.length; x++) {
		data_arr = [];
		filtered = pd.filter(e => e.type == type[x]);
		for (var i = 0; i < filtered.length; i++) {
			data_arr.push({
				x: filtered[i].dat, y: (max+min)/2
			});
		}
		legends.push({ color: pd_color[color_index], lbl: type[x] });
		dataset.push({
			label: type[x],
			borderColor: pd_color[color_index],
			backgroundColor: pd_color[color_index],
			pointRadius: 25,
			data: data_arr
		});
		color_index++;
	}

	legends = [...new Map(legends.map(item =>
	  [item.lbl, item])).values()];

	return { dataset: dataset, legends: legends};
}

exports.processSeedChartData = function(calendars, seeds) {
	var obj_data = { labels: [], datasets: [] };
	var color, lbl, data;
	var color_arr = ['#caf270', '#45c490', '#008d93', '#2e5468', '#2e5468', '#665191', '#a05195', '#d45087',
	'#f95d6a', '#ff7c43', '#ffa600', ''
	];
	// var color_arr_set = [
	// 	['#004c6d', '#2b6588', '#497fa3', '#669ac0', '#82b6dd'],
	// 	['#228B22', '#489740', '#5da453', '#75b16b', '#8cbd82'],
	// 	['#B22222', '#c64339', '#d85f52', '#eb7a6b', '#fc9485'],
	// 	['#FFA500', '#f3a73b', '#e7a95b', '#d8aa76', '#c7ac90'],
	// 	['#962995', '#ac44aa', '#c25cbf', '#d975d5', '#f08deb'],
	// ]
	var color_arr_set = [
		['#29066B', '#489740', "#fccb35", "#1ff0ff", '#e65ab5'],
		['#7D3AC1', '#489740', "#fccb35", "#1ff0ff", '#e65ab5'],
		['#EB548C', '#489740', "#fccb35", "#1ff0ff", '#e65ab5'],
		['#EA7369', '#489740', "#fccb35", "#1ff0ff", '#e65ab5'],
		['#FDA587', '#489740', "#fccb35", "#1ff0ff", '#e65ab5'],
	]

	var unique_cycles = [...new Set(calendars.map(item =>
	  item.crop_plan))];
	var unique_farms = [...new Set(calendars.map(item =>
	  item.farm_name))];
	obj_data.labels = unique_cycles;

	var arr = [];
	var seed_obj = { seed: [], avg_yield: [] }, avg, count;
	var temp, stack, farm = '';
	var y = 0;
	var legends = [];

	for (var y = 0; y < unique_farms.length; y++) {
		for (var x = 0; x < seeds.length; x++) {
			arr = [];
			lbl = seeds[x].name;
			data = [];
			seed_obj.seed.push(lbl);
			avg = 0;
			count = 0;

			for (var i = 0; i < unique_cycles.length; i++) {
				temp = calendars.filter(e=> e.crop_plan == unique_cycles[i] && e.farm_name == unique_farms[y]);
				data.push(temp.filter(e => e.seed_planted == seeds[x].id).length != 0 ? temp.filter(e => e.seed_planted == seeds[x].id)[0].harvest_yield : 0 );
			}

			obj_data.datasets.push({
				label: lbl+` ${unique_farms[y]}`,
				yAxisID: `bar-stack`,
				stack: unique_farms[y],
				backgroundColor: color_arr_set[x][y],
				data: data
			});
			legends.push({ color: color_arr_set[x][y], lbl: lbl });

			seed_obj.avg_yield.push(parseInt(avg / count));
		}
	}
	legends = [...new Map(legends.map(item =>
	  [item.lbl, item])).values()];
	console.log(legends);
	return { seed: null, avg: null, data: obj_data, farm_legends: unique_farms.join().replace(/,/g, ' / '), legends: legends };
}

exports.processMeanProductivity = function(fp, input) {
	var avg_productivity = 0;
	var productivity = 0;

	for (var i = 0; i < fp.length; i++) {

		avg_productivity += (fp[i].harvest_yield.toFixed(2) / input.filter(e => e.calendar_id == fp[i].calendar_id).reduce((a, b) => a + b.total_cost, 0).toFixed(2));
	}

	avg_productivity /= fp.length;
	return (Math.round(avg_productivity * 10000) / 10000).toFixed(5);
}

exports.prepHarvestComparison = function(harvest_summary, nutrient_det) {
	var filtered_nutrients;
	for (var i = 0; i < harvest_summary.length; i++) {
		filtered_nutrients = nutrient_det.filter(e => e.calendar_id == harvest_summary[i].calendar_id);

		temp_nutrients = filtered_nutrients.filter(e => e.record_type == 'Nutrient User Generated');
		harvest_summary[i]['manual_application'] = temp_nutrients.length != 0 ? temp_nutrients[0].count : 0;

		temp_nutrients = filtered_nutrients.filter(e => e.record_type == 'Nutrient Generated Recommendation' && e.followed == 'Followed');
		harvest_summary[i]['followed_recommended'] = temp_nutrients.length != 0 ? temp_nutrients[0].count : 0;
		
		temp_nutrients = filtered_nutrients.filter(e => e.record_type == 'Nutrient Generated Recommendation' && e.followed == 'Unfollowed');
		harvest_summary[i]['total_recommended'] = temp_nutrients.length != 0 ? temp_nutrients[0].count : 0;
		harvest_summary[i]['total_recommended'] += harvest_summary[i]['followed_recommended'];
	}

	return harvest_summary;
}

exports.processHarvestSummary = function(data, harvest, history, fp, nutrient, system_reco_count) {
	const unique = [...new Map(data.map(item =>
	  [item.seed_name, item])).values()];
	var obj_keys = ['seed_rate', 'temp', 'humidity', 'pressure', 'rainfall', 'forecast', 'harvested'];
	var color_arr = ['#ad765e', '#abaa5b', '#50a84a', '#3a6b9e', '#8d3a9e'];
	var chart_arr = [];
	var dataset_obj;
	var summary = '';
	var total_harvest = 0, count_avg = 0;
	var printable = [];
	var og_pressure = [];
	var filtered_nutrients;
	var filtered_reco;
	var temp_nutrients;

	var env_obj = { Temperature: { data: [] }, Humidity: { data: [] }, Pressure: { data: [ ] }, Rainfall: { data: [] }, labels: [] };

	for (var i = 0; i < data.length; i++) {
		env_obj.labels.push(data[i].farm_name);
		env_obj.Temperature.data.push((Math.round((data[i].temp - 273.15) * 100)/100).toFixed(2));
		env_obj.Humidity.data.push(Math.round(data[i].humidity * 100)/100);
		env_obj.Pressure.data.push(Math.round(data[i].pressure * 100)/100);
		env_obj.Rainfall.data.push((Math.round(data[i].rainfall * 100)/100).toFixed(2));
	}



	for (var i = 0; i < unique.length; i++) {
		var chart_data = { labels: ['Seed Rate', 'Avg Temp', 'Avg Humidity', 'Avg Pressure', 'Avg Rainfall',
		 'User Nutrient Application', 'Recommended Nutrient Application', 'Total','Forecasted Yield', 'Actual Yield'], datasets: [], title: null };
		chart_data.datasets = [];
		chart_data.title = unique[i].seed_name;

		for (var x = 0; x < data.length; x++) {
			dataset_obj = { label: data[x].farm_name, data: [] };

			if (unique[i].seed_name === data[x].seed_name) {
				og_pressure.push((Math.round(data[x].pressure * 100)/100).toFixed(2));

				data[x].temp -= 273.15;
				data[x].temp = (Math.round(data[x].temp * 100)/100).toFixed(2);
				data[x].humidity = Math.round(data[x].humidity * 100)/100;
				data[x].pressure = Math.round(data[x].pressure * 100)/100;
				data[x].rainfall = (Math.round(data[x].rainfall * 100)/100).toFixed(2);

				//data[x] = smoothRadarChartData(data[x]);
				
				for (var y = 0; y < obj_keys.length; y++) {
					dataset_obj.data.push(data[x][obj_keys[y]]);

					if (obj_keys[y] == 'harvested') {
						total_harvest += data[x][obj_keys[y]];
						count_avg++;
					}
				}

				filtered_nutrients = nutrient.filter(e => e.calendar_id == data[x].calendar_id);
				filtered_reco = system_reco_count.filter(e => e.calendar_id == data[x].calendar_id);

				temp_nutrients = filtered_nutrients.filter(e => e.record_type == 'Nutrient User Generated');
				temp_nutrients = temp_nutrients.length != 0 ? temp_nutrients[0].count : 0;
				dataset_obj.data.splice(5, 0, temp_nutrients);

				temp_nutrients = filtered_nutrients.filter(e => e.record_type == 'Nutrient Generated Recommendation' && e.followed == 'Followed');
				temp_nutrients = temp_nutrients.length != 0 ? temp_nutrients[0].count : 0;
				dataset_obj.data.splice(6, 0, temp_nutrients);
				
				// temp_nutrients = filtered_nutrients.filter(e => e.record_type == 'Nutrient Generated Recommendation' && (e.followed == 'Unfollowed' || e.followed == 'N/A') );
				// temp_nutrients = temp_nutrients.length != 0 ? temp_nutrients[0].count : 0;
				// temp_nutrients += dataset_obj.data[6];
				temp_nutrients = filtered_reco[0].count;
				dataset_obj.data.splice(7, 0, temp_nutrients);

				dataset_obj.data[8] = dataset_obj.data[8] == -1 ? 'N/A' : dataset_obj.data[8];
				//console.log(dataset_obj);
				chart_data.datasets.push(dataset_obj);
			}

		}

		chart_arr.push(chart_data);
	}

	for (var i = 0; i < chart_arr.length; i++) {
		printable = printable.concat(JSON.parse(JSON.stringify(chart_arr[i])));
	}
		
	var index = 0;

	for (var i = 0; i < printable.length; i++) {
		printable[i].labels.splice(7,1);
		for (var x = 0; x < printable[i].datasets.length; x++) {
			
			
			index++;
			printable[i].datasets[x].data[6] = `${printable[i].datasets[x].data[6]} / ${printable[i].datasets[x].data[7]}`;
			printable[i].datasets[x].data.splice(7,1);
		}
	}
	printable['total_harvest'] = total_harvest;
	printable['avg'] = Math.round(total_harvest / count_avg * 100) / 100;

	for (var x = 0; x < chart_arr.length; x++) {
		chart_arr[x].labels.splice(7, 1);
		for (var i = 0; i < chart_arr[x].datasets.length; i++) {
			chart_arr[x].datasets[i].data.splice(7, 1);
		}
	}
			
	if (harvest.filter(e => e.farm_name).length != 0) {
		summary += `A total of ${harvest.filter(e => e.farm_name).length} farms conducted special/early harvest. `;
		for (var i = 0; i < harvest.length; i++) {
			if (i == 1) {
				summary += ' On the other hand, ';
			}
			summary += `${harvest[i].farm_name} conducted early harvests ${harvest[i].frequency} and was able to harvest a total of ${harvest[i].harvest} cavans with the earliest during the ${harvest[i].stage_harvested} stage.`;
		}
	} 
	else {
		summary += 'All farms were able to complete their respective crop calendars without any special/early harvests.';
	}

	//Error handling to do more validation!!
	if (fp.filter(e => e.status == 'Completed' && e.productivity != 'N/A').length == 0) {
		var highest_yield = 0;
		var highest_productivity = 0;
		var lowest_yield = 0;
		var lowest_productivity = 0;
	}
	else {
		var highest_yield = fp.filter(e => e.status == 'Completed' && e.productivity != 'N/A').reduce((a,b)=>a.current_yield>b.current_yield?a:b);
		var highest_productivity = fp.filter(e => e.status == 'Completed' && e.productivity != 'N/A').reduce((a,b)=>a.current_productivity>b.current_productivity?a:b);
		var lowest_yield = fp.filter(e => e.status == 'Completed' && e.current_yield != 'N/A').reduce((a,b)=>a.current_yield<b.current_yield?a:b);
		var lowest_productivity = fp.filter(e => e.status == 'Completed' && e.productivity != 'N/A').reduce((a,b)=>a.current_productivity<b.current_productivity?a:b);
	}

	summary += ` ${highest_yield.farm_name} is the top performer in terms of cavans harvest with a harvest of ${highest_yield.current_yield} 
	while the worst performer is ${lowest_yield.farm_name} with a harvest of only ${lowest_yield.current_yield}. In terms of farm productivity however,
		${highest_productivity.farm_name} performed the best with costs incurred per cavan at Php 
	${(Math.round(highest_productivity.net_spend / parseFloat(highest_productivity.current_yield*highest_productivity.farm_area)))} per cavan produced.`;
	
	summary = summary.replace(/(\r\n|\n|\r)/gm, "");
	
	for (var i = 0; i < data.length; i++) {
		data[i]['historical_yield'] = 'N/A';
		for (var x = 0; x < history.length; x++) {

			if (data[i].farm_name == history[x].farm_name) {
				data[i]['historical_yield'] = Math.round(history[x].avg_yield * 100)/100;
			}
		}
		data[i].forecast > data[i].harvested ? 
				data[i].forecast / data[i].harvested : 
				data[i].forecast / data[i].harvested
		data[i]['change'] = { 
			val: data[i].forecast != 'N/A' ? 
				(data[i].harvested - data[i].forecast) / data[i].forecast : 0,
			arrow: data[i].forecast != 'N/A' ? 
				data[i].harvested >= data[i].forecast ? 
				'up' :
				'down'
				: 'up'
		};

		data[i].change.val = data[i].change.val != 0 ? (parseInt((data[i].change.val * 100))) : 0;
		data[i].change.color = data[i].change.arrow == 'up' ? 
		data[i].change.val != 0 ? 'text-success' : 'text-muted' : 'text-danger';
	}

	return { chart_data: chart_arr, env_chart: JSON.stringify(env_obj), json_chart_data: JSON.stringify(chart_arr), detailed_list: data, overview: summary, printable: printable };
}

exports.processDetailedFarmProductivity = function(fp, resources) {
	var fp_obj = {
		yield: { arr: [], total: 0 },
		inputs: { arr: [], total: 0 },
		productivity: 0
	}

	var category_cont;
	var cont_obj;
	var obj;
	var input_types = ['Seed', 'Fertilizer', 'Pesticide']; //Removed Employee Labor
	var input_categories = ['Input Resources']; //Removed Labor
	var temp_arr;
	var index = 0;

	var input_obj = {
		name: fp[0].seed_name, forecasted_yield: fp[0].forecast_yield == -1 ? `N/A` : `${fp[0].forecast_yield} cavans/ha`, 
		current_yield: fp[0].current_yield != null ? Math.round(fp[0].current_yield*100)/100+' cavans/ha' : 'N/A',
		total: fp[0].current_yield != null ? Math.round(fp[0].current_yield * fp[0].farm_area * 100)/100+' cavans': 'N/A'
	}
	
	fp_obj.yield.arr.push(input_obj);
	fp_obj.yield.total = input_obj.total;

	for (var y = 0; y < input_categories.length; y++) {
		category_cont = { title: input_categories[y], rows: [], total: 0 };

		for (var i = index; i < input_types.length; i++) {
			temp_arr = resources.filter(e => e.type == input_types[i]);

			cont_obj = { title: input_types[i], rows: [], total: 0 };
			for (var x = 0; x < temp_arr.length; x++) {
				obj = { input: temp_arr[x].resource_name, qty: temp_arr[x].qty, units: temp_arr[x].resource_unit, 
					cost_per_unit: numberWithCommas((Math.round(parseFloat(temp_arr[x].price) * 100)/100).toFixed(2)), 
					total_cost: numberWithCommas((Math.round(parseFloat(temp_arr[x].total_cost) * 100)/100).toFixed(2)) };
				
				cont_obj.total += parseFloat(temp_arr[x].total_cost);
				cont_obj.rows.push(obj);
				if (input_categories[y] == 'Input Resources' && input_types[i] != 'Employee Labor' 
					|| input_categories[y] == 'Labor' && input_types[i] == 'Employee Labor') {
					fp_obj.inputs.total += parseFloat(temp_arr[x].total_cost);
				}
			}
			cont_obj.total = numberWithCommas((Math.round(cont_obj.total * 100)/100).toFixed(2));
			if (input_categories[y] == 'Input Resources' && input_types[i] != 'Employee Labor' 
				|| input_categories[y] == 'Labor' && input_types[i] == 'Employee Labor') {
				category_cont.rows.push(cont_obj);
			}
		}

		fp_obj.inputs.arr.push(category_cont);
		index++;
	}

	fp_obj.productivity = fp_obj.yield.total != 'N/A' ? (Math.round(parseInt(fp_obj.yield.total.replace(' cavans','')) / fp_obj.inputs.total * 1000) / 1000)+' cavans per peso' : 'N/A';
	fp_obj['cost_per_cavan'] = fp_obj.yield.total != 'N/A' ? (Math.round(fp_obj.inputs.total / parseInt(fp_obj.yield.total.replace(' cavans','')) * 1000) / 1000)+' pesos per cavan per' : '&nbsp';
	fp_obj.inputs.total = numberWithCommas((Math.round(fp_obj.inputs.total * 100)/100).toFixed(2));

	if (fp[0].current_yield == 0 || fp[0].current_yield == null) {
		fp_obj['cost_per_cavan'] = 'N/A';
		fp_obj.productivity = 'N/A';
	}

	return fp_obj;
}

exports.calculateProductivity = function(fp_overview, input_resources) {
	for (var i = 0; i < fp_overview.length; i++) {
		fp_overview[i]['input_items'] = input_resources.filter(e => fp_overview[i].calendar_id == e.calendar_id);
		fp_overview[i]['net_spend'] = fp_overview[i]['input_items'].reduce((a, b) => a + b.total_cost, 0);
		fp_overview[i]['prev_input_items'] = input_resources.filter(e => fp_overview[i].max_prev_calendar == e.calendar_id);
		fp_overview[i]['prev_net_spend'] = fp_overview[i]['prev_input_items'].reduce((a, b) => a + b.total_cost, 0);

		fp_overview[i]['current_productivity'] = 'N/A';
		if (fp_overview[i].max_previous_yield == null) {
			fp_overview[i]['prev_productivity'] = 'N/A'
		}
		else
			fp_overview[i]['prev_productivity'] = (Math.round((fp_overview[i].max_previous_yield / fp_overview[i].prev_net_spend) * 100000) / 100000).toFixed(5);
		
		fp_overview[i]['total_harvest'] = fp_overview[i]['current_yield'] != 'N/A' ? fp_overview[i].farm_area * fp_overview[i].current_yield : 'N/A';

		fp_overview[i].current_yield = fp_overview[i].current_yield != null ? fp_overview[i].current_yield
			 : fp_overview[i].current_yield = 'N/A';

		fp_overview[i]['current_productivity'] = fp_overview[i].current_yield != 'N/A' ? (Math.round((fp_overview[i].current_yield / fp_overview[i].net_spend) * 100000) / 100000).toFixed(5) : `N/A`;
		
		fp_overview[i]['change'] = { 
			val: fp_overview[i].current_productivity != 'N/A' ? 
				fp_overview[i].prev_productivity != 'N/A' ?
				(fp_overview[i].current_productivity - fp_overview[i].prev_productivity) / fp_overview[i].prev_productivity : 'N/A'
				: 0,
			arrow: fp_overview[i].current_productivity != 'N/A' ? 
				fp_overview[i].current_productivity >= fp_overview[i].prev_productivity ? 
				'up' :
				'down'
				: 'up'
		};

		fp_overview[i].change.val = fp_overview[i].change.val != 'N/A' ?
								fp_overview[i].change.val != 0 ? parseInt((fp_overview[i].change.val * 100)) : 'N/A'
								: '0';
		fp_overview[i].change.color = fp_overview[i].change.arrow == 'up' ? 
		fp_overview[i].change.val != 0 ? 'text-success' : 'text-muted' : 'text-danger';

		fp_overview[i].outlook = fp_overview[i].current_productivity != 'N/A' ?
			fp_overview[i].current_productivity >= (fp_overview[i].prev_productivity * 1.4) ?
			'Attained' : fp_overview[i].current_productivity < (fp_overview[i].prev_productivity * 1.4) && fp_overview[i].current_productivity >= (fp_overview[i].prev_productivity * 1.2) ?
			'Met' : fp_overview[i].current_productivity < (fp_overview[i].prev_productivity * 1.2) && fp_overview[i].current_productivity >= (fp_overview[i].prev_productivity * 0.8) ?
			'Acceptable' : 'Unmet' : 'N/A';

		if (fp_overview[i].change.val == 'N/A')
			fp_overview[i].change.color = 'text-muted';
	}


	return fp_overview;
}

 exports.processNutrientRecommendation = function(data) {
 	
 }

function denormalizeData(data, val) {
	return val.min + data * (val.max - val.min);
}

function parseDecimal(num, decimal) {
	return parseFloat((num).toFixed(decimal));
}

// [temp, humidity, pressure, rainfall, seed_type, yield, N, P, K, seed rate]
exports.forecastYield = function(dataset, testing) {
	const net = new brain.recurrent.LSTMTimeStep({
	  inputSize: 10,
	  hiddenLayers: [9],
	  outputSize: 10,
	});
	const trainingData = [dataset.data];

	net.train(trainingData, { 
		//log: true 
	});

	const forecast = net.forecast(testing.data, 1);

	for (var i = 0; i < forecast.length; i++) {
		for (var x = 0; x < forecast[i].length; x++) {

			forecast[i][x] = denormalizeData(forecast[i][x], dataset.val[x]);
		}
	}

	return forecast;
}

//!!
exports.weatherForecast14D = function(dataset, testing, length) {
	var result_obj;

	const net = new brain.recurrent.LSTMTimeStep({
	  inputSize: 6,
	  hiddenLayers: [10],
	  outputSize: 6,
	});

	const trainingData = dataset.data_arr;

	net.train(trainingData, { 
		//log: true 
	});


	const forecast = net.forecast(testing.data_arr, 9 * length);

	var api_forecast = testing.data_arr;

	// Merge first 5 days from Agro API and 9 days from ANN forecast
	for (var i = 0; i < forecast.length; i++) {
		api_forecast.push(forecast[i]);
	}

	// Normalize values and process data
	for (var i = 0; i < dataset.denormalize_val.length; i++) {
		for (var x = 0; x < api_forecast.length; x++) {
			api_forecast[x][i] = denormalizeData(api_forecast[x][i], dataset.denormalize_val[i]);
		}
	}

	result_obj  = { forecast: api_forecast, weather_data: dataset.uniqueWeather };

	return result_obj;
}

exports.analyzeHistoricalNDVI = function(arr) {
	var resultObj = { stats: {}, dataArr: [] };
	var dc = 0, cl = 0, 
	std = 0, p25 = 0, p75 = 0, min = 0, max = 0, mean = 0, median = 0;

	for (var i = 0; i < arr.length; i++) {
		dc += arr[i].dc;
		cl += arr[i].cl;

		std += arr[i].data.std;
		p25 += arr[i].data.p25;
		p75 += arr[i].data.p75;
		min += arr[i].data.min;
		max += arr[i].data.max;
		mean += arr[i].data.mean;
		median += arr[i].data.median;

		resultObj.dataArr.push(arr[i]);
	}

	std /= (arr.length);
	p25 /= (arr.length);
	p75 /= (arr.length);
	min /= (arr.length);
	max /= (arr.length);
	mean /= (arr.length);
	median /= (arr.length);

	resultObj.stats['avg_dc'] = parseDecimal(dc,5);
	resultObj.stats['avg_cl'] = parseDecimal(cl,5);
	resultObj.stats['avg_std'] = parseDecimal(std,5);
	resultObj.stats['avg_p25'] = parseDecimal(p25,5);
	resultObj.stats['avg_p75'] = parseDecimal(p75,5);
	resultObj.stats['avg_min'] = parseDecimal(min,5);
	resultObj.stats['avg_max'] = parseDecimal(max,5);
	resultObj.stats['avg_mean'] = parseDecimal(mean,5);
	resultObj.stats['avg_median'] = parseDecimal(median,5);

	return resultObj;
}



