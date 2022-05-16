exports.processChangedDate = function(start, end) {
	var true_date = new Date();

	if (start == end) {
		start = new Date(start);
		start.setDate(start.getDate() - 30);
		start = formatDate(start, 'YYYY-MM-DD');
	}

	if (true_date < new Date(start) || true_date < new Date(end)) {
		start = new Date(start);
		start.setMonth(start.getMonth() - 12);

		end = new Date(end);
		end.setMonth(end.getMonth() - 12);
	}

	return { start: start, end: end };
}

exports.smoothDailyData = function(arr, type) {
	var i = 0;
	var counter = 1;
	var temp_obj = arr[0];
	var temp_arr = []; 
	if (type == 'soil_history') {
		do {
			if (arr[i].dt == arr[i+1].dt) {
				temp_obj.moisture += arr[i+1].moisture;
				temp_obj.t0 += arr[i+1].t0;
				temp_obj.t10 += arr[i+1].t10;
				counter++;
			}
			else {
				temp_obj.moisture /= counter;
				temp_obj.t0 /= counter;
				temp_obj.t10 /= counter;

				counter = 1;

				temp_obj = arr[i];
				temp_arr.push(temp_obj);
			}
			i++;
		}
		while (i < arr.length-1);
	}
	else if (type == 'accumulated_temp') {
		do {
			if (arr[i].dt == arr[i+1].dt) {
				temp_obj.clouds.all += arr[i+1].clouds.all;
				temp_obj.main.humidity += arr[i+1].main.humidity;
				temp_obj.main.pressure += arr[i+1].main.pressure;
				temp_obj.main.temp += arr[i+1].main.temp;
				counter++;
			}
			else {
				temp_obj.clouds.all /= counter;
				temp_obj.main.humidity /= counter;
				temp_obj.main.pressure /= counter;
				temp_obj.main.temp /= counter;
				counter = 1;

				temp_obj = arr[i];
				temp_arr.push(temp_obj);
			}
			i++;
		}
		while (i < arr.length-1);
	}
	else if (type == 'uvi_history') {
		// do {

		// }
		// while (i < arr.length);
	}
	return temp_arr;
}

exports.processNPKValues = function(obj, area, applied, msg, wo_list) {
	obj = obj[0];
	var keys = ['n_lvl', 'p_lvl', 'k_lvl'];
	var new_keys = ['n_val', 'p_val', 'k_val'];
	var nutrient_lbls = ['N:', 'P205:', 'K20:'];
	var index;
	var val;
	var obj_result = {
		Depleted: [14.0, 8.25, 13.5],
		Deficient: [7.75, 4.0, 8.75],
		Adequate: [3.75, 1.0, 4.75],
		Sufficient: [3.75, 1.0, 4.75],
		Surplus: [0, 0, 0]
	};
	var count_applied = 0;
	var conversion = 30.5151727; // oz / 100 sq ft to kg/ha
	var count_deficiencies = 0;

	for (var i = 0; i < applied.length; i++) {
		if (applied[i].resources_used != 0) {
			obj.p_lvl -= applied[i].P * applied[i].resources_used;
			obj.k_lvl -= applied[i].K * applied[i].resources_used;
			obj.n_lvl -= applied[i].N * applied[i].resources_used;
		}
	}

	obj.p_lvl = obj.p_lvl < 0 ? 0 : obj.p_lvl;
	obj.k_lvl = obj.k_lvl < 0 ? 0 : obj.k_lvl;
	obj.n_lvl = obj.n_lvl < 0 ? 0 : obj.n_lvl; 

	for (var i = 0; i < keys.length; i++) {
			switch(keys[i]) {
			case 'n_lvl':
			obj_key = 
			index = 0;
			break;
			case 'p_lvl':
			index = 1;
			break;
			case 'k_lvl':
			index = 2;
			break;
		}

		if (obj_result['Depleted'][index] == obj[keys[i]]) {
			val = 'Depleted';
			count_deficiencies++;
		}
		else if (obj_result['Deficient'][index] == obj[keys[i]]) {
			val = 'Deficient';
			count_deficiencies++;
		}
		else if (obj_result['Adequate'][index] == obj[keys[i]]) {
			val = 'Adequate';
		}
		else if (obj_result['Sufficient'][index] == obj[keys[i]]) {
			val = 'Sufficient';
		}
		else if (obj_result['Surplus'][index] == obj[keys[i]]) {
			val = 'Surplus';
		}

		obj[new_keys[i]] = val;
		//console.log(obj[keys[i]]);
		obj[keys[i]] = Math.round(obj[keys[i]]*conversion * area * 100) / 100;
		//console.log(obj[keys[i]]);
		if (i == 0) {
			msg += 'The nutrient requirements at the start of the crop calendar are as follows - '; 
		}
		msg += nutrient_lbls[i]+' '+obj[keys[i]];
		if (i != keys.length -1) {
			msg += ', ';
		}
		else {
			msg += '. ';
		}
	}

	count_applied = wo_list.length;
	for (var  i = 0; i < keys.length; i++) {
		obj[keys[i]] = Math.round(obj[keys[i]] * 100) / 100;

		obj[keys[i]] = obj[keys[i]] < 0 ? 0 : obj[keys[i]];

		if (count_applied != 0) {
			if (i == 0) {
				msg += 'A total of '+count_applied+' fertilizer applications have been completed to this date which reduced the nutrient requirements to - ';
			}
			else {

			}
			msg += nutrient_lbls[i]+' '+obj[keys[i]];

			if (i != keys.length -1) {
				msg += ', ';
			}
			else {
				msg += '. ';
			}
		}
	}

	//console.log(obj);

	obj['deficiencies'] = count_deficiencies+' out of 3';

	obj['summary'] = msg;

	return obj;
}

