const notifModel = require('../models/notificationModel.js');
const workOrderModel = require('../models/workOrderModel.js');
const farmModel = require('../models/farmModel.js');
const materialModel = require('../models/materialModel.js');
const cropCalendarModel = require('../models/cropCalendarModel.js');
const nutrientModel = require('../models/nutrientModel.js');
const dataformatter = require('../public/js/dataformatter.js');
const js = require('../public/js/session.js');
var request = require('request');
var solver = require('javascript-lp-solver');

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

function processAmountEquation(arr, variables) {
	//
	var order = [];
	var inner_most_opening, inner_most_closing;
	var i = 0, x = 0;

	// Get highest fertilizer value
	const fertilizer_keys = Object.keys(variables.fv);
	const str_values = fertilizer_keys.map(key => {
		return key;
	});
	const values = fertilizer_keys.map(key => {
		if (isNaN(variables.fv[key]))
			return 0;
		else
	  	return variables.fv[key];
	});
	const max = Math.max(...values);
	var nutrient_type = str_values[values.indexOf(max)];

	switch (nutrient_type) {
		case 'N': nutrient_type = 'n_lvl';
			break;
		case 'P': nutrient_type = 'p_lvl';
			break;
		case 'K': nutrient_type = 'k_lvl';
			break;
	}

	arr.forEach(function(item, index) {
		switch (item) {
			case 'fa':
				arr[index] = variables.fa;
				break;
			case 'fv':
				arr[index] = max;
				break;
			case 'tnr':
				arr[index] = variables.tnr[nutrient_type];
				break;
		}
		arr = arr;
	});

	var str = arr.join('');
	//
	return Math.ceil(Function("return " + str)());
}

function processInventory(arr, recommendation, applied) {
	var row_arr = [];
	var temp_obj = {};
	var qty, recommendation_amt, applied_fertilizer, deficiency;
	var mat;

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

exports.ajaxGetActiveCNRPlans = function(req, res) {
	const farm_id = req.query.farm_id;
	nutrientModel.getAggregatedCNRAssignment(function(err, cnr_assignments) {
		if (err)
			throw err;
		else {
			nutrientModel.getAggregatedCNR(function(err, cnr_items) {
				if (err)
					throw err;
				else {
					materialModel.getMaterialsList('Fertilizer', null, function(err, material_list) {
						if (err)
							throw err;
						else {
							var filtered_cnra = cnr_assignments.filter(e => e.farm_id == farm_id);
							var filtered_arr = [];
							var cnr_obj;
							var temp_arr = [], filtered;
							filtered_cnra.forEach(function(item) {
								cnr_obj = {
									name: item.cnr_name,
									items: []
								};

								filtered = cnr_items.filter(e => e.cnr_id == item.cnr_id);

								filtered.forEach(function(filtered_item) {
									item_obj = {
										dat: filtered_item.dat,
										fertilizer_name: material_list.filter(e => e.id == filtered_item.fertilizer_id)[0].name,
										amount_equation: convertCNRItems(filtered_item.amount_equation.split(','))
									};

									cnr_obj.items.push(item_obj);

								});
								filtered_arr.push(cnr_obj);
							});
							
							res.send(filtered_arr);
						}
					});
				}
			});
		}
	});
}

exports.getNutrientMgtDiscover = function(req, res) {
	var html_data = {};
	html_data["title"] = "Nutrient Management > Discover";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'nutrient_mgt_discover', req.session);
	html_data["notifs"] = req.notifs;

	res.render('nutrient_mgt_discover', html_data);

}

exports.getNutrientMgtPlan = function(req, res) {
	var html_data = {};
	html_data["title"] = "Nutrient Management > Nutrient Plan";
	var farm_filter = req.query.farm_name;
	var calendar_filter;
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'nutrient_mgt_plan', req.session);
	html_data["notifs"] = req.notifs;

	farmModel.getAllFarms(function(err, farm_list) {
		if (err)
			throw err;
		else {
			cropCalendarModel.getCropPlans(function(err, crop_plans) {
				if (err)
					throw err;
				else {
					// Select default farm and calendar
					if (farm_filter == undefined || farm_filter == null) {
						farm_filter = farm_list[0].farm_name;
					}

					if (crop_plans.length != 0)
						calendar_filter = crop_plans.filter(e => e.farm_name == farm_filter)[0].calendar_id;
					else 
						calendar_filter = null;
					
					html_data['farm_list'] = farm_list;
					html_data['crop_plans'] = { filtered: crop_plans.filter(e=>e.farm_name == farm_filter), list: JSON.stringify(crop_plans) };
					html_data['filter'] = JSON.stringify({ farm: farm_filter, calendar: calendar_filter });

					if (farm_filter != null) {
						html_data.farm_list.forEach(function(item) {
							if (item.farm_name == farm_filter)
								item['initial'] = true;
						});
					}
					if (calendar_filter != null) {
						html_data.crop_plans.filtered.forEach(function(item) {
							if (item.calendar_id == calendar_filter)
								item['initial'] = true;
						});
					}

					res.render('nutrient_mgt_plan', html_data);
				}
			});
		}
	});
}

