const employeeModel = require('../models/employeeModel');
const farmModel = require('../models/farmModel');
const dataformatter = require('../public/js/dataformatter.js');
const materialModel = require('../models/materialModel.js');
const workOrderModel = require('../models/workOrderModel.js');
const nutrientModel = require('../models/nutrientModel.js');
const cropCalendarModel = require('../models/cropCalendarModel.js');
const pestdiseaseModel = require('../models/pestdiseaseModel.js');
const analyzer = require('../public/js/analyzer.js');
const js = require('../public/js/session.js');
var request = require('request');

//var key = '1d1823be63c5827788f9c450fb70c595'; // Unpaid
var key = '2ae628c919fc214a28144f699e998c0f'; // Paid API Key

var temp_lat = 13.073091;
var temp_lon = 121.388563;

exports.forecastYield = function(req, res) {
	farmModel.getFarmData({ group: 'farm_id' }, function(err, farms) {
		if (err)
			throw err;
		else {
			//
			html_data["notifs"] = req.notifs;
			res.render('yield_forecast_test', { list: farms });
		}
	});
}

exports.ajaxGetFarmList = function(req, res) {
	let where = req.query.where;
	farmModel.getFarmData({ where: where, group: 'farm_id'}, function(err, farms) {
		if (err)
			throw err;
		else {
			res.send(farms);
		}
	});
}

exports.getDashboard = function(req, res) {
	var html_data = {};
	html_data["title"] = "Dashboard";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'dashboard', req.session);

	html_data["notifs"] = req.notifs;
	res.render('home', html_data);
}

exports.getFarms = function(req, res) {
	farmModel.getAllFarms(function(err, farm_list) {
		if (err)
			throw err;
		else {
			var html_data = { farm_list: farm_list };
			html_data = js.init_session(html_data, 'role', 'name', 'username', 'farms', req.session);
			html_data["notifs"] = req.notifs;
			res.render('farms', html_data);
		}
	});
}

// ADD FARMS PAGE (TO BE UPDATED)
exports.getAddFarm = function(req, res) {
	var html_data = {};
	html_data["title"] = "Farm Monitoring";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'add_farm', req.session);
	html_data["notifs"] = req.notifs;
	res.render('add_farm', html_data);
}

//AJAX
exports.checkFarmExists = function(req, res) {
	farmModel.filteredFarmDetails({ farm_name: req.body.farm_name }, function(err, farm) {
		if (err)
			throw err;
		else {
			res.send(farm);
		}
	});
}

