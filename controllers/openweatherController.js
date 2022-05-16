var request = require('request');
const dataformatter = require('../public/js/dataformatter.js');
const weatherForecastModel = require('../models/weatherForecastModel.js');
const disasterModel = require('../models/disasterModel.js');
const notifModel = require('../models/notificationModel.js');

var key = 'd7aa391cd7b67e678d0df3f6f94fda20';
var temp_lat = 13.073091;
var temp_lon = 121.388563;
var open_weather_key = 'd7aa391cd7b67e678d0df3f6f94fda20';

const precip = 'rgba(82, 94, 117, 1)';
const avg_precip = 'rgba(146, 186, 146, 1)';
const precip_3_year = 'rgba(252, 170, 53, 1)';
const precip_1_year = 'rgba(148, 70, 84, 1)';
const precip_6_month = 'rgba(86, 36, 92, 1)';
const precip_3_month = 'rgba(252, 170, 53, 1)';
const precip_1_month = 'rgba(181, 179, 130, 1)';

function processPrecipChartData(result) {
	var data = { labels: [], datasets: [] };
	var data_cont = { precipitation_mean: [], lag_30year: [], lag_1year: [], lag_3year: [], lag_3month: [], lag_1month: [] };
	var outlook = { classification: '', drought_summary: '', weather_forecast: '' };
	result.forEach(function(item) {
		data_cont.precipitation_mean.push(item.precipitation_mean);
		data_cont.lag_30year.push(item.year_30_lag);
		data_cont.lag_3year.push(item.year_3_lag);
		data_cont.lag_1year.push(item.year_1_lag);
		// data_cont.lag_6month.push(item.month_6_lag);
		// data_cont.lag_3month.push(item.month_3_lag);
		// data_cont.lag_1month.push(item.month_1_lag);

		data.labels.push(dataformatter.formatDate(new Date(item.date), 'Month - Year'));
	});
	data.datasets.push({ type: 'line', backgroundColor: precip, borderColor: precip, label: 'Total Precipitation', yAxisID: 'y', data: data_cont.precipitation_mean });
	data.datasets.push({ type: 'line', backgroundColor: avg_precip, borderColor: avg_precip, label: 'Average Precipitation', yAxisID: 'y', data: data_cont.lag_30year });
	data.datasets.push({ type: 'line', backgroundColor: precip_3_year, borderColor: precip_3_year, label: '3 Yr MA', yAxisID: 'y', data: data_cont.lag_3year, hidden: true });
	data.datasets.push({ type: 'line', backgroundColor: precip_1_year, borderColor: precip_1_year, label: '1 Yr MA', yAxisID: 'y', data: data_cont.lag_1year, hidden: true });
	// data.datasets.push({ type: 'line', backgroundColor: precip_6_month, borderColor: precip_6_month, label: '6 Mo MA', yAxisID: 'y', data: data_cont.lag_6month, hidden: true });
	// data.datasets.push({ type: 'line', backgroundColor: precip_3_month, borderColor: precip_3_month, label: '3 Mo MA', yAxisID: 'y', data: data_cont.lag_3month, hidden: true });
	// data.datasets.push({ type: 'line', backgroundColor: precip_1_month, borderColor: precip_1_month, label: '1 Mo MA', yAxisID: 'y', data: data_cont.lag_1month, hidden: true });

	// Classify meteorological drought
	var drought_obj = { severe: { data: [], continuous: [] }, medium: { data: [], continuous: [] } };
	result.forEach(function(item, index) {
		if ((item.year_30_lag - item.precipitation_mean) / item.year_30_lag >= .6 ) {
			drought_obj.severe.data.push(item);				
		}

		if ((item.year_30_lag - item.precipitation_mean) / item.year_30_lag >= .21 ) {
			drought_obj.medium.data.push(item);
		}
	});

	drought_obj.severe = checkContinuous(drought_obj.severe);
	drought_obj.medium = checkContinuous(drought_obj.medium);

	// Classify severity and category
	var recent_medium_count = drought_obj.medium.continuous.length != 0 ? drought_obj.medium.continuous[drought_obj.medium.continuous.length-1].length : 0;
	var recent_severe_count = drought_obj.severe.continuous.length != 0 ? drought_obj.severe.continuous[drought_obj.severe.continuous.length-1].length : 0;
	var str = '';
	var count_to_word = ['one','two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

	if (recent_severe_count >= 3 || recent_medium_count >= 5) {
		if (recent_severe_count >= 3) {
			str += `A significant decline in precipitation levels has been ongoing for ${count_to_word[recent_severe_count-1]} months during the season.`;
		}
		else {
			str += `An extended decline in precipitation levels is currently being experienced for the current season. Allocate water reserves as needed.`
		}

		outlook.classification = 'Drought';
		outlook.drought_summary = str;
	}
	else if (recent_severe_count >= 2 || recent_medium_count >= 3) {
		if (recent_severe_count >= 2) {
			str += `A significant decline in precipitation levels has been ongoing for two months during the season. Drought may be expected if precipitation levels do not rise. Prepare water reserves now.`;
		}
		else {
			str += `A ${count_to_word[recent_medium_count-1]} month decline in precipitation levels is currently being experienced for the current season. Please be advised to monitor precipitation and temperature levels closely and allocate water reserves.`
		}

		outlook.classification = 'Dry Spell';
		outlook.drought_summary = str;
	}
	else if (recent_medium_count >= 2) {
		outlook.classification = 'Dry Condition';
		outlook.drought_summary = 'Precipitation levels have fallen below normal range for two consecutive months in the current season. Please be advised to monitor precipitation and temperature levels closely and allocate water reserves.';
	}
	else {
		outlook.classification = 'Normal Fluctuation';
		outlook.drought_summary = 'Precipitation levels are within normal ranges. Refer to the weather forecast for short-term fluctuations in the weather.';
	}


	return { chart: data, outlook: outlook };
}

function checkContinuous(arr) {
	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
	  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
	];
	var date, month_index, prev_month_index;
	var count = 1;
	var found = 0;

	arr.data.forEach(function(item, index) {
		if (index != 0) {
			date = new Date(item.date);
			month_index = date.getMonth();
			date = new Date(arr.data[index-1].date);
			prev_month_index = date.getMonth();
			if (Math.abs((month_index - prev_month_index)%10) == 1) {
				if (found == 0) {
					found = arr.data[index-1];
				}

				if (count > arr.continuous.length) {
					arr.continuous.push([found]);
				}
				arr.continuous[arr.continuous.length-1].push(item);
			}
			else {
				if (found != 0) {
					count++;
					found = 0;
				}
			}
		}
	});
	return arr;
}

