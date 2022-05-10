function processForecastDB(data) {
	var date, day;
	var cont_arr = [];
	var obj = {};

	const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

	const unique = [...new Map(data.map(item =>
	  [item['date'], item.date])).values()];
	var temp_min, temp_max;

	for (var i = 0; i < unique.length; i++) {
		var filtered_forecast = data.filter(forecast => forecast.date == unique[i]);
		date = new Date(unique[i]);
		day = days[date.getDay()];

		obj['date'] = formatDate(date, 'mm DD, YYYY');
		obj['day'] = day;
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
			obj['icon'] = processIcons(filtered_forecast[0].desc);
		}
		obj['max_temp'] = temp_max;
		obj['min_temp'] = temp_min;
		
		cont_arr.push(obj);
		obj = {};
	}
	return cont_arr;
}

function processIcons(desc) {
	var icon = '';
	if (desc == 'light rain') {
		icon = 'fas fa-cloud-rain';
	}
	else if (desc == 'overcast clouds') {
		icon = 'fas fa-cloud';
	}
	else if (desc == 'heavy intensity rain') {
		icon = 'fas fa-cloud-showers-heavy';
	}
	else if (desc == 'few clouds') {
		icon = 'fas fa-cloud-sun';
	}
	else if (desc == 'clear sky') {
		icon = 'fas fa-sun';
	}
	else if (desc == 'scattered clouds') {
		icon = 'fas fa-cloud-meatball';
	}
	else if (desc == 'moderate rain') {
		icon = 'fas fa-cloud-rain';
	}
	else if (desc == 'sky is clear') {
		icon = 'fas fa-cloud-rain';
	}
	else {
		//console.log('Unknown desc please add in js file!');
		//console.log(desc);
	}
	return desc;
}

function createForecastCards(data) {
	var th, h2, h4, h6, div, i, small1, small2, div_cont, img, img_cont, desc;
	var a = '';
	th = document.createElement('td');
	th.setAttribute('style', 'border-style: none;');

	div_cont = document.createElement('div');
	div_cont.setAttribute('class', 'forecast_card');
	div_cont.setAttribute('value', data.date);

	h2 = document.createElement('div');
	h2.setAttribute('class', 'justify-content-xl-center text-muted text-center');
	h2.setAttribute('style', 'color: #332C1F;font-size: 12px;');
	h2.innerHTML = data.day;

	h4 = document.createElement('div');
	h4.setAttribute('class', 'justify-content-xl-center text-center');
	h4.setAttribute('style', 'color: #332C1F;font-size: 12px;');
	h4.innerHTML = data.date;

	// h6 = document.createElement('h6');
	// h6.setAttribute('class', 'text-muted justify-content-xl-center text-align-center');
	// h6.setAttribute('style', 'text-align: center !important;');

	// i = document.createElement('i');
	// i.setAttribute('class', 'justify-content-xl-center '+data.icon);
	// i.setAttribute('style', 'color: #332C1F;font-size: 35px;');

	// h6.appendChild(i);

	img_cont = document.createElement('div');
	img_cont.setAttribute('class', 'text-muted justify-content-xl-center text-align-center w-100');

	img = document.createElement('img');
	img.setAttribute('src', `http://openweathermap.org/img/wn/${data.icon}.png`);
	img.setAttribute('class', 'float-center text-center');
	img.setAttribute('style', 'width: 88px; height: 60px;');

	img_cont.appendChild(img);
	desc = document.createElement('div');
	desc.setAttribute('class', 'w-100 text-center');
	desc.innerHTML = data.desc;

	div = document.createElement('div');
	div.setAttribute('class', 'd-flex w-100 justify-content-center');

	small1 = document.createElement('small');
	small1.setAttribute('class', 'form-text font-weight-bold');
	small1.setAttribute('style', 'color: #332C1F;');
	small1.innerHTML = data.max_temp+'° ';
	var small3 = document.createElement('small');
	small3.setAttribute('class', 'form-text');
	small3.setAttribute('style', 'color: #332C1F;');
	small3.innerHTML = '/';
	small2 = document.createElement('small');
	small2.setAttribute('class', 'form-text text-muted');
	small2.setAttribute('style', 'color: #332C1F;');
	small2.innerHTML = data.min_temp+'°';

	div.appendChild(small1);
	div.appendChild(small3);
	div.appendChild(small2);

	div_cont.appendChild(h2);
	div_cont.appendChild(h4);
	//div_cont.appendChild(h6);
	div_cont.appendChild(img_cont);
	div_cont.appendChild(desc);
	div_cont.appendChild(div);
	th.appendChild(div_cont);

	return th;
}

