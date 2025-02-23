const dataformatter = require('../public/js/dataformatter.js');
const reportModel = require('../models/reportModel.js');
const farmModel = require('../models/farmModel.js');
const workOrderModel = require('../models/workOrderModel.js');
const weatherForecastModel = require('../models/weatherForecastModel.js');
const cropCalendarModel = require('../models/cropCalendarModel.js');
const harvestModel = require('../models/harvestModel.js');
const nutrientModel = require('../models/nutrientModel.js');
const materialModel = require('../models/materialModel.js');
const analyzer = require('../public/js/analyzer.js');
const js = require('../public/js/session.js');
const chart_formatter = require('../public/js/chart_formatter.js');
const request = require('request');
const mathjs = require('mathjs');

var temp_lat = 13.073091;
var temp_lon = 121.388563;
var key = '2ae628c919fc214a28144f699e998c0f'; // Paid API Key
var open_weather_key = 'd7aa391cd7b67e678d0df3f6f94fda20';
const _MS_PER_DAY = 1000 * 60 * 60 * 24;

const min_temp = 'rgba(	255, 166, 0, 0.6)';
const max_temp = 'rgba(188,	80,	144, 0.6)';
const temp = 'rgba(255,99,97, 0.6)';

// a and b are javascript Date objects
function dateDiffInDays(a, b) {
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function processNutrientChartData(sql_filter, calendar_list, nutrient_chart, pd_chart) {
	var nutrient_chart_arr = [], temp_nutrient, temp_pd, temp, calendar;
	var legends;
	for (var x = 0; x < sql_filter.length; x++) {
		calendar = calendar_list.filter(e => e.calendar_id == parseInt(sql_filter[x]))[0];

		temp_nutrient = nutrient_chart.filter(e => e.crop_calendar_id == parseInt(sql_filter[x]));
		temp_pd = pd_chart.filter(e => e.calendar_id == parseInt(sql_filter[x]));
		//
		for (var i = 0; i < temp_nutrient.length; i++) {
			if (new Date(calendar.sowing_date > new Date(temp_nutrient[i].date_completed))) {
				temp_nutrient[i]['dat'] = dateDiffInDays(new Date(calendar.sowing_date), new Date(temp_nutrient[i].date_completed));
			}
			else {
				temp_nutrient[i]['dat'] = dateDiffInDays(new Date(temp_nutrient[i].date_completed), new Date(calendar.sowing_date));
			}
			
			if (calendar.method == 'Transplanting')
				temp_nutrient[i].dat += 15;
		}
		// PD data
		for (var i = 0; i < temp_pd.length; i++) {
			if (new Date(calendar.sowing_date > new Date(temp_pd[i].date_diagnosed))) {
				temp_pd[i]['dat'] = dateDiffInDays(new Date(calendar.sowing_date), new Date(temp_pd[i].date_diagnosed));
			}
			else {
				temp_pd[i]['dat'] = dateDiffInDays(new Date(temp_pd[i].date_diagnosed), new Date(calendar.sowing_date));
			}

			if (calendar.method == 'Transplanting')
				temp_pd[i].dat += 15;
		}

		var temp_data = analyzer.processNutrientChart(temp_nutrient, temp_pd);
		legends = temp_data.legends;

		nutrient_chart_arr.push({ 
			farm_name: calendar_list.filter(e => e.calendar_id == sql_filter[x])[0].farm_name, 
			data: temp_data.dataset
		});
	}

	if (nutrient_chart_arr.length == 1) {
		nutrient_chart_arr.push({ yes: true });
	}

	return { dataset: nutrient_chart_arr, legends: legends };
}

function processWeatherChartData(result, type) {
	var month_arr = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var data = { labels: [], datasets: [] };
	var data_cont = { min_temp: [], max_temp: [], avg_temp: [], precip: [] };

	result.forEach(function(item) {
		data_cont.min_temp.push(item.temp_min);
		data_cont.max_temp.push(item.temp_max);
		data_cont.avg_temp.push(item.temp);
		//data_cont.precip.push(item.precip);
		if (type == 'grouped')
			data.labels.push(`${month_arr[item.month]} (${item.year})`);
		else 
			data.labels.push(dataformatter.formatDate(new Date(item.date), 'mm DD, YYYY'));
	});
	data.datasets.push({ type: 'line', backgroundColor: min_temp, borderColor: min_temp, label: 'Min Temp', yAxisID: 'y', data: data_cont.min_temp });
	data.datasets.push({ type: 'line', backgroundColor: max_temp, borderColor: max_temp, label: 'Max Temp', yAxisID: 'y', data: data_cont.max_temp });
	data.datasets.push({ type: 'line', backgroundColor: temp, borderColor: temp, label: 'Avg Temp', yAxisID: 'y', data: data_cont.avg_temp });
	//data.datasets.push({ type: 'bar', backgroundColor: 'rgba(	0, 63, 92, 0.6)', borderColor: 'rgba(0, 63, 92, 0.6)', label: 'Precipitation', yAxisID: 'y1', data: data_cont.precip });
	return data;
}

function groupSPI_N(arr, month, n) {
	var filter = arr.map(e => e.month);
	var indices = filter.reduce(function(a, e, i) {
	    if (e === month)
	        a.push(i);
	    return a;
	}, []);
	var cont = [];

	var grouped_precip, prev_n, len;
	indices.forEach(function(item, index) {
		// Group precipitation data according to time series (3 mo, 6 mo, etc)
		// i.e SPI 3 for February requires data from Dec, Jan, and Feb
		prev_n = (item - n+1) <= 0 ? 0 : (item - n+1);
		grouped_precip = arr.slice(prev_n, item+1);
		len = grouped_precip.length;
		grouped_precip = grouped_precip.reduce((n, { precip }) => n + precip, 0) / len;

		cont.push({ date:`${arr[item].year} ${arr[item].month}`, data: grouped_precip, count: len });
	});
	//

	return cont;
}

function getGammaParameters(data) {
	var mean_precip = data.reduce((n , { data }) => n + data, 0) / data.length;

	var A = (mathjs.log(mean_precip) - (data.reduce((n , { data }) => n + mathjs.log(data), 0) / data.length ) );
	var alpha = (1/(4*A) * (1+mathjs.sqrt(1+(4*A/3) ) ) );
	var beta = mean_precip / alpha;
	
	return { alpha: alpha, beta: beta };
}

function gammaEq(params, spi_data) {
	var g_of_x = (1/mathjs.gamma(params.alpha)) * 1;
	var x = spi_data[spi_data.length-1].data;
	var t = x / params.beta;
	var integral = ( (mathjs.pow(t, params.alpha-1)) * (mathjs.pow(2.71828, t*-1)) ) / mathjs.pow(1, params.alpha-1);
}

function calculateSPI(spi_data, month, n) {
	var spi_data = groupSPI_N(spi_data, month, n);
	var gamma_params = getGammaParameters(spi_data);
	gammaEq(gamma_params, spi_data);

}

exports.getBenchmarkCharts = function(req, res, next) {
	farmModel.getAllFarms(function(err, farm_list) {
		if (err)
			throw err;
		else {
			// Change active filters as needed
			farm_list.forEach(function(item, index) {
					farm_list[index]['checked'] = true;
			});
			req.farm_list = { lowland: farm_list.filter(e=>e.land_type=='Lowland'), upland: farm_list.filter(e=>e.land_type=='Upland') };

			cropCalendarModel.getCropPlans(function(err, crop_plans) {
				if (err)
					throw err;
				else {
					const unique_cycles = [...new Set(crop_plans.map(e => e.crop_plan).map(item => item))];
					const unique_farms = [...new Set(farm_list.map(e => e.farm_id).map(item => item))];

					var cycle_cont = [], checked;
					unique_cycles.forEach(function(item, index) {
						if (index <= 5)
							checked = true;
						else
							checked = false;

						cycle_cont.push({ cycle_name: unique_cycles[index], checked: checked });
					});
					req.crop_plans = cycle_cont;

					if (unique_cycles.length != 0) {
						reportModel.getProductionOverview({ farm_id: unique_farms, cycles: unique_cycles }, function(err, production_chart_data) {
							if (err)
								throw err;
							else {
								var production_chart = chart_formatter.formatProductionChart(production_chart_data);
								req.production_chart = JSON.stringify(production_chart);

								reportModel.getFertilizerConsumption({ farm_id: unique_farms, cycles: unique_cycles }, function(err, nutrient_consumption_data) {
									if (err)
										throw err;
									else {
										var nutrient_consumption_chart = chart_formatter.formatConsumptionChart(nutrient_consumption_data);
										req.consumption_chart = JSON.stringify(nutrient_consumption_chart);

										reportModel.getPDOverview({ farm_id: unique_farms, cycles: unique_cycles }, function(err, pd_overview_data) {
											if (err)
												throw err;
											else {
												var pd_overview = chart_formatter.formatPDOverview(pd_overview_data);
												req.pd_overview_chart = { stage: JSON.stringify(pd_overview.stage), trend: JSON.stringify(pd_overview.trend) };
											
												return next();
											}
										});
									}
								});

							}
						});
					}
					else {
						return next();
					}	
				}
			});
		}
	});
}

exports.ajaxWeatherChart = function(req, res) {
	var start_date = new Date(req.query.start_date), end_date = new Date(req.query.end_date);
	var diff = Math.abs(end_date - start_date);
	var diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24)); 

	weatherForecastModel.getWeatherChart({ type: diffDays <= 90 ? '' : 'grouped', start_date: dataformatter.formatDate((start_date), 'YYYY-MM-DD'), end_date: dataformatter.formatDate((end_date), 'YYYY-MM-DD') }, function(err, weather_chart) {
		if (err)
			throw err;
		else {
			res.send({ stringify: processWeatherChartData(weather_chart, diffDays <= 90 ? '' : 'grouped') });
		}
	});
}