exports.updateWeatherData = function(req, res, next) {
	var lat = req.query.lat, lon = req.query.lon;
	lat = temp_lat;
	lon = temp_lon;
	var date = new Date();
	date.setMonth(date.getMonth - 12);
	var start = dataformatter.dateToUnix(date), end = dataformatter.dateToUnix(new Date());
	var arr = [];
	var date = new Date();
	var month = date.getMonth()+1, day = date.getDate();
	var range_start, range_end = new Date();
	var month_end = range_end.getMonth()+1, day_end = range_end.getDate();
	var url = `https://history.openweathermap.org/data/2.5/aggregated/year?lat=${lat}&lon=${lon}&appid=${open_weather_key}`;

	weatherForecastModel.lastWeatherData(function(err, last_record) {
		if (err)
			throw err;
		else {
			range_start = new Date(last_record[0].date);
			month = range_start.getMonth()+1;
			day = range_start.getDate();
			if (month_end == month && day_end == day) {
				console.log('updated weather data');
			}
			else {
				request(url, {json: true}, function(err, response, body) {
					if (err)
						throw err;
					else {

						body = body.result.filter(e => (e.month == month && (e.day > day && e.day <= day_end) ) || (e.month == month_end && (e.day <= day_end && e.day > day) ) );

						if (body.length != 0) {
							var temp_date;
							body.forEach(function(item) {
								temp_date = dataformatter.formatDate(new Date(`${item.month}-${item.day}-${date.getFullYear()}`), 'YYYY-MM-DD');
								arr.push({ date: temp_date, temp_mean: Math.round((item.temp.mean-273.15)*100)/100, temp_min: Math.round((item.temp.record_min-273.15)*100)/100, 
									temp_max: Math.round((item.temp.record_max-273.15)*100)/100, pressure_mean: Math.round(item.pressure.mean*100)/100, 
									humidity_mean: Math.round(item.humidity.mean*100)/100, precipitation_mean: Math.round(item.precipitation.mean*100)/100 });
							})
							weatherForecastModel.saveWeatherData(arr, function(err, result) {
								if (err)
									throw err;
								else {
									//console.log(result);
								}
							});
						}
					}
				});
			}

			disasterModel.getDisasterLogs({ status: 1, type: ['"Drought"', '"Dry Spell"', '"Dry Condition"', '"Normal Fluctuation"'] }, function(err, disaster_records) {
				if (err)
					throw err;
				else {
					var start_date = new Date(req.session.cur_date);
					start_date.setMonth(start_date.getMonth() - 12);
					weatherForecastModel.getPrecipHistory({ date: dataformatter.formatDate(start_date, 'YYYY-MM-DD'), end_date: dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD') }, function(err, precip_data) {
						if (err) {
							throw err;
						}
						else {
							var precip_details = processPrecipChartData(precip_data)
							req.precip_data = JSON.stringify(precip_details.chart);
							//req.outlook = { drought_summary: disaster_records[0].description, classification: disaster_records[0].type, last_update: dataformatter.formatDate(new Date(disaster_records[0].date_recorded), 'YYYY-MM-DD') };
							req.outlook = { drought_summary: precip_details.outlook.drought_summary, classification: precip_details.outlook.classification, last_update: dataformatter.formatDate(new Date(cur_date), 'YYYY-MM-DD') };

							var cur_date = new Date(req.session.cur_date);
							var cur_month = cur_date.getMonth(), cur_year = cur_date.getFullYear();
							var last_record_date = disaster_records.length <= 0 ? 1 : new Date(disaster_records[0].date_recorded);
							var last_record_month = disaster_records.length <= 0 ? 0 : last_record_date.getMonth(), last_record_year = disaster_records.length <= 0 ? 0 : last_record_date.getFullYear();

							// Check if assessment must be updated
							if (disaster_records.length < 1 || ((cur_year != last_record_year) || (cur_month != last_record_month))) {
								// Update previous assessments to inactive
								disasterModel.updateLog({ status: 0 }, { type: ['"Drought"', '"Dry Spell"', '"Dry Condition"', '"Normal Fluctuation"'] }, function(err, update_status) {
									if (err)
										throw err;
									else {
										
									}
								});
								// Create new disaster log and notification
								var notif_warning = [], disaster_log = [];
								var time = new Date();
								time = time.toLocaleTimeString();

								notif_warning.push({
									date: '"'+dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')+'"',
									notification_title: `"Weather Alert: ${precip_details.outlook.classification}"`,
									notification_desc: `"${precip_details.outlook.drought_summary}"`,
									farm_id: '"null"',
									url: '"/disaster_management"',
									icon: '"exclamation-triangle"',
									color: '"danger"',
									status: 0,
									type: "'DISASTER_WARNING'",
									time: `"${time}"`
								});

								disaster_log.push({
									max_temp: `"null"`,
									min_temp: `"null"`,
									pressure: `"null"`,
									humidity: `"null"`,
									weather: `"null"`,
									description: `"${precip_details.outlook.drought_summary}"`,
									wind_speed: `"null"`,
									rainfall: `"null"`,
									wind_direction: `"null"`,
									status: 1,
									type: `"${precip_details.outlook.classification}"`,
									date_recorded: '"'+dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')+'"',
									target_date: '"'+dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')+'"'
								});	

								// Create disaster log and create notif alert
								disasterModel.createDisasterLog(disaster_log, function(err, disaster_add) {
									if (err)
										throw err;
									else {
										notifModel.createNotif(notif_warning, function(err, notif) {
											if (err)
												throw err;
											else {
												notifModel.createUserNotif(function(err, user_notif_status) {
				                                    if (err)
				                                        throw err;
				                                    else {

				                                    }
				                                });																	
											}
										});
									}
								});		
							}			
						}
					});
				}
			});
						
			return next();
		}
	});
};