function objectMerger(arr1, arr2, arr1_param, arr2_param, id) {
	var objArr = [];
	var obj;

	for (var i = 0; i < arr1.length; i++) {
		obj = arr1[i];
		obj[id] = [];

		for (var x = 0; x < arr2.length; x++) {
			if (arr1[i][arr1_param.key] == arr2[x][arr2_param.key]) {

				if (arr2_param.cleanse.length != 0) {
					for (var m = 0 ; m < arr2_param.cleanse.length; m++) {
						delete arr2[x][arr2_param.cleanse[m]];
					}
				}
				obj[id].push(arr2[x]);
			}
		}
		
		objArr.push(obj);
	}

	return objArr;
}

exports.dateDiff = function(d1, d2) {
	if (!(d1 instanceof Date && !isNaN(d1))) {
		d1 = new Date(d1);
	}
	if (!(d2 instanceof Date && !isNaN(d2))) {
		d2 = new Date(d2);
	}
	const diffTime = Math.abs(d2 - d1);
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
	return diffDays;
}

exports.smoothHourlyData = function(arr, hours) {
	var result = [];
	for (var i = 0; i < hours.length; i++) {
		for (var x = 0; x < arr.length; x++) {
			if (formatDate(arr[x].dt, 'HH:m') == hours[i]) {
				result.push(arr[x]);
			}
		}
	}
	return result;
}


exports.aggregateFarmData = function(farms, plots, employees) {
	var objArr;

	var param1 = { key:'farm_id' };
	var param2 = { key:'farm_id', cleanse:['farm_id'] };
	var id = 'plots';

	objArr = objectMerger(farms, plots, param1, param2, id);

	var param1 = { key:'farm_id' };
	var param2 = { key:'assigned_farm', cleanse:['assigned_farm'], append_key:'position', append_var:'Farm Manager' };
	var id = 'employees';

	objArr = objectMerger(objArr, employees, param1, param2, id);

	return objArr;
}

exports.coordinateToFloat = function(arr) {
	for (var i = 0; i < arr.length; i++) {
		for (var x = 0; x < arr[i].length; x++) {
			for (var y = 0; y < arr[i][x].length; y++) {
				arr[i][x][y] = parseFloat(arr[i][x][y]);
			}
		}
	}
	return arr;
}

exports.parseCoordinate = function(data) {
	var counter = 0;
	var coordArr = [], arr = [], apiArr = [];
	if (data.length % 2 != 0 || data.length == 0) {
		return false;
	}
	else {
		for (var i = 0; i < data.length; i++) {
			arr.push(data[i]);


			counter++;

			if (counter == 2) {
				coordArr.push(arr);

				arr = [];
				counter = 0;
			}
		}
	}
	apiArr.push(coordArr)
	
	return apiArr;
}