exports.ajaxFilterOverview = function(req, res) {
	var html_data = {};
	const unique_cycles = req.query.selected_cycles;
	const unique_farms = req.query.selected_farms;

	reportModel.getProductionOverview({ farm_id: unique_farms, cycles: unique_cycles }, function(err, production_chart_data) {
		if (err)
			throw err;
		else {
			reportModel.getFertilizerConsumption({ farm_id: unique_farms, cycles: unique_cycles }, function(err, nutrient_consumption_data) {
				if (err)
					throw err;
				else {
					reportModel.getPDOverview({ farm_id: unique_farms, cycles: unique_cycles }, function(err, pd_overview_data) {
						if (err)
							throw err;
						else {
							var production_chart = chart_formatter.formatProductionChart(production_chart_data);
							var nutrient_consumption_chart = chart_formatter.formatConsumptionChart(nutrient_consumption_data);
							var pd_overview = chart_formatter.formatPDOverview(pd_overview_data);

							html_data['production_chart'] = (production_chart);
							html_data['consumption_chart'] = (nutrient_consumption_chart);
							html_data['pd_overview_chart'] = (pd_overview);

							res.send(html_data);
						}
					});
							
				}
			});
					
		}
	});
}

exports.testDisasterChart = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'reports', req.session);
	var month = 2;
	var start_date = new Date(req.session.cur_date);
	start_date.setMonth(start_date.getMonth() - 12);
	
	res.render('customCNRTest', html_data);
}