function processDailyDetails(arr) {
	var obj = {
		day: '',
		date: '',
		icon: '',
		min_temp: '',
		max_temp: '',
		pressure: '',
		humidity: '',
		rainfall: '',
	}
	const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	var date;

	for (var i = 0; i < arr.length; i++) {
		if (i == 0) {
			date = new Date(arr[i].date);
			obj.day = weekday[date.getDay()];
			obj.date = formatDate(date, 'YYYY-MM-DD');
			obj.min_temp = arr[i].min_temp;
			obj.max_temp = arr[i].max_temp;
			obj.icon = processIcons(arr[i].icon);
			obj.pressure = arr[i].pressure;
			obj.humidity = arr[i].humidity;
			obj.rainfall = arr[i].rainfall;
			obj.desc = arr[i].desc;
		}
		else {
			if (arr[i].min_temp > obj.min_temp) {
				obj.min_temp = arr[i].min_temp;
			}

			if (arr[i].max_temp > obj.max_temp) {
				obj.max_temp = arr[i].max_temp;
			}
		}
	}

	return obj;
}

function appendForecastCards(arr, keys) {
	var table = $('#weather_table');
	var tr;
	tr = document.createElement('tr');

	for (var i = 0; i < 14; i++) {
		tr.appendChild(createForecastCards(processDailyDetails(arr[keys[i]])));
	}

	table.append(tr);
}

function switchWeek(week) {
	var index;
	$('.week_switch').removeClass('active');
	$('.forecast_card').parent().removeClass('hide');

	if (week) {
		index = 0;
		$($('.week_switch')[1]).addClass('active');
	}
	else {
		index = 7;
		$($('.week_switch')[0]).addClass('active');
	}

	for (var i = index; i < index+7; i++) {
		$($($('.forecast_card')[i]).parent()[0]).addClass('hide');
	}
}