exports.getFarmDetails = function(req, res) {
	var html_data = {};
	var query = req.query;
	var center = req.query.center;
	var coordinates = req.query.coordinates;
	var farm_id = req.query.farm_id;
	var farmtypes = [];
	farmModel.filteredFarmDetails({farm_id : req.query.farm_id}, function(err, details) {
		if (err)
			throw err;
		else {
			//
			html_data["details"] = details;
			////
			farmtypes.push(details[0].land_type);
		}

		materialModel.getFarmMaterialsSpecific({farm_id : farm_id}, {item_type : "Seed"}, function(err, seeds){
			if(err)
				throw err;
			else{
				if(seeds == null){
	
				}
				else{
					var ctr = seeds.length;
					if(seeds == null)
						ctr = 0;
					while(ctr < 5){
						seeds.push({});
						ctr++;
					}
					html_data["seed"] = seeds;
				}
	
				materialModel.getFarmMaterialsSpecific({farm_id : farm_id}, {item_type : "Fertilizer"}, function(err, fertilizers){
					if(err)
						throw err;
					else{
						if(fertilizers == null){
	
						}
						else{
							var ctr = fertilizers.length;
							if(fertilizers == null)
								ctr = 0;
							while(ctr < 5){
								fertilizers.push({});
								ctr++;
							}
							html_data["fertilizer"] = fertilizers;
						}
						materialModel.getFarmMaterialsSpecific({farm_id : farm_id}, {item_type : "Pesticide"}, function(err, pesticides){
							if(err)
								throw err;
							else{
								if(pesticides == null){
	
								}
								else{
									var ctr = pesticides.length;
									if(pesticides == null)
										ctr = 0;
									while(ctr < 5){
										pesticides.push({});
										ctr++;
									}
									html_data["pesticide"] = pesticides;
								}
								
								////
								////
								var center = req.query.center;
								if(center == null){
									var lat = 13.073091;
									var lon = 121.388563;
								}
								else{
									var lat = center[1];
									var lon = center[0];
								}
								
								new Date(req.session.cur_date);

								var d1 = new Date(req.session.cur_date);
								var d2 = new Date(req.session.cur_date);
								d2.setDate(d2.getDate() - 2);
								d1.setDate(d1.getDate() - 1);

								var temp_date = dataformatter.processChangedDate(d2, d1);
								var start_date = dataformatter.dateToUnix(temp_date.start), end_date = dataformatter.dateToUnix(temp_date.end);
								
								var x = new Date(req.session.cur_date);
								var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?lat='+lat+'&lon='+lon+'&start='+start_date+'&end='+end_date+'&appid='+key;
								request(url, { json: true }, function(err, response, body) {
									if (err)
										throw err;
									else {
										// //
										for (var i = 0; i < body.length; i++) {
											body[i].dt = dataformatter.unixtoDate(body[i].dt);
										}
										
										//***** Call Agro API for succeeding 5 day forecast
										var forecast_url = 'https://api.agromonitoring.com/agro/1.0/weather/forecast?lat='+lat+'&lon='+lon+'&appid='+key;
										request(forecast_url, { json: true }, function(err, response, forecast_body) {
											if (err)
												throw err;
											else {
												forecast_body.dt = dataformatter.unixtoDate(forecast_body.dt);
			
												var hour_arr = [];
												for (var i = 0; i < forecast_body.length; i++) {
													forecast_body[i].dt = dataformatter.unixtoDate((forecast_body[i].dt));
													hour_arr.push(dataformatter.formatDate(forecast_body[i].dt, 'HH:m'))
												}
												// //
												
												//***** Get unique hour timestamps from forecast and filter data
												hour_arr = [...new Map(hour_arr.map(item =>
													[item, item])).values()];
							
												body = dataformatter.smoothHourlyData(body, hour_arr);
												forecast_body = dataformatter.smoothHourlyData(forecast_body, hour_arr);
							
												//***** Build on Agro API and use ANN to forecast remaining 9 days
												var result = analyzer.weatherForecast14D(dataformatter.prepareData(body, 1), dataformatter.prepareData(forecast_body, 1), hour_arr.length+1);
												var keys = ['min_temp', 'max_temp', 'humidity', 'pressure', 'rainfall', 'id'];
												
												result.forecast = dataformatter.convertForecastWeather(dataformatter.arrayToObject(result.forecast, keys));
							
												forecast = dataformatter.mapAndFormatForecastResult(result, hour_arr);
												
												// //
												var daily_ctr = 0;
												var dmin_temp = 0, dmax_temp = 0, dhumidity = 0, dpressure = 0, drainfall = 0;
												for(var i = 0; i < forecast.length; i++){
													// //
			
													var ctr = 0;
													var min_temp = 0, max_temp = 0, humidity = 0, pressure = 0, rainfall = 0;
													for(var y = 0;y < forecast[i].data.length; y++){
														if(!isNaN(forecast[i].data[y].min_temp)){
															min_temp = min_temp + forecast[i].data[y].min_temp;
															max_temp = max_temp + forecast[i].data[y].max_temp;
															humidity = humidity + forecast[i].data[y].humidity;
															pressure = pressure + forecast[i].data[y].pressure;
															rainfall = rainfall + forecast[i].data[y].rainfall;
				
															ctr++;
														}
														
													}
													if(ctr != 0){
														min_temp = min_temp / ctr;
														max_temp = max_temp / ctr;
														humidity = humidity / ctr;
														pressure = pressure / ctr;
														rainfall = rainfall / ctr;
													}
													
			
													dmin_temp = dmin_temp + min_temp;
													dmax_temp = dmax_temp + max_temp;
													dhumidity = dhumidity + humidity;
													dpressure = dpressure + pressure;
													drainfall = drainfall + rainfall;
			
													daily_ctr++;
												}
			
												var weather = {
													min_temp : ((dmin_temp / daily_ctr) - 32) / 1.8,
													max_temp : ((dmax_temp / daily_ctr) - 32) / 1.8,
													humidity : dhumidity / daily_ctr,
													precipitation : drainfall / daily_ctr
												}
												
												// //
			
			
												var season = {
													season_temp : 35,
													season_humidity : 65
												}
												var cc_query = {
													status: ['In-Progress', 'Active', "Completed"], date: req.session.cur_date
												}
												cropCalendarModel.getCropCalendars(cc_query, function(err, stage){
													if(err)
														throw err;
													else{
														var i, index;
														for(i = 0; i < stage.length; i++)
															if(stage[i].calendar_id == req.query.calendar_id){
																index = i;
																break;
															}
														//
														if(index == null){
															var cur_stage = {
																stage_name : null
															}	
														}
														else{
															var cur_stage = {
																stage_name : stage[0].stage
															}	
															farmtypes.push(stage[0].method);
														}
														
													}
													pestdiseaseModel.getPDProbabilityPercentage(weather, season, farmtypes, cur_stage,function(err, possible_pests){
														if(err){
															throw err;
														}else{
															var statements = new Array();
															for(i = 0; i < possible_pests.length; i++){
																stmt = possible_pests[i].pest_name + " - May occur due to ";
																if(possible_pests[i].weather_id != null)
																	stmt = stmt + possible_pests[i].weather + " weather, ";
																if(possible_pests[i].season_id != null)
																	stmt = stmt + possible_pests[i].season_name + " season ";
																if(possible_pests[i].stage_id != null)
																	stmt = stmt + possible_pests[i].t_stage_name + " stage ";
																statements.push({ statement : stmt});
															}
				
															for(x =0; x < possible_pests.length; x++){
																if(x >= 3)
																	possible_pests.pop(x);
															}
														}
														farmModel.getFarmerQueries(farm_id, null, function(err, queries){
															if(err)
																throw err;
															else{
																
															}
	
	
															//ADD CROP CYCLE DETAILS (WORK ORDERS)
															var calendar_id = req.query.calendar_id;
	
															var crop_calendar_query = { status: ['In-Progress', 'Active','Completed'] , where : {key : "calendar_id", val : calendar_id}, date: req.session.cur_date }
															//
															cropCalendarModel.getCropCalendars(crop_calendar_query, function(err, crop_calendar_details){
																if(err)
																	throw err;
																else{
																	var calendar_index = -1;
																	if(calendar_id == null)
																		calendar_index = -1;
																	else{
																		for(i = 0; i < crop_calendar_details.length; i++){
																			if(crop_calendar_details[i].calendar_id == calendar_id){
																				calendar_index = i;
																				break;
																			}
																		}
																		if(calendar_index != -1){
																			var expected_vegetation = crop_calendar_details[calendar_index].sowing_date;
																			crop_calendar_details[calendar_index].land_prep_date = dataformatter.formatDate(dataformatter.formatDate(new Date(crop_calendar_details[0].land_prep_date)), 'YYYY-MM-DD');
																			var calendar_details = crop_calendar_details[calendar_index];
																			calendar_details["expected_harvest"] = new Date(expected_vegetation);
																			calendar_details.expected_harvest.setDate(calendar_details.expected_harvest.getDate() +  crop_calendar_details[calendar_index].maturity_days + 65);
																			calendar_details.expected_harvest = dataformatter.formatDate(dataformatter.formatDate(new Date(calendar_details.expected_harvest)), 'YYYY-MM-DD');
																			
																			calendar_details["sowing_date_end"] = new Date(crop_calendar_details[calendar_index].sowing_date);
																			calendar_details.sowing_date_end.setDate(calendar_details.sowing_date_end.getDate() + crop_calendar_details[calendar_index].maturity_days);
																			calendar_details.sowing_date_end = dataformatter.formatDate(dataformatter.formatDate(new Date(calendar_details.sowing_date_end)), 'YYYY-MM-DD');

																			html_data["crop_calendar_details"] = calendar_details;

																			var land_prep = calendar_details.land_prep_date;
																			var sowing = calendar_details.sowing_date;
																			var ripening = new Date(expected_vegetation);
																			ripening.setDate(ripening.getDate() + calendar_details.maturity_days + 35);
																			var reproductive = new Date(expected_vegetation);
																			var vegetation = calendar_details.sow_date_completed;
																			var harvest = calendar_details.expected_harvest;
																		}
																		
																	}
	
																}
																//
																//
																var wo_query = {
																	where: {
																		key: ['crop_calendar_id'],
																		value: [calendar_id]
																	},
																	order: ['work_order_table.date_start ASC']
																};
																workOrderModel.getWorkOrders(wo_query, function(err, workorders){
																	if(err)
																		 throw err;
																	else{
																		var current = true;
																		for(i = 0; i < workorders.length; i++){
																			if(workorders[i].date_completed == null){
																				workorders[i]["current"] = "current_wo";
																			}
																			else
																				workorders[i]["current"] = "past_wo";
	
	
																			if(workorders[i].type == "Land Preparation" || (workorders[i].date_start > land_prep && workorders[i].date_start < sowing))
																				workorders[i]["stage"] = "Land Preparation";
																			else if(workorders[i].type == "Sow Seed" || (workorders[i].date_start > sowing && workorders[i].date_start < vegetation))
																				workorders[i]["stage"] = "Sowing";
																			else if(workorders[i].type == "Harvest" || workorders[i].date_start > harvest)
																				workorders[i]["stage"] = "Harvest";
																			else if(workorders[i].date_start > vegetation && workorders[i].date_start < reproductive)
																				workorders[i]["stage"] = "Vegetation";
																			else if(workorders[i].date_start > reproductive && workorders[i].date_start < ripening)
																				workorders[i]["stage"] = "Reproductive";
																			else if(workorders[i].date_start > vegetation && workorders[i].date_start < reproductive)
																				workorders[i]["stage"] = "Ripening";
																			else{
																				workorders[i]["stage"] = "Vegetation";
																			}
	
																			dataformatter.formatDate(dataformatter.unixtoDate(workorders[i].date_completed), 'mm DD, YYYY');
																			if(workorders[i].date_completed == null)
																				workorders[i].date_completed = "N/A"; //Not yet completed (changed to reduce conflict with case insensitive search, e.g., "Completed")
																			else
																				workorders[i].date_completed = dataformatter.formatDate(dataformatter.formatDate(new Date(workorders[i].date_completed)), 'YYYY-MM-DD');
																			workorders[i].date_start = dataformatter.formatDate(dataformatter.formatDate(new Date(workorders[i].date_start)), 'YYYY-MM-DD');
																			workorders[i].date_due = dataformatter.formatDate(dataformatter.formatDate(new Date(workorders[i].date_due)), 'YYYY-MM-DD');
																			workorders[i].date_created = dataformatter.formatDate(dataformatter.formatDate(new Date(workorders[i].date_created)), 'YYYY-MM-DD');
																		}
																	}
																	// //
																	// //
																	
																	pestdiseaseModel.getDiagnosis({farm_id : farm_id}, null, function(err, diagnosis){

																		if(err)
																			throw err;
																		else{
																			var i, x;
																			for(i = 0; i < diagnosis.length; i++){
																				diagnosis[i].date_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(diagnosis[i].date_diagnosed)), 'YYYY-MM-DD');
																				
																				for(x = 0 ; x < possible_pests.length; x++){
																					if(possible_pests[x].type == diagnosis[i].type && possible_pests[x].pd_id == diagnosis[i].pd_id){
																						// possible_pests[x].probability = possible_pests[x].probability * 1.1;
																						if(diagnosis[i].farm_id == farm_id){
																							// possible_pests[x].probability = possible_pests[x].probability * 1.1;
																						}
																					}
																				}
																			}
																			
																			//Sort possibilties
																			var temp_pos = [];
																			var smallest = 0;
																			for(x = 1 ; x < possible_pests.length; x++){
																				
																				if(possible_pests[smallest].probability < possible_pests[x].probability){
																					temp_pos.push(possible_pests[x]);
																				}
																				else{
																					temp_pos.push(possible_pests[smallest]);
																					smallest = x;
																				}
																			}
																		}
																		html_data["workorders"] = workorders;
																		html_data["queries"] = queries;
																		html_data["statements"] = statements;
																		html_data["probability"] = temp_pos;
																		html_data["main"] = forecast_body[0].main;
																		res.send(html_data);
																	});
																});
															});
														});
													});
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	});
}

exports.getFarmDetailsDashboard = function(req, res) {

	farmModel.filteredFarmDetails({farm_id : req.query.farm_id}, function(err, details) {
		if (err)
			throw err;
		else {
			res.send(details);
		}
	});
}

exports.getMonitorFarms = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'monitor_farms', req.session);
	html_data["farm_id"] = req.query.farm_id;
	html_data["notifs"] = req.notifs;
	res.render('farm_monitoring', html_data);
}

exports.assignFarmers = function(req, res) {
	var query = req.body.query;

	farmModel.addAssignedFarmers(query, function(err, result) {
		if (err)
			throw err;
		else {
			//
			res.send({ success: true });
		}
	});
}

exports.retireFarm = function(req, res) {
	var update = {
		status: 'Inactive'
	};
	var filter = {
		farm_name: req.params.id
	};
	farmModel.updateFarm(update, filter, function(err, result) {
		if (err)
			throw err;
		else {
			res.redirect('/farms');
		}
	});
}

// exports.getCropCalendar = function(req, res) {
// 	var html_data = {};
// 	html_data = js.init_session(html_data, 'role', 'name', 'username', 'crop_calendar');
// 	html_data["notifs"] = req.notifs;
//res.render('crop_calendar', html_data); //crop_calendar
// }

// exports.getAddCropCalendar = function(req, res) {
// 	var html_data = {};
// 	html_data["title"] = "Crop Calendar";
// 	html_data = js.init_session(html_data, 'role', 'name', 'username', 'add_crop_calendar');
// 	html_data["notifs"] = req.notifs;
//res.render('add_crop_calendar', html_data); //crop_calendar_test
// }

// exports.getAddCropCalendar2 = function(req, res) { //delete later
// 	var html_data = {};
// 	html_data = js.init_session(html_data, 'role', 'name', 'username', 'crop_calendar');
// 	html_data["notifs"] = req.notifs;
//res.render('crop_calendar_test', html_data); //crop_calendar_test
// }

exports.getHarvestCycle = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'harvest_cycle', req.session);
	html_data["notifs"] = req.notifs;
	res.render('harvest_cycle', html_data);
}

exports.getGeoMap = function(req, res) {
	farmModel.getFarmData(null, function(err, farm_data) {
		if (err) {
			throw err;
		}
		else {
			farmModel.getPlotData(null, function(err, plot_data) {
				if (err) {
					throw err;
				}
				else {
					employeeModel.queryEmployee('allEmployees', null, function(err, employee_data) {
						if (err) {
							throw err;
						}
						else {
							var html_data = { farm_data: dataformatter.aggregateFarmData(farm_data, plot_data, employee_data)};
							////
							html_data["notifs"] = req.notifs;
							res.render('home', {});
						}
					})
				}
			})
		}
	});
}

exports.singleFarmDetails = function(req, res) {
	var query = { where: { key: 'farm_name', value: req.body.farm_name } };

	farmModel.getFarmData(query, function(err, result) {
		if (err)
			throw err;
		else {
			////
			res.send({ farm_list: result });
		}
	});
}

exports.createFarmRecord = function(req, res) {
	var query = {
		farm_name: req.body.farm_name,
		farm_desc: req.body.farm_desc == '' ? null : req.body.farm_desc,
		farm_area: req.body.polygon_area,
		land_type: req.body.land_type,
	};

	farmModel.addFarm(query, function(err, result) {
		if (err)
			throw err;
		else {
			var status = false;
			if (result.affectedRows)
				status = true;

			res.send({ success: status, farm_id: result.insertId });
		}
	});
}

//Environment Variable Queries
exports.getIncludedCalendars = function(req, res) {
	cropCalendarModel.getCurrentCropCalendar({ farm_name: req.query.farm_name }, function(err, calendar) {
		if (err)
			throw err;
		else {
			cropCalendarModel.getCropCalendars({ status: ['Completed'], where: { key: 'farm_name', val: req.query.farm_name }, date: req.session.cur_date }, function(err, calendar_list) {
		   		if (err)
		   			throw err;
		   		else {
		   			if (calendar.length != 0) {
		   				cropCalendarModel.readCropCalendar({ calendar_id: calendar[0].calendar_id }, function(err, curr_calendar) {
		   					if (err)
		   						throw err;
		   					else {
		   						calendar_list = calendar_list.filter(e => new Date(e.harvest_date) < curr_calendar[0].harvest_date);
					   			if (calendar_list.length < 4) {
					   				res.send({ result: null });
					   			}
					   			else {
					   				res.send({ result: calendar_list, current_calendar: curr_calendar[0] });
					   			}
		   					}
		   				});
		   			}
		   			else {
		   				//
			   			if (calendar_list.length < 4) {
			   				res.send({ result: null });
			   			}
			   			else {
			   				res.send({ result: calendar_list });
			   			}
		   			}
		   		}
		   });
		}
	});
		   
}

function normalizeForecastVariables(data) {
	var obj = {
		temp: [], humidity: [], pressure: [], rainfall: [], seed_id: [], yield: [], 
		N: [], P: [], K: [], seed_rate: []
	}
	var normalized_data = { data: [], val: [] };
	var obj_keys = ['temp', 'humidity', 'pressure', 'rainfall', 'seed_id', 'yield', 'N',
	'P', 'K', 'seed_rate'];
	//
	for (var i = 0; i < data.length; i++) {
		for (var x = 0; x < data[i].length; x++) {
			data[i][x] = parseFloat(data[i][x]);

			switch(x) {
				case 0:
				obj.temp.push(data[i][x]);
				break;
				case 1:
				obj.humidity.push(data[i][x]);
				break;
				case 2:
				obj.pressure.push(data[i][x]);
				break;
				case 3:
				obj.rainfall.push(data[i][x]);
				break;
				case 4:
				obj.seed_id.push(data[i][x]);
				break;
				case 5:
				obj.yield.push(data[i][x]);
				break;
				case 6:
				obj.N.push(data[i][x]);
				break;
				case 7:
				obj.P.push(data[i][x]);
				break;
				case 8:
				obj.K.push(data[i][x]);
				break;
				case 9:
				obj.seed_rate.push(data[i][x]);
				break;
			}
		}
	}

	for (var i = 0; i < obj_keys.length; i++) {
		obj[obj_keys[i]] = dataformatter.normalizeData(obj[obj_keys[i]]);
		normalized_data.val.push((obj[obj_keys[i]]));
	}

	var i = 0, x = 0;
	do {
		var arr = [];
		for (var i = 0; i < obj_keys.length; i++) {
			arr.push(obj[obj_keys[i]].arr[x]);
		}
		x++;
		normalized_data.data.push(arr);
	}
	while (x < obj[obj_keys[0]].arr.length);

	return normalized_data;
}

exports.ajaxCreateForecastedYieldRecord = function(req, res) {
	//ERROR THAT PREVENTS SMS
	farmModel.createForecastedYieldRecord(req.query, function(err, record) {
		if (err)
			throw err;
		else {
			res.send(record);
		}
	});
}

// requires farm_name, start, end, redirect
exports.completeYieldForecast = function(req, res) {
	req.params.redirect = '/farms/'+req.params.redirect;
	var insufficient = false;
	var current_calendar = null;
	var training_set = [];
	var testing_set = [];
	cropCalendarModel.getCurrentCropCalendar({ farm_name: req.params.farm_name }, function(err, calendar) {
		if (err)
			throw err;
		else {
			cropCalendarModel.getCropCalendars({ status: ['Completed'], where: { key: 'farm_name', val: req.params.farm_name }, date: req.session.cur_date }, function(err, calendar_list) {
		   		if (err)
		   			throw err;
		   		else {
		   			cropCalendarModel.readCropCalendar({ calendar_id: req.params.calendar_id }, function(err, curr_calendar) {
	   					if (err)
	   						throw err;
	   					else {
		   					calendar_list = calendar_list.filter(e => new Date(e.harvest_date) < curr_calendar[0].harvest_date);
			   				current_calendar = curr_calendar[0];
				   			// Get env variables of previous harvest from db
			   				var query = {
			   					calendar_id : calendar_list.map(({ calendar_id }) => calendar_id)
			   				}
			   				if (calendar_list.map(({ calendar_id }) => calendar_id).length >= 4) {
								farmModel.getForecastedYieldRecord(query, function(err, forecast_records) {
									if (err)
										throw err;
									else {
										// Transform db records
										delete forecast_records.forecast;

										for (var o = 0; o < forecast_records.length; o++) {
											training_set.push(Object.values(forecast_records[o]));
										}
										testing_set = training_set.slice();
										for (var i = 0; i < testing_set.length/2; i++) {
											testing_set.shift();
										}
									}
								});
			   				}

			   				//
							//
							// If there is existing crop cycle - Get current env variables
							if (current_calendar != null) {
								req.params.start = new Date(req.params.start) > new Date(req.session.cur_date) ? dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD') : dataformatter.formatDate(new Date(req.params.start), 'YYYY-MM-DD');
								req.params.end = new Date(req.params.end) > new Date(req.session.cur_date) ? dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD') : dataformatter.formatDate(new Date(req.params.end), 'YYYY-MM-DD');

								// Get polygon id
								var url = 'http://api.agromonitoring.com/agro/1.0/polygons?appid='+key;
							    request(url, { json: true }, function(err, response, polygon_list) {
							        if (err)
							        	throw err;
							        else {
							        	var polygon_id = polygon_list.filter(e => e.name == req.params.farm_name)[0].id;
										var start_date = dataformatter.dateToUnix(req.params.start), end_date = dataformatter.dateToUnix(req.params.end);
										var lat = req.query.lat, lon = req.query.lon, threshold = req.query.threshold;

										lat = temp_lat;
										lon = temp_lon;

										var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?accumulated_temperature?polyid='+polygon_id+'&lat='+lat+'&lon='+lon+'&start='+start_date+'&end='+end_date+'&appid='+key;

									    request(url, { json: true }, function(err, response, body) {
									        if (err)
									        	throw err;
									        else {
									        	var rainfall = 0;
									             body_rainfall = body.filter(e => e.rain != undefined || e.rain != null);
									        	if (body_rainfall.length != 0) {
									        		for (var i = 0; i < body_rainfall.length; i++) {
										        		rainfall += typeof body_rainfall[i].rain['3h'] == 'undefined' ? body_rainfall[i].rain['1h'] : body_rainfall[i].rain['3h'] 
										        	}
										        	rainfall /= body_rainfall.length
									        	}
										        //
										        if (body.length == 0) {
										        	var stat_obj = {
										        		avg_temp: 0,
											        	avg_humidity: 0,
											        	avg_pressure: 0,
										        		avg_rainfall: rainfall
										        	}
										        }
										        else {
										        	var stat_obj = {
										        		avg_temp: body.reduce((total, next) => total + next.main.temp, 0) / body.length,
											        	avg_humidity: body.reduce((total, next) => total + next.main.humidity, 0) / body.length,
											        	avg_pressure: body.reduce((total, next) => total + next.main.pressure, 0) / body.length,
										        		avg_rainfall: rainfall
										        	}

										        }
													
									        	// Replace last data of testing set with current env variables
												nutrientModel.getNutrientDetails({ specific: { calendar_id: current_calendar.calendar_id } }, function(err, curr_nutrient_details) {
													if (err)
														throw err;
													else {
														stat_obj['seed_id'] = current_calendar.seed_id;
														if (calendar_list.map(({ calendar_id }) => calendar_id).length >= 4)
															stat_obj['harvest_yield'] = testing_set[testing_set.length-1][5];
														else
															stat_obj['harvest_yield'] = 0;
														stat_obj['deficient_N'] = curr_nutrient_details[0].deficient_N;
														stat_obj['deficient_P'] = curr_nutrient_details[0].deficient_P;
														stat_obj['deficient_K'] = curr_nutrient_details[0].deficient_K;
														stat_obj['seed_rate'] = current_calendar.seed_rate;

														testing_set[testing_set.length-1] = Object.values(stat_obj);

														var forecast;
														if (calendar_list.map(({ calendar_id }) => calendar_id).length >= 4) {
															// Create actual forecast
															training_set = normalizeForecastVariables(training_set);
															testing_set = normalizeForecastVariables(testing_set);
															forecast = analyzer.forecastYield(training_set, testing_set);
														}
														else {
															forecast = [[0, 0, 0, 0, 0, -1]];
														}

														// Update db records
														var forecast_update = {
															temp: stat_obj.avg_temp,
															humidity: stat_obj.avg_humidity,
															pressure: stat_obj.avg_pressure,
															rainfall: stat_obj.avg_rainfall,
															forecast: Math.round(forecast[0][5]),
															N: stat_obj.deficient_N,
															P: stat_obj.deficient_P,
															K: stat_obj.deficient_K,
															seed_rate: stat_obj.seed_rate
														};
														var forecast_filter = {
															calendar_id: current_calendar.calendar_id
														}
														farmModel.updateForecastYieldRecord(forecast_update, forecast_filter, function(err, update_status) {
															if (err)
																throw err;
															else {
																// Redirect
																res.redirect(req.params.redirect);
															}
														})
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
		}
	});
		   
}

exports.createYieldForecast = function(req, res) {
	var training = req.query.training, testing = req.query.testing;
	//
	//
	//
	var training_set = normalizeForecastVariables(training);
	var testing_set = normalizeForecastVariables(testing);
	//
	//
	//
	var forecast = analyzer.forecastYield(training_set, testing_set);
	//
	res.send(forecast);
}

exports.ajaxGetForecastRecord = function(req, res) {
	var query = req.query;
	farmModel.getForecastedYieldRecord(query, function(err, records) {
		if (err)
			throw err;
		else {
			res.send(records);
		}
	});
}

exports.getYieldVariables = function(req, res) {
	req.query.start = new Date(req.query.start) > new Date(req.session.cur_date) ? dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD') : dataformatter.formatDate(new Date(req.query.start), 'YYYY-MM-DD');
	req.query.end = new Date(req.query.end) > new Date(req.session.cur_date) ? dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD') : dataformatter.formatDate(new Date(req.query.end), 'YYYY-MM-DD');

	var polygon_id = req.query.polyid;
	var start_date = dataformatter.dateToUnix(req.query.start), end_date = dataformatter.dateToUnix(req.query.end);
	var lat = req.query.lat, lon = req.query.lon, threshold = req.query.threshold;

	lat = temp_lat;
	lon = temp_lon;

	var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?accumulated_temperature?polyid='+polygon_id+'&lat='+lat+'&lon='+lon+'&start='+start_date+'&end='+end_date+'&appid='+key;
	//
    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	//
        	var rainfall = 0;
             body_rainfall = body.filter(e => e.rain != undefined || e.rain != null);
        	if (body_rainfall.length != 0) {
        		for (var i = 0; i < body_rainfall.length; i++) {
	        		rainfall += typeof body_rainfall[i].rain['3h'] == 'undefined' ? body_rainfall[i].rain['1h'] : body_rainfall[i].rain['3h'] 
	        	}
	        	rainfall /= body_rainfall.length
        	}
	        	
			var stat_obj = {
        		avg_temp: body.reduce((total, next) => total + next.main.temp, 0) / body.length,
	        	avg_humidity: body.reduce((total, next) => total + next.main.humidity, 0) / body.length,
	        	avg_pressure: body.reduce((total, next) => total + next.main.pressure, 0) / body.length,
        		avg_rainfall: rainfall
        	}
        	res.send(stat_obj);
        }
    });
}


exports.queryYieldVariables = function(req, res) {
	var polygon_id = req.query.polyid;
	var start_date = dataformatter.dateToUnix(req.query.start), 
	end_date = dataformatter.dateToUnix(req.query.end);
	var html_data = {};
	var obj;

	var data = {
		polygon_id: polygon_id,
		start: start_date,
		end: end_date
	};

	var options = {
		url: 'https://api.agromonitoring.com/agro/1.0/ndvi/history?polyid='+polygon_id+'&start='+start_date+'&end='+end_date+'&appid='+key,
		method: 'GET',
		headers: {
			'Content-type':'application/json'
		},
		body: JSON.stringify(data)
	};

	request(options, function(err, response, body) {
		if (err)
			throw err;
		else {
			body = JSON.parse(body);
			body = body.filter(e => e.cl < 60);
			for (var i = 0; i < body.length; i++) {
				body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
				body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
			}

			html_data['ndvi_history'] = body;

			var url = 'http://api.agromonitoring.com/agro/1.0/soil/history?start='+start_date+'&end='+end_date+'&polyid='+polygon_id+'&appid='+key;

		    request(url, { json: true }, function(err, response, body) {
		        if (err)
		        	throw err;
		        else {

					for (var i = 0; i < body.length; i++) {
		        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
		        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
		        	}

		        	html_data['soil_history'] = dataformatter.smoothDailyData(body, 'soil_history');

		        	var lat = req.query.lat, lon = req.query.lon, threshold = req.query.threshold;

					lat = temp_lat;
					lon = temp_lon;

					var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?accumulated_temperature?polyid='+polygon_id+'&lat='+lat+'&lon='+lon+'&threshold='+threshold+'&start='+start_date+'&end='+end_date+'&appid='+key;

				    request(url, { json: true }, function(err, response, body) {
				        if (err)
				        	throw err;
				        else {

							for (var i = 0; i < body.length; i++) {
				        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
				        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
				        	}

				        	html_data['accumulated_temp'] = dataformatter.smoothDailyData(body, 'accumulated_temp');

						    var url = 'http://api.agromonitoring.com/agro/1.0/uvi/history?polyid='+polygon_id+'&appid='+key+'&start='+start_date+'&end='+end_date;

						    request(url, { json: true }, function(err, response, body) {
						        if (err)
						        	throw err;
						        else {

									for (var i = 0; i < body.length; i++) {
						        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
						        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
						        	}

						        	html_data['uvi_history'] = dataformatter.smoothDailyData(body, 'uvi_history');;

						        	//
									res.send(html_data);
						        }
						    });
				        }
				    });
		        }
		    });
		}
	});
}

//**** NDVI and Satellite Imagery ****//
exports.getHistoricalNDVI = function(req, res) {
	var polygon_id = req.query.polyid;
	var start_date = dataformatter.dateToUnix(req.query.start), 
	end_date = dataformatter.dateToUnix(req.query.end);

	var obj;

	var data = {
		polygon_id: polygon_id,
		start: start_date,
		end: end_date
	};

	var options = {
		url: 'https://api.agromonitoring.com/agro/1.0/ndvi/history?polyid='+polygon_id+'&start='+start_date+'&end='+end_date+'&appid='+key,
		method: 'GET',
		headers: {
			'Content-type':'application/json'
		},
		body: JSON.stringify(data)
	};

	request(options, function(err, response, body) {
		if (err)
			throw err;
		else {
			body = JSON.parse(body);
			body = body.filter(e => e.cl < 60);
			for (var i = 0; i < body.length; i++) {
				body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
			}

			res.send(body);
		}
	})
}

exports.getSatelliteImageryData = function(req, res) {
	//
	var polygon_id = req.query.polygon_id;
	var temp_date = dataformatter.processChangedDate(req.query.start, req.query.end);
	var start_date = dataformatter.dateToUnix(temp_date.start), end_date = dataformatter.dateToUnix(temp_date.end);
	var obj;

	var data = {
		polygon_id: polygon_id,
		start: start_date,
		end: end_date,
		clouds_max: 1
	};

	var options = {
		url: 'https://api.agromonitoring.com/agro/1.0/image/search?polyid='+polygon_id+'&start='+start_date+'&end='+end_date+'&appid='+key+'&clouds_max='+60,
		method: 'GET',
		headers: {
			'Content-type':'application/json'
		},
		body: JSON.stringify(data)
	};
	request(options, function(err, response, body) {
		if (err)
			throw err;
		else {

			body = JSON.parse(body);

			for (var i = 0; i < body.length; i++) {
        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
        	}
			//var result = body[body.length-1];
			//result.dt = dataformatter.unixtoDate(result.dt);
			////
			res.send(body);
		}
	});
}

//**** Soil Data ****//
exports.getCurrentSoilData = function(req, res){
	var polygon_id = req.query.polyid;
	var cur_date = new Date(req.session.cur_date);
	var true_date = new Date();

	if(true_date != cur_date) {
		var temp_date = dataformatter.processChangedDate(req.session.cur_date, req.session.cur_date);
		var start_date = dataformatter.dateToUnix(temp_date.start), end_date = dataformatter.dateToUnix(temp_date.end);

		var url = 'http://api.agromonitoring.com/agro/1.0/soil/history?start='+start_date+'&end='+end_date+'&polyid='+polygon_id+'&appid='+key;

	    request(url, { json: true }, function(err, response, body) {
	        if (err)
	        	throw err;
	        else {
	        	//
	        	body = JSON.parse(JSON.stringify(body));
	        	body = body[body.length - 1];

				// for (var i = 0; i < body.length; i++) {
	   //      		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
	   //      		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
	   //      	}

	   			if (body == 'undefined' || body == undefined) {
	   				body = { dt: 'N/A', moisture: 'N/A' }; 
	   			}
	   			else {
	   				body.dt = dataformatter.unixtoDate(body.dt);
					body.moisture *= 100;
					body = dataformatter.kelvinToCelsius(body, 'Soil');
	   			}
		  			

	        	res.send(body);
	        }
	    });
	}
	else {
		var url = 'http://api.agromonitoring.com/agro/1.0/soil?polyid='+polygon_id+'&appid='+key;
	    request(url, { json: true }, function(err, response, body) {
	        if (err)
	        	throw err;
	        else {
	        	//
				body.dt = dataformatter.unixtoDate(body.dt);
				body.moisture *= 100;
				body = dataformatter.kelvinToCelsius(body, 'Soil');

	        	res.send(body);
	        }
	    });
	}
}

//!!!!! havent tested yet because of this is a premium feature !!!!!//
exports.getHistoricalSoilData = function(req, res){
	var polygon_id = req.query.polyid;
	var temp_date = dataformatter.processChangedDate(req.query.start, req.query.end);
	var start_date = dataformatter.dateToUnix(temp_date.start), end_date = dataformatter.dateToUnix(temp_date.end);

	var url = 'http://api.agromonitoring.com/agro/1.0/soil/history?start='+start_date+'&end='+end_date+'&polyid='+polygon_id+'&appid='+key;

    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	body = JSON.parse(body);

			for (var i = 0; i < body.length; i++) {
        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
        	}

        	res.send(body);
        }
    });
}


//!!!!! havent tested yet because of this is a premium feature !!!!!//
//**** Temperature and Precipitation ****//
exports.getAccumulatedTemperature = function(req, res){
	var polygon_id = req.query.polyid;
	var temp_date = dataformatter.processChangedDate(req.query.start, req.query.end);
	var start_date = dataformatter.dateToUnix(temp_date.start), end_date = dataformatter.dateToUnix(temp_date.end);

	var lat = req.query.lat, lon = req.query.lon, threshold = req.query.threshold;

	lat = temp_lat;
	lon = temp_lon;

	var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?accumulated_temperature?lat='+lat+'&lon='+lon+'&threshold='+threshold+'&start='+start_date+'&end='+end_date+'&appid='+key;

    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	body = JSON.parse(body);

			for (var i = 0; i < body.length; i++) {
        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
        	}

        	res.send(body);
        }
    });
}

exports.getAccumulatedPrecipitation = function(req, res){
	var polygon_id = req.query.polyid;
	var temp_date = dataformatter.processChangedDate(req.query.start, req.query.end);
	var start_date = dataformatter.dateToUnix(temp_date.start), end_date = dataformatter.dateToUnix(temp_date.end);

	var lat = req.query.lat, lon = req.query.lon, threshold = req.query.threshold;

	lat = temp_lat;
	lon = temp_lon;

	var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?accumulated_precipitation?lat='+lat+'&lon='+lon+'&threshold='+threshold+'&start='+start_date+'&end='+end_date+'&appid='+key;

    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	body = JSON.parse(body);

			for (var i = 0; i < body.length; i++) {
        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
        	}

        	res.send(body);
        }
    });
}

//**** Ultra Violet Index ****//
exports.getCurrentUVI = function(req, res){
	var polygon_id = req.query.polyid;
	var url = 'http://api.agromonitoring.com/agro/1.0/uvi?polyid='+polygon_id+'&appid='+key;

    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
			body.dt = dataformatter.unixtoDate(body.dt);


        	res.send(body);
        }
    });
}

exports.getHistoricalUVI = function(req, res){
	var polygon_id = req.query.polyid;
	var temp_date = dataformatter.processChangedDate(req.query.start, req.query.end);
	var start_date = dataformatter.dateToUnix(temp_date.start), end_date = dataformatter.dateToUnix(temp_date.end);

	var url = 'http://api.agromonitoring.com/agro/1.0/uvi/history?polyid='+polygon_id+'&appid='+key+'&start='+start_date+'&end='+end_date;

    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	body = JSON.parse(body);

			for (var i = 0; i < body.length; i++) {
        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
        	}

        	res.send(body);
        }
    });
}

//**** Weather API ****//
exports.getCurrentWeather = function(req, res){
	var polygon_id = req.query.polyid;
	var lat = req.query.lat, lon = req.query.lon;
	
	lat = temp_lat;
	lon = temp_lon;

	var url = 'https://api.agromonitoring.com/agro/1.0/weather?lat='+lat+'&lon='+lon+'&appid='+key;

    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	body.dt = dataformatter.unixtoDate(body.dt);
        	body = dataformatter.kelvinToCelsius(body, 'Weather');

        	res.send(body);
        }
    });
}

exports.getHistoricalWeather = function(req, res){
	var temp_date = dataformatter.processChangedDate(req.query.start, req.query.end);
	var start_date = dataformatter.dateToUnix(temp_date.start), end_date = dataformatter.dateToUnix(temp_date.end);
	var lat = req.query.lat, lon = req.query.lon;
	
	lat = temp_lat;
	lon = temp_lon;

	var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?lat='+lat+'&lon='+lon+'&start='+start_date+'&end='+end_date+'&appid='+key;

    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	for (var i = 0; i < body.length; i++) {
        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);
        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
        	}


        	res.send({ result: body, success: true });
        }
    });
    //res.send({});
}

// 
exports.getForecastWeather = function(req, res) {
	var temp_date = dataformatter.processChangedDate(req.query.start, req.query.end);
	var start_date = dataformatter.dateToUnix(temp_date.start), end_date = dataformatter.dateToUnix(temp_date.end);
	
	var lat = req.query.lat, lon = req.query.lon;
	lat = temp_lat;
	lon = temp_lon;


	var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?lat='+lat+'&lon='+lon+'&start='+start_date+'&end='+end_date+'&appid='+key;

    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	for (var i = 0; i < body.length; i++) {
        		body[i].dt = dataformatter.unixtoDate(body[i].dt);
        	}

        	//***** Call Agro API for succeeding 5 day forecast

        	var forecast_url = 'https://api.agromonitoring.com/agro/1.0/weather/forecast?lat='+lat+'&lon='+lon+'&appid='+key;
        	// //
		    request(forecast_url, { json: true }, function(err, forecast_response, forecast_body) {
		        if (err)
		        	throw err;
		        else {
		        	var hour_arr = [];

		        	for (var i = 0; i < forecast_body.length; i++) {
		        		forecast_body[i].dt = dataformatter.unixtoDate((forecast_body[i].dt));
		        		hour_arr.push(dataformatter.formatDate(forecast_body[i].dt, 'HH:m'))
		        	}
		        		// //
        				////
		        	//***** Get unique hour timestamps from forecast and filter data
		        	hour_arr = [...new Map(hour_arr.map(item =>
	  					[item, item])).values()];

		        	body = dataformatter.smoothHourlyData(body, hour_arr);
		        	forecast_body = dataformatter.smoothHourlyData(forecast_body, hour_arr);

		        	////
		        	//***** Build on Agro API and use ANN to forecast remaining 9 days
		        	var result = analyzer.weatherForecast14D
		        	(dataformatter.prepareData(body, 1), dataformatter.prepareData(forecast_body, 1), hour_arr.length+1);
		        	var keys = ['min_temp', 'max_temp', 'humidity', 'pressure', 'rainfall', 'id'];

		        	result.forecast = 
		        	dataformatter.convertForecastWeather(dataformatter.arrayToObject(result.forecast, keys));

		        	forecast = dataformatter.mapAndFormatForecastResult(result, hour_arr);

		        	res.send({ forecast: forecast });
		        }
		    });
        }
    });
}