exports.dateToUnix = function(date) {
	let x = new Date(date);
	if (!x instanceof Date) {
		date = Date.parse(date);
	}
	if (new Date(date) >= new Date()) {
		date = (new Date());
		date.setDate(date.getDate() - 1);
	}
	//console.log(date);

	return parseInt((new Date(date).getTime() / 1000).toFixed(0));
}

exports.unixtoDate = function(timestamp) {
	return new Date(timestamp * 1000);
}

function partitionData(data, size) {
	var partition = { training: [], testing: [] };
	var m = data.length;

	m = Math.round(m * size);

	for (var i = 0; i < data.length; i++) {
		if (i < m) {
			partition.training.push(data[i]);
		}
		else {
			partition.testing.push(data[i]);
		}
	}

	return partition;
}

exports.normalizeData = function(array) {
	var i, obj = { min: 0, max: 0, arr: [] };
	var max = Number.MIN_VALUE;
	var min = Number.MAX_VALUE;
	for (i = 0; i < array.length; i++)
	{
	   if(array[i]>max)
	   {
	       max = array[i];
	   }

	   if(array[i]<min)
	   {
	       min = array[i];
	   }
	}

	for (i = 0; i < array.length; i++)
	{
	   var norm = (array[i]-min)/(max-min);
	   norm = Number.isNaN(norm) ? 1 : norm;
	   array[i] = norm;
	}

	obj.min = min;
	obj.max = max;
	obj.arr = array;

	max = Number.MIN_VALUE;
	min = Number.MAX_VALUE;
	for (i = 0; i < array.length; i++) {
	    if(array[i]>max) {
	        max = array[i];
	    }
	}

	return obj;
}

function normalizeData(array) {
	var i, obj = { min: 0, max: 0, arr: [] };
	var max = Number.MIN_VALUE;
	var min = Number.MAX_VALUE;
	for (i = 0; i < array.length; i++)
	{
	   if(array[i]>max)
	   {
	       max = array[i];
	   }

	   if(array[i]<min)
	   {
	       min = array[i];
	   }
	}

	for (i = 0; i < array.length; i++)
	{
	   var norm = (array[i]-min)/(max-min);
	   array[i] = norm;
	}

	obj.min = min;
	obj.max = max;
	obj.arr = array;

	max = Number.MIN_VALUE;
	min = Number.MAX_VALUE;
	for (i = 0; i < array.length; i++) {
	    if(array[i]>max) {
	        max = array[i];
	    }
	}

	return obj;
}

function embedWeatherIDs(obj, array) {
	const unique = [...new Map(array.map(item =>
	  [item['weather'][0]['id'], item])).values()];
	var unique_weathers = [];
	var temp_obj = { id: null, name: null, desc: null };

	for (var i = 0; i < unique.length; i++) {
		unique_weathers.push({ id: unique[i].weather[0].id, name: unique[i].weather[0].main, 
			desc: unique[i].weather[0].description });
	}

	obj['uniqueWeather'] = unique_weathers;

	return obj;
}

function parseHour(hour) {
	return parseInt(hour)+hour.slice(-2);
}

function filterHoursToday(hour_arr, curr_hour) {
	filtered_hour = hour_arr.filter(hour => hour.slice(-2) == curr_hour.slice(-2));
	filtered_hour = filtered_hour.filter(function(item, i) {
		if (i > 0) {
			if (item[i-1] < item[i]) {
				return item;
			}
			else {

			}
		}
		else
			return item;
	});

	return filtered_hour;
}

function findStartIndex(filtered_arr, arr) {
	// console.log(filtered_arr);
	// console.log(arr);
	var index = 0;
	for (var i = 0; i < arr.length; i++) {
		if (filtered_arr[filtered_arr.length-1] == arr[i]) {
			index = i;
		}
	}
	return index;
}

function sortHours(arr) {
	var am = arr.filter(hour => hour.slice(-2) == 'AM');
	var pm = arr.filter(hour => hour.slice(-2) == 'PM');

	pm = pm.sort(function(a, b) {
		return parseInt(a) - parseInt(b);
	});
	pm = pm.sort(function(a, b) {
		return parseInt(a) - parseInt(b);
	});

	if (am[am.length-1] == '12:00AM') {
		var temp_arr = [];
		temp_arr.push(am.pop());
		am = temp_arr.concat(am);
	}

	arr = am.concat(pm);

	return arr;
}