function appendRecommendation(obj) {
	var cont, div, lbl, dates; 

	cont = document.createElement('div');
	cont.setAttribute('class', 'd-flex');
	
	div = document.createElement('div');
	div.setAttribute('class', 'd-flex flex-column');
	
	lbl = document.createElement('label');
	lbl.innerHTML = 'Suggested Land Preparation Date:';

	dates = document.createElement('div');
	dates.setAttribute('class', 'text-center font-weight-normal');
	dates.innerHTML = obj.suggested_date;

	div.appendChild(lbl);
	div.appendChild(dates);

	cont.appendChild(div);

	for (var i = 0; i < obj.consecutive_rain.length; i++) {
		if (i == 0) {
			div = document.createElement('div');
			div.setAttribute('class', 'd-flex flex-column ml-3');
			
			lbl = document.createElement('label');
			lbl.innerHTML = 'Expected Continuous Rainfall During:';

			div.appendChild(lbl);
		}
		dates = document.createElement('div');
		dates.setAttribute('class', 'text-center font-weight-normal weather_list');
		dates.innerHTML = '• '+formatDate(new Date(obj.consecutive_rain[i].start), 'YYYY-MM-DD') + ' - ' + formatDate(new Date(obj.consecutive_rain[i].end), 'YYYY-MM-DD');

		div.appendChild(dates);
	}
	cont.appendChild(div);

	for (var i = 0; i < obj.heavy_rain.length; i++) {
		if (i == 0) {
			div = document.createElement('div');
			div.setAttribute('class', 'd-flex flex-column ml-3');
			
			lbl = document.createElement('label');
			lbl.innerHTML = 'Expected Heavy Rain During:';

			div.appendChild(lbl);
		}
		dates = document.createElement('div');
		dates.setAttribute('class', 'text-center font-weight-normal');
		dates.innerHTML = formatDate(new Date(obj.heavy_rain[i].date), 'YYYY-MM-DD');

		div.appendChild(dates);
	}
	cont.appendChild(div);

	$('#weather_outlook').html(cont);


	// $('#weather_summary').html(obj.msg);
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

	var m_stats = {
		ideal_days: [],
		heavy_rain: [],
		consecutive_rain: [],
		suggested_date: null
	};
	var prev_index;
	var temp_arr;
	for (var i = 0; i < arr.keys.length; i++) {
		for (var x = 0; x < arr.data[arr.keys[i]].length; x++) {
			//console.log(arr.data[arr.keys[i]]);			

			if (arr.data[arr.keys[i]][x].desc == 'light rain' || arr.data[arr.keys[i]][x].desc == 'moderate rain') {
				if (counter == 0) {
					temp_arr = []
					temp_arr.push(arr.data[arr.keys[i]][x]);

					chain = true;
					counter = 1;
					start_date = arr.data[arr.keys[i]][x].date;
				}
				else {
					temp_arr.push(arr.data[arr.keys[i]][x]);
					counter++;
					end_date = arr.data[arr.keys[i]][x].date;
				}
			}
			else if (arr.data[arr.keys[i]][x].desc == 'heavy intensity rain') {
				m_stats.heavy_rain.push(arr.data[arr.keys[i]][x]);

				if (counter >= 3) {
					m_stats.consecutive_rain.push({ arr: temp_arr, start: formatDate(new Date(start_date), 'YYYY-MM-DD'), end: formatDate(new Date(end_date), 'YYYY-MM-DD') });
				}

				temp_arr = [];
				chain = false;
				counter = 0;
			}
			else {
				if (counter >= 3) {
					m_stats.consecutive_rain.push({ arr: temp_arr, start: formatDate(new Date(start_date), 'YYYY-MM-DD'), end: formatDate(new Date(end_date), 'YYYY-MM-DD') });
				}

				temp_arr = [];
				chain = false;
				counter = 0;

				m_stats.ideal_days.push(arr.data[arr.keys[i]][x]);
			}
		}
	}

	var date = new Date();
	if (m_stats.heavy_rain.length != 0) {
		date = new Date(m_stats.heavy_rain[m_stats.heavy_rain.length - 1].date);
		date.setDate(date.getDate() + 1);
	}
	else {
		if (m_stats.ideal_days.length != 0) {
			date = new Date(m_stats.ideal_days[m_stats.ideal_days.length - 1].date);
		}
		else {
			if (m_stats.consecutive_rain.length != 0) {
				date = new Date(m_stats.consecutive_rain[0].date);
			}
		}
	}
	m_stats.suggested_date = date;
	m_stats.suggested_date = formatDate(m_stats.suggested_date, 'YYYY-MM-DD');

	appendRecommendation(m_stats);
	// for (var i = 0; i < arr.length; i++) {
	// 	var count = arr[i].data.filter(data => data.desc == 'light rain').length;
	// 	//console.log(arr[i].date+' - '+count);

	// 	// Start bad day cycle if rainfall happens thrice in a day
	// 	if (count >= 3) {

	// 		if (!chain) {
	// 			start_date = arr[i].date;
	// 			chain = true;

	// 			obj['start'] = start_date;
				
	// 			avg_rainfall = count;
	// 			counter = 1;
	// 		}
	// 		else {
	// 			avg_rainfall += count;
	// 			counter++;
	// 		}

	// 		if (good_chain) {
	// 			good_end = arr[i-1].date;
	// 			good_chain = false;

	// 			good_obj['end'] = good_end;

	// 			var diff = dateDiff(good_obj.end, good_obj.start);

	// 			if (diff >= 3) {
	// 				good_push = true;
	// 			}
	// 		}
	// 	}
	// 	// 
	// 	else {
	// 		avg_rainfall = 0;
	// 		counter = 0;

	// 		if (chain) {
	// 			end_date = arr[i-1].date;
	// 			chain = false;

	// 			obj['end'] = end_date;


	// 			var diff = dateDiff(obj.end, obj.start);

	// 			if (diff >= 3) {
	// 				push = true;
	// 			}
	// 		}

	// 		if (!good_chain) {
	// 			good_start = arr[i].date;
	// 			good_chain = true;

	// 			good_obj['start'] = good_start;
	// 		}
			
	// 	}

	// 	// Check for ongoing bad or good days on the last index
	// 	if (i == arr.length - 1) {
	// 		if (obj.start != undefined) {
	// 			end_date = arr[i].date;
	// 			obj['end'] = end_date;

	// 			push = true;

	// 		}

	// 		if (good_obj.start != undefined) {
	// 			good_end = arr[i].date;
	// 			good_obj['end'] = good_end;

	// 			good_push = true;
	// 		}
	// 	}

	// 	if (push) {
	// 		stats.bad.push(obj);
	// 		obj = {};
	// 		push = false;
	// 	}

	// 	if (good_push) {
	// 		stats.good.push(good_obj);
	// 		good_obj = {};
	// 		good_push = false;
	// 	}
	// }
	//console.log('-------------------');
	//console.log(stats.good);
	//console.log(stats.bad);

	// for (var i = 0; i < stats.bad.length; i++) {
	// 	var diff = dateDiff(stats.bad[i].start, stats.bad[i].end);

	// 	if (diff >= 5) {
	// 		stats.risk_lvl += 3;
	// 	}

	// 	stats.risk_lvl += 1.5;
	// }

	// if (stats.risk_lvl >= 8) {
	// 	stats.risk_lvl = 'High Risk';
	// }
	// else if (stats.risk_lvl < 8 && stats.risk_lvl >= 6) {
	// 	stats.risk_lvl = 'Moderately Risky';
	// }
	// else {
	// 	stats.risk_lvl = 'Low Risk';
	// }

	// if (stats.bad.length == 1) {
	// 	stats.msg += 'Continuous rainfall is expected from '+stats.bad[0].start+' to '+stats.bad[0].end+' with fairly low risks of seed damages. The recommended date of planting is ';

	// 	if (stats.good.length == 2) {
	// 		stats.msg += 'from between '+stats.good[0].start+' until '+stats.good[0].end+' or '+stats.good[1].start+' until '+stats.good[1].end+'.';
	// 	}
	// 	else {
	// 		stats.msg += 'from '+stats.good[0].start+' onwards.';
	// 	}
	// }
	// else if (stats.bad.length >= 2) {
	// 	var date_diff = dateDiff(stats.bad[0].end, stats.bad[1].start);
	// 	stats.msg += 'Multiple cycles of rainfall is expected within the next two weeks with the first rainfall expecting to hit by '+stats.bad[0].start+' which would last until '+stats.bad[0].end+' and the second cycle is expected to start '+date_diff+' days after the end of the first cycle on '+stats.bad[1].start+' and is expected to last until '+stats.bad[1].end+'.With this, the recommended date of planting is between '+stats.good[0].start+' and '+stats.good[0].end+'.';


	// }

	// appendRecommendation(stats);
}

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

	return date;
}

