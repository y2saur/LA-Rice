const dataformatter = require('../public/js/dataformatter.js');
const similarity = require('../public/js/similarity.js');
const analyzer = require('../public/js/analyzer.js');
const js = require('../public/js/session.js');
const weatherForecastModel = require('../models/weatherForecastModel.js');
const farmModel = require('../models/farmModel.js');
const nutrientModel = require('../models/nutrientModel.js');
const cropCalendarModel = require('../models/cropCalendarModel.js');
const materialModel = require('../models/materialModel.js');
const workOrderModel = require('../models/workOrderModel.js');
const pestdiseaseModel = require('../models/pestdiseaseModel.js');
const notifModel = require('../models/notificationModel.js');
var request = require('request');
var solver = require('javascript-lp-solver');
const e = require('connect-flash');


var key = '2ae628c919fc214a28144f699e998c0f';

//var key = '1d1823be63c5827788f9c450fb70c595'; 

exports.getPestDiseaseManagement = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease', req.session);
	pestdiseaseModel.getAllPests(function(err,pests){
		if(err){
			throw err;
		}
		else{
			pestdiseaseModel.getAllDiseases(function(err,diseases){
				if(err){
					throw err;
				}
				else{
					pestdiseaseModel.getAllSymptoms(function(err, symptoms){
						if(err){
							throw err;
						}
						else{
							//
							if(symptoms.length == 0){
								//
							}
							else{
								
								var lat = 13.073091;
								var lon = 121.388563;
								new Date(req.session.cur_date);

								var d1 = new Date(req.session.cur_date);
								var d2 = new Date(req.session.cur_date);
								d2.setDate(d2.getDate() - 2);
								d1.setDate(d1.getDate() - 1);

								var start_date = dataformatter.dateToUnix(d2);
								var end_date = dataformatter.dateToUnix(d1);
								
								var x = new Date(req.session.cur_date);
							
							
								var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?lat='+lat+'&lon='+lon+'&start='+start_date+'&end='+end_date+'&appid='+key;

								request(url, { json: true }, function(err, response, body) {
									if (err)
										throw err;
									else {
										//
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
												//
												
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
												
												//
												var daily_ctr = 0;
												var dmin_temp = 0, dmax_temp = 0, dhumidity = 0, dpressure = 0, drainfall = 0;
												for(var i = 0; i < forecast.length; i++){

													var ctr = 0;
													var min_temp = 0, max_temp = 0, humidity = 0, pressure = 0, rainfall = 0;
													for(var y = 0;y < forecast[i].data.length; y++){
														min_temp = min_temp + forecast[i].data[y].min_temp;
														max_temp = max_temp + forecast[i].data[y].max_temp;
														humidity = humidity + forecast[i].data[y].humidity;
														pressure = pressure + forecast[i].data[y].pressure;
														rainfall = rainfall + forecast[i].data[y].rainfall;

														ctr++;
													}
													min_temp = min_temp / ctr;
													max_temp = max_temp / ctr;
													humidity = humidity / ctr;
													pressure = pressure / ctr;
													rainfall = rainfall / ctr;

													dmin_temp = dmin_temp + min_temp;
													dmax_temp = dmax_temp + max_temp;
													dhumidity = dhumidity + humidity;
													dpressure = dpressure + pressure;
													drainfall = drainfall + rainfall;

													daily_ctr++;
												}

												var weather = {
													min_temp : ((dmin_temp / ctr) - 32) / 1.8,
													max_temp : ((dmax_temp / ctr) - 32) / 1.8,
													humidity : dhumidity / ctr,
													precipitation : drainfall / ctr
												}


												var season = {
													season_temp : 35,
													season_humidity : 65
												}

												var stage = {
													stage_name : "Reproductive"
												}


												pestdiseaseModel.getPestPossibilities(weather, season, null, stage,function(err, possible_pests){
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
														
														request("http://api.agromonitoring.com/agro/1.0/image/search?start=1500336000&end=1508976000&polyid=61765325a81b7645c5687533&appid=f7ba528791357b8aad084ea3fcb33b03", { json: true }, function(err, response, body2) {
															
														});

														weather = {
															min_temp : 29,
															max_temp : 29,
															humidity : 70,
															precipitation : 30
														}

														pestdiseaseModel.getDiseaseProbability(weather, season, null, stage, function(err, probability){
														});

														// html_data["img"] = body2[0].image.truecolor;
														html_data["statements"] = statements;
														html_data["pos_pests"] = possible_pests;
														html_data["weather"] = weather;
														html_data["main"] = forecast_body[0].main;
														html_data["pests"] = pests;
														html_data["diseases"] = diseases;
														html_data["symptoms"] = symptoms;
														
														html_data["notifs"] = req.notifs;
														res.render('pest_disease', html_data);
														
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


exports.getProbability = function(req, res){
	var html_data = {};
	var lat = 13.073091;
	var lon = 121.388563;
	new Date(req.session.cur_date);

	var d1 = new Date(req.session.cur_date);
	var d2 = new Date(req.session.cur_date);
	d2.setDate(d2.getDate() - 2);
	d1.setDate(d1.getDate() - 1);

	var start_date = dataformatter.dateToUnix(d2);
	var end_date = dataformatter.dateToUnix(d1);
	
	var x = new Date(req.session.cur_date);


	var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?lat='+lat+'&lon='+lon+'&start='+start_date+'&end='+end_date+'&appid='+key;

	request(url, { json: true }, function(err, response, body) {
		if (err)
			throw err;
		else {
			//
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
					//
					
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
					
					//
					var daily_ctr = 0;
					var dmin_temp = 0, dmax_temp = 0, dhumidity = 0, dpressure = 0, drainfall = 0;
					for(var i = 0; i < forecast.length; i++){
						//

						var ctr = 0;
						var min_temp = 0, max_temp = 0, humidity = 0, pressure = 0, rainfall = 0;
						for(var y = 0;y < forecast[i].data.length; y++){
							min_temp = min_temp + forecast[i].data[y].min_temp;
							max_temp = max_temp + forecast[i].data[y].max_temp;
							humidity = humidity + forecast[i].data[y].humidity;
							pressure = pressure + forecast[i].data[y].pressure;
							rainfall = rainfall + forecast[i].data[y].rainfall;

							ctr++;
						}
						min_temp = min_temp / ctr;
						max_temp = max_temp / ctr;
						humidity = humidity / ctr;
						pressure = pressure / ctr;
						rainfall = rainfall / ctr;

						dmin_temp = dmin_temp + min_temp;
						dmax_temp = dmax_temp + max_temp;
						dhumidity = dhumidity + humidity;
						dpressure = dpressure + pressure;
						drainfall = drainfall + rainfall;

						daily_ctr++;
					}

					var weather = {
						min_temp : ((dmin_temp / ctr) - 32) / 1.8,
						max_temp : ((dmax_temp / ctr) - 32) / 1.8,
						humidity : dhumidity / ctr,
						precipitation : drainfall / ctr
					}


					var season = {
						season_temp : 35,
						season_humidity : 65
					}

					var stage = {
						stage_name : "Reproductive"
					}


					pestdiseaseModel.getPestPossibilities(weather, season, null, stage,function(err, possible_pests){
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

							weather = {
								min_temp : 29,
								max_temp : 29,
								humidity : 70,
								precipitation : 30
							}

							pestdiseaseModel.getPestProbabilityPercentage(weather, season, null, stage, function(err, probability){
								html_data["possible_pest"] = probability;
								html_data["notifs"] = req.notifs;
								res.render('pest_disease3', html_data);
							});
						}
					});
				}
			});
		}
	});
}

exports.getPestFactors = function(req,res){
	var html_data = {};
	js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease', req.session);

	var type = req.params.type;
	var id = req.params.name;

	if(type == "Pest"){
		pestdiseaseModel.getPestFactors(id, function(err, factors){
			if(err){
				throw err;
			}
			else{
				pestdiseaseModel.getPestDetails({pest_id : id}, function(err, details){
					if(err){
						throw err;
					}
					else{
						if(details.length == 0){
	
						}
						else{
							pestdiseaseModel.getPestSymptoms(id, function(err, symptoms){
								if(err){
									throw err;
								}
								else{
									if(details.length == 0){
				
									}
									else{
										//
										//
										html_data['pest_name'] =  details[0].pest_name;
										html_data["symptoms"] = symptoms;
										html_data["factors"] = factors;
										
										html_data["notifs"] = req.notifs;
										res.render('pest_disease2', html_data);
									}
								}
							});
						}
					}
				});
			}
		});
	}
	else{
		pestdiseaseModel.getDiseaseFactors(id, function(err, factors){
			if(err){
				throw err;
			}
			else{
				pestdiseaseModel.getDiseaseDetails({disease_id : id}, function(err, details){
					if(err){
						throw err;
					}
					else{
						if(details.length == 0){
	
						}
						else{
							html_data['pest_name'] =  details[0].disease_name;
							html_data["factors"] = factors;
							
							html_data["notifs"] = req.notifs;
							res.render('pest_disease2', html_data);
						}
					}
				});
			}
		});
	}
	
}

exports.addPest = function(req,res){
	var pest_data = {
		pest_name: req.body.pest_name,
		pest_desc : req.body.pest_desc
	};

	var new_symptom = {
		symptom_name : req.body.symptom_name,
		symptom_desc : req.body.symptom_desc
	}
	var pest_name = req.body.pest_name;
	var symptoms = req.body.symptom;
	symptoms.shift();

	//check if already exists
	pestdiseaseModel.getAllPests(function(err, pests){
		if(err){
			throw err;
		}
		else{
			if(pests.length == 0){

			}
			else{
				var possible_match;
				var highest_match = 0;
				for(var i = 0; i < pests.length; i++){
					if(similarity.similarity(pest_name.toLowerCase(),pests[i].pest_name.toLowerCase()) && similarity.levenshtein(pest_name.toLowerCase(),pests[i].pest_name.toLowerCase()) > 0.5){
					}
					else if(similarity.similarity(pest_name.toLowerCase(),pests[i].pest_name.toLowerCase()) && similarity.levenshtein(pest_name.toLowerCase(),pests[i].pest_name.toLowerCase()) > 0.15 || similarity.levenshtein(pest_name.toLowerCase(),pests[i].pest_name.toLowerCase()) > 0.5){
						//Ask user for similarity
						if(similarity.levenshtein(pest_name.toLowerCase(),pests[i].pest_name.toLowerCase()) > highest_match){
							highest_match = similarity.levenshtein(pest_name.toLowerCase(),pests[i].pest_name.toLowerCase());
							possible_match = i;
						}
					}
				}
				if(possible_match != null){
					//asks if same
				}
				else{
					pestdiseaseModel.addPest(pest_data, function(err, result){
					});
					pestdiseaseModel.getLastInserted("Pest", function(err, last){
						var last = last[0].last;
						//Add symptoms to pest
						for(var i = 0; i < symptoms.length; i ++){
							pestdiseaseModel.addPestDiseaseSymptom("Pest", last, symptoms[i], function(err, next){});
						}
						//Add new symptom
						pestdiseaseModel.addSymptom(new_symptom, function(err, success){
						});
						pestdiseaseModel.getLast(function(err, last_insert){
							var last_insert = last_insert[0].last;
							pestdiseaseModel.addPestDiseaseSymptom("Pest", last, last_insert, function(err, next){});
						});
					});
					
					
				}
			}
		}
	});
	html_data["notifs"] = req.notifs;
	res.render('pest_disease');
}


exports.addDisease = function(req,res){
	var disease_data = {
		disease_name : req.body.disease_name,
		disease_desc : req.body.disease_desc
	};

	var new_symptom = {
		symptom_name : req.body.symptom_name,
		symptom_desc : req.body.symptom_desc
	}
	var disease_name = req.body.disease_name;
	var symptoms = req.body.symptom;
	symptoms.shift();
	//check if already exists
	pestdiseaseModel.getAllDiseases(function(err, diseases){
		if(err){
			throw err;
		}
		else{
			if(diseases.length == 0){

			}
			else{
				var possible_match;
				var highest_match = 0;
				for(var i = 0; i < diseases.length; i++){
					if(similarity.similarity(disease_name.toLowerCase(),diseases[i].disease_name.toLowerCase()) && similarity.levenshtein(disease_name.toLowerCase(),diseases[i].disease_name.toLowerCase()) > 0.75){
						break;
					}
					else if(similarity.similarity(disease_name.toLowerCase(),diseases[i].disease_name.toLowerCase()) && similarity.levenshtein(disease_name.toLowerCase(),diseases[i].disease_name.toLowerCase()) > 0.15 || similarity.levenshtein(disease_name.toLowerCase(),diseases[i].disease_name.toLowerCase()) > 0.5){
						//Ask user for similarity
						if(similarity.levenshtein(disease_name.toLowerCase(),diseases[i].disease_name.toLowerCase()) > highest_match){
							highest_match = similarity.levenshtein(disease_name.toLowerCase(),diseases[i].disease_name.toLowerCase());
							possible_match = i;
						}
					}
				}
				if(possible_match != null){
					//asks if same
				}
				else{
					pestdiseaseModel.addDisease(disease_data, function(err, result){
					});
					pestdiseaseModel.getLastInserted("Disease", function(err, last){
						var last = last[0].last;
						//Add symptoms
						for(var i = 0; i < symptoms.length; i++){
							pestdiseaseModel.addPestDiseaseSymptom("Disease", last, symptoms[i], function(err, next){});
						}
						//Add new symptom
						pestdiseaseModel.addSymptom(new_symptom, function(err, success){
						});
						pestdiseaseModel.getLast(function(err, last_insert){
							var last_insert = last_insert[0].last;
							pestdiseaseModel.addPestDiseaseSymptom("Disease", last, last_insert, function(err, next){});
						});
					});
				}
			}
		}
	});
	html_data["notifs"] = req.notifs;
	res.render('pest_disease');
}

//********** Nutrient Management Start *************//

exports.addSoilRecord = function(req, res) {
	var query = { 
		farm_id: req.body.farm_id,
		pH_lvl: req.body.ph_test, 
		p_lvl: req.body.p_lvl,
		k_lvl: req.body.k_lvl,
		n_lvl: req.body.n_lvl,
		date_taken: req.body.date_taken,
		calendar_id: req.body.calendar_id
	 };
	 var farm_query = {
	 	where: { key: 't1.farm_id', value: req.body.farm_id },
	 	group: 'farm_id'
	 };

	farmModel.getFarmData(farm_query, function(err, farm) {
		if (err)
			throw err;
		else {
			nutrientModel.addSoilRecord(query, function(err, record) {
				if (err)
					throw err;
				else {
					let redirect = '/nutrient_management/'+farm[0].farm_name;
					res.send(redirect);
				}
			});		
		}
	});
}

function recommendFertilizerPlan(obj, materials) {
	var model;
	var multiplier = 1.5;
	var constraints = {
		N: { min: obj.n_lvl },
		P: { min: obj.p_lvl, max: obj.p_lvl*1.1 },
		K: { min: obj.k_lvl },
	};
	//
	var temp_obj = {};
	var variables = {};
	for (var i = 0; i < materials.length; i++) {
		variables[materials[i].fertilizer_name] = {
			N: materials[i].N,
			P: materials[i].P,
			K: materials[i].K,
			price: materials[i].price
		};
	}
	model = {
		optimize: '',
		opType: 'min',
		constraints,
		variables
	};

	temp_obj['recommendation'] = solver.Solve(model);

	for (var prop in obj.recommendation) {
		if (parseFloat(obj.recommendation[prop])) {
			temp_obj.recommendation[prop] = Math.round(temp_obj.recommendation[prop] * 100) / 100;
			temp_obj.recommendation[prop] = temp_obj.recommendation[prop] < 0 ? 0 : temp_obj.recommendation[prop];
		}
	}

	return temp_obj.recommendation;
}

exports.ajaxUpdateNutrientPlan = function(req, res) {
	var update = req.body.update;
	var filter = req.body.filter;

	nutrientModel.updateNutrientPlan(update, filter, function(err, plan_record) {
		if (err)
			throw err;
		else {
			res.send(plan_record);
		}
	});
}


exports.ajaxCreateNutrientPlan = function(req, res) {
	var query = req.body;
	nutrientModel.createNutrientPlan(query, function(err, plan_record) {
		if (err)
			throw err;
		else {
			res.send(plan_record);
		}
	});
}

exports.ajaxGetNutrientDetails = function(req, res) {
	var query = req.query;
	nutrientModel.getNutrientDetails(query, function(err, details) {
		if (err)
			throw err;
		else {
			res.send(details);
		}
	});
}

exports.ajaxGetNutrientPlan = function(req, res) {
	var query = req.query;
	nutrientModel.getNutrientPlanDetails(query, function(err, plan) {
		if (err)
			throw err;
		else {
			res.send(plan);
		}
	});
}

exports.ajaxCreateNutrientItem = function(req, res) {
	var query = req.body;
	nutrientModel.createNutrientItem(query, function(err, plan_record) {
		if (err)
			throw err;
		else {
			res.send(plan_record);
		}
	});
}

exports.ajaxUpdateSoilRecord = function(req, res) {
	nutrientModel.updateSoilRecord(req.body.update, req.body.filter, function(err, plan_record) {
		if (err)
			throw err;
		else {
			res.send(plan_record);
		}
	});
}

exports.ajaxGetNutrientPlanItems = function(req, res) {
	var query = { };
	if (req.query.hasOwnProperty('calendar_id'))
		query['frp.calendar_id'] = req.query.calendar_id;
	else if (req.query.hasOwnProperty('frp_id')) {
		query['fr_plan_id'] = req.query.frp_id;
	}
	else if (req.query.hasOwnProperty('farm_id')) {
		query['farm_id'] = req.query.farm_id;
	}

	nutrientModel.getNutrientPlanItems(query, function(err, items) {
		if (err)
			throw err;
		else {
			res.send(items);
		}
	});
}

exports.ajaxGetSoilRecord = function(req, res) {
	var query = { farm_id: req.query.farm_id };

	nutrientModel.getSoilRecord(query, function(err, soil_record) {
		if (err)
			throw err;
		else {
			res.send(soil_record);
		}
	});
}

exports.prepareFRPlan = function(req, res) {
	var query = { farm_id: req.body.farm_id };

	nutrientModel.getMostActiveFRPlan(query, function(err, active_plan) {
		if (err)
			throw err;
		else {
			if (active_plan.length != 0) {
				nutrientModel.deleteNutrientItems({ fr_plan_id: active_plan[0].fr_plan_id }, function(deleted_items) {
					if (err)
						throw err;
					else {
						res.send(deleted_items);
					}
				});
			}
			else {
				var create_plan = {
					calendar_id: null,
					last_updated: dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD'),
					farm_id: req.body.farm_id
				}
				nutrientModel.createNutrientPlan(create_plan, function(new_fr_plan) {
					if (err)
						throw err;
					else {
						res.send(new_fr_plan);
					}
				});
			}
		}
	});
}

exports.ajaxGetDetailedNutrientMgt = function(req, res) {
	var query = {};

	if (req.query.farm_name == null && req.query.farm_name == undefined) {
		query['farm_id'] = req.query.farm_id;
	}
	else if (req.query.farm_id == null && req.query.farm_id == undefined) {
		query['farm_name'] = req.query.farm_name;
	}

	var html_data = {};
	nutrientModel.getSoilRecord(query, function(err, result) {
		if (err)
			throw err;
		else {
			if (result.length != 0) {
				result[0]['default_soil'] = false;
			}
			else {
				result = [{}];
			}
			materialModel.getMaterials(req.query.type, req.query.filter, function(err, materials) {
		        if (err)
		            throw err;
		        else {
		        	var type;
		        	var farm_id;
		        	materialModel.readResourcesUsed(req.query.type, req.query.filter, req.query.calendar_id, function(err, applied) {
		        		if (err)
		        			throw err;
		        		else {
		        			cropCalendarModel.getCurrentCropCalendar(query, function(err, crop_calendar) {
		        				if (err)
		        					throw err;
		        				else {
		        					if (result.length != 0)
		        						var result_date_diff = dataformatter.dateDiff(new Date(result[0].date_taken), new Date(req.session.cur_date))
		        					
		        					if (result.length == 0 || result[0].soil_quality_id == null || result_date_diff > 364) {
				        				//Serves as default soil data if soil test has never been done
				        				var ph_lvl = 'N/A', n_lvl = 7.75, p_lvl = 4.0, k_lvl = 8.75;
				        				result[0].pH_lvl = ph_lvl;
				        				result[0].n_lvl = n_lvl;
				        				result[0].p_lvl = p_lvl;
				        				result[0].k_lvl = k_lvl;
				        				result[0]['default_soil'] = true;
									}
									//
									//
		        					result = dataformatter.processNPKValues(result, result[0].farm_area, applied, '', applied);
						            result['recommendation'] = recommendFertilizerPlan(result, materials);
						            result['calendar_id'] = crop_calendar.calendar_id;

									res.send(result);
		        				}
		        			});     	
		        		}
		        	});
		        }
		    });
		}
	});
}

function processInventory(arr, recommendation, applied) {
	var row_arr = [];
	var temp_obj = {};
	var qty, recommendation_amt, applied_fertilizer, deficiency;
	var mat;
	//
	//
	//Fertilizer - Current Stock - Recommendation - Applied - Deficiency
	for (var i = 0; i < arr.length; i++) {
		mat = applied.filter(ele => ele.fertilizer_name == arr[i].fertilizer_name)[0];

		if (recommendation.hasOwnProperty(arr[i].fertilizer_name)) {
			recommendation_amt = recommendation[arr[i].fertilizer_name];
		}
		else {
			recommendation_amt = 'N/A';
		}


		qty = arr[i].current_amount;
		applied_fertilizer = mat.resources_used;

		deficiency = recommendation_amt != 'N/A' ? recommendation_amt - applied_fertilizer : 'N/A';
		deficiency = deficiency != 'N/A' ? Math.round(deficiency * 100) / 100 : 'N/A';

		if (deficiency != 'N/A') {
			deficiency = deficiency < 0 ? 'N/A' : deficiency;
		}

		temp_obj = {
			fertilizer: arr[i].fertilizer_name,
			desc: '('+arr[i].N+'-'+arr[i].P+'-'+arr[i].K+')',
			qty: qty,
			recommendation: recommendation_amt,
			applied: applied_fertilizer,
			deficiency: deficiency
		}

		row_arr.push(temp_obj);
	}

	return row_arr;
}

exports.detailedNutrientManagement = function(req, res) {
	var query = { farm_name: req.params.farm_name };
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'monitor_farms', req.session);

	var summary = '';
	cropCalendarModel.readCropCalendar({ calendar_id: req.params.calendar_id }, function(err, calendar_details) {
		if (err)
			throw err;
		else {
			nutrientModel.getSoilRecord(query, function(err, result) {
				if (err) {
					throw err;
				}
				else {
					if (result.length != 0) {
						result[0]['default_soil'] = false;
					}
					else {
						result = [{}];
					}
					farmModel.getAllFarms(function(err, farm_list) {
						if (err)
							throw err;
						else {
							var farm_id = farm_list.filter(e => e.farm_name == req.params.farm_name)[0].farm_id;
							farmModel.getForecastedYieldRecord({ calendar_id: [req.params.calendar_id] }, function(err, forecast) {
								if (err)
									throw err;
								else {
									materialModel.readResourcesUsed('Fertilizer', query.farm_name, req.params.calendar_id, function(err, applied) {
						        		if (err)
						        			throw err;
						        		else {
						        			if (result.length == 0 || result[0].soil_quality_id == null) {
						        				//Serves as default soil data if soil test has never been done
						        				var ph_lvl = 'N/A', n_lvl = 7.75, p_lvl = 4.0, k_lvl = 8.75;
						        				result[0].pH_lvl = ph_lvl;
						        				result[0].n_lvl = n_lvl;
						        				result[0].p_lvl = p_lvl;
						        				result[0].k_lvl = k_lvl;
						        				result[0]['default_soil'] = true;

						        				summary += 'Default soil nutrient data is used in the calculations as there are no applicable soil test records. ';
											}
											else {
												summary += 'Soil test record taken last '+' is used for the nutrient calculations shown. ';
											}
											nutrientModel.getNutrientPlanDetails({ calendar_id: req.params.calendar_id }, function(err, frp) {
												if (err)
													throw err;
												else {
													//
													nutrientModel.getNutrientPlanItems({ fr_plan_id: frp[0].fr_plan_id }, function(err, fr_items) {
														if (err)
															throw err;
														else {
															workOrderModel.getGroupedWO('Fertilizer Application' , req.params.calendar_id, function(err, wo_list) {
																if (err)
																	throw err;
																else {
																	var range;
																	for (var i = 0; i < wo_list.length; i++) {
																		wo_list[i].followed = wo_list[i].followed == 'Followed' ? 1 : 0;
																		wo_list[i].date_due = dataformatter.formatDate(new Date(wo_list[i].date_due), 'YYYY-MM-DD');
																		if (wo_list[i].target_application_date != null)
																		wo_list[i].target_application_date = dataformatter.formatDate(new Date(wo_list[i].target_application_date), 'YYYY-MM-DD');
																		wo_list[i].target_date_end = dataformatter.formatDate(new Date(wo_list[i].target_date_end), 'YYYY-MM-DD');
																		wo_list[i].date_completed = dataformatter.formatDate(new Date(wo_list[i].date_completed), 'YYYY-MM-DD');
																	}
																	materialModel.getAllMaterials('Fertilizer', farm_id, function(err, material_list) {
																		if (err)
																			throw err;
																		else {	
																			for (var i = 0; i < fr_items.length; i++) {
																				fr_items[i].last_updated = dataformatter.formatDate(new Date(fr_items[i].last_updated), 'YYYY-MM-DD');
																				fr_items[i].target_application_date = dataformatter.formatDate(new Date(fr_items[i].target_application_date), 'YYYY-MM-DD');
																			}
																			
																			if (result)
																			//
																			//
																			
																			html_data['detailed_data'] = dataformatter.processNPKValues(result, result[0].farm_area, applied, summary, wo_list);
																			if (forecast != 0) {
																				html_data['yield_forecast'] = forecast[0].forecast;
																			}
																			fr_items = fr_items.filter(e => e.isCreated == 0);
																			//
																			html_data['recommendation'] = recommendFertilizerPlan(result[0], material_list);
																			html_data['detailed_data']['calendar_id'] = req.params.calendar_id;
																			html_data['fr_items'] = fr_items;
																			html_data['wo_list'] = wo_list;
																			html_data['inventory'] = processInventory(material_list, html_data.recommendation, applied);
																			html_data['calendar_details'] = calendar_details[0];
																			html_data['farm_id'] = farm_id;
																			//
																			html_data["notifs"] = req.notifs;
																			res.render('nutrient_mgt_detailed', html_data);
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
								}
							});
									
						}
					});
				}
			});
		}
	});		
}

//********** Nutrient Management End *************//

exports.uploadForecastResult = function(req, res) {
	var query = req.body.data;
	weatherForecastModel.saveForecastResults(query, function(err, result) {
		if (err)
			throw err;
		else {
			res.send(result);
		}
	});
}

exports.getWeatherForecast = function(req, res) {
	weatherForecastModel.readWeatherForecast(function(err, result) {
		if (err)
			throw err;
		else {
			res.send(result);
		}
	});
}

exports.clearWeatherForecastRecords = function(req, res) {
	weatherForecastModel.clearRecords(function(err, result) {
		if (err)
			throw err;
		else {
			res.send(result);
		}
	});
}

//USED FUNCTIONS -----------------------------------------------------------

exports.getFarmResources = function(req, res){
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'farms', req.session);

	var farm_id = req.query.farm_id;
	var type = "Seed";


	materialModel.getFarmMaterialsSpecific({farm_id : farm_id}, {item_type : "Seed"}, function(err, seeds){
		if(err)
			throw err;
		else{
			if(seeds.length == 0){

			}
			else{
				//Adds blank rows
				var ctr = seeds.length;
				if(seeds == null)
					ctr = 5;
				while(ctr < 5){
					seeds.push({blank : true});
					ctr++;
				};
				html_data["seed"] = seeds;
			}

			materialModel.getPurchasesPerFarm(null, {farm_id : farm_id}, {status : "Pending"}, function(err, pending){
				if(err)
					throw err;
				else{
					html_data["pending"] = pending;
				}

				materialModel.getPurchasesPerFarm(null, {farm_id : farm_id}, {status : "Processing"}, function(err, processing){
					if(err)
						throw err;
					else{
						html_data["processing"] = processing;
					}
					
					materialModel.getPurchasesPerFarm(type, {farm_id : farm_id}, null, function(err, orders){
						if(err)
							throw err;
						else{
							var ctr2 = orders.length;
							if(orders == null)
								ctr2 = 5;
							while(ctr2 < 5){
								orders.push({blank : true});
								ctr2++;
							};
							html_data["orders"] = orders;
						}
						html_data["farm_id"] = farm_id;
						html_data["notifs"] = req.notifs;
						res.render("farm_resources", html_data);
					});
				});
			});
		}
	});
}

exports.ajaxGetResources = function(req,res){
	var html_data = {};
	var farm_id = req.query.farm_id;
	var type = req.query.type;

	//
	//
	var blanks = [];
	materialModel.getFarmMaterialsSpecific({farm_id : farm_id}, {item_type : type}, function(err, materials){
		if(err)
			throw err;
		else{
			if(materials.length == 0){

			}
			else{
				//Adds blank rows
				var ctr = materials.length;
				if(materials == null)
					ctr = 5;
				while(ctr < 5){
					blanks.push({});
					ctr++;
				};
				html_data["items"] = materials;
				html_data["blanks"] = blanks;

				
			}
			res.send(html_data);
		}
	});
	
}


exports.getFarmPestDiseases = function(req, res){
	var html_data = {};
	var farmtypes = [];
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'monitor_farms', req.session);
	
	if(req.query.farm_id != null){
		var farm_id = {
			farm_id : req.query.farm_id
		};
	}
	else{
		var farm_id = {
			farm_id : 54
		};
	}
	//GETS FARM NAME
	farmModel.filteredFarmDetails(farm_id, function(err, farm_details){
		if(err)
			throw err;
		else{
			//GETS CENTER
			var url = 'http://api.agromonitoring.com/agro/1.0/polygons?appid='+key;
			request(url, { json: true }, function(err, response, body) {
				if (err)
					throw err;
				else {
					var i;
					var lat = 13.073091;
					var lon = 121.388563;
					//Looks for center
					farmtypes.push(farm_details[0].land_type);
					for(i = 0; i < body.length; i++){
						if(farm_details[0].farm_name == body[i].farm_name){
							var lat = body[i].center[1];
							var lon = body[i].center[0];
							break;
						}
					}
				
					new Date(req.session.cur_date);
					var d1 = new Date(req.session.cur_date);
					var d2 = new Date(req.session.cur_date);
					d2.setDate(d2.getDate() - 100);
					d1.setDate(d1.getDate() - 1);

					var start_date = dataformatter.dateToUnix(d2);
					var end_date = dataformatter.dateToUnix(d1);
					
					var url = 'http://api.agromonitoring.com/agro/1.0/weather/history?lat='+lat+'&lon='+lon+'&start='+start_date+'&end='+end_date+'&appid='+key;

					request(url, { json: true }, function(err, response, body) {
						if (err)
							throw err;
						else {
							//
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
									//
									
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
									
									
									var daily_ctr = 0;
									var dmin_temp = 0, dmax_temp = 0, dhumidity = 0, dpressure = 0, drainfall = 0;
									//Gets average weather for next 14 days
									for(var i = 0; i < forecast.length; i++){
										var ctr = 0;
										var min_temp = 0, max_temp = 0, humidity = 0, pressure = 0, rainfall = 0;
										for(var y = 0;y < forecast[i].data.length; y++){
											if(forecast[i].data[y].rainfall > 0)
											min_temp = min_temp + forecast[i].data[y].min_temp;
											max_temp = max_temp + forecast[i].data[y].max_temp;
											humidity = humidity + forecast[i].data[y].humidity;
											pressure = pressure + forecast[i].data[y].pressure;
											rainfall = rainfall + forecast[i].data[y].rainfall;

											ctr++;
										}
										min_temp = min_temp / ctr;
										max_temp = max_temp / ctr;
										humidity = humidity / ctr;
										pressure = pressure / ctr;
										rainfall = rainfall / ctr;

										dmin_temp = dmin_temp + min_temp;
										dmax_temp = dmax_temp + max_temp;
										dhumidity = dhumidity + humidity;
										dpressure = dpressure + pressure;
										drainfall = drainfall + rainfall;

										daily_ctr++;
									}
									//
									//
									//
									// var weather = {
									// 	min_temp : ((dmin_temp / ctr) - 32) / 1.8,
									// 	max_temp : ((dmax_temp / ctr) - 32) / 1.8,
									// 	humidity : dhumidity / ctr,
									// 	precipitation : drainfall / ctr
									// }
									var weather = {
										min_temp : dmin_temp / daily_ctr,
										max_temp : dmax_temp / daily_ctr,
										humidity : dhumidity / daily_ctr,
										precipitation : drainfall / daily_ctr
									}
									//


									var season = {
										season_temp : 35,
										season_humidity : 65
									}
									var cc_query = {
										status: ['In-Progress', 'Active', "Completed"], date: req.session.cur_date
									}
									cropCalendarModel.getCropCalendars(cc_query, function(err, crop_calendars){
										if(err)
											throw err;
										else{
											var i, index;
											for(i = 0; i < crop_calendars.length ; i++){
												if(crop_calendars[i].farm_id == farm_id.farm_id){
													index = i;
													break;
												}
											}
											
											if(index == null){
												var cur_stage = {
													stage_name : null
												}	
											}
											else{
												var cur_stage = {
													stage_name : crop_calendars[index].stage
												}	
												farmtypes.push(crop_calendars[index].method);
											}
										
											var fertilizer = null;
											pestdiseaseModel.getPestProbabilityPercentage(weather, season, farmtypes, cur_stage,function(err, possible_pests){
												if(err){
													throw err;
												}else{
													//
													var statements = new Array();
		
													var ctr = possible_pests.length;
													if(ctr < 5)
														while(ctr != 5 ){
															possible_pests.push({});
															ctr++;
														};
													// for(i = 0; i < possible_pests.length; i++){
													// 	stmt = possible_pests[i].pest_name + " - May occur due to ";
													// 	if(possible_pests[i].weather_id != null)
													// 		stmt = stmt + possible_pests[i].weather + " weather, ";
													// 	if(possible_pests[i].season_id != null)
													// 		stmt = stmt + possible_pests[i].season_name + " season ";
													// 	if(possible_pests[i].stage_id != null)
													// 		stmt = stmt + possible_pests[i].t_stage_name + " stage ";
													// 	statements.push({ statement : stmt});
													// }
		
													// pestdiseaseModel.getDiseaseProbability(weather, season, null, stage, function(err, probability){
													//
													// });
		
													// html_data["img"] = body2[0].image.truecolor;
		
													pestdiseaseModel.getDiagnosis(farm_id, null, function(err, diagnosis){

														if(err)
															throw err;
														else{
															var i, x, existing = [];
															for(i = 0; i < diagnosis.length; i++){
																diagnosis[i].date_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(diagnosis[i].date_diagnosed)), 'YYYY-MM-DD');
																
																for(x = 0 ; x < possible_pests.length; x++){
																	if(possible_pests[x].type == diagnosis[i].type && possible_pests[x].pd_id == diagnosis[i].pd_id){
																		// possible_pests[x].probability = possible_pests[x].probability * 1.1;
																		if(diagnosis[i].farm_id == farm_id.farm_id){
																			// possible_pests[x].probability = possible_pests[x].probability * 1.1;
																		}
																	}
																	
																}	
																if(diagnosis[i].status == "Present")
																	existing.push(diagnosis[i]);
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
															html_data["diagnosis"] = existing;
															html_data["statements"] = statements;
															html_data["probability"] = temp_pos;
															html_data["weather"] = weather;
															html_data["main"] = forecast_body[0].main;
															html_data["notifs"] = req.notifs;
															res.render("farm_pestdisease", html_data);
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
				}
			});
		}
	});
	
}

exports.ajaxGetFarmPestDiseaseProbability = function(req, res){
	var html_data = {};
	var farmtypes = [];
	var type = req.query.type;
	var center = req.query.center;

	if(req.query.farm_id != null && req.query.farm_id != ""){
		var farm_id = {
			farm_id : req.query.farm_id
		};
	}
	else{
		var farm_id = {
			farm_id : 54
		};
	}
	farmModel.filteredFarmDetails(farm_id, function(err, farm_details){
		if(err)
			throw err;
		else{
			farmtypes.push(farm_details[0].land_type);

			html_data["farm_id"] = farm_id.farm_id;

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

			var start_date = dataformatter.dateToUnix(d2);
			var end_date = dataformatter.dateToUnix(d1);
			
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
							//
							
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
							
							
							var daily_ctr = 0;
							var dmin_temp = 0, dmax_temp = 0, dhumidity = 0, dpressure = 0, drainfall = 0;
							//Gets average weather for next 14 days
							for(var i = 0; i < forecast.length; i++){
								var ctr = 0;
								var min_temp = 0, max_temp = 0, humidity = 0, pressure = 0, rainfall = 0;
								for(var y = 0;y < forecast[i].data.length; y++){
									min_temp = min_temp + forecast[i].data[y].min_temp;
									max_temp = max_temp + forecast[i].data[y].max_temp;
									humidity = humidity + forecast[i].data[y].humidity;
									pressure = pressure + forecast[i].data[y].pressure;
									rainfall = rainfall + forecast[i].data[y].rainfall;

									ctr++;
								}
								min_temp = min_temp / ctr;
								max_temp = max_temp / ctr;
								humidity = humidity / ctr;
								pressure = pressure / ctr;
								rainfall = rainfall / ctr;

								dmin_temp = dmin_temp + min_temp;
								dmax_temp = dmax_temp + max_temp;
								dhumidity = dhumidity + humidity;
								dpressure = dpressure + pressure;
								drainfall = drainfall + rainfall;

								daily_ctr++;
							}

							var weather = {
								min_temp : ((dmin_temp / ctr) - 32) / 1.8,
								max_temp : ((dmax_temp / ctr) - 32) / 1.8,
								humidity : dhumidity / ctr,
								precipitation : drainfall / ctr
							}
							


							var season = {
								season_temp : 35,
								season_humidity : 65
							}

							var cc_query = {
								status: ['In-Progress', 'Active', "Completed"], date: req.session.cur_date
							}
							cropCalendarModel.getCropCalendars(cc_query, function(err, crop_calendars){
								if(err)
									throw err;
								else{
									var i, index;
									for(i = 0; i < crop_calendars.length ; i++){
										if(crop_calendars[i].farm_id == farm_id.farm_id){
											index = i;
											break;
										}
									}
									if(index == null){
										var cur_stage = {
											stage_name : null
										}	
									}
									else{
										var cur_stage = {
											stage_name : crop_calendars[index].stage
										}	
										farmtypes.push(crop_calendars[index].method);
									}

									var fertilizer = null;

									if(type == "Pest"){
										pestdiseaseModel.getPestProbabilityPercentage(weather, season, farmtypes, cur_stage,function(err, possible_pests){
											if(err){
												throw err;
											}else{
												var statements = new Array();
					
												var ctr = possible_pests.length;
												// if(ctr < 5)
												// while(ctr != 5){
												// 	possible_pests.push({});
												// 	ctr++;
												// };
										
											}

											pestdiseaseModel.getDiagnosis(farm_id, null, function(err, diagnosis){

												if(err)
													throw err;
												else{
													var i, x;
													for(i = 0; i < diagnosis.length; i++){
														diagnosis[i].date_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(diagnosis[i].date_diagnosed)), 'YYYY-MM-DD');
														for(x = 0 ; x < possible_pests.length; x++){
															if(possible_pests[x].type == diagnosis[i].type && possible_pests[x].pd_id == diagnosis[i].pd_id){
																// possible_pests[x].probability = possible_pests[x].probability * 1.1;
																if(diagnosis[i].farm_id == farm_id.farm_id){}
																	// possible_pests[x].probability = possible_pests[x].probability * 1.1;
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
												html_data["probability"] = temp_pos;
												res.send(html_data);
											});
										});
									}
									else if(type == "Disease"){
										pestdiseaseModel.getDiseaseProbabilityPercentage(weather, season, farmtypes, cur_stage,function(err, possible_pests){
											if(err){
												throw err;
											}else{
												var statements = new Array();
					
												// var ctr = possible_pests.length;
												// if(ctr < 5)
												// while(ctr != 5){
												// 	possible_pests.push({});
												// 	ctr++;
												// };
											}

											pestdiseaseModel.getDiagnosis(farm_id, null, function(err, diagnosis){

												if(err)
													throw err;
												else{
													var i, x;
													for(i = 0; i < diagnosis.length; i++){
														diagnosis[i].date_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(diagnosis[i].date_diagnosed)), 'YYYY-MM-DD');
														for(x = 0 ; x < possible_pests.length; x++){
															if(possible_pests[x].type == diagnosis[i].type && possible_pests[x].pd_id == diagnosis[i].pd_id){
																// possible_pests[x].probability = possible_pests[x].probability * 1.1;
																if(diagnosis[i].farm_id == farm_id.farm_id){}
																	// possible_pests[x].probability = possible_pests[x].probability * 1.1;
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
												html_data["probability"] = temp_pos;
												res.send(html_data);
											});
										});
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

exports.getPestDiseaseDetails = function(req, res){
	var html_data = {};

	var type = req.query.type;
	var id = req.query.id;
	var tab = req.query.tab;
	var tab_name;
	if(tab == null)
		tab_name = "monitor_farms"
	else if(tab == "PestandDisease")
		tab_name = "pest_and_disease_discover";

	js.init_session(html_data, 'role', 'name', 'username', tab_name, req.session);
	if(type == "Pest"){
		pestdiseaseModel.getPestFactors(id, function(err, factors){
			if(err){
				throw err;
			}
			else{
				pestdiseaseModel.getPestDetails({pest_id : id}, function(err, details){
					if(err){
						throw err;
					}
					else{
						if(details.length == 0){
	
						}
						else{
							pestdiseaseModel.getPestSymptoms(id, function(err, symptoms){
								if(err){
									throw err;
								}
								else{
									if(details.length == 0){
				
									}
									else{
										//
										//
										html_data['pd'] =  details[0];
										html_data["symptoms"] = symptoms;
										html_data['type'] = "Pest";
										// html_data["factors"] = factors;
										
										html_data["notifs"] = req.notifs;
										res.render('pest_disease_details', html_data);
									}
								}
							});
						}
					}
				});
			}
		});
	}
	else{
		pestdiseaseModel.getDiseaseSymptoms(id, function(err, symptoms){
			if(err){
				throw err;
			}
			else{
				pestdiseaseModel.getDiseaseDetails({disease_id : id}, function(err, details){
					if(err){
						throw err;
					}
					else{
						if(details.length == 0){
	
						}
						else{
							html_data['pd'] =  details[0];
							html_data['type'] = "Disease";
							html_data["symptoms"] = symptoms;
							
							html_data["notifs"] = req.notifs;
							res.render('pest_disease_details', html_data);
						}
					}
				});
			}
		});
	}
}


//AJAX Soil Data
exports.getFarmSoilData = function(req,res){

	var query = { farm_name: req.query.farm_name };

	nutrientModel.getSoilRecord(query, function(err, result) {
		if (err) {
			throw err;
		}
		else {
			materialModel.readResourcesUsed('Fertilizer', query.farm_name, req.query.calendar_id, function(err, applied) {
        		if (err)
        			throw err;
        		else {
        			if (result[0].soil_quality_id == null) {
        				//Serves as default soil data if soil test has never been done
        				var ph_lvl = 'N/A', n_lvl = 7.75, p_lvl = 4.0, k_lvl = 0;
        				result[0].pH_lvl = ph_lvl;
        				result[0].n_lvl = n_lvl;
        				result[0].p_lvl = p_lvl;
        				result[0].k_lvl = k_lvl;
					}
					var soil_data = dataformatter.processNPKValues(result, result[0].farm_area, applied, '', applied);
					res.send(soil_data);
        		}
        	});
		}
	});
}


exports.updatePDDetails = function(req,res){
	var html_data = {};
	var type = req.params.type;
	var pd_id = req.params.id;
	var detail_type = req.params.detail_type;
	pestdiseaseModel.getPDDetails(type, pd_id, detail_type, function(err, result){
		res.send(result);
	});
}

// Pest and Disease Diagnosis Part (Temporary)
exports.getDiagnoses = function(req, res) {
	console.log(req.query.symptoms);
	if(req.query.symptoms != null)
		var reported_symptoms = req.query.symptoms.split("%");
	else
		var reported_symptoms = [];
	var html_data = {};
	html_data["title"] = "Diagnose";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_diagnoses', req.session);

	pestdiseaseModel.getDiagnosis(null, null, function(err, diagnoses){
		if(err)
			throw err;
		else{
			var i;
			for(i =0; i < diagnoses.length; i++){
				diagnoses[i].date_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(diagnoses[i].date_diagnosed)), 'YYYY-MM-DD');
				diagnoses[i].date_solved = dataformatter.formatDate(dataformatter.formatDate(new Date(diagnoses[i].date_solved)), 'YYYY-MM-DD');
			}
			

			pestdiseaseModel.getDiagnosis(null, "Pest", function(err, pest_diagnoses){
				if(err)
					throw err;
				else{
					var i;
					for(i =0; i < pest_diagnoses.length; i++){
						pest_diagnoses[i].date_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(pest_diagnoses[i].date_diagnosed)), 'YYYY-MM-DD');
						pest_diagnoses[i].date_solved = dataformatter.formatDate(dataformatter.formatDate(new Date(pest_diagnoses[i].date_solved)), 'YYYY-MM-DD');
					}
					
					pestdiseaseModel.getDiagnosis(null, "Disease", function(err, disease_diagnoses){
						if(err)
							throw err;
						else{
							var i;
							for(i =0; i < disease_diagnoses.length; i++){
								disease_diagnoses[i].date_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(disease_diagnoses[i].date_diagnosed)), 'YYYY-MM-DD');
								disease_diagnoses[i].date_solved = dataformatter.formatDate(dataformatter.formatDate(new Date(disease_diagnoses[i].date_solved)), 'YYYY-MM-DD');
							}

							farmModel.getAllFarms(function(err, farms){
								if(err)
									throw err;
								else{

								}
								pestdiseaseModel.getPestDiseaseList("Pest", function(err, pd_list){
									if(err)
										throw err;
									else{

									}

									pestdiseaseModel.getAllSymptoms(function(err, symptoms){
										if(err)
											throw err;
										else{
											for(var i = 0; i < reported_symptoms.length; i++){
												symptoms[reported_symptoms[i] - 1]["selected"] = true;
											}
										}
										//
										pestdiseaseModel.getPossibilitiesBasedOnSymptoms([], function(err, possibilities){
											if(err)
												throw err;
											else{
												//INSERT PERCENTAGE HERE
												pestdiseaseModel.getDBProbabilities(farms[0].farm_id, function(err, percentage){
													if(err){
													}
													else{
														if(percentage.length > 0){
															for(i = 0; i < possibilities.length; i++){
																possibilities[i]["percent"] = "N/A";
																for(x = 0; x < percentage.length; x++)
																	if(possibilities[i].pd_type == percentage[x].pd_type && possibilities[i].pd_id == percentage[x].pd_id)
																		possibilities[i]["percent"] = percentage[x].probability + "%";
															}
														}
														else{
															for(i = 0; i < possibilities.length; i++)
															possibilities[i]["percent"] = "N/A"
														}
													}
													html_data["possibilities"] = possibilities;
													html_data["symptom"] = symptoms;
													html_data["pest_list"] = pd_list;
													html_data["pest_diagnoses"] = pest_diagnoses;
													html_data["disease_diagnoses"] = disease_diagnoses;
													html_data["diagnoses"] = diagnoses;
													html_data["farms"] = farms;
													html_data["notifs"] = req.notifs;
													res.render('pest_and_disease_diagnoses', html_data);
												});
											}
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


exports.getDiagnosisDetails = function(req, res){
	var html_data = {};
	html_data["title"] = "Diagnose";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_diagnoses', req.session);
	var id = req.query.id;
	pestdiseaseModel.getDiagnosisDetails(id, function(err, diagnosis_details){
		if(err)
			throw err;
		else{
			//
			if(diagnosis_details[0].date_solved == null){
				diagnosis_details[0].date_solved = "Not yet resolved";
				diagnosis_details[0]["solved"] = true;
			}
			else
				diagnosis_details[0].date_solved = dataformatter.formatDate(dataformatter.formatDate(new Date(diagnosis_details[0].date_solved)), 'YYYY-MM-DD');
					
			diagnosis_details[0].date_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(diagnosis_details[0].date_diagnosed)), 'YYYY-MM-DD');
			html_data["details"] = diagnosis_details[0];
			
		}
		//
		//Get Symptoms
		pestdiseaseModel.getDiagnosisSymptoms(html_data.details.diagnosis_id, function(err, symptoms){
			if(err)
				throw err;
			else{
				html_data["symptoms"] = symptoms;
			}
			//GET SOLUTION WORKORDERS
			var wo_query = {
				where : { key : ["calendar_id"], value : [diagnosis_details[0].calendar_id]}
			}
			var solution_wos = [];
			workOrderModel.getWorkOrders(wo_query, function(err, wos){
				if(err)
					throw err;
				else{
					var i;
					for(i = 0; i < wos.length; i++){
						wos[i].date_start = dataformatter.formatDate(new Date(wos[i].date_start), 'YYYY-MM-DD');
						if(wos[i].date_completed != null)
							wos[i].date_completed = dataformatter.formatDate(new Date(wos[i].date_completed), 'YYYY-MM-DD');
						else
							wos[i].date_completed = "N/A" //Not yet completed (changed to reduce conflict with case insensitive search, e.g., "Completed")
						
						if(wos[i].type != "Land Preparation" && wos[i].type != "Sow Seed" && wos[i].type != "Fertilizer Application" && wos[i].type != "Harvest")
							solution_wos.push(wos[i]);
					}
				}
				//Get pest/disease solutions
				var solutions_made = [];
				if(diagnosis_details[0].type == "Pest"){
					pestdiseaseModel.getPestSolutions(diagnosis_details[0].pd_id, function(err, solutions){
						if(err)
							throw err;
						else{
							//Get workorders
								//Match with workorders
							var i,x;
							for(i = 0; i < solutions.length; i++){
								//if match then push
								for(x = 0; x < solution_wos.length; x++){
									if(solution_wos[x].type == solutions[i].detail_name){
										solutions_made.push(solution_wos[x]);
									}
								}
							}
						}
						html_data["wos"] = solutions_made;
						html_data["cur_date"] = dataformatter.formatDate(new Date(req.session.cur_date),'YYYY-MM-DD');
						html_data["notifs"] = req.notifs;
						res.render('pest_disease_diagnose_details', html_data);
					});
				}
				else if(diagnosis_details[0].type == "Disease"){
					pestdiseaseModel.getDiseaseSolutions(diagnosis_details[0].pd_id, function(err, solutions){
						if(err)
							throw err;
						else{
							//Get workorders
								//Match with workorders
							var i,x;
							for(i = 0; i < solutions.length; i++){
								//if match then push
								for(x = 0; x < solution_wos.length; x++){
									if(solution_wos[x].type == solutions[i].detail_name){
										solutions_made.push(solution_wos[x]);
									}
								}
							}
						}
						html_data["wos"] = solutions_made;
						html_data["cur_date"] = dataformatter.formatDate(new Date(req.session.cur_date),'YYYY-MM-DD');
						html_data["notifs"] = req.notifs;
						res.render('pest_disease_diagnose_details', html_data);
					});
				}
				
			});
		});
	});


}


exports.updateDiagnosis = function(req,res){
	var solve_date = req.body.date_solved;
	var id = req.body.id;

	pestdiseaseModel.updateDiagnosis({diagnosis_id : id}, solve_date, function(err, result){
		if(err)
			throw err;
		else{
		}
	});

	res.redirect("/pest_and_disease/diagnose_details?id=" + id);
}

exports.getAddDiagnosis = function(req, res) {
	var html_data = {};
	html_data["title"] = "Diagnose";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_add_diagnosis', req.session);
	html_data["notifs"] = req.notifs;
	res.render('add_diagnosis', html_data);
}

exports.getAddPest = function(req, res) {
	var html_data = {};
	html_data["title"] = "Diagnose";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_add_pest', req.session);
	html_data["notifs"] = req.notifs;
	res.render('add_pest', html_data);
}

exports.getAddDisease = function(req, res) {
	var html_data = {};
	html_data["title"] = "Diagnose";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_add_disease', req.session);
	html_data["notifs"] = req.notifs;
	res.render('add_disease', html_data);
}

exports.getDetailedDiagnosis = function(req, res) {
	var html_data = {};
	html_data["title"] = "Diagnose";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_detailed_diagnosis', req.session);
	html_data["notifs"] = req.notifs;
	res.render('detailed_diagnosis', html_data);
}

exports.getDetailedPest = function(req, res) {
	var html_data = {};
	html_data["title"] = "Diagnose";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_detailed_pest', req.session);
	html_data["notifs"] = req.notifs;
	res.render('detailed_pest', html_data);
}

exports.getDetailedDisease = function(req, res) {
	var html_data = {};
	html_data["title"] = "Diagnose";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_detailed_disease', req.session);
	html_data["notifs"] = req.notifs;
	res.render('detailed_disease', html_data);
}



exports.getPestandDiseaseDiscover = function(req,res){
	var html_data = {};
	html_data["title"] = "Discover";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_discover', req.session);

	pestdiseaseModel.getPestDiseaseList("Pest", function(err, pests){
		if(err)
			throw err;
		else{
			var i;
			for(i = 0; i < pests.length; i++){
				if(pests[i].last_diagnosed != null)
				pests[i].last_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(pests[i].last_diagnosed)), 'YYYY-MM-DD');
			}
			html_data["pests"] = pests;
		}
		pestdiseaseModel.getPestDiseaseList("Disease", function(err, diseases){
			if(err)
				throw err;
			else{
				var i;
				for(i = 0; i < diseases.length; i++){
					if(diseases[i].last_diagnosed != null)
					diseases[i].last_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(diseases[i].last_diagnosed)), 'YYYY-MM-DD');
				}
				html_data["diseases"] = diseases;
			}
			pestdiseaseModel.getAllSymptoms(function(err, symptoms){
				if(err)
					throw err;
				else{
					html_data["symptoms"] = symptoms;
				}
				pestdiseaseModel.getAllFactors(function(err, factors){
					if(err)
						throw err;
					else{
						html_data["factors"] = factors;
					}
					pestdiseaseModel.getAllPreventions(function(err, preventions){
						if(err)
							throw err;
						else{
							html_data["preventions"] = preventions;
						}
						pestdiseaseModel.getAllSolutions(function(err, solutions){
							if(err)
								throw err;
							else{
								html_data["solutions"] = solutions;
							}
							html_data["notifs"] = req.notifs;
							res.render('pest_disease_discover', html_data);
						});
					});
				});
			});
		});
	});
	
}


exports.addNewPD = function(req, res){
	var type = req.body.pd_type;

	var symptoms = [];
	for(i = 0; i < req.body.symptom.length; i++){
		symptoms.push(req.body.symptom[i].id);
	}

	var solutions = [];
	for(i = 0; i < req.body.solution.length; i++){
		solutions.push(req.body.solution[i].id);
	}

	var prevention = [];
	for(i = 0; i < req.body.prevention.length; i++){
		prevention.push(req.body.prevention[i].id);
	}

	var factor = [];
	for(i = 0; i < req.body.factor.length; i++){
		factor.push(req.body.factor[i].id.split('|'));
	}
	if(type == "Pest"){
		var pd = {
			pest_name : req.body.pd_name,
			pest_desc : req.body.pd_desc,
			scientific_name : req.body.pd_scientific
		}
		var i;
		

		pestdiseaseModel.addPest(pd, function(err, result){
		});
		pestdiseaseModel.getLastInserted("Pest", function(err, last){
			var last = last[0].last;
			//Add symptoms to pest
			for( i = 0; i < symptoms.length; i++){
				pestdiseaseModel.addPestDiseaseSymptom("Pest", last, symptoms[i], function(err, next){});
			}
			//Add new symptom
			// pestdiseaseModel.addSymptom(new_symptom, function(err, success){
			// });
			// pestdiseaseModel.getLast(function(err, last_insert){
			// 	var last_insert = last_insert[0].last;
			// 	pestdiseaseModel.addPestDiseaseSymptom("Pest", last, last_insert, function(err, next){});
			// });

			for( i = 0; i < solutions.length; i++){
				pestdiseaseModel.addPestDiseaseSolution("Pest", last, solutions[i], function(err, next){});
			}

			for( i = 0; i < prevention.length; i++){
				pestdiseaseModel.addPestDiseasePrevention("Pest", last, prevention[i], function(err, next){});
			}

			for( i = 0; i < factor.length; i++){
				pestdiseaseModel.addPestDiseaseFactor(factor[i][1], "Pest", last, factor[i][0], function(err, next){});
			}
			res.redirect("/pest_and_disease_details?type=Pest&id=" + last + "&tab=PestandDisease");
		});
	}
	else if(type == "Disease"){
		var pd = {
			disease_name : req.body.pd_name,
			disease_desc : req.body.pd_desc,
			scientific_name : req.body.pd_scientific
		}
		var i;

		pestdiseaseModel.addDisease(pd, function(err, result){
		});
		pestdiseaseModel.getLastInserted("Disease", function(err, last){
			var last = last[0].last;
			//Add symptoms to pest
			for( i = 0; i < symptoms.length; i ++){
				pestdiseaseModel.addPestDiseaseSymptom("Disease", last, symptoms[i], function(err, next){});
			}
			//Add new symptom
			// pestdiseaseModel.addSymptom(new_symptom, function(err, success){
			// });
			// pestdiseaseModel.getLast(function(err, last_insert){
			// 	var last_insert = last_insert[0].last;
			// 	pestdiseaseModel.addPestDiseaseSymptom("Pest", last, last_insert, function(err, next){});
			// });

			for( i = 0; i < solutions.length; i++){
				pestdiseaseModel.addPestDiseaseSolution("Disease", last, solutions[i], function(err, next){});
			}

			for( i = 0; i < prevention.length; i++){
				pestdiseaseModel.addPestDiseaseSolution("Disease", last, prevention[i], function(err, next){});
			}

			for( i = 0; i < factor.length; i++){
				pestdiseaseModel.addPestDiseaseFactor(factor[i][1], "Disease", last, factor[i][0], function(err, next){});
			}

			res.redirect("/pest_and_disease_details?type=Disease&id=" + last + "&tab=PestandDisease");
		});
	}
	

	
	
}

exports.ajaxGetPD = function(req, res){
	var type = req.query.type;
	pestdiseaseModel.getPestDiseaseList(type, function(err, pd_list){
		res.send(pd_list);
	});
	
}


exports.addDiagnosis = function(req,res){
	var workorders = [];
	var i;
	if(req.body.solution != null)
		for(i = 0; i < req.body.solution.length; i++)
			workorders.push(req.body.solution[i].split("|"));
	
	var pd = req.body.pd;
	pd = pd.split("|");
	var diagnosis = {
		type : pd[1],
		farm_id : req.body.farm_id,
		pd_id : pd[0],
		date_diagnosed : req.body.date_diagnosed
	}
	var query = { where: { key: 'farm_id', value: diagnosis.farm_id } };
	var symptoms = req.body.symptom;
	farmModel.getFarmData(query, function(err, farm_data){
		if(err)
			throw err;
		else{
			var farm_name = farm_data[0].farm_name;
		}
		var crop_calendar_query = { status: ['In-Progress', 'Active',"Completed"] , where : {key : "farm_name", val : farm_name}, date: req.session.cur_date }
		cropCalendarModel.getCropCalendars(crop_calendar_query, function(err, crop_calendar){
			if(err)
				throw err;
			else{
				var i, lastest, crop_plan;
				latest = 0;
				crop_plan = -1;
				//  //FIX HERE
				for(i =0; i < crop_calendar.length; i++){
					if(crop_calendar[i].farm_name == farm_name){

						// latest  = i;
						var temp_harvest = new Date(crop_calendar[i].harvest_date);
						var i_date = new Date(crop_calendar[i].land_prep_date);
						var index_date = new Date(crop_calendar[latest].land_prep_date);
						var diagnose_date = new Date(diagnosis.date_diagnosed);
						
						//
						//
						//


						if(diagnose_date.getTime() - i_date.getTime() >= 0){
							if(diagnose_date.getTime() - temp_harvest.getTime() <= 0){
								crop_plan = i;
								i = crop_calendar.length;
							}
							else{
								latest  = i;
							}
						}

						// if(crop_calendar[i].land_prep_date > crop_calendar[latest].land_prep_date)
						// 	latest  = i;
					}
						
					// if(crop_calendar[i].farm_name == farm_name)
					// 	diagnosis["calendar_id"] = crop_calendar[i].calendar_id;
				}
				//
				//
				if(crop_plan == -1){
					diagnosis["calendar_id"] = crop_calendar[latest].calendar_id;
					diagnosis["stage_diagnosed"] = crop_calendar[latest].stage;
				}
				else{
					var stage;
					var maturity_days = crop_calendar[crop_plan].maturity_days;
					var land_prep = new Date(crop_calendar[crop_plan].land_prep_date);
					var sowing = new Date(crop_calendar[crop_plan].sowing_date);
					var vegetation = new Date(req.session.cur_date);
					vegetation.setTime(sowing.getTime() + (7 * 24 * 60 * 60 * 1000));
					var reproduction = new Date(req.session.cur_date);
					reproduction.setTime(vegetation.getTime() + (maturity_days * 24 * 60 * 60 * 1000));
					var ripening = new Date(req.session.cur_date);
					ripening.setTime(reproduction.getTime() + (35* 24 * 60 * 60 * 1000));
					var harvesting = new Date(req.session.cur_date);
					harvesting.setTime(ripening.getTime() + (30 * 24 * 60 * 60 * 1000));
					//
					//
					//
					//
					//
					//
					//

					var diag_date = new Date(diagnosis.date_diagnosed);
					if(diag_date > harvesting){
						stage = "Harvesting";
					}
					else if(diag_date > ripening){
						stage = "Ripening";
					}
					else if(diag_date > reproduction){
						stage = "Reproduction";
					}
					else if(diag_date > vegetation){
						stage = "Vegetation";
					}
					else if(diag_date > sowing){
						stage = "Sowing";
					}
					else if(diag_date > land_prep){
						stage = "Land Preparation";
					}
					else{
						stage = null;
					}
					//
					diagnosis["calendar_id"] = crop_calendar[crop_plan].calendar_id;
					diagnosis["stage_diagnosed"] = stage;
				}
				
					
			}


			pestdiseaseModel.getDiagnosis({farm_id :diagnosis.farm_id},diagnosis.type, function(err, diagnoses){
				if(err)
					throw err;
				else{
					var add = true;
					var i;
					for(i = 0; i < diagnoses.length; i++){
						
						if(diagnoses[i].status == "Present" && diagnosis.pd_id == diagnoses[i].pd_id){
							//
							//
							add = false;
							break;
						}
					}
					//INSERT
					if(add)	{
						pestdiseaseModel.addDiagnosis(diagnosis, function(err, result){
							if(err)
								throw err;
							else{
							}
							//GET LAST INSERTED
							pestdiseaseModel.getLastInserted("Diagnosis", function(err, last){
								if(err)
									throw err;
								else{

								}
								//ADD ALL TO DIAGNOSIS_SYMPTOMS
								var x;
								for(x = 0; x < symptoms.length; x++){
									pestdiseaseModel.addDiagnosisSymptom(last[0].last, symptoms[x], function(err, success){});
								}
								
								//Create new WorkOrders
								var today = new Date(req.session.cur_date); 
								today.setDate(today.getDate() + 7);	
								//
								for(i = 0;i < workorders.length; i++){

									var temp_wo = {
										type : workorders[i][1],
										notes : workorders[i][2],
										date_created : new Date(req.session.cur_date),
										date_start : new Date(req.session.cur_date),
										date_due : today,
										crop_calendar_id : diagnosis.calendar_id
									}
									workOrderModel.createWorkOrder(temp_wo, function(err, success){});
								}
								
								//Create Cancelled Workorders
								var recommended_solutions = [];
								//Get pest/disease solutions
								if(pd[1] == "Pest"){
									pestdiseaseModel.getPestSolutions(pd[0], function(err, solutions){
										var i;
										for(i = 0; i < solutions.length; i++){
											//
											var x;
											var create = true;

											for(x = 0;x < workorders.length; x++){
												//
												if(solutions[i].detail_name == workorders[x][1] && solutions[i].detail_desc == workorders[x][2]){
													//Do not create
													create = false;
												}
											}
											if(create){
												//Create cancelled workorder
												var temp_wo = {
													type : solutions[i].detail_name,
													notes : "Recommendation Not Followed",
													date_created : dataformatter.formatDate(new Date(req.session.cur_date), 'MM-DD-YYYY'),
													date_start : dataformatter.formatDate(new Date(req.session.cur_date), 'MM-DD-YYYY'),
													date_due : today,
													crop_calendar_id : diagnosis.calendar_id,
													status : "Cancelled"
												}
												//Add cancelled work order
												workOrderModel.createWorkOrder(temp_wo, function(err, success){});
											}
										}
									});
								}
								else if(pd[1] == "Disease"){
									pestdiseaseModel.getDiseaseSolutions(pd[0], function(err, solutions){
										var i;
										for(i = 0; i < solutions.length; i++){
											var create = true;
											var x;
											for(x = 0;x < workorders.length; x++){
												
												//
												if(solutions[i].detail_name == workorders[x][1] && solutions[i].detail_desc == workorders[x][2]){
													//Do not create
													create = false;
												}
											}
											if(create){
												//Create cancelled workorder
												var temp_wo = {
													type : solutions[i].detail_name,
													notes : "Recommendation Not Followed",
													date_created : dataformatter.formatDate(new Date(req.session.cur_date), 'MM-DD-YYYY'),
													date_start : dataformatter.formatDate(new Date(req.session.cur_date), 'MM-DD-YYYY'),
													date_due : today,
													crop_calendar_id : diagnosis.calendar_id,
													status : "Cancelled"
												}
												//Add cancelled work order
												workOrderModel.createWorkOrder(temp_wo, function(err, success){});
											}
										}
									});
								}
								//Set cancelled work orders



								//Create new PD_Recommendation
								//pestdiseaseModel.addNewPDRecommendation()
								// res.redirect("/pest_and_disease/diagnose");

								//Create Notification
								var notif = {
									date : new Date(req.session.cur_date),
									farm_id : diagnosis.farm_id,
									notification_title : "New Pest/Disease diagnosed",
									url : "/pest_and_disease/diagnose_details?id=" + last[0].last,
									icon : "bug",
									color : "danger"
								}
								notifModel.createNotif(notif, function(err, success){

								});
								res.redirect("/pest_and_disease/diagnose_details?id=" + last[0].last);
							});
							
						});
					}
					else{
						res.redirect("/pest_and_disease/diagnose");
					}
					
				}
			});
		});
	});
	
	
}


exports.ajaxGetPossibilitiesBasedOnSymptoms = function(req,res){
	var farm_id = req.query.farm_id;
	var symptoms = req.query.symptoms;
	if(symptoms != null){
		var symptoms_count = symptoms.length;
	}
	else{
		var symptoms_count = 0;
		symptoms = [];
	}
	
	pestdiseaseModel.getPossibilitiesBasedOnSymptoms(symptoms, function(err, possibilities){
		if(err)
			throw err;
		else{
			//filter

			pestdiseaseModel.getDBProbabilities(farm_id, function(err, percentage){
				if(err){
				}
				else{
					if(percentage.length > 0){
						for(i = 0; i < possibilities.length; i++){
							possibilities[i]["percent"] = "N/A";
							for(x = 0; x < percentage.length; x++)
								if(possibilities[i].pd_type == percentage[x].pd_type && possibilities[i].pd_id == percentage[x].pd_id)
									possibilities[i]["percent"] = percentage[x].probability + "%";
						}
					}
					else{
						for(i = 0; i < possibilities.length; i++)
						possibilities[i]["percent"] = "N/A"
					}
				}
				res.send(possibilities);
			});
		}
	});

};


exports.getRecommendationDiagnosis = function(req,res){
	//
	var farm_id = req.query.farm_id;
	var type = req.query.type;
	var id = req.query.pd_id;
	var recommended_solutions = [];
	if(farm_id == "all" || farm_id == "" || farm_id == null){
		farm_id = null;
	}
	if(type == "Pest"){
		pestdiseaseModel.getPestSolutions(id, function(err, solutions){
			if(err)
				throw err;
			else{
				//
				var i;
				for(i = 0; i < solutions.length; i++){
					var solution = {
						date_words : dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD'),
						date : dataformatter.formatDate(new Date(req.session.cur_date), 'MM-DD-YYYY'),
						type : solutions[i].detail_name,
						desc : solutions[i].detail_desc
					}

					//add to recommendation
					recommended_solutions.push(solution);
				}
				pestdiseaseModel.getPestSymptoms(id, function(err, symptoms){
					//
					//

					pestdiseaseModel.getPestPreventions(id, function(err, preventions){
						
						res.send({recommended_solutions: recommended_solutions, symptoms : symptoms, preventions : preventions});
					});
				});
			}
		});
	}
	else if("Disease"){
		pestdiseaseModel.getDiseaseSolutions(id, function(err, solutions){
			if(err)
				throw err;
			else{
				var i;
				for(i = 0; i < solutions.length; i++){
					var solution = {
						date_words : dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD'),
						date : dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD'),
						type : solutions[i].solution_name,
						desc : solutions[i].solution_desc
					}
					recommended_solutions.push(solution);
				}
				
				pestdiseaseModel.getDiseaseSymptoms(id, function(err, symptoms){
					//
					//

					pestdiseaseModel.getDiseasePreventions(id, function(err, preventions){
						res.send({recommended_solutions: recommended_solutions, symptoms : symptoms, preventions: preventions});
					});
				});

			}
		});
	}


}


exports.getPDProbability = function(req, res){
	var center = req.query.center;
	var farmtypes = [];
	if(center == null){
		var lat = 13.073091;
		var lon = 121.388563;
	}
	else{
		var lat = center[1];
		var lon = center[0];
	}
	
	farmModel.filteredFarmDetails({farm_id : req.query.farm_id}, function(err, details) {
		if (err)
			throw err;
		else {
			//
			farmtypes.push(details[0].land_type);
		}

		var d1 = new Date(req.session.cur_date);
		var d2 = new Date(req.session.cur_date);
		d2.setDate(d2.getDate() - 2);
		d1.setDate(d1.getDate() - 1);

		var start_date = dataformatter.dateToUnix(d2);
		var end_date = dataformatter.dateToUnix(d1);
		
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
								var i, index = null;
								for(i = 0; i < stage.length; i++)
									if(stage[i].calendar_id == req.query.calendar_id){
										index = i;
										break;
									}
								//
								var cur_stage = {
									stage_name : stage[0].stage
								}	
							}
							// res.send({});
							//
							if(index == null){
								var cur_stage = {
									stage_name : null
								}	
							}
							else{
								var cur_stage = {
									stage_name : stage[index].stage
								}	
								farmtypes.push(stage[index].method);
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
								}
								//
								//
								res.send(possible_pests);
							});
						});
					}
				});
			}
		});
	});
};


exports.storePDRecommendation = function(req, res){
	//
	//
	
	var possibility = req.query.possibilities;
	var i;
	date = new Date(req.session.cur_date);
	date = dataformatter.formatDate(date, 'YYYY-MM-DD');
	
	pestdiseaseModel.getPDProbability({date : date},possibility.type, possibility.pd_id, req.query.farm_id, function(err, recommendations){
		if(err)
			throw err;
		else{
			if(recommendations.length == 0){
				//create recommendation
				var data = {
					pd_type : possibility.type,
					pd_id : possibility.pd_id,
					probability : possibility.probability,
					date : date,
					farm_id : req.query.farm_id,
					calendar_id : req.query.calendar_id
				}
				pestdiseaseModel.addPDProbability(data, function(err, success){

				});
			}
			else{
				//
				recommendations[0].probability = recommendations[0].probability + parseInt(possibility.probability);
				recommendations[0].probability = recommendations[0].probability / 2;
				//update
				pestdiseaseModel.updatePDProbability(recommendations[0].probability_id, recommendations[0].probability, function(err, success){

				});
			}
		}
	});
	res.send("ok");
};

//ajax
exports.getDiagnosisList = function(req,res){
	var farm_id = req.query.farm_id;
	//

	if(farm_id == "" || farm_id == null){
		farm_id = null;
	}
	//
	pestdiseaseModel.getDiagnosis({farm_id : farm_id}, null, function(err, diagnoses){
		//
		//
		res.send(diagnoses);
	});

};

exports.getProbabilities = function(req,res){
	var farm_id = req.query.farm_id;

	if(farm_id == "" || farm_id == null){
		farm_id = null;
	}
	pestdiseaseModel.getProbabilities(null, {farm_id : farm_id}, function(err, probabilities){
		if(err)
			throw err;
		else	
			res.send(probabilities);
	});
};

exports.ajaxGetDiagnosisStageFrequency = function(req,res){
	var farm_id = req.query.farm_id;
	//

	if(farm_id == "" || farm_id == null){
		farm_id = null;
	}

	pestdiseaseModel.getDiagnosisFrequentStage2(farm_id, null, null, null, function(err, frequency){
		if(err)
			throw err;
		else{
			//
			//
			res.send(frequency);
		}
	});
}

exports.getPreventions = function(req, res){
	var type = req.query.type;
	var id = req.query.id;
	
	var seed_id = req.query.seed_id;
	var possibilities = req.query.possibilities;

	//Get seed dmaturity days
	materialModel.getMaterials("Seed", {seed_id : seed_id}, function(err, seed){
		if(err)
			throw err;
		else{
			//

			var maturity_days = seed[0].maturity_days;
			var land_prep = new Date(req.query.land_prep_date);
			var sowing = new Date(req.query.sowing_date);
			var vegetation = new Date(req.query.vegetation_date);
			var reproduction = new Date(req.session.cur_date);
			reproduction.setTime(vegetation.getTime() + (maturity_days * 24 * 60 * 60 * 1000));
			var ripening = new Date(req.session.cur_date);
			ripening.setTime(reproduction.getTime() + (35* 24 * 60 * 60 * 1000));
			var harvesting = new Date(req.session.cur_date);
			harvesting.setTime(ripening.getTime() + (30 * 24 * 60 * 60 * 1000));

			//
			//
			//
			//
			//
			//
			//Get 
			if(type == "Pest"){
				pestdiseaseModel.getPestPreventions(id, function(err, preventions){
					if(err)
						throw err;
					else{
						//Look for optimal date
						var i, date;
						if(possibilities.frequent_stage == "Land Preparation")
							date = dataformatter.formatDate(land_prep, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Sowing")
							date = dataformatter.formatDate(sowing, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Vegetation")
							date = dataformatter.formatDate(vegetation, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Reproductive")
							date = dataformatter.formatDate(reproduction, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Ripening")
							date = dataformatter.formatDate(ripening, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Harvesting")
							date = dataformatter.formatDate(harvesting, 'YYYY-MM-DD');
						else
							date = dataformatter.formatDate(land_prep, 'YYYY-MM-DD');

						for(i = 0; i < preventions.length; i++){
							
							preventions[i]["date"] = date;
						}
						res.send(preventions);
					}
				});
			}
			else if(type == "Disease"){
				pestdiseaseModel.getDiseasePreventions(id, function(err, preventions){
					if(err)
						throw err;
					else{
						//Look for optimal date
						var i, date;
						if(possibilities.frequent_stage == "Land Preparation")
							date = dataformatter.formatDate(land_prep, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Sowing")
							date = dataformatter.formatDate(sowing, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Vegetation")
							date = dataformatter.formatDate(vegetation, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Reproductive")
							date = dataformatter.formatDate(reproduction, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Ripening")
							date = dataformatter.formatDate(ripening, 'YYYY-MM-DD');
						else if(possibilities.frequent_stage == "Harvesting")
							date = dataformatter.formatDate(harvesting, 'YYYY-MM-DD');
						else
						date = date = dataformatter.formatDate(land_prep, 'YYYY-MM-DD');

						for(i = 0; i < preventions.length; i++){
							
							preventions[i]["date"] = date;
						}
						res.send(preventions);
					}
				});
			}
		}
	});
}

exports.getPDFrequency = function(req, res){
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'pest_and_disease_frequency', req.session);
	html_data["title"] = "Diagnose";

	pestdiseaseModel.getTotalDiagnosesPerPD2(null,null, function(err, total){
		if(err)
			throw err;
		else{
			var i,x, temp_total = [];
			var pest = [];
			var disease = [];
			
			temp_total = total;
			
		}
		pestdiseaseModel.getDiagnosisFrequentStage2(null, null, null, null, function(err, frequency){
			if(err)
				throw err;
			else{
				for(x = 0; x < temp_total.length; x++){
					var freq_stage = "N/A", stage_count = 0;
					for(i = 0; i < frequency.length; i++){
						if(temp_total[x].pd_id == frequency[i].pd_id && temp_total[x].type == frequency[i].type){
							if(frequency[i].count > stage_count){
								stage_count = frequency[i].count;
								freq_stage = frequency[i].stage_diagnosed;
							}
						}
					}
					temp_total[x]["frequent_stage"] = freq_stage;
				}

				for(x = 0; x < temp_total.length; x++){
					if(temp_total[x].type == "Pest")
						pest[x] = temp_total[x];
					if(temp_total[x].type == "Disease")
						disease[x] = temp_total[x];
				}
				var new_total = [];

				var max_index = temp_total.length >= 5 ? 5 : temp_total.length;
				for(i = 0; i < max_index; i++){
					new_total.push(temp_total[i]);
				}
				
				if (new_total.length != 0)
					new_total[0]["selected"] = true;
			}

			farmModel.getAllFarms(function(err, farms){
				if(err)
					throw err;
				else{
					html_data["farms"] = farms;
				}

				pestdiseaseModel.getTotalDiagnosesPerMonth(null, null, null, null, function(err, month_frequency){
					if(err)
						throw err;
					else{
						var i, highest = 0;
						for(i = 0; i < month_frequency.length; i++){
							//get highest
							if(month_frequency[i].frequency > highest)
								highest = month_frequency[i].frequency;
						}
						highest = Math.ceil(highest / 5) * 5;
						for(i = 0; i < month_frequency.length; i++){
							//update array for chart
							month_frequency[i]["percent"] = (month_frequency[i].frequency * 1.0) / (highest * 1.0) * 100;
							//
							// if(month_frequency[i]["month"] == "")
							// if(month_frequency[i]["month"] == "")
							// if(month_frequency[i]["month"] == "")
							// if(month_frequency[i]["month"] == "")
							// if(month_frequency[i]["month"] == "")
							// if(month_frequency[i]["month"] == "")
							// if(month_frequency[i]["month"] == "")
							// if(month_frequency[i]["month"] == "")
							// if(month_frequency[i]["month"] == "")
							// if(month_frequency[i]["month"] == "")
						}

						month_frequency[0]["month_label"] = "Jan";
						month_frequency[1]["month_label"] = "Feb";
						month_frequency[2]["month_label"] = "Mar";
						month_frequency[3]["month_label"] = "Apr";
						month_frequency[4]["month_label"] = "May";
						month_frequency[5]["month_label"] = "Jun";
						month_frequency[6]["month_label"] = "Jul";
						month_frequency[7]["month_label"] = "Aug";
						month_frequency[8]["month_label"] = "Sep";
						month_frequency[9]["month_label"] = "Oct";
						month_frequency[10]["month_label"] = "Nov";
						month_frequency[11]["month_label"] = "Dec";

						html_data["highest"] = highest;
						html_data["middle"] = highest / 2;
						
					}
					pestdiseaseModel.getPestDiseaseList("Pest", function(err, pests){
						if(err)
							throw err;
						else{
							var i;
							//
							for(i = 0; i < pests.length; i++){
								pests[i]["pd_type"] = "Pest";
								if(pests[i].last_diagnosed != null)
								pests[i].last_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(pests[i].last_diagnosed)), 'YYYY-MM-DD');
							}
							html_data["pests"] = pests;
						}
						html_data["total"] = new_total;
						html_data["month_frequency"] = month_frequency;
						// html_data["pest"] = pest;
						// html_data["disease"] = disease;
						html_data["notifs"] = req.notifs;
						res.render("pest_and_disease_frequency", html_data);
					});
				});
			});
		});
	});
};

exports.ajaxUpdateChart = function(req, res){
	var type = req.query.type;
	var pd_id = req.query.pd_id;
	var farm_id = req.query.farm_id;
	var year = req.query.year;
	//
	if(farm_id == "all"){
		farm_id = null;
	}
	if(type == "" || type == null || type == "all"){
		type = null;
	}
	if(pd_id == "" || pd_id == null){
		pd_id = null;
	}
	if(year == "" || year == null || year == "all"){
		year = null;
	}

	pestdiseaseModel.getTotalDiagnosesPerMonth(farm_id, year, pd_id, type, function(err, month_frequency){
		var html_data = {};
		if(err)
			throw err;
		else{
			var i, highest = 0, highest_index = 0;
			for(i = 0; i < month_frequency.length; i++){
				//get highest
				if(month_frequency[i].frequency > highest){
					highest = month_frequency[i].frequency;
					highest_index = i;
				}
			}
			highest = Math.ceil(highest / 5) * 5;
			for(i = 0; i < month_frequency.length; i++){
				//update array for chart
				month_frequency[i]["percent"] = (month_frequency[i].frequency * 1.0) / (highest * 1.0) * 100;
			}

			month_frequency[0]["month_label"] = "Jan";
			month_frequency[1]["month_label"] = "Feb";
			month_frequency[2]["month_label"] = "Mar";
			month_frequency[3]["month_label"] = "Apr";
			month_frequency[4]["month_label"] = "May";
			month_frequency[5]["month_label"] = "Jun";
			month_frequency[6]["month_label"] = "Jul";
			month_frequency[7]["month_label"] = "Aug";
			month_frequency[8]["month_label"] = "Sep";
			month_frequency[9]["month_label"] = "Oct";
			month_frequency[10]["month_label"] = "Nov";
			month_frequency[11]["month_label"] = "Dec";

			html_data["highest"] = highest;
			html_data["middle"] = highest / 2;

			html_data["highest_month"] = month_frequency[highest_index].month;
			html_data["highest_month_count"] = month_frequency[highest_index].frequency;
			
		}
		html_data["month_frequency"] = month_frequency;
		res.send(html_data);
	});
}

exports.ajaxDiagnosisPDFrequency = function(req, res){
	var type = req.query.type;
	var farm_id = req.query.farm_id;
	var year = req.query.year;
	var pd_id = req.query.pd_id;
	if(farm_id == "all"){
		farm_id = null;
	}
	if(year == "" || year == "all" || year == null){
		year = null;
	}
	if(pd_id == "" || pd_id == null){
		pd_id = null;
	}
	if(type == "" || type == null || type =="all"){
		type = null;
	}
	pestdiseaseModel.getTotalDiagnosesPerPD2(farm_id, year, function(err, total){
		if(err)
			throw err;
		else{
			var i,x, temp_total = [];
			var pest = [];
			var disease = [];
			
			temp_total = total;
			
		}
		pestdiseaseModel.getDiagnosisFrequentStage2(farm_id, year, pd_id, type, function(err, frequency){
			if(err)
				throw err;
			else{
				//
				if(frequency.length != 0 && total.length != 0){
					for(x = 0; x < temp_total.length; x++){
						var freq_stage = "N/A", stage_count = 0;
						for(i = 0; i < frequency.length; i++){
							if(temp_total[x].pd_id == frequency[i].pd_id && temp_total[x].type == frequency[i].type){
								if(frequency[i].count > stage_count){
									stage_count = frequency[i].count;
									freq_stage = frequency[i].stage_diagnosed;
								}
							}
						}
						temp_total[x]["frequent_stage"] = freq_stage;
					}
	
	
					for(x = 0; x < temp_total.length; x++){
						if(temp_total[x].type == "Pest")
							pest.push(temp_total[x]);
						if(temp_total[x].type == "Disease")
							disease.push(temp_total[x]);
					}
					var new_total = [];
					var new_pest = [];
					var new_disease = [];
					for(i = 0; i < 5; i++){
						new_total.push(temp_total[i]);
						new_pest.push(pest[i]);
						new_disease.push(disease[i]);
					}
					
					new_total[0]["selected"] = true;
	
					//
				}
			}
			if(type == "Pest"){
				res.send(new_pest);
			}
			else if(type == "Disease"){
				res.send(new_disease);
			}
			else{
				res.send(new_total);
			}
		});
	});
}

exports.ajaxDiagnosisListPerPD = function(req,res){
	var pd_id = req.query.pd_id;
	var type = req.query.type;
	var farm_id = req.query.farm_id;
	var year = req.query.year;

	if(farm_id == "all")
		farm_id = null;

	if(pd_id == "")
		pd_id = null;
	
	if(type == "")
		type = null;
	
	if(year == "" || year == "all")
		year = null;
	
	pestdiseaseModel.getDiagnosisList(pd_id, type, farm_id, year, function(err, diagnosis_list){
		if(err)
			err;
		else{
			var i;
			for(i = 0; i < diagnosis_list.length; i++){
				diagnosis_list[i].date_diagnosed = dataformatter.formatDate(new Date(diagnosis_list[i].date_diagnosed), 'YYYY-MM-DD');
				if(diagnosis_list[i].date_solved != null)
					diagnosis_list[i].date_solved = dataformatter.formatDate(new Date(diagnosis_list[i].date_solved), 'YYYY-MM-DD');
				else
				diagnosis_list[i].date_solved = "N/A";
			}
			pestdiseaseModel.getDiagnosisFrequentStage2(farm_id, year, pd_id, type, function(err, frequency){
				if(err)
					throw err;
				else{
					if(frequency.length != 0){
						//
						//
						diagnosis_list[0]["count"] = frequency[0].count;
						diagnosis_list[0]["common_stage"] = frequency[0].stage_diagnosed;
					}
					else{
						if(diagnosis_list.length > 0){
							
						}
						// diagnosis_list[0]["count"] = 0;
						// diagnosis_list[0]["common_stage"] = "N/A";
					}
				}
				res.send(diagnosis_list);
			});
		}
	});
}


exports.getSinglePDProbabilitity = function(req,res){
	var pd_id = req.query.pd_id;
	var type = req.query.type;
	var farm_id = req.query.farm_id;
	if(farm_id == null || farm_id == "all" || farm_id == ""){
		farm_id = null;
	}

	pestdiseaseModel.getSinglePDProbability(pd_id, type, farm_id, function(err, probability){
		if(err)
			throw err;
		else{
			if(probability.length != 0){
				if(farm_id == null){
					var date = dataformatter.formatDate(new Date(probability[0].date), 'YYYY-MM-DD');
					var i, ctr = 0, sum = 0; 
					for(i =0; i < probability.length; i++){
						//
						if(date == dataformatter.formatDate(new Date(probability[i].date), 'YYYY-MM-DD')){
							ctr++;
							sum = sum + probability[i].probability;
						}
					}
					probability[0].probability = sum * 1.0 / ctr;
				}
				res.send(probability[0]);
			}
			else{
				res.send({});
			}
		}
	});
}





//APRIL 07, 2022
exports.checkExistingPreventionWo = function(req, res){
	var preventions = req.query.preventions;
	var farm_name = req.query.farm_name;

	cropCalendarModel.getCurrentCropCalendar({farm_id : farm_name}, function(err, crop_calendar){
		if(crop_calendar.length > 0){
			var wo_query = {
				where : { key : ["calendar_id"], value : [crop_calendar[0].calendar_id]}
			}
			workOrderModel.getWorkOrders(wo_query, function(err, wos){
				var i,x;
				
				for(i = 0; i < preventions.length; i++){
					for(x = 0; x < wos.length; x++){
						if(wos[x].type == preventions[i].detail_name){
							preventions[i]["made"] = true;
						}
					}
				}
				res.send({preventions : preventions, calendar_id : crop_calendar[0].calendar_id});
			});
		}
		else{
			res.send({active_calendar : true}); //no existing calendar active
		}
	});
}


exports.createPreventionWo = function(req, res){
	var calendar_id = req.body.calendar_id;
	var workorders = [];
	var preventions = req.body.preventions;
	var i;
	for(i = 0; i < preventions.length; i++)
		workorders.push(preventions[i].split('|'));
	
	//Create new WorkOrders
	var today = new Date(req.session.cur_date); 
	today.setDate(today.getDate() + 7);	
	//
	for(i = 0;i < workorders.length; i++){

		var temp_wo = {
			type : workorders[i][1],
			notes : workorders[i][2],
			date_created : new Date(req.session.cur_date),
			date_start : new Date(req.session.cur_date),
			date_due : today,
			crop_calendar_id : calendar_id
		}
		workOrderModel.createWorkOrder(temp_wo, function(err, success){});
	}

	res.redirect("/pest_and_disease/frequency");
}