exports.mapAndFormatForecastResult = function(data, hours) {
	var min = 0, index = 0, hour_index = 0;

	var date = new Date(), temp_date;
	var curr_hour = formatDate(date, 'HH');

	var filtered_hours = filterHoursToday(hours, curr_hour);
	var start_index = findStartIndex(filtered_hours, hours) + 1;
	var temp_start_index = 0;
	var isDone = false;
	var nextDay = false;
	//console.log(filtered_hours);
	hours = sortHours(hours);

	// Embed date and time
	for (var i = 0; i < data.forecast.length; i++) {
		temp_date = formatDate(date, 'mm DD, YYYY');

		if(!isDone) {
			while (!isDone) {
				data.forecast[i]['date'] = temp_date;
				data.forecast[i]['time'] = filtered_hours[hour_index];


				i++;
				hour_index++;

				if (hour_index == filtered_hours.length) {
					isDone = true;
					i--;
					date = new Date(date.setDate(date.getDate()+1) );
				}
			}
			
		}
		else {
			data.forecast[i]['date'] = temp_date;
			data.forecast[i]['time'] = hours[temp_start_index];

			temp_start_index++;

			if (temp_start_index == hours.length) {
				temp_start_index = 0;
				date = new Date(date.setDate(date.getDate()+1) );
			}
		}
	}

	// Map weather ids
	for (var i = 0; i < data.forecast.length; i++) {
		min = Math.abs(data.forecast[i].id - data.weather_data[0].id);
		index = 0;

		for (var x = 1; x < data.weather_data.length; x++) {
			if(Math.abs(data.forecast[i].id - data.weather_data[x].id) < min) {
				min = Math.abs(data.forecast[i].id - data.weather_data[x].id);
				index = x;
			}
		}
		data.forecast[i]['name'] = data.weather_data[index].name;
		data.forecast[i]['desc'] = data.weather_data[index].desc;
	}

	// Consolidate as array of objects
	const unique = [...new Map(data.forecast.map(item =>
	  [item['date'], item.date])).values()];
	var obj = {};
	var cont_arr = [];
	var temp_min, temp_max;
	for (var i = 0; i < unique.length; i++) {
		var filtered_forecast = data.forecast.filter(forecast => forecast.date == unique[i]);

		obj['date'] = unique[i];
		obj['data'] = [];
		for (var y = 0; y < filtered_forecast.length; y++) {
			if (y == 0) {
				temp_min = filtered_forecast[y].min_temp;
				temp_max = filtered_forecast[y].max_temp;
			}
			else {
				if (temp_min > filtered_forecast[y].min_temp)
					temp_min = filtered_forecast[y].min_temp

				if (temp_max < filtered_forecast[y].max_temp)
					temp_max = filtered_forecast[y].max_temp;
			}

			delete filtered_forecast[y].date;
			obj['data'].push(filtered_forecast[y]);
		}
		obj['max_temp'] = temp_max;
		obj['min_temp'] = temp_min;
		
		cont_arr.push(obj);
		obj = {};
	}
	
	return cont_arr;
}

exports.arrayToObject = function(arr, keys) {
	var obj_arr = [];
	var obj;
 
	// Iterate through data array 
	for (var i = 0; i < arr.length; i++) {

		// Initialize and cleanse object properties
		obj = {};
		for (var y = 0; y < keys.length; y++) {
			obj[keys[y]] = null;
		}

		for (var x = 0; x < arr[i].length; x++) {
			obj[keys[x]] = arr[i][x];

		}
		obj_arr.push(obj);
	}

	return obj_arr;
}