function normalizeForDB(result, hour) {
	var temp_obj = {};
	var cont_arr = [];
	var date;
	result = result.forecast;

	for (var i = 0; i < result.length; i++) {
		for (var y = 0; y < result[i].data.length; y++) {
			temp_obj = {};

			date = new Date(result[i].date);
			date = formatDate(date, 'YYYY-MM-DD');

			temp_obj['date'] = date;
			temp_obj['time'] = result[i].data[y].time;
			temp_obj['weather_id'] = result[i].data[y].id;
			temp_obj['desc'] = result[i].data[y].desc;
			temp_obj['humidity'] = result[i].data[y].humidity;
			temp_obj['max_temp'] = result[i].data[y].max_temp;
			temp_obj['min_temp'] = result[i].data[y].min_temp;
			temp_obj['name'] = result[i].data[y].name;
			temp_obj['pressure'] = result[i].data[y].pressure;
			temp_obj['rainfall'] = result[i].data[y].rainfall;
			temp_obj['time_uploaded'] = hour;

			cont_arr.push(temp_obj);
		}
	}
	return {data:cont_arr};
}

function normalizeToJSON(arr) {
	const unique = [...new Map(arr.map(item =>
	  [item['date'], item.date])).values()];

	var obj = { data: [], keys: [] };

	for (var i = 0; i < unique.length; i++) {
		obj.data[formatDate(new Date(unique[i]), 'YYYY-MM-DD')] = arr.filter(e => e.date == unique[i]);
		obj.keys.push(formatDate(new Date(unique[i]), 'YYYY-MM-DD'));
	}

	return obj;
}

function processChartData(arr) {
	var data = { labels: [], datasets: [] };
	var dataset_obj = { data: [], fill: true,
   borderColor: "#bae755", borderWidth: 1, backgroundColor: "#FFFACD",
   pointBackgroundColor: "#FFA500",
   pointBorderColor: "#FFA500", pointRadius: 5 };
	for (var i = 0; i < arr.length; i++) {
		data.labels.push(arr[i].time.replace(':00', ''));
		dataset_obj['data'].push(Math.round(arr[i].max_temp));
	}
	data.datasets.push(dataset_obj);

	return data;
}