exports.getDetailedReport = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'reports', req.session);

	reportModel.getFarmProductivity(function(err, fp_overview) {
		if (err)
			throw err;
		else {
			fp_overview = fp_overview.filter(e => e.calendar_id == req.query.calendar_id);
			
			var calendar_arr = fp_overview.map(({ calendar_id }) => calendar_id).concat(fp_overview.map(({ max_prev_calendar }) => max_prev_calendar));
			reportModel.getInputResourcesUsed({ calendar_ids: calendar_arr }, function(err, input_resources) {
				if (err)
					throw err;
				else {
					harvestModel.readHarvestDetail({ cct_id: req.query.calendar_id }, function(err, harvest_details) {
						if (err)
							throw err;
						else {
							var total_harvest = 0;
							harvest_details.forEach(function(item) {
								total_harvest += item.sacks_harvested;
							})
							fp_overview[0]['current_yield'] = total_harvest;
							
							var query = { status: ['In-Progress', 'Active', 'Completed'], date: req.session.cur_date};
							
							cropCalendarModel.getCropCalendarByID(query, req.query.calendar_id,  function(err, calendar_details) {

							farmModel.getSpecificFarm({farm_id: calendar_details[0].farm_id}, function(err,farm_details) {


							input_resources = input_resources.filter(e => e.calendar_id == req.query.calendar_id);
							html_data['farm_productivity'] = analyzer.processDetailedFarmProductivity(fp_overview, input_resources);
							html_data['calendar'] = calendar_details[0];
							html_data['farm'] = farm_details[0];
							html_data["notifs"] = req.notifs;
							res.render('detailed_farm_report', html_data);

							});
							});
						}
					});
							
				}
			});
		}
	});
}

exports.getFarmProductivityReport = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'reports', req.session);

	html_data['farm_list'] = req.farm_list;
	html_data['crop_plans'] = req.crop_plans;
	html_data['production_chart'] = req.production_chart;
	html_data['consumption_chart'] = req.consumption_chart;

	reportModel.getFarmProductivity(function(err, fp_overview) {
		if (err)
			throw err;
		else {
			var calendar_arr = fp_overview.map(({ calendar_id }) => calendar_id).concat(fp_overview.map(({ max_prev_calendar }) => max_prev_calendar));

			if (calendar_arr.length != 0) {
				reportModel.getInputResourcesUsed({ calendar_ids: calendar_arr }, function(err, input_resources) {
					if (err)
						throw err;
					else {	
						html_data['farm_productivity'] = analyzer.smoothFP(analyzer.calculateProductivity(fp_overview, input_resources));
						html_data['currentCycle'] = fp_overview[fp_overview.length-1];
					}
				});
			}
				
			reportModel.getHarvestReports(function(err, harvest_reports) {
				if (err)
					throw err;
				else {
					//
					var years = harvest_reports.map( ({crop_plan}) => crop_plan.replace(/\D/g, "") );
					years = years.filter((x, i, a) => a.indexOf(x) == i)
					var lbl = ['Late', 'Early'];
					var arr;
					
					// for (var y = 0; y < harvest_reports.length; y++) {
					// 	for (var i = 0; i < years.length; i++) {
					// 		for (var x = lbl.length; x > 0; x--) {
					// 			if (`${lbl[x]} ${years[i]}` == harvest_reports[y].crop_plan) {
					//
					// 			}
					// 		}
					// 	}

					// }
					// var filtered;
					// for (var i = 0; i < harvest_reports.length; i++) {
					// 	for (var x = 0; x < years.length; x++) {
					// 		filtered = harvest_reports.filter(e => (e.crop_plan.replace(/\D/g, "")) == years[x]);
					//

					// 		filtered.sort((a,b) => a.crop_plan < b.crop_plan);
					//
					// 	}
					// }

					// harvest_reports.sort((a,b) => a.crop_plan.replace(/\D/g, "") > b.crop_plan.replace(/\D/g, ""));
					//

					//
					html_data['harvest_reports'] = harvest_reports;

					//
					html_data["notifs"] = req.notifs;
					res.render('farm_productivity_report', html_data);
				}
			});		
		}
	});
}

exports.ajaxSeedChart = function(req, res) {
	var html_data = {};

	reportModel.getSeedChart( req.query.farms, req.query.plans, function(err, seed_chart) {
		if (err)
			throw err;
		else {
			materialModel.getMaterialsList('Seed', null, function(err, seed_materials) {
				if (err)
					throw err;
				else {
					const calendar_list = seed_chart;
					const calendar = calendar_list.filter(e => e.calendar_id == req.query.id)[0];
					const crop_plans = [...new Set(calendar_list.map(e => e.crop_plan).map(item => item))];

					seed_chart = analyzer.processSeedChartData(seed_chart, seed_materials)
					
					res.send({ stringify: (seed_chart.data), obj: seed_chart.stringify, legends: seed_chart.legends });
				}
			});
		}
	});
}