exports.kelvinToCelsius = function(obj, type) {
	var keys = [];
	//console.log(obj);
	if (type == 'Weather') {
		keys = ['feels_like', 'temp', 'temp_max', 'temp_min'];
	}
	else if (type == 'Soil') {
		keys = ['t0', 't10'];
	}

	for (var i = 0; i < keys.length; i ++) {
		if (type == 'Weather') {
			if (obj['main'][keys[i]] == undefined) {
				obj['main'][keys[i]] = 'N/A';
			}
			else {
				obj['main'][keys[i]] -= 273.15;
				obj['main'][keys[i]] = Math.round(obj['main'][keys[i]] * 100) / 100;
				obj['main'][keys[i]] = obj['main'][keys[i]].toString() + '°';
			}
		}
		else if (type == 'Soil') {
			if (obj[keys[i]] == undefined) {
				obj[keys[i]] = 'N/A';
			}
			else {
				obj[keys[i]] -= 273.15;
				obj[keys[i]] = Math.round(obj[keys[i]] * 100) / 100;
				obj[keys[i]] = obj[keys[i]].toString() + '°';
			}
		}
	}

	return obj;
}

exports.convertForecastWeather = function(arr) {
	for (var i = 0; i < arr.length; i++) {
		arr[i].min_temp -= 273.15;
		arr[i].max_temp -= 273.15;

		arr[i].min_temp = Math.round(arr[i].min_temp * 100) / 100;
		arr[i].max_temp = Math.round(arr[i].max_temp * 100) / 100;

		arr[i].humidity = Math.round(arr[i].humidity);
		arr[i].pressure = Math.round(arr[i].pressure);

		if (arr[i].rainfall < 0)
			arr[i].rainfall = 0;
		else
			arr[i].rainfall = Math.round(arr[i].rainfall * 100) / 100;
	}

	return arr;
}

exports.prepareData = function(arr, size) {
	var result_arr = { data_arr: [], denormalize_val: [], denormalize_keys: [] };
	var temp_arr = [];

	var json_obj = { dt: [], min_temp: [], max_temp: [], humidity: [], pressure: [],
	rainfall: [], main: [], desc: [], id: [] };

	var keys = ['min_temp', 'max_temp', 'humidity', 'pressure', 'rainfall', 'id'];
	var normalize_keys = ['min_temp', 'max_temp', 'humidity', 'pressure', 'rainfall', 'id'];

	var val = {};

	for (var i = 0; i < arr.length; i++) {
		// var index_date = formatDate(arr[i].dt, 'HH:m')

		// if (index_date.includes('12:00') || index_date.includes('3:00') || 
		// 	index_date.includes('9:00') || index_date.includes('6:00'))  {
			
		// }
		json_obj['dt'].push(formatDate(arr[i].dt, 'YYYY-MM-DD : HH:m'));
		json_obj['min_temp'].push(arr[i].main.temp_min);
		json_obj['max_temp'].push(arr[i].main.temp_max);
		json_obj['humidity'].push(arr[i].main.humidity);
		json_obj['pressure'].push(arr[i].main.pressure);
		json_obj['rainfall'].push(typeof arr[i].rain == 'undefined' || arr[i].rain == null ? 0 : 
			typeof arr[i].rain['3h'] == 'undefined' ? arr[i].rain['1h'] : arr[i].rain['3h']);
		json_obj['main'].push(arr[i].weather[0].main);
		json_obj['desc'].push(arr[i].weather[0].description);
		json_obj['id'].push(arr[i].weather[0].id);
			
	}
	
	for (var x = 0; x < normalize_keys.length; x++) {
		json_obj[normalize_keys[x]] = normalizeData(json_obj[normalize_keys[x]]);

		result_arr.denormalize_val.push({ min: json_obj[normalize_keys[x]].min , max: json_obj[normalize_keys[x]].max });
		json_obj[normalize_keys[x]] = json_obj[normalize_keys[x]].arr;
	}

	for (var y = 0; y < json_obj.dt.length; y++) {
		for (var k = 0; k < keys.length; k++) {
			json_obj[keys[k]][y] = json_obj[keys[k]][y] == NaN ? json_obj[keys[k]][y] : 0;
			temp_arr.push(json_obj[keys[k]][y]);
			//console.log(json_obj[keys[k]][y]);
		}
		result_arr.data_arr.push(temp_arr);
		temp_arr = [];
	}

	result_arr.denormalize_keys = normalize_keys;

	result_arr = embedWeatherIDs(result_arr, arr);

	return result_arr;
}