exports.ajaxGetNutrientPlanView = function(req, res) {
	var query = { farm_name: req.query.farm_name };
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'monitor_farms', req.session);
	
	var summary = '';
	cropCalendarModel.readCropCalendar({ calendar_id: req.query.calendar_id }, function(err, calendar_details) {
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
							var farm_id = farm_list.filter(e => e.farm_name == req.query.farm_name)[0].farm_id;
							farmModel.getForecastedYieldRecord({ calendar_id: [req.query.calendar_id] }, function(err, forecast) {
								if (err)
									throw err;
								else {
									materialModel.readResourcesUsed('Fertilizer', query.farm_name, req.query.calendar_id, function(err, applied) {
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
											nutrientModel.getNutrientPlanDetails({ calendar_id: req.query.calendar_id }, function(err, frp) {
												if (err)
													throw err;
												else {
													//
													nutrientModel.getNutrientPlanItems({ fr_plan_id: frp[0].fr_plan_id }, function(err, fr_items) {
														if (err)
															throw err;
														else {
															workOrderModel.getGroupedWO('Fertilizer Application' , req.query.calendar_id, function(err, wo_list) {
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
																			
																			
																			html_data['detailed_data'] = dataformatter.processNPKValues(result, result[0].farm_area, applied, summary, wo_list);
																			if (forecast != 0) {
																				html_data['yield_forecast'] = forecast[0].forecast == -1 ? `N/A` : `${forecast[0].forecast} cavans/ha`;
																			}
																			fr_items = fr_items.filter(e => e.isCreated == 0);
																			//
																			frp[0]['formatted_date'] = dataformatter.formatDate(new Date(frp[0].last_updated), 'YYYY-MM-DD');
																			html_data['frp_details'] = frp[0];
																			html_data['recommendation'] = recommendFertilizerPlan(result[0], material_list);
																			html_data['detailed_data']['calendar_id'] = req.query.calendar_id;
																			html_data['fr_items'] = fr_items;
																			html_data['wo_list'] = wo_list;
																			html_data['inventory'] = processInventory(material_list, html_data.recommendation, applied);
																			html_data['calendar_details'] = calendar_details[0];
																			html_data['farm_id'] = farm_id;

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

function convertCNRItems(arr) {
	var menu_arr = ['', '+', '-', '*', '/', '(', ')', 'fa', 'fv', 'tnr', ''];
	var str = ``;
	var index;
	var val_arr = [];
	arr.forEach(function(item) {
		index = menu_arr.indexOf(item);
		if (index != -1) {
			val_arr.push(index);
		}
		else {
			val_arr.push(10);
		}
      switch (item) {
        case '+': 
          str += `<i class="fa fa-plus fa-2xs formula_item-operands" value="+"></i>`;
          break;
        case '-':
          str += `<i class="fa fa-minus fa-2xs formula_item-operands" value="-"></i>`;
          break;
        case '*':
          str += `<i class="fa fa-asterisk fa-2xs formula_item-operands" value="*"></i>`;
          break;
        case '/':
          str += `<i class="fa fa-divide fa-2xs formula_item-operands" value="/"></i>`;
          break;
        case '(':
          str += `<div class="formula_item-special" value="(">(</div>`;
          break;
        case ')':
          str += `<div class="formula_item-special" value=")">)</div>`;
          break;
        case 'fa':
          str += `<div class="formula_item-variable" value="fa">Farm area</div>`;
          break;
        case 'fv':
          str += `<div class="formula_item-variable" value="fv">Fertilizer nutrient value</div>`;
          break;
        case 'tnr':
          str += `<div class="formula_item-variable" value="tnr">Total nutrient requirement</div>`;
          break;
        default:
          str+= `<div class="formula_item"><input type="number" disabled name="user_number" min="0" class="form-control user_number formula_item-variable" style="" value="${item}"></div>`;
          break;
      }
    });
    return { ele: str, arr: arr, vals: val_arr };
}

exports.getRecommendationSystem = function(req, res) {
	var html_data = {};
	html_data["title"] = "Nutrient Management > Recommendation System";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'nutrient_mgt_reco', req.session);
	html_data["notifs"] = req.notifs;

	farmModel.getAllFarms(function(err, farm_list) {
		if (err)
			throw err;
		else {
			materialModel.getMaterialsList('Fertilizer', null, function(err, material_list) {
				if (err)
					throw err;
				else {
					nutrientModel.getAggregatedCNR(function(err, cnr_list) {
						if (err)
							throw err;
						else {
							nutrientModel.getAggregatedCNRAssignment(function(err, cnra_list) {
								if (err)
									throw err;
								else {
									var unique_cnr = [...new Set(cnr_list.map(item =>
			 						 item.cnr_name))];
									var cnr_arr = [];
									var filtered, filtered_assignment;
									var obj, item_obj;
									var cnr_items_arr = [];
									var temp_arr;
									unique_cnr.forEach(function(item) {
										filtered = cnr_list.filter(e => e.cnr_name == item);
										filtered_assignment = cnra_list.filter(e => e.cnr_name == item);
										temp_arr = [];
										obj = {
											cnr_id: filtered[0].cnr_id,
											cnr_name: filtered[0].cnr_name,
											farms: [...new Set(filtered_assignment.map(item =>
			 									 item.farm_id))],
											items: []
										};
										filtered.forEach(function(filtered_item) {
											item_obj = {
												dat: filtered_item.dat,
												fertilizer_id: filtered_item.fertilizer_id,
												amount_equation: convertCNRItems(filtered_item.amount_equation.split(','))
											};
											obj.items.push(item_obj);
											temp_arr.push(item_obj.amount_equation.vals);
										});
										cnr_arr.push(obj);
										cnr_items_arr.push(temp_arr);
									});
									html_data['cnr_plan_json'] = JSON.stringify(cnr_items_arr);
									html_data['cnr_plans'] = cnr_arr;
									html_data['farm_list'] = { lowland: farm_list.filter(e=>e.land_type=='Lowland'), upland: farm_list.filter(e=>e.land_type=='Upland') };
									html_data['fertilizers'] = { json: JSON.stringify(material_list), obj: material_list };

									res.render('nutrient_mgt_reco', html_data);
								}
							});	
						}
					});	
				}
			});
		}
	});
}

exports.getNurientManagement = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'nutrient_mgt_discover', req.session);
	html_data["notifs"] = req.notifs;
	res.render('nutrient_mgt', html_data);
}

exports.ajaxCheckCNRPlans = function(req, res) {
	nutrientModel.getCNRPlans({ cnr_name: req.query.name }, function(err, result) {
		if (err)
			throw err;
		else {
			res.send(result);
		}
	});
}

exports.updateCNRPlan = function(req, res) {
	var { name, farms, items } = req.query;
	nutrientModel.getCNRPlans({ cnr_name: req.query.name }, function(err, result) {
		if (err)
			throw err;
		else {
			items.forEach(function(item) {
				item['cnr_id'] = result[0].cnr_id;
			});
			nutrientModel.deleteCNRAssignments({ cnr_id: result[0].cnr_id }, function(err, assignment_del) {
				if (err)
					throw err;
				else {
				}
			});
			nutrientModel.deleteCNRItems({ cnr_id: result[0].cnr_id }, function(err, items_del) {
				if (err)
					throw err;
				else {
				}
			});
			nutrientModel.createCNRItems(items, function(err, cnr_items) {
				if (err)
					throw err;
				else {
					if (farms.length != 0) {
						var assignment_arr = [];
						farms.forEach(function(item) {
							assignment_arr.push({ cnr_id: result[0].cnr_id, farm_id: item });
						});
						nutrientModel.createCNRAssignments(assignment_arr, function(err, cnr_assignments) {
							if (err)
								throw err;
							else {

							}
						});
					}
					res.redirect('/nutrient_mgt/recommendation_system');
				}
			});
		}
	});
}

exports.createCNRPlan = function(req, res) {
	var { name, farms, items } = req.query;
	if (farms == undefined)
		farms = [];

	nutrientModel.createCNR({ cnr_name: name }, function(err, cnr_result) {
		if (err)
			throw err;
		else {
			items.forEach(function(item) {
				item['cnr_id'] = cnr_result.insertId;
			});
			nutrientModel.createCNRItems(items, function(err, cnr_items) {
				if (err)
					throw err;
				else {

					if (farms.length != 0) {
						var assignment_arr = [];
						farms.forEach(function(item) {
							assignment_arr.push({ cnr_id: cnr_result.insertId, farm_id: item });
						});
						nutrientModel.createCNRAssignments(assignment_arr, function(err, cnr_assignments) {
							if (err)
								throw err;
							else {

							}
						});
					}
					res.redirect('/nutrient_mgt/recommendation_system');
				}
			});
		}
	});
}