function appendDailyDetails(data) {
	var i;
	i = document.createElement('i');
	i.setAttribute('class', data.icon);

	$('#icon_detail').html(i);
	$('#temp_detail').html(data.max_temp);
	$('#precipitation_detail').html(data.pressure);
	$('#humidity_detail').html(data.humidity);
	$('#rainfall_detail').html(data.rainfall);
	$('#weather_day_detail').html(data.date);
	$('#weather_desc_detail').html(data.day);
}

function setChartOptions(options) {
	var opts = {
		type: 'line',
		options: {
			title: {
				display: false
			},
			plugins: {
				legend: {
					display: false
				}
			},
			scales: {
				y: {
					ticks: {
						display: true
					},
					grid: {
						display: false
					}
				},
				x: {
					grid: {
						display: false
					}
				}

			}
		}
	}

	opts['data'] = options.data;
	var min = Math.min(...opts.data.datasets[0].data), max = Math.max(...opts.data.datasets[0].data);
	min -= 0.5;
	max += 0.1;

	opts.options.scales.y['suggestedMin'] = min;
	opts.options.scales.y['max'] = max;

	return opts;
}

function styleSelectedCard(index) {
	$('.forecast_card').removeClass('selected');
	$($('.forecast_card')[index]).addClass('selected');
}

