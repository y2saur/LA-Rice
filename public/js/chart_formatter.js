exports.formatWOStatusChart = function(data) {
	var obj_data = { labels: [], datasets: [] };
	var color, lbl, data2, data1;
	// N, P, K CA4E0C FAC55B F0A276 506F86
	var color_arr = ['#4BACAD', '#FAC55B', "#F0A276", '#506F86', '#2F3C4F', "#CA4E0C"];

	const unique_cycles = [...new Set(data.map(e => e.farm_name).map(item => item))];
	const unique_status = ['Completed', 'Pending (Regular)', 'Pending (Overdue)', 'In-Progress (Regular)', 'In-Progress (Overdue)', 'Cancelled'];
	var filtered, nutrient_sum;

	obj_data.labels = unique_cycles;

	for (var x = 0; x < unique_status.length; x++) {
		arr = [];
		lbl = unique_status[x];
		data1 = [];

		for (var i = 0; i < unique_cycles.length; i++) {
			nutrient_sum = 0;

			if (unique_status[x] == 'Pending (Regular)') {
				filtered = data.filter(e=> e.farm_name == unique_cycles[i] && e.status == 'Pending' && e.type == 'Normal');
			}
			else if (unique_status[x] == 'Pending (Overdue)') {
				filtered = data.filter(e=> e.farm_name == unique_cycles[i] && e.status == 'Pending' && e.type == 'Overdue');
			}
			else if (unique_status[x] == 'In-Progress (Regular)') {
				filtered = data.filter(e=> e.farm_name == unique_cycles[i] && e.status == 'In-Progress' && e.type == 'Normal');
			}
			else if (unique_status[x] == 'In-Progress (Overdue)') {
				filtered = data.filter(e=> e.farm_name == unique_cycles[i] && e.status == 'In-Progress' && e.type == 'Overdue');
			}
			else {
				filtered = data.filter(e=> e.farm_name == unique_cycles[i] && e.status == unique_status[x] && e.type == 'Normal');
			}

			filtered.forEach(function(item) {
				nutrient_sum += item.count;
			});

			data1.push(nutrient_sum);
		}

		obj_data.datasets.push({
			label: lbl,
			yAxisID: `bar-stack`,
			stack: 'harvested',
			backgroundColor: color_arr[x],
			data: data1
		});

	}

	return obj_data;
} 

exports.formatProductionChart = function(data) {
	var obj_data = { labels: [], datasets: [] };
	var color, lbl, data2, data1;
	var color_arr_set = [
		['#29066B', '#7D3AC1', "#EB548C", "#EA7369", '#FDA587'],
		['#D4CDE2', '#E5D8F3', "#F8DBF0", "#FBE3E1", '#FBEDE8']
	]
	const unique_cycles = [...new Set(data.map(e => e.crop_plan).map(item => item))];
	const unique_seeds = [...new Set(data.map(e => e.seed_name).map(item => item))];
	var filtered, sum_harvest, sum_forecast;

	obj_data.labels = unique_cycles;

	for (var x = 0; x < unique_seeds.length; x++) {
		arr = [];
		lbl = unique_seeds[x];
		data1 = [];
		data2 = [];

		for (var i = 0; i < unique_cycles.length; i++) {
			filtered = data.filter(e=> e.crop_plan == unique_cycles[i]);
			filtered = filtered.filter(e => e.seed_name == unique_seeds[x]);
			
			sum_harvest = 0;
			sum_forecast = 0;

			filtered.forEach(function(item) {
				sum_harvest += Math.round(item.harvested*100)/100;
				sum_forecast += Math.round(item.forecasted*100)/100;
			})

			data1.push(filtered.length != 0 ? sum_harvest  : 0 );
			data2.push(filtered.length != 0 ? sum_forecast : 0 );
		}

		obj_data.datasets.push({
			label: `Harvested ${lbl}`,
			yAxisID: `bar-stack`,
			stack: 'harvested',
			backgroundColor: color_arr_set[0][x],
			data: data1
		});
		obj_data.datasets.push({
			label: `Forecasted ${lbl}`,
			yAxisID: `bar-stack`,
			stack: 'forecasted',
			backgroundColor: color_arr_set[1][x],
			data: data2
		});
	}

	//console.log(obj_data.datasets);

	return obj_data;
} 