exports.prepareWeatherData = function(arr, size) {
	var input = [], output = [];
	var obj = [];
	var result_arr = [];
	var temp_arr = [];
	var env_obj = { temp: [], env: [] };
	// var json_obj = { dt: [], min_temp: [], max_temp: [], humidity: [], pressure: [],
	// 	rainfall: [], main: [], desc: [], id: []};

	for (var i = 0; i < arr.length; i++) {
		// json_obj['dt'].push(formatDate(arr[i].dt, 'YYYY-MM-DD : HH:m'));
		// json_obj['min_temp'].push(arr[i].main.temp_min);
		// json_obj['max_temp'].push(arr[i].main.temp_max);
		// json_obj['humidity'].push(arr[i].main.humidity);
		// json_obj['pressure'].push(arr[i].main.pressure);
		// json_obj['rainfall'].push(typeof arr[i].rain == 'undefined'? 0 : arr[i].rain['3h']);
		// json_obj['main'].push(arr[i].weather[0].main);
		// json_obj['desc'].push(arr[i].weather[0].description);
		// json_obj['id'].push(arr[i].weather[0].id);

		obj['dt'] = formatDate(arr[i].dt, 'YYYY-MM-DD : HH:m');
		obj['min_temp'] = arr[i].main.temp_min;
		obj['max_temp'] = arr[i].main.temp_max;
		obj['humidity'] = arr[i].main.humidity;
		obj['pressure'] = arr[i].main.pressure;
		obj['rainfall'] = typeof arr[i].rain == 'undefined'? 0 : arr[i].rain['3h'];
		obj['main'] = arr[i].weather[0].main;
		obj['desc'] = arr[i].weather[0].description;
		obj['id'] = arr[i].weather[0].id;

		result_arr.push(obj);
		obj = {};

		// Prepare data to forecast environment variables (ANN - brain.js) to be used to 
		// forecast weather (Decision Tree - decision-tree)
		temp_arr.push(arr[i].main.temp_min);
		temp_arr.push(arr[i].main.temp_max);
		env_obj.temp.push(temp_arr);

		temp_arr = [];

		temp_arr.push(arr[i].main.humidity);
		temp_arr.push(arr[i].main.pressure);
		temp_arr.push(arr[i].main.rainfall);
		env_obj.env.push(temp_arr);

		temp_arr = [];
	}

	result_arr = partitionData(result_arr, size);

	result_arr['stats'] = { temp: [], env: [] };

	result_arr['stats']['temp'] = normalizeData(partitionData(env_obj.temp, size));
	result_arr['stats']['env'] = normalizeData(partitionData(env_obj.env, size));

	return result_arr;
}

// exports.normalizeInitialForecast = function(arr) {
// 	var result_arr = [];
// 	var m = { };
// 	var x = 1;
// 	var date;
// 	var min_temp, max_temp, humidity, pressure, rainfall;
// 	for (var i = 0; i < arr.length - 1; i++) {
// 		date = formatDate(arr[i].dt, 'YYYY-MM-DD');
// 		min_temp = arr[i].main.temp_min;
// 		max_temp = arr[i].main.temp_max;
// 		humidity = arr[i].main.humidity;
// 		pressure = arr[i].main.pressure;
// 		rainfall = typeof arr[i].rain == 'undefined'? 0 : arr[i].rain['3h'];
// 		x = 1;

// 		console.log(date);
// 		console.log(arr[i].weather[0].main);
// 		console.log(arr[i].weather[0].description);
// 		do {
// 		console.log(arr[i].weather[0].main);
// 		console.log(arr[i].weather[0].description);
// 			i++;
// 			if (arr[i-1].main.temp_min > arr[i].main.temp_min)
// 				min_temp = arr[i].main.temp_min;
// 			if (arr[i-1].main.temp_max < arr[i].main.temp_max)
// 				max_temp = arr[i].main.temp_max;

// 			humidity += arr[i].main.humidity;
// 			pressure += arr[i].main.pressure;
// 			rainfall += typeof arr[i].rain == 'undefined'? 0 : arr[i].rain['3h'];

// 			x++;
// 		}
// 		while (i < arr.length-1 && formatDate(arr[i].dt, 'YYYY-MM-DD') == formatDate(arr[i+1].dt, 'YYYY-MM-DD'));

// 		humidity /= x;
// 		pressure /= x;