$(document).ready(function() {
	var d1 = new Date(Date.now());
	var d2 = new Date(Date.now());
	d2.setDate(d2.getDate() - 60);
	var refresh_on = 0;
	var loaded = false;
	var hour = new Date();
	hour = hour.getHours();

	// Run this each time a page is loaded
	$.get('/get_weather_forecast', {}, function(forecast_result) {
		//console.log(formatDate(new Date(forecast_result[0].date), 'YYYY-MM-DD'));
		if (view == 'home' || view == 'add_crop_calendar') {
			jQuery.ajaxSetup({async: false });
			var hour = new Date();
			hour = hour.getHours();
			var forecast_records = null;
			var day;

			if (forecast_result.length != 0) {
				forecast_records = normalizeToJSON(forecast_result);
				day = formatDate(new Date(forecast_result[0].date), 'YYYY-MM-DD');

				// Append clickable daily weather cards
				appendForecastCards(forecast_records.data, forecast_records.keys);
				appendDailyDetails(processDailyDetails(forecast_records.data[day]));
				styleSelectedCard(0);
				switchWeek(0);

				generateRecommendation(forecast_records);
			}
			else {
				console.log('err');
			}
			
			if (forecast_records != null) {
				// var options = { data: processChartData(forecast_records.data[day]) }
				// options = setChartOptions(options);

				// var ctx = document.getElementById('weather_chart').getContext('2d');

				// var weather_chart = new Chart(ctx, options);

				// Change viewed active daily detail
				$('#weather_table').on('click', '.forecast_card', function() {
					styleSelectedCard($('.forecast_card').index(this));
					appendDailyDetails(processDailyDetails(forecast_records.data[$(this).attr('value')]));

					// var options = { data: processChartData(forecast_records.data[$(this).attr('value')]) }
					// options = setChartOptions(options);
					// var ctx = document.getElementById('weather_chart').getContext('2d');

					// weather_chart.destroy();
					// weather_chart = new Chart(ctx, options);
				});

				// Change week
				$('.week_switch').on('click', function() {
					var index = $('.week_switch').index(this);
					var card = index == 0 ? 0 : 7;
					var day = $($('.forecast_card')[card]).attr('value');
					switchWeek(index);

					styleSelectedCard(card);
					appendDailyDetails(processDailyDetails(forecast_records.data[day]));

					// var options = { data: processChartData(forecast_records.data[day]) }
					// options = setChartOptions(options);
					// var ctx = document.getElementById('weather_chart').getContext('2d');

					// weather_chart.destroy();
					// weather_chart = new Chart(ctx, options);
				});
			}
		}
		else {
			if (forecast_result == 0) {
				refresh_on = hour + 1;
				$.get('/forecast_weather14d', {}, function(result) {
					console.log(result);
					loaded = false;
				});
				// $.get('/agroapi/weather/forecast', { start: d2, end: d1 }, function(result) {
				// 	let query = normalizeForDB(result, hour);

				// 	$.post('/upload_weather_forecast', query, function(upload_result) {
				// 		console.log('DB upload success');

				// 		loaded = false;
				// 	});
				// });	
			}
			else if (hour == refresh_on && hour != forecast_result[0].time_uploaded || 
				formatDate(new Date(forecast_result[0].date), 'YYYY-MM-DD') != formatDate(new Date(), 'YYYY-MM-DD')) {
				console.log(new Date()+' : Deleting DB records...');
				$.get('/clear_weather_forecast', {}, function(status) {

					//console.log('Generating weather forecast...');
					refresh_on = hour + 1;
					$.get('/forecast_weather14d', {}, function(result) {
						console.log(result);
						loaded = false;
					});
					// $.get('/agroapi/weather/forecast', { start: d2, end: d1 }, function(result) {
					// 	let query = normalizeForDB(result, hour);

					// 	$.post('/upload_weather_forecast', query, function(upload_result) {
					// 		console.log('DB upload success');

					// 		loaded = false;
					// 	});
					// });	
				})
			}
			else {
				console.log('Getting weather forecast...');

				refresh_on = forecast_result[0].time_uploaded + 1;
			}
		}

		/************  DB to UI Start *************/
		//console.log(view+' - '+loaded);
		// if (view == 'farm_monitoring' && loaded == false) {

		// 	loaded = true;
		// 	$('#weather_table').empty();
		// 	appendForecastCards(processForecastDB(forecast_result));
		// 	//appendForecastDetails(result.forecast[0]);

		// 	// // Recommendation
		// 	// generateRecommendation(result.forecast);

		// 	// $('.carousel-inner').on('click', '.forecast_card', function() {
		// 	// 	var card = $('.forecast_card').index(this);

		// 	// 	appendForecastDetails(result.forecast[card]);
		// 	// });
		// }

		/************  DB to UI End *************/
	});

	// setInterval(function() {
	// 	var hour = new Date();
	// 	hour = hour.getHours();

	// 	//console.log(hour+' - '+refresh_on);

	// 	/************  Weather Forecast to DB Start *************/
	// 	$.get('/get_weather_forecast', {}, function(forecast_result) {
	// 		//console.log(formatDate(new Date(forecast_result[0].date), 'YYYY-MM-DD'));
	// 		if (forecast_result == 0) {
	// 			refresh_on = hour + 1;
	// 			$.get('/agroapi/weather/forecast', { start: d2, end: d1 }, function(result) {
	// 				let query = normalizeForDB(result, hour);

	// 				$.post('/upload_weather_forecast', query, function(upload_result) {
	// 					console.log('DB upload success');

	// 					loaded = false;
	// 				});
	// 			});	
	// 		}
	// 		else if (hour == refresh_on && hour != forecast_result[0].time_uploaded || 
	// 			formatDate(new Date(forecast_result[0].date), 'YYYY-MM-DD') != formatDate(new Date(), 'YYYY-MM-DD')) {
	// 			console.log(new Date()+' : Deleting DB records...');
	// 			$.get('/clear_weather_forecast', {}, function(status) {

	// 				//console.log('Generating weather forecast...');
	// 				refresh_on = hour + 1;
	// 				$.get('/agroapi/weather/forecast', { start: d2, end: d1 }, function(result) {
	// 					let query = normalizeForDB(result, hour);

	// 					$.post('/upload_weather_forecast', query, function(upload_result) {
	// 						console.log('DB upload success');

	// 						loaded = false;
	// 					});
	// 				});	
	// 			})
	// 		}
	// 		else {
	// 			console.log('Getting weather forecast...');

	// 			refresh_on = forecast_result[0].time_uploaded + 1;
	// 		}

	// 		/************  DB to UI Start *************/
	// 		//console.log(view+' - '+loaded);
	// 		if (view == 'farm_monitoring' && loaded == false) {

	// 			loaded = true;
	// 			$('#weather_table').empty();
	// 			appendForecastCards(processForecastDB(forecast_result));
	// 			//appendForecastDetails(result.forecast[0]);

	// 			// // Recommendation
	// 			// generateRecommendation(result.forecast);

	// 			// $('.carousel-inner').on('click', '.forecast_card', function() {
	// 			// 	var card = $('.forecast_card').index(this);

	// 			// 	appendForecastDetails(result.forecast[card]);
	// 			// });
	// 		}

	// 		/************  DB to UI End *************/
	// 	});
	// 	/************  Weather Forecast to DB End *************/


	// }, 600000);
});