exports.formatConsumptionChart = function(data) {
	var obj_data = { labels: [], datasets: [] };
	var color, lbl, data2, data1;
	// N, P, K
	var color_arr = ['#0b86ba', '#1ee6bf', "#b418de"];

	const unique_cycles = [...new Set(data.map(e => e.crop_plan).map(item => item))];
	const unique_nutrients = ['N', 'P', 'K'];
	var filtered, nutrient_sum;

	obj_data.labels = unique_cycles;

	for (var x = 0; x < unique_nutrients.length; x++) {
		arr = [];
		lbl = unique_nutrients[x];
		data1 = [];

		for (var i = 0; i < unique_cycles.length; i++) {
			nutrient_sum = 0;
			filtered = data.filter(e=> e.crop_plan == unique_cycles[i]);
			filtered.forEach(function(item) {
				nutrient_sum += item[lbl] * item.qty;
			});

			data1.push(nutrient_sum);
		}

		obj_data.datasets.push({
			label: lbl,
			yAxisID: `bar-stack`,
			stack: 'harvested',
			backgroundColor: color_arr[x],
			data: data1
		});

	}

	return obj_data;
}

exports.formatPDOverview = function(data) {
	var obj_data = { labels: [], datasets: [] };
	var obj_data1 = { labels: [], datasets: [] };
	var color, lbl, data2, data1;
	var pd_color = ['#2b6588', '#489740', "#fccb35", "#1ff0ff", '#e65ab5', '#2b6588', '#489740', "#fccb35", "#1ff0ff", '#e65ab5'];
	// N, P, K
	var line_color = ['#2b6588', '#489740'];
	var obj_data = { labels: [], datasets: [] };
	var color, lbl, data2, data1;

	const unique_cycles = [...new Set(data.map(e => e.crop_plan).map(item => item))];
	const unique_stages = [...new Set(data.map(e => e.stage_diagnosed).map(item => item))];
	const unique_pd = [...new Set(data.map(e => e.pd_name).map(item => item))];
	const type = ['Pest', 'Disease'];

	obj_data.labels = unique_cycles;
	obj_data1.labels = unique_stages;

	// PD Trend by type
	var count_occurence = 0;
	for (var x = 0; x < type.length; x++) {
		arr = [];
		lbl = type[x];
		data1 = [];

		for (var i = 0; i < unique_cycles.length; i++) {
			count_occurence = 0;
			filtered = data.filter(e=> e.crop_plan == unique_cycles[i] && e.type == lbl);
			filtered.forEach(function(item) {
				count_occurence += item.count;
			});

			data1.push(count_occurence);
		}
		obj_data.datasets.push({
			label: lbl,
			borderColor: line_color[x],
			backgroundColor: line_color[x],
			data: data1
		});
	}

	// PD By Stage
	var count_occurence = 0;
	for (var x = 0; x < unique_pd.length; x++) {
		arr = [];
		lbl = unique_pd[x];
		data1 = [];

		for (var i = 0; i < unique_stages.length; i++) {
			count_occurence = 0;
			filtered = data.filter(e=> e.pd_name == lbl && e.stage_diagnosed == unique_stages[i]);
			filtered.forEach(function(item) {
				count_occurence += item.count;
			});
			if (count_occurence != 0)
				data1.push(count_occurence);
			else 
				data1.push(null);
		}

		obj_data1.datasets.push({
			label: lbl,
			backgroundColor: pd_color[x],
			data: data1,
			skippNull: true,

		});
	}

	return { trend: (obj_data), stage: (obj_data1) };
}