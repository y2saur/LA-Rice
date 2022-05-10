var request = require('request');
const dataformatter = require('../public/js/dataformatter.js');
const weatherForecastModel = require('../models/weatherForecastModel.js');
const disasterModel = require('../models/disasterModel.js');
const notifModel = require('../models/notificationModel.js');

var key = 'd7aa391cd7b67e678d0df3f6f94fda20';
var temp_lat = 13.073091;
var temp_lon = 121.388563;
var open_weather_key = 'd7aa391cd7b67e678d0df3f6f94fda20';

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

					notif_warning.push({
						date: '"'+dataformatter.formatDate(new Date(), 'YYYY-MM-DD')+'"',
						notification_title: '"Heavy Rainfall Alert"',
						notification_desc: '"Expected heavy intensity rain on '+weather_obj.date+'"',
						farm_id: 'null',
						url: '"/disaster_management"',
						icon: '"exclamation-triangle"',
						color: '"danger"',
						status: 0
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
						date_recorded: '"'+dataformatter.formatDate(new Date(), 'YYYY-MM-DD')+'"',
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
								disasterModel.getDisasterLogs({ status: 1 }, function(err, disaster_records) {
									if (err)
										throw err;
									else {
										// Set all previously recorded disaster warnings to inactive
										disasterModel.updateLog({ status: 0 }, null, function(err, update_status) {
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
														console.log(disaster_add);
														if (query_notif.length != 0) {
															notifModel.createNotif(query_notif, function(err, notif) {
																if (err)
																	throw err;
																else {
																	console.log(notif);
																	res.send({});																		
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
						disasterModel.updateLog({ status: 0 }, null, function(err, update_status) {
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