exports.getHistoricalWeather = function(req, res) {
	var lat = req.query.lat, lon = req.query.lon;
	lat = temp_lat;
	lon = temp_lon;
	var start = new Date('01/01/2022'), end = new Date();

	var url = `http://history.openweathermap.org/data/2.5/history/city?lat=${lat}&lon=${lon}&type=hour&start=${start}&end=${end}&appid=${key}`;
	request(url, {json: true}, function(err, response, body) {
		if (err)
			throw err;
		else {
			//console.log(body);
			res.send(body);
		}
	});
}

exports.get14DWeatherForecast = function(req, res) {
	var lat = req.query.lat, lon = req.query.lon, cnt = 14;
	lat = temp_lat;
	lon = temp_lon;

	var url = `https://pro.openweathermap.org/data/2.5/forecast/climate?lat=${lat}&lon=${lon}&appid=${key}`;

	request(url, {json: true}, function(err, response, body) {
		if (err)
			throw err;
		else {
			var query = [];
			var weather_obj;
			var date = new Date();
			var hour = date.getHours();
			var notif_warning = [];
			var disaster_log = [];
			for (var i = 0; i < body.list.length; i++) {
				weather_obj = {
					date: dataformatter.formatDate(dataformatter.unixtoDate(body.list[i].dt), 'YYYY-MM-DD'),
					humidity: body.list[i].humidity,
					max_temp: Math.round((body.list[i].temp.max - 273.15) * 100) / 100,
					min_temp: Math.round((body.list[i].temp.min - 273.15) * 100) / 100,
					pressure: body.list[i].pressure,
					rainfall: body.list[i].hasOwnProperty('rain') ? body.list[i].rain : 0,
					weather_id: body.list[i].weather[0].id,
					desc: body.list[i].weather[0].description,
					time_uploaded: hour,
					icon: body.list[i].weather[0].icon
				}
				query.push(weather_obj);
				if (weather_obj.desc == 'heavy intensity rain') {
					var time = new Date();
					time = time.toLocaleTimeString();

					notif_warning.push({
						date: '"'+dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')+'"',
						notification_title: '"Heavy Rainfall Alert"',
						notification_desc: '"Expected heavy intensity rain on '+weather_obj.date+'"',
						farm_id: '"null"',
						url: '"/disaster_management"',
						icon: '"exclamation-triangle"',
						color: '"danger"',
						status: 0,
						type: "'DISASTER_WARNING'",
						time: `"${time}"`
					});
					disaster_log.push({
						max_temp: Math.round((body.list[i].temp.max - 273.15) * 100) / 100,
						min_temp: Math.round((body.list[i].temp.min - 273.15) * 100) / 100,
						pressure: body.list[i].pressure,
						humidity: body.list[i].humidity,
						weather: body.list[i].weather[0].id,
						description: '"'+body.list[i].weather[0].description+'"',
						wind_speed: body.list[i].speed,
						rainfall: body.list[i].hasOwnProperty('rain') ? body.list[i].rain : 0,
						wind_direction: body.list[i].deg,
						status: 1,
						type: '"Heavy Rainfall"',
						date_recorded: '"'+dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')+'"',
						target_date: '"'+weather_obj.date+'"'
					});
				}

				weather_obj = {};
			}
			weatherForecastModel.saveForecastResults(query, function(err, status) {
				if (err)
					throw err;
				else {
					if (notif_warning.length != 0) {
						// Check for repeat rainfall warnings && disaster logs
						notifModel.getAllNotifs(function(err, notif_list) {
							if (err)
								throw err;
							else {
								disasterModel.getDisasterLogs({ status: 1, type: ['"Heavy Rainfall Alert"'] }, function(err, disaster_records) {
									if (err)
										throw err;
									else {
										// Set all previously recorded disaster warnings to inactive
										disasterModel.updateLog({ status: 0, type: ['"Heavy Rainfall Alert"'] }, null, function(err, update_status) {
											if (err)
												throw err;
											else {
												var repeat_notif = [];
												var query_notif = [];

												var delete_disaster = [];
												var list_index = [];
												
												for (var i = 0; i < notif_warning.length; i++) {
													list_index = notif_list.filter(e => '"'+e.notification_title+'"' == notif_warning[i].notification_title && 
														'"'+e.notification_desc+'"' == notif_warning[i].notification_desc);
													if (list_index.length == 0) {
														query_notif.push(notif_warning[i]);
													}
												}

												for (var i = 0; i < disaster_records.length; i++) {
													list_index = disaster_log.filter(e => e.type == disaster_records[i].type &&
														e.target_date == '"'+disaster_records[i].target_date+'"');

													if (list_index.length == 0) {
														delete_disaster.push({ disaster_id: disaster_records[i].disaster_id });
													}
												}
												// If there are existing similar disaster records delete them
												if (delete_disaster.length != 0) {
													disasterModel.deleteDisasterLog(delete_disaster, function(err, disaster_delete) {
														if (err)
															throw err;
													});
												}

												// Create disaster log and create notif alert
												disasterModel.createDisasterLog(disaster_log, function(err, disaster_add) {
													if (err)
														throw err;
													else {
														if (query_notif.length != 0) {
															notifModel.createNotif(query_notif, function(err, notif) {
																if (err)
																	throw err;
																else {
																	notifModel.createUserNotif(function(err, user_notif_status) {
									                                    if (err)
									                                        throw err;
									                                    else {

																			res.send({});	
									                                    }
									                                });																	
																}
															});
														}
														else {
															res.send({});
														}
													}
												});
											}
										});
												
									}
								});				
							}
						});
					}
					else {
						disasterModel.updateLog({ status: 0, type: ['"Heavy Rainfall Alert"'] }, null, function(err, update_status) {
							if (err)
								throw err;
							else {
								res.send(body);
							}
						});
					}
				}
			});
					
		}
	})
}

exports.getNationalAlerts = function(req, res) {
	var lat = req.query.lat, lon = req.query.lon;
	lat = temp_lat;
	lon = temp_lon;

	var url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,daily&appid=${key}`;

	request(url, {json: true}, function(err, response, body) {
		if (err)
			throw err;
		else {
			if (body.hasOwnProperty('alerts')) {
				console.log(body.alerts);
			}
			res.send(body);
		}
	});
}

exports.climateForecast = function(req, res) {
	var lat = req.query.lat, lon = req.query.lon;
	lat = temp_lat;
	lon = temp_lon;

	var url = `https://pro.openweathermap.org/data/2.5/forecast/climate?lat=${lat}&lon=${lon}&appid=${key}`;
	request(url, {json: true}, function(err, response, body) {
		if (err)
			throw err;
		else {
			//console.log(body.list[29]);
			res.send(body);
		}
	});
}