//Polygon Queries
exports.createPolygon = function(req, res) {
	var data = ({
		name: req.body.farm_name,
		geo_json: {
			type:"Feature",
			properties:{},
			geometry:{
				type:"Polygon",
				coordinates: typeof req.body.coordinates == 'undefined' || req.body.coordinates == null ? 0 : 
				dataformatter.coordinateToFloat(req.body.coordinates)// dataformatter.parseCoordinate(req.body.coordinates.split(',')) 
			}}
		});

	var options = {
		url: 'http://api.agromonitoring.com/agro/1.0/polygons?appid='+key,
		method: 'POST',
		headers: {
			'Content-type':'application/json'
		},
		body: JSON.stringify(data)
	}

	request(options, function(err, response, body) {
		if (err)
			throw err;
		else {
			body = JSON.parse(body);
			var success = true;

			if (body.name == 'UnprocessableEntityError') {
				success = false;
			}

			res.send(success);
		}
	})
}

exports.getPolygonInfo = function(req, res){
	var polygon_id = req.query.polyid;
	var url = 'http://api.agromonitoring.com/agro/1.0/polygons/'+polygon_id+'?appid='+key;
    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	//

        	html_data["notifs"] = req.notifs;
			res.render('home', {});
        }
    });
}

exports.getAllPolygons = function(req, res){
	var url = 'http://api.agromonitoring.com/agro/1.0/polygons?appid='+key;
    request(url, { json: true }, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	////

        	res.send(body);
        }
    });
}

exports.updatePolygonName = function(req, res){
	var polygon_id = req.query.polyid;

	var data = {
		geo_json: {
			something: "something",
		},
		name: req.query.name
	};

	var options = {
		url: 'http://api.agromonitoring.com/agro/1.0/polygons/'+polygon_id+'?appid='+key,
		method: 'PUT',
		headers: {
			'Content-type':'application/json'
		},
		body: JSON.stringify(data)
	}

    request(options, function(err, response, body) {
        if (err)
        	throw err;
        else {
        	//

        	html_data["notifs"] = req.notifs;
			res.render('home', {});
        }
    });
}

exports.removePolygon = function(req, res){
	var polygon_id = req.query.polyid;
	
	var options = {
		url: 'http://api.agromonitoring.com/agro/1.0/polygons/'+polygon_id+'?appid='+key,
		method: 'DELETE',
		followRedirect: false,
		followAllRedirects: false
	}

    request(options, function(err, response, body) {
        if (err)
        	throw err;
        else {

        	res.send({ success: true });
        }
    });

}