// 		m['dt'] = date;
// 		m['min_temp'] = min_temp;
// 		m['max_temp'] = max_temp;
// 		m['mean_humidity'] = humidity;
// 		m['mean_pressure'] = pressure;
// 		m['total_rainfall'] = rainfall;

// 		result_arr.push(m);
// 		m = {};
// 	}
	
// 	return result_arr;
// }

function formatDate(date, format) {
	var year,month,day;
	const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
	  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
	];
	year = date.getFullYear();
	month = date.getMonth()+1;
	day = date.getDate();

	if (format === 'MM/DD/YYYY') {
		if (month < 10)
			month = '0'+month;
		if (day < 10)
			day = '0'+day;
		date = month+'/'+day+'/'+year;
	}
	else if (format == 'Month - Year') {
		date = `${monthNames[month]} ${year}`;
	}
	else if (format === 'YYYY-MM-DD') {
		if (month < 10)
			month = '0'+month;
		if (day < 10)
			day = '0'+day;
		date = year+'-'+month+'-'+day;
	}
	else if (format === 'mm DD, YYYY') {
		date = monthNames[month]+' '+day+', '+year;
	}
	else if (format === 'HH:m') {
		var hour = parseInt(date.getHours());
		var lbl;
		if (hour < 12)
			lbl = 'AM';
		else {
			lbl = 'PM';
		}

		if (hour == 0)
			hour = 12;
		else if (hour > 12)
			hour -= 12;

		date = hour+':'+(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()+lbl;
	}
	else if (format == 'HH') {
		var hour = parseInt(date.getHours());
		var lbl;
		if (hour < 12)
			lbl = 'AM';
		else {
			lbl = 'PM';
		}

		if (hour == 0)
			hour = 12;
		else if (hour > 12)
			hour -= 12;

		date = hour+':'+'00'+lbl;
	}
	else if (format === 'YYYY-MM-DD : HH:m') {
		if (month < 10)
			month = '0'+month;
		if (day < 10)
			day = '0'+day;

		var hour = parseInt(date.getHours());
		var lbl;
		if (hour < 12)
			lbl = 'AM';
		else {
			lbl = 'PM';
		}

		if (hour == 0)
			hour = 12;
		else if (hour > 12)
			hour -= 12;

		date = year+'-'+month+'-'+day+' - '+hour+':'+(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()+lbl;
	}

	return date;
}

exports.formatDate = function(date, format) {
	var year,month,day;
	const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
	  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
	];
	year = date.getFullYear();
	month = date.getMonth()+1;
	day = date.getDate();
	if (format === 'MM/DD/YYYY') {
		if (month < 10)
			month = '0'+month;
		if (day < 10)
			day = '0'+day;
		date = month+'/'+day+'/'+year;
	}
	else if (format == 'Month - Year') {
		date = `${monthNames[month]} ${year}`;
	}
	else if (format === 'YYYY-MM-DD') {
		if (month < 10)
			month = '0'+month;
		if (day < 10)
			day = '0'+day;
		date = year+'-'+month+'-'+day;
	}
	else if (format === 'mm DD, YYYY') {
		date = monthNames[month]+' '+day+', '+year;
	}
	else if (format === 'HH:m') {
		var hour = parseInt(date.getHours());
		var lbl;
		if (hour < 12)
			lbl = 'AM';
		else {
			lbl = 'PM';
		}

		if (hour == 0)
			hour = 12;
		else if (hour > 12)
			hour -= 12;

		date = hour+':'+(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()+lbl;
	}
	else if (format == 'HH') {
		var hour = parseInt(date.getHours());
		var lbl;
		if (hour < 12)
			lbl = 'AM';
		else {
			lbl = 'PM';
		}

		if (hour == 0)
			hour = 12;
		else if (hour > 12)
			hour -= 12;

		date = hour+':'+'00'+lbl;
	}
	else if (format === 'YYYY-MM-DD : HH:m') {
		if (month < 10)
			month = '0'+month;
		if (day < 10)
			day = '0'+day;

		var hour = parseInt(date.getHours());
		var lbl;
		if (hour < 12)
			lbl = 'AM';
		else {
			lbl = 'PM';
		}

		if (hour == 0)
			hour = 12;
		else if (hour > 12)
			hour -= 12;

		date = year+'-'+month+'-'+day+' - '+hour+':'+(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()+lbl;
	}
	return date;
}