exports.ajaxNutrientTimingChart = function(req, res) {
	var html_data = {};
	var sql_filter = req.query.calendars;
	console.log(sql_filter);
	sql_filter.forEach(function(item, index) {
		sql_filter[index] = parseInt(item);
	});
	//
	reportModel.getSeedChart( req.query.farms, req.query.plans, function(err, seed_chart) {
		if (err)
			throw err;
		else {
			reportModel.getNutrientChart({ crop_calendar_id: sql_filter }, { calendar_id: sql_filter }, function(err, nutrient_chart) {
				if (err)
					throw err;
				else {
					console.log(nutrient_chart.filter(e => e.crop_calendar_id == '105' && e.application_type == 'Applied' && e.nutrient_type == 'K'));
					reportModel.getPDOccurence({ calendar_id: sql_filter }, function(err, pd_chart) {
						if (err)
							throw err;
						else {
							var nutrient_chart_arr = processNutrientChartData(sql_filter, seed_chart, nutrient_chart, pd_chart);
							html_data['obj'] = nutrient_chart_arr.dataset;
							html_data['legends'] = nutrient_chart_arr.legends;

							nutrientModel.getNutrientPlanDetails({ calendar_id: sql_filter[0] }, function(err, frp) {
								if (err)
									throw err;
								else {
									reportModel.getPDOccurence({ calendar_id: [sql_filter[0]] }, function(err, pd_chart) {
										if (err)
											throw err;
										else {
											nutrientModel.getNutrientPlanItems({ fr_plan_id: frp[0].fr_plan_id }, function(err, fr_items) {
												if (err)
													throw err;
												else {
													workOrderModel.getGroupedWO('Fertilizer Application' , sql_filter[0], function(err, wo_list) {
														if (err)
															throw err;
														else {
															cropCalendarModel.readCropCalendar({ calendar_id: sql_filter[0] }, function(err, calendar_details) {
																if (err)
																	throw err;
																else {
																	html_data['exception1'] = processFertilizerApplications(fr_items, wo_list, calendar_details[0], pd_chart);

																	if (sql_filter.length == 2) {
																		nutrientModel.getNutrientPlanDetails({ calendar_id: sql_filter[1] }, function(err, frp1) {
																			if (err)
																				throw err;
																			else {
																				reportModel.getPDOccurence({ calendar_id: [sql_filter[1]] }, function(err, pd_chart1) {
																					if (err)
																						throw err;
																					else {
																						nutrientModel.getNutrientPlanItems({ fr_plan_id: frp1[0].fr_plan_id }, function(err, fr_items1) {
																							if (err)
																								throw err;
																							else {
																								workOrderModel.getGroupedWO('Fertilizer Application' , sql_filter[1], function(err, wo_list1) {
																									if (err)
																										throw err;
																									else {
																										cropCalendarModel.readCropCalendar({ calendar_id: sql_filter[1] }, function(err, calendar_details1) {
																											if (err)
																												throw err;
																											else {
																												html_data['exception2'] = processFertilizerApplications(fr_items1, wo_list1, calendar_details1[0], pd_chart1);

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
																	else
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

function dateDiff(date1, date2) {
	date2 = new Date(date2);
	date1 = new Date(date1);

	const diffTime = (date2 - date1);
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
	return diffDays;
}

function processFertilizerApplications(data1, data2, calendar, pd_data) {
	var type = '';
	var ideal_range = [];
	var dat;
	var within_range;
	var report_notes;
	var item_type;
	var date;
	//console.log(pd_data);

	data1.forEach(function(item, index) {
		date = new Date(item.target_application_date);
		date = date.setDate(date.getDate() + 7);
		item_type = `${item.fertilizer_name} application`;

		data1[index]['notes'] = '';
		data1[index]['report_notes'] = item.description;
		data1[index].date_start = dataformatter.formatDate(new Date(item.target_application_date), 'YYYY-MM-DD');
		data1[index].date_due = dataformatter.formatDate(new Date(date), 'YYYY-MM-DD');
		data1[index]['link_url'] = `#`;
		data1[index]['link_title'] = `N/A`;
		data1[index]['item_type'] = item_type;
	});

	pd_data.forEach(function(item, index) {
		dat = dateDiff(item.date_diagnosed, item.date_solved);
		item_type = `${item.pd_name} Diagnosed`;
		report_notes = `Found during ${item.stage_diagnosed} stage and took ${dat} days to resolve`;
		if (dat <= 7) {
			type = 'Quick Resolution';
		}
		else {
			type = 'Slow Resolution';
		}
		pd_data[index]['type'] = type;
		pd_data[index]['notes'] = '';
		pd_data[index]['report_notes'] = report_notes;
		pd_data[index].date_start = dataformatter.formatDate(new Date(item.date_diagnosed), 'YYYY-MM-DD');
		pd_data[index].date_due = dataformatter.formatDate(new Date(item.date_solved), 'YYYY-MM-DD');
		pd_data[index]['link_url'] = `/pest_and_disease/diagnose_details?id=${item.diagnosis_id}`;
		pd_data[index]['link_title'] = `Diagnosis ${item.diagnosis_id}`;
		pd_data[index]['item_type'] = item_type;
	});

	data2.forEach(function(item, index) {
		item_type = `${item.fertilizer_name} application`;
		if (item.record_type == 'Generated Recommendation') {
			if (dateDiff(item.date_completed, item.date_due) >= 0 && dateDiff(item.date_completed, item.date_start) <= 0) {
				type = 'In-range';
				report_notes = 'System recommendation applied on time';
			}
			else if (dateDiff(item.date_completed, item.date_due) < 0) {
				type = 'Late';
				report_notes = 'System recommendation applied too late';
			}
			else if (dateDiff(item.date_completed, item.date_start) > 0) {
				type = 'Early';
				report_notes = 'System recommendation applied too early';
			}
			else {
				type = 'err';
				console.log(item);
				console.log(dateDiff(item.date_completed, item.date_start));
				console.log(dateDiff(item.date_completed, item.date_due));
			}
		}
		else {
			within_range = 0;
			if (item.fertilizer_name == 'Urea 46-0-0') {
				ideal_range = [[14,20], [20,35], [40,50], [60,70]];
			}
			else if (item.fertilizer_name == 'Fertilizer 16-20-0') {
				ideal_range = [[-5, 0]];
			}
			else if (item.fertilizer_name == 'Potash 0-0-60') {
				ideal_range = [[-5, 0]];
			}

			dat = dateDiff(calendar.sowing_date, item.date_completed);

			if (calendar.method == 'Transplanting')
				dat += 15;

			ideal_range.forEach(function(item) {
				if (dat >= item[0] && dat <= item[1]) {
					within_range = 1;
				}
			})

			if (within_range == 0) {
				type = 'Manual Wrong';
				if (item.fertilizer_name != 'Potash 0-0-60') {
					report_notes = 'Fertilizer not applied at the ideal shedule';
				}
				else {
					report_notes = '';
				}
			}
			else {
				type = 'Manual Right';
				report_notes = 'Fertilizer applied on ideal schedule';
			}
		}
			
		data2[index]['type'] = type;
		data2[index]['report_notes'] = report_notes;
		data2[index].date_start = dataformatter.formatDate(new Date(item.date_start), 'YYYY-MM-DD');
		data2[index].date_due = dataformatter.formatDate(new Date(item.date_due), 'YYYY-MM-DD');
		data2[index]['link_url'] = `/farms/work_order&id=${item.work_order_id}`;
		data2[index]['link_title'] = `WO ${item.work_order_id}`;
		data2[index]['item_type'] = item_type;
	});

	var list_obj = { 
		followed_recommendation_ontime: data2.filter(e => e.type == 'In-range'), 
		followed_recommendation_late: data2.filter(e => e.type == 'Late'), 
		followed_recommendation_early: data2.filter(e => e.type == 'Early'),
		unfollowed_recommendation: data1.filter(e => e.isCreated == 0),
		manual_application_wrong_time: data2.filter(e => e.type == 'Manual Wrong' && e.fertilizer_name != 'Potash 0-0-60'), 
		manual_application_right_time: data2.filter(e => e.type == 'Manual Right'),
		pd_quick_resolution: pd_data.filter(e => e.type == 'Quick Resolution'),
		pd_slow_resolution: pd_data.filter(e => e.type == 'Slow Resolution')
	};

	var report_obj = {
		good: [],
		bad: [],
		improvement: []
	}
	//console.log(data2.filter(e => e.record_type == 'Generated Recommendation').length);
	// What went right
	if (list_obj.followed_recommendation_ontime.length > 0) {
		report_obj.good.push({
			row_title: `Followed system recommendations and completed on-time: (${list_obj.followed_recommendation_ontime.length}/${data2.filter(e => e.record_type == 'Generated Recommendation').length})`,
			row_items: list_obj.followed_recommendation_ontime
		});
	}
	if (list_obj.manual_application_right_time.length > 0) {
		report_obj.good.push({
			row_title: `Generated user fertilizer applications completed on optimal timing: (${list_obj.manual_application_right_time.length}/${data2.filter(e => e.record_type != 'Generated Recommendation').length})`,
			row_items: list_obj.manual_application_right_time
		});
	}
	if (list_obj.pd_quick_resolution.length > 0) {
		report_obj.good.push({
			row_title: `Quick resolution time of diagnosed pest and diseases: (${list_obj.pd_quick_resolution.length}/${pd_data.length})`,
			row_items: list_obj.pd_quick_resolution
		});
	}

	// What went wrong
	if (list_obj.manual_application_wrong_time.length > 0) {
		report_obj.bad.push({
			row_title: `Generated user fertilizer applications not performed on optimal timing: (${list_obj.manual_application_wrong_time.length}/${data2.filter(e => e.record_type != 'Generated Recommendation').length})`,
			row_items: list_obj.manual_application_wrong_time
		});
	}
	if (list_obj.pd_slow_resolution.length > 0) {
		report_obj.bad.push({
			row_title: `Slow resolution time of diagnosed pest and diseases: (${list_obj.pd_slow_resolution.length}/${pd_data.length})`,
			row_items: list_obj.pd_slow_resolution
		});
	}

	// What can be improved
	if (list_obj.unfollowed_recommendation.length > 0) {
		report_obj.improvement.push({
			row_header: `Adherance to system recommendations on fertilizer application`,
			row_title: `Unfollowed system recommendations: (${list_obj.unfollowed_recommendation.length}/${list_obj.unfollowed_recommendation.length+list_obj.followed_recommendation_ontime.length})`,
			row_items: list_obj.unfollowed_recommendation
		});
	}
	var len = list_obj.followed_recommendation_late.length + list_obj.followed_recommendation_early.length;
	if (list_obj.followed_recommendation_late.length > 0) {
		report_obj.improvement.push({
			row_header: `Completion of generated system recommendations within the ideal range`,
			row_title: `System recommendations completed too early or too late: (${len}/${len})`,
			row_items: list_obj.followed_recommendation_late.concat(list_obj.followed_recommendation_early)
		});
	}

	return report_obj;
};

exports.getSummaryHarvestReport = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'reports', req.session);

	reportModel.getHarvestSummaryChart({ calendar_ids: req.query.id.split(','), status: 'Completed' }, function(err, chart_data) {
		if (err)
			throw err;
		else {
			reportModel.getCropCalendarNutrientRecommendations({ calendar_ids: req.query.id.split(',') }, function(err, nutrient_reco_count) {
				if (err)
					throw err;
				else {
					reportModel.getNutrientRecommendationDetails({ calendar_ids: req.query.id.split(',') }, function(err, nutrient_reco_details) {
						if (err)
							throw err;
						else {
							reportModel.getEarlyHarvestDetails({ calendar_ids: req.query.id.split(',') }, function(err, early_harvest) {
								if (err)
									throw err;
								else {
									reportModel.getHistoricalYieldQuery({ calendar_ids: req.query.id.split(',') }, function(err, query) {
										if (err)
											throw err;
										else {
											reportModel.getHistoricalYield(query, function(err, historical_yield) {
												if (err)
													throw err;
												else {
													reportModel.getFarmProductivity(function(err, fp_overview) {
														if (err)
															throw err;
														else {
															var calendar_arr = fp_overview.map(({ calendar_id }) => calendar_id).concat(fp_overview.map(({ max_prev_calendar }) => max_prev_calendar));
															reportModel.getInputResourcesUsed({ calendar_ids: calendar_arr }, function(err, input_resources) {
																if (err)
																	throw err;
																else {
																	html_data['data'] = analyzer.processHarvestSummary(chart_data, early_harvest, historical_yield, analyzer.calculateProductivity(fp_overview, input_resources), nutrient_reco_details, nutrient_reco_count);
																	
																	var arr = [], obj, calendar_ids;
																	reportModel.getHarvestSummaryChart({ crop_plan: req.params.crop_plan, status: 'Completed' }, function(err, chart_data1) {
																		if (err) {
																			throw err;
																		}
																		else {
																			// Get best, worst, and target crop plans checked
																			var ranking = ['1st', '2nd', '3rd'], i = 0, x = 0;
																			obj = chart_data1[0]
																			obj['category'] = 'Target';
																			arr.push(obj);

																			while(x < chart_data1.length) {
																				obj = chart_data1.reduce((a,b)=>a.harvested>b.harvested ?a:b);
																				chart_data1 = chart_data1.filter(function(e) { return e.calendar_id !== obj.calendar_id });
																				obj['category'] = ranking[i];
																				if (i == 0)
																					obj['isTarget'] = true;
																				arr.push(obj);
																				if (i < ranking.length) 
																					i++;
																			}

																			// Clean array and indicate if object is best, worst, or target
																			arr = [...new Map(arr.map(item =>
																  		[item.calendar_id, item])).values()];

																  		if (arr.length == 1)
																  			arr[0]['category'] = '';

																  		arr.sort((a,b) => b.harvested - a.harvested);

																  		calendar_ids = arr.map(a => a.calendar_id );
																			reportModel.getNutrientRecommendationDetails({ calendar_ids: calendar_ids }, function(err, nutrient_reco_details) {
																				if (err) {
																					throw err;
																				}
																				else {
																					html_data['comparison'] = analyzer.prepHarvestComparison(arr, nutrient_reco_details);
																					farmModel.filteredFarmDetails({ farm_name: req.query.farm }, function(err, farm) {
																					if (err) {
																						throw err
																					}
																					else {
																						cropCalendarModel.getAllCalendars(function(err, crop_cycle_list) {
																							if (err)
																								throw err;
																							else {
																								var crop_plan_list = crop_cycle_list.map(a => a.crop_plan);
																								crop_plan_list = crop_plan_list.slice(crop_plan_list.indexOf(req.params.crop_plan), crop_plan_list.length);

																								cropCalendarModel.getCropPlans(function(err, all_crop_plans) {
																									if (err)
																										throw err;
																									else {
																										farmModel.getAllFarms(function(err, farm_list) {
																											if (err)
																												throw err;
																											else {
																												var farm_filter2;

																												farm_list.forEach(function(e) {
																													arr.forEach(function(item, index) {
																														if (e.farm_name == item.farm_name) {
																															e['checked'] = true
																														}
																														if (e.farm_name == item.farm_name && !item.hasOwnProperty('isTarget') && index == 0) {
																															farm_filter2 = e.farm_name;
																															e['nutrient_check2'] = true
																														}
																													})
																													if (e.farm_name == arr[0].farm_name) {
																														e['nutrient_check1'] = true
																													}
																												});

																												var filter1 = all_crop_plans.filter(e => e.farm_name == arr[0].farm_name);
																												filter1.forEach(function(e) {
																													if (e.crop_plan == req.params.crop_plan) {
																														e['checked'] = true;
																													}
																												});

																												var filter2 = all_crop_plans.filter(e => e.farm_name == farm_filter2);
																												filter2.forEach(function(e) {
																													if (e.crop_plan == req.params.crop_plan) {
																														e['checked'] = true;
																													}
																												});

																												var sql_filter = filter1.filter(e => e.checked == true).map(a => a.calendar_id).concat(filter2.filter(e => e.checked == true).map(a => a.calendar_id));

																												reportModel.getSeedChart( arr.map(a => a.farm_name), crop_plan_list, function(err, seed_chart) {
																													if (err)
																														throw err;
																													else {
																														materialModel.getMaterialsList('Seed', null, function(err, seed_materials) {
																															if (err)
																																throw err;
																															else {
																																const calendar_list = seed_chart;
																																var calendar = calendar_list.filter(e => e.calendar_id == req.query.id)[0];
																																const crop_plans = [...new Set(crop_cycle_list.map(e => e.crop_plan).map(item => item))];
																																var range = [crop_plan_list[crop_plan_list.length-1], crop_plan_list[0]];

																																seed_chart = analyzer.processSeedChartData(seed_chart, seed_materials)
																																html_data['seed_chart_legends'] = seed_chart.legends;
																																html_data['seed_chart_lbls'] = seed_chart.farm_legends;
																																html_data['seed_chart'] = { stringify: JSON.stringify(seed_chart.data), obj: seed_chart };
																																html_data['crop_plans'] = { data: JSON.stringify(crop_plans.reverse()), index: JSON.stringify([crop_plans.indexOf(range[0]), crop_plans.indexOf(range[1])]), start: range[0], end: range[1] };

																																reportModel.getNutrientChart({ crop_calendar_id: sql_filter }, { calendar_id: sql_filter }, function(err, nutrient_chart) {
																																	if (err)
																																		throw err;
																																	else {
																																		reportModel.getPDOccurence({ calendar_id: sql_filter }, function(err, pd_chart) {
																																			if (err)
																																				throw err;
																																			else {
																																				nutrient_chart_arr = processNutrientChartData(sql_filter, calendar_list, nutrient_chart, pd_chart);

																																				if (farm_list.filter(e => e.nutrient_check2 == true).length == 0) {
																																					farm_list.unshift({
																																						extra: true
																																					});
																																				}

																																				nutrientModel.getNutrientPlanDetails({ calendar_id: sql_filter }, function(err, frp) {
																																					if (err)
																																						throw err;
																																					else {
																																						nutrientModel.getNutrientPlanItems({ fr_plan_id: frp[0].fr_plan_id }, function(err, fr_items) {
																																							if (err)
																																								throw err;
																																							else {
																																								workOrderModel.getGroupedWO('Fertilizer Application' , sql_filter, function(err, wo_list) {
																																									if (err)
																																										throw err;
																																									else {
																																										cropCalendarModel.readCropCalendar({ calendar_id: sql_filter }, function(err, calendar_details) {
																																											if (err)
																																												throw err;
																																											else {
																																											console.log(farm_list);
																																												html_data['exception1'] = processFertilizerApplications(fr_items, wo_list, calendar_details[0], pd_chart);
																																												html_data['farm_list'] = farm_list;
																																												html_data['json_nutrient'] = nutrient_chart_arr.dataset;

																																												html_data['nutrient_chart_legends'] = nutrient_chart_arr.legends
																																												html_data['nutrient_chart'] = JSON.stringify(nutrient_chart_arr.dataset);

																																												html_data['nutrient_filter'] = { crop_plan1: filter1, crop_plan2: filter2, crop_plan_list: JSON.stringify(all_crop_plans) };
																																												html_data["notifs"] = req.notifs;
																																												//console.log(html_data.exception1);
																																												res.render('summary_harvest_report', html_data);	
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
									})
								}
							});
						}
					});
				}
			});
					
					
		}
	});
}

exports.getDetailedHarvestReport = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'reports', req.session);
	html_data["notifs"] = req.notifs;
	html_data["farm_name"] = req.query.farm;
	html_data['range'] = { start: "2017-01-01", end: dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD') };

	var arr = [], obj, calendar_ids;
	reportModel.getHarvestSummaryChart({ crop_plan: req.params.crop_plan, status: 'Completed' }, function(err, chart_data) {
		if (err) {
			throw err;
		}
		else {
			// Get best, worst, and target crop plans checked
			var ranking = ['1st', '2nd', '3rd'], i = 0, x = 0;
			obj = chart_data.filter(a => a.calendar_id == req.query.id)[0]
			obj['category'] = 'Target';
			arr.push(obj);

			while(x < chart_data.length) {
				obj = chart_data.reduce((a,b)=>a.harvested>b.harvested ?a:b);
				chart_data = chart_data.filter(function(e) { return e.calendar_id !== obj.calendar_id });
				obj['category'] = ranking[i];
				arr.push(obj);
				if (i < ranking.length) 
					i++;

			}

			// Clean array and indicate if object is best, worst, or target
			arr = [...new Map(arr.map(item =>
  		[item.calendar_id, item])).values()];
  		arr.filter(e => e.calendar_id == req.query.id)[0]['isTarget'] = true;

  		if (arr.length == 1)
  			arr[0]['category'] = '';

  		arr.sort((a,b) => b.harvested - a.harvested);

  		calendar_ids = arr.map(a => a.calendar_id );

			reportModel.getNutrientRecommendationDetails({ calendar_ids: calendar_ids }, function(err, nutrient_reco_details) {
				if (err) {
					throw err;
				}
				else {

					html_data['comparison'] = analyzer.prepHarvestComparison(arr, nutrient_reco_details);
					farmModel.filteredFarmDetails({ farm_name: req.query.farm }, function(err, farm) {
					if (err) {
						throw err
					}
					else {
						cropCalendarModel.getAllCalendars(function(err, crop_cycle_list) {
							if (err)
								throw err;
							else {
								var crop_plan_list = crop_cycle_list.map(a => a.crop_plan);
								crop_plan_list = crop_plan_list.slice(crop_plan_list.indexOf(req.params.crop_plan), crop_plan_list.length);

								cropCalendarModel.getCropPlans(function(err, all_crop_plans) {
									if (err)
										throw err;
									else {
										farmModel.getAllFarms(function(err, farm_list) {
											if (err)
												throw err;
											else {
												var farm_filter2;
												farm_list.forEach(function(e) {
													arr.forEach(function(item, index) {
														if (e.farm_name == item.farm_name) {
															e['checked'] = true
														}
														if (e.farm_name == item.farm_name && !item.hasOwnProperty('isTarget') && index == 0) {
															farm_filter2 = e.farm_name;
															e['nutrient_check2'] = true
														}
													})
													if (e.farm_name == req.query.farm) {
														e['nutrient_check1'] = true
													}
														
												});

												var filter1 = all_crop_plans.filter(e => e.farm_name == req.query.farm);
												filter1.forEach(function(e) {
													if (e.crop_plan == req.params.crop_plan) {
														e['checked'] = true;
													}
												});

												var filter2 = all_crop_plans.filter(e => e.farm_name == farm_filter2);
												filter2.forEach(function(e) {
													if (e.crop_plan == req.params.crop_plan) {
														e['checked'] = true;
													}
												});
												var sql_filter = filter1.filter(e => e.checked == true).map(a => a.calendar_id).concat(filter2.filter(e => e.checked == true).map(a => a.calendar_id));

												reportModel.getSeedChart( arr.map(a => a.farm_name), crop_plan_list, function(err, seed_chart) {
													if (err)
														throw err;
													else {
														materialModel.getMaterialsList('Seed', null, function(err, seed_materials) {
															if (err)
																throw err;
															else {
																const calendar_list = seed_chart;
																var calendar = calendar_list.filter(e => e.calendar_id == req.query.id)[0];
																const crop_plans = [...new Set(crop_cycle_list.map(e => e.crop_plan).map(item => item))];
																var range = [crop_plan_list[crop_plan_list.length-1], crop_plan_list[0]];

																seed_chart = analyzer.processSeedChartData(seed_chart, seed_materials)
																html_data['seed_chart_lbls'] = seed_chart.farm_legends;
																html_data['seed_chart'] = { stringify: JSON.stringify(seed_chart.data), obj: seed_chart };
																html_data['crop_plans'] = { data: JSON.stringify(crop_plans.reverse()), index: JSON.stringify([crop_plans.indexOf(range[0]), crop_plans.indexOf(range[1])]), start: range[0], end: range[1] };

																reportModel.getNutrientChart({ crop_calendar_id: sql_filter }, { calendar_id: sql_filter }, function(err, nutrient_chart) {
																	if (err)
																		throw err;
																	else {
																		reportModel.getPDOccurence({ calendar_id: sql_filter }, function(err, pd_chart) {
																			if (err)
																				throw err;
																			else {
																				nutrient_chart_arr = processNutrientChartData(sql_filter, calendar_list, nutrient_chart, pd_chart);

																				if (farm_list.filter(e => e.nutrient_check2 == true).length == 0) {
																					farm_list.unshift({
																						extra: true
																					});
																				}

																				html_data['farm_list'] = farm_list;
																				html_data['json_nutrient'] = nutrient_chart_arr;

																				html_data['nutrient_chart'] = JSON.stringify(nutrient_chart_arr);

																				html_data['nutrient_filter'] = { crop_plan1: filter1, crop_plan2: filter2, crop_plan_list: JSON.stringify(all_crop_plans) };
																				html_data["notifs"] = req.notifs;

																				res.render('detailed_harvest_report', html_data);		
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
	});																
}

// Trial for getting ndvi data
							// if (true) {
							// 	const calendar = calendar_list.filter(e => e.calendar_id == req.query.id)[0];

							// 	var url = 'http://api.agromonitoring.com/agro/1.0/polygons?appid='+key;
							//     request(url, { json: true }, function(err, response, farm_body) {
							//         if (err)
							//         	throw err;
							//         else {
							//         	var start_date = dataformatter.dateToUnix(calendar.sowing_date), end_date = dataformatter.dateToUnix(calendar.harvest_date);
							// 			var obj;
							// 			var polygon_id = ((farm_body.filter(e => e.name == calendar.farm_name)[0]).id);

							// 			var data = {
							// 				polygon_id: polygon_id,
							// 				start: start_date,
							// 				end: end_date,
							// 				clouds_max: 1
							// 			};
							// 			var options = {
							// 				url: 'https://api.agromonitoring.com/agro/1.0/image/search?polyid='+polygon_id+'&start='+start_date+'&end='+end_date+'&appid='+key+'&clouds_max='+60,
							// 				method: 'GET',
							// 				headers: {
							// 					'Content-type':'application/json'
							// 				},
							// 				body: JSON.stringify(data)
							// 			};
							//
							// 			request(options, function(err, response, body) {
							// 				if (err)
							// 					throw err;
							// 				else {

							// 					body = JSON.parse(body);
							// 					var arr = [];
							// 					for (var i = 0; i < body.length; i++) {
							// 		        		body[i].dt = dataformatter.formatDate(dataformatter.unixtoDate(body[i].dt), 'YYYY-MM-DD');
							// 		        		body[i]['date'] = dataformatter.unixtoDate(body[i].dt);

							//

							// 		        		var stats_options = {
							// 		        			url: body[i].stats.ndvi,
							// 		        			method: 'GET',
							// 		        			headers: {
							// 		        				'Content-type':'application/json'
							// 		        			}
							// 		        		}
							// 		        		request(stats_options, function(err, response, stats) {
							// 		        			if (err)
							// 		        				throw err;

							// 		        			arr.push(stats.max);
							//
							// 		        		});
							// 		        	}
							//
							// 		        	//
							// 					//var result = body[body.length-1];
							// 					//result.dt = dataformatter.unixtoDate(result.dt);
							// 					////
							// 					res.render('detailed_harvest_report', html_data);
							// 				}
							// 			});
							//         }
							//     });
							// }