const dataformatter = require('../public/js/dataformatter.js');
const chart_formatter = require('../public/js/chart_formatter.js');
const analyzer = require('../public/js/analyzer.js');
const js = require('../public/js/session.js');
const workOrderModel = require('../models/workOrderModel.js');
const employeeModel = require('../models/employeeModel.js');
const materialModel = require('../models/materialModel.js');
const pestdiseaseModel = require('../models/pestdiseaseModel.js');
const cropCalendarModel = require('../models/cropCalendarModel.js');
const farmModel = require('../models/farmModel.js');
const notifModel = require('../models/notificationModel.js');
const harvestModel = require('../models/harvestModel.js');
const weatherForecastModel = require('../models/weatherForecastModel.js');
const reportModel = require('../models/reportModel.js');
const globe = require('../controllers/smsController.js');
var request = require('request');

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

function consolidateResources(type, ids, qty, wo_id) {
	var query_arr = [];
	var resource_query;

	var resource_id = ids;
	var resource_qty = qty;

	for (var i = 0; i < resource_qty.length; i++) {
		if (resource_qty[i] == 0 || resource_qty[i] == '0') {
			resource_qty.splice(i, 1);
			resource_id.splice(i, 1);
			i--;
		}
	}

	for (var i = 0; i < resource_id.length; i++) {
		resource_query = {
			work_order_id: wo_id,
			type: type,
			units: null,
			qty: resource_qty[i],
			item_id: resource_id[i]
		};

		query_arr.push(resource_query);

		resource_query = null;
	}

	return query_arr;
}

exports.ajaxGetWOResources = function(req, res) {
	var query = { work_order_id: req.query.work_order_id };
	workOrderModel.getResourceDetails(query, req.query.type, function(err, resource_details) {
		if (err)
			throw err;
		else {
			// html_data['resources'] = resource_details;
			// html_data['resources']['title'] = type+'s:';
			// html_data['resources']['lbl'] = { name: type, item: type+'_id', qty: type+'_qty' };
			// html_data["notifs"] = req.notifs;
			//res.render('detailed_work_order', html_data);
			res.send(resource_details);
		}
	});
}

exports.getDetailedWO = function(req, res) {
	var query = { work_order_id: req.params.work_order_id };
	workOrderModel.getDetailedWorkOrder(query, function(err, details) {
		if (err)
			throw err;
		else {
			details = details[0];
			details['date_start'] = dataformatter.formatDate(new Date(details['date_start']), 'YYYY-MM-DD');
			details['date_due'] = dataformatter.formatDate(new Date(details['date_due']), 'YYYY-MM-DD');
			details['date_created'] = dataformatter.formatDate(new Date(details['date_created']), 'YYYY-MM-DD');

			if (details.date_completed != null || details.date_completed != undefined)
				details['date_completed'] = dataformatter.formatDate(new Date(details['date_completed']), 'YYYY-MM-DD');

			var type;
			var html_data = {
				work_order: details,
				editable: details.status == 'Completed' || details.status == 'Cancelled' ? false : true
			};

			html_data = js.init_session(html_data, 'role', 'name', 'username', 'farms', req.session);
			html_data['stage'] = '';
			html_data['farm_area'] = 0;
			html_data['status_editable'] = true;
			html_data['harvest_editable'] = details.type == 'Harvest' ? true : false;
			html_data['farm_id'] = details.farm_id;
			html_data['isCancellable'] = true;
			switch (details.type) {
				case 'Sow Seed':
				type = 'Seed';
				html_data['isCancellable'] = false;
				break;
				case 'Pesticide Application':
				type = 'Pesticide';
				break;
				case 'Fertilizer Application':
				type = 'Fertilizer';
				break;
				case 'Harvest':
				type = 'Harvest';
				html_data['isCancellable'] = false;
				break;
				case 'Land Preparation':
				html_data['isCancellable'] = false;
				break;
				default:
				type = null;
			}

			var wo_type = details.type.split("-");
			if(wo_type[0] == "Apply pesticide" || wo_type[0] == "Apply fungicide"){
				html_data["pesticide"] = true;
			}

			if (type != null) {
				if (type == 'Harvest') {
					var wo_list_query = {
						where: {
							key: ['crop_calendar_id', 'type'],
							value: [details.crop_calendar_id, 'Sow Seed']
						},
						order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
					};
					workOrderModel.getWorkOrders(wo_list_query, function(err, wo_list) {
						if (err)
							throw err;
						else {
							cropCalendarModel.getCropCalendars({ status: ['Completed', 'In-Progress', 'Cancelled', 'Active'], where: { key: 'calendar_id', val: details.crop_calendar_id }, date: html_data.cur_date }, function(err, crop_calendar) {
								if (err)
									throw err;
								else {
									harvestModel.readHarvestDetail({ cct_id: details.crop_calendar_id }, function(err, harvest_details) {
										if (err)
											throw err;
										else {
											html_data["farm_area"] = crop_calendar.filter(e => e.calendar_id == details.crop_calendar_id)[0].farm_area;
											for (var i = 0; i < harvest_details.length; i++) {
												harvest_details[i].sacks_harvested *= html_data.farm_area;
											}
											if (harvest_details.length == 0) 
												harvest_details.push({});

											harvest_details.forEach(function(item, index) {
												harvest_details[index].sacks_harvested = Math.round(harvest_details[index].sacks_harvested);
											})
											
											html_data['stage'] = crop_calendar.filter(e => e.calendar_id == details.crop_calendar_id)[0].stage2;

											html_data['status_editable'] = wo_list[0].status == 'Completed' ? true : false;
											html_data['harvest_details'] = harvest_details;

											html_data["notifs"] = req.notifs;
											res.render('detailed_work_order', html_data);
										}
									});
											
								}
							});	
						}
					});
				}
				else {

					materialModel.getFarmMaterials(details.farm_id, function(err, inventory) {
						if (err)
							throw err;
						else {
							var filter_mats;
							if (type == 'Seed') {
								var wo_list_query = {
									where: {
										key: ['crop_calendar_id', 'type'],
										value: [details.crop_calendar_id, 'Land Preparation']
									},
									order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
								};
								workOrderModel.getWorkOrders(wo_list_query, function(err, wo_list) {
									if (err)
										throw err;
									else {
										workOrderModel.getResourceDetails(query, type, function(err, resource_details) {
											if (err)
												throw err;
											else {
												resource_details.forEach(function(item, index) {
													filter_mats = inventory.filter(e => e.item_name == item.material_name)[0];

													resource_details[index]['inventory_qty'] = filter_mats.current_amount;
												});

												for (var i = 0; i < resource_details.length; i++) {
													resource_details[i].qty = Math.round(resource_details[i].qty * 100) / 100;
												}
												html_data['status_editable'] = wo_list[0].status == 'Completed' ? true : false;
												html_data['resources'] = resource_details;
												html_data['resources']['title'] = type+'s:';
												html_data['resources']['lbl'] = { name: type, item: type+'_id', qty: type+'_qty' };

												html_data["notifs"] = req.notifs;
												res.render('detailed_work_order', html_data);
											}
										});
									}
								});
							}
							else {
								workOrderModel.getResourceDetails(query, type, function(err, resource_details) {
									if (err)
										throw err;
									else {
										resource_details.forEach(function(item, index) {
											filter_mats = inventory.filter(e => e.item_name == item.material_name)[0];

											resource_details[index]['inventory_qty'] = filter_mats.current_amount;
										});

										html_data['resources'] = resource_details;
										html_data['resources']['title'] = type+'s:';
										html_data['resources']['lbl'] = { name: type, item: type+'_id', qty: type+'_qty' };
										//console.log(html_data);
										html_data["notifs"] = req.notifs;
										res.render('detailed_work_order', html_data);
									}
								});
							}
						}
					});
							
				}
			}
			else {
				html_data["notifs"] = req.notifs;
				res.render('detailed_work_order', html_data);
			}
		}
	});
}

exports.createWorkOrder = function(req, res) {
	var query = {
		type: req.body.wo_type,
		crop_calendar_id: req.body.crop_calendar_id,
		date_created: dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD'),
		date_due: dataformatter.formatDate(new Date(req.body.due_date), 'YYYY-MM-DD'),
		date_start: dataformatter.formatDate(new Date(req.body.start_date), 'YYYY-MM-DD'),
		status: 'Pending',
		desc: null,
		notes: req.body.notes
	};

	cropCalendarModel.getCropCalendars({ status: ['In-Progress', 'Active'], date: req.session.cur_date }, function(err,calendars) {
		if (err)
			throw err;
		else {
			var selected_calendar = calendars.filter(e => e.calendar_id == req.body.crop_calendar_id)[0];

			query['stage'] = selected_calendar.stage;
			workOrderModel.createWorkOrder(query, function(err, result) {
				if (err)
					throw err;
				else {
					var resource_type = null;

					//CODE OSMS2
					//CREATE SMS FOR SMS SUBSCRIPTIONS
					//Get employees of the farm subscribed to sms
					employeeModel.getRelatedEmployees({farm_id : selected_calendar.farm_id}, function(err, employees){
						if(err)
							throw err;
						else{
							console.log(employees);
							console.log(query);
							//set message
							var msg = "NEW WORK ORDER FOR " + selected_calendar.farm_name + "\n\nType: " + query.type + "\nStart: " + dataformatter.formatDate(new Date(req.body.start_date), "mm DD, YYYY") + "\nDue: " + dataformatter.formatDate(new Date(req.body.due_date), "mm DD, YYYY") + "\nNotes: " + query.notes;
							//For each employee, send SMS
							for(var i = 0; i < employees.length; i++){
								//SEND SMS TO EMPLOYEE ID
								globe.sendSMS(employees[i], msg);
							}
						}
					});	


					if (query.type == 'Pesticide Application') {
						resource_type = 'Pesticide';
					}
					else if (query.type == 'Fertilizer Application') {
						resource_type = 'Fertilizer'
					}
					else if (query.type == 'Sow Seed') {
						resource_type = 'Seed;'
					}
					var time = new Date();
					time = time.toLocaleTimeString();

					var notif = {
				        date : dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD'),
				        farm_id : selected_calendar.farm_id,
				        notification_title : `New Work Order: ${result.insertId}`,
				        notification_desc: `Scheduled ${req.body.wo_type} for ${selected_calendar.farm_name} from ${dataformatter.formatDate(new Date(req.body.start_date), 'YYYY-MM-DD')}`,
				        url : `/farms/work_order&id=${result.insertId}`,
				        icon : "digging",
				        color : "primary",
				        type: `NEW_WO`,
				        time: time
				    };
				    notifModel.createNotif(notif, function(err, success){
				        if (err) {
				        	throw err;
				        }
				        else {
				        	notifModel.createUserNotif(function(err, user_notif_status) {
                                if (err)
                                    throw err;
                                else {
                                    
                                }
                            });
				        }
				    });

					if (resource_type != null) {
						var query_arr = consolidateResources(resource_type, req.body[''+resource_type+'_id']
								, req.body[''+resource_type+'_qty'], result.insertId);

						workOrderModel.createWorkOrderResources(query_arr, function(err, resource_result) {
							if (err)
								throw err;
							else {
								res.redirect('/farms/work_order&id='+result.insertId);
							}
						});
					}
					else {
						res.redirect('/farms/work_order&id='+result.insertId);
					}
				}
			})
		}
	});
}

exports.ajaxCreateWorkOrder = function(req, res) {
	var query = {
		type: req.body.wo_type,
		crop_calendar_id: req.body.crop_calendar_id,
		date_created: dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD'),
		date_due: dataformatter.formatDate(new Date(req.body.due_date), 'YYYY-MM-DD'),
		date_start: dataformatter.formatDate(new Date(req.body.start_date), 'YYYY-MM-DD'),
		status: 'Pending',
		desc: null,
		notes: req.body.notes
	};
	var resource_ids = req.body.resources.ids;
	var resource_qty = req.body.resources.qty;

	var farm_query = { status: ['In-Progress', 'Active', 'Completed'], date: req.session.cur_date};
	cropCalendarModel.getCropCalendarByID(farm_query, req.body.crop_calendar_id, function(err, farm_details) {
		if (err)
			throw err;
		else {
			workOrderModel.createWorkOrder(query, function(err, result) {
				if (err)
					throw err;
				else {
					var resource_type = null;

					if (query.type == 'Pesticide Application') {
						resource_type = 'Pesticide';
					}
					else if (query.type == 'Fertilizer Application') {
						resource_type = 'Fertilizer'
					}
					else if (query.type == 'Sow Seed') {
						resource_type = 'Seed'
					}
					var time = new Date();
					time = time.toLocaleTimeString();

					var notif = {
				        date : dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD'),
				        farm_id : farm_details[0].farm_id,
				        notification_title : `New Work Order: ${result.insertId}`,
				        notification_desc: `Scheduled ${req.body.wo_type} for ${farm_details[0].farm_name} from ${dataformatter.formatDate(new Date(req.body.start_date), 'YYYY-MM-DD')}`,
				        url : `/farms/work_order&id=${result.insertId}`,
				        icon : "digging",
				        color : "primary",
				        type: `NEW_WO`,
				        time: time
				    };
				    notifModel.createNotif(notif, function(err, success){
				        if (err) {
				        	throw err;
				        }
				        else {
				        	notifModel.createUserNotif(function(err, user_notif_status) {
		                        if (err)
		                            throw err;
		                        else {
		                            
		                        }
		                    });
				        }
				    });

					if (resource_type != null) {
						var query_arr = consolidateResources(resource_type, resource_ids
								, resource_qty, result.insertId);

						workOrderModel.createWorkOrderResources(query_arr, function(err, resource_result) {
							if (err)
								throw err;
							else {
								res.send('/farms/work_order&id='+result.insertId);
							}
						});
					}
					else {
						res.send('/farms/work_order&id='+result.insertId);
					}
				}
			})
		}
	});
			
}

exports.ajaxGetWorkOrders = function(req, res) {
	var query = req.query;
	workOrderModel.getWorkOrders(query, function(err, list) {
		if (err)
			throw err;
		else {
			res.send(list);
		}
	});
}

exports.getWorkOrdersPage = function(req, res) {
	var query = {
        order: ['work_order_table.status ASC', 'work_order_table.date_due asc']
    }
	workOrderModel.getWorkOrders(query, function(err, list) {
		if (err)
			throw err;
		else {
			// console.log(list);
			for (var i = 0; i < list.length; i++) {
				list[i].date_created = dataformatter.formatDate(new Date(list[i].date_created), 'YYYY-MM-DD');
				list[i].date_due = dataformatter.formatDate(new Date(list[i].date_due), 'YYYY-MM-DD');
				list[i].notes = list[i].notes == null ? 'N/A' : list[i].notes;
			}

			var html_data = { wo_list: list };
			// console.log(html_data);
			html_data = js.init_session(html_data, 'role', 'name', 'username', 'farms', req.session);
			html_data["notifs"] = req.notifs;
			html_data["notifs"] = req.notifs;
			res.render('farms', html_data);
		}
	});
}

exports.getWorkOrdersDashboard = function(req, res) {
	var upcoming = [];
	var completed = [];
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'dashboard', req.session);

	var query = {
        order: [ 'work_order_table.date_completed desc', 'work_order_table.date_due ASC'],
		// limit: ['10']
    }

	workOrderModel.getWorkOrders(query, function(err, list) {
		if (err)
			throw err;
		else {
			for (var i = 0; i < list.length; i++) {

				if (list[i].status == 'Pending') {
					list[i].date_created = dataformatter.formatDate(new Date(list[i].date_created), 'YYYY-MM-DD');
					list[i].date_due = dataformatter.formatDate(new Date(list[i].date_due), 'YYYY-MM-DD');
					list[i].notes = list[i].notes == null ? 'N/A' : list[i].notes;

					upcoming.push(list[i]);
				}

				if (list[i].status == 'Completed') {
					list[i].date_created = dataformatter.formatDate(new Date(list[i].date_created), 'YYYY-MM-DD');
					list[i].date_due = dataformatter.formatDate(new Date(list[i].date_due), 'YYYY-MM-DD');
					list[i].date_completed = dataformatter.formatDate(new Date(list[i].date_completed), 'YYYY-MM-DD');
					list[i].notes = list[i].notes == null ? 'N/A' : list[i].notes;
	
					completed.push(list[i]);
				}
			}
			html_data['upcomingWoList'] = upcoming.slice(0, 10);
			html_data['completedWoList'] =  completed.slice(0, 10);

			reportModel.getCalendarList('old',function(err, fp_overview) {
				if (err)
					throw err;
				else {
					var calendar_arr = fp_overview.map(({ calendar_id }) => calendar_id);
					if (calendar_arr.length != 0) {
						reportModel.getInputResourcesUsed({ calendar_ids: calendar_arr }, function(err, input_resources) {
							if (err)
								throw err;
							else {
								reportModel.getCalendarList('new', function(err, fp_new) {
									if (err)
										throw err;
									else {
										var calendar_arr_new = fp_new.map(({ calendar_id }) => calendar_id);
										if (calendar_arr_new.length != 0) {
											reportModel.getInputResourcesUsed({ calendar_ids: calendar_arr_new }, function(err, input_new) {
												if (err)
													throw err;
												else {
													var fp_obj = {
														avg: analyzer.processMeanProductivity(fp_overview, input_resources),
														cur: analyzer.processMeanProductivity(fp_new, input_new),
														percentage: null,
														max: 100
													}
													fp_obj.percentage = ((fp_obj.cur / fp_obj.avg) * 100).toFixed(2);

													var standard = 100;
													while (standard < fp_obj.percentage) {
														standard += 100;
														fp_obj.max = standard;
													}
													html_data['fp'] = fp_obj;
												}
											});
										}
									}
								});		
							}
						});
					}
				}
			});

			// pestdiseaseModel.getTotalDiagnosesPerPD2(null,null, function(err, total){
			// 	if(err)
			// 		throw err;
			// 	else{
			// 		var i,x, temp_total = [];
			// 		var pest = [];
			// 		var disease = [];
					
			// 		temp_total = total;
					
			// 	}
			// 	pestdiseaseModel.getDiagnosisFrequentStage2(null, null, null, null, function(err, frequency){
			// 		if(err)
			// 			throw err;
			// 		else{
			// 			// console.log(temp_total);
			// 			for(x = 0; x < temp_total.length; x++){
			// 				var freq_stage = "N/A", stage_count = 0;
			// 				for(i = 0; i < frequency.length; i++){
			// 					if(temp_total[x].pd_id == frequency[i].pd_id && temp_total[x].type == frequency[i].type){
			// 						if(frequency[i].count > stage_count){
			// 							stage_count = frequency[i].count;
			// 							freq_stage = frequency[i].stage_diagnosed;
			// 						}
			// 					}
			// 				}
			// 				temp_total[x]["frequent_stage"] = freq_stage;
			// 			}


			// 			for(x = 0; x < temp_total.length; x++){
			// 				if(temp_total[x].type == "Pest")
			// 					pest[x] = temp_total[x];
			// 				if(temp_total[x].type == "Disease")
			// 					disease[x] = temp_total[x];
			// 			}
			// 			var new_total = [];
			// 			for(i = 0; i < 5; i++){
			// 				new_total.push(temp_total[i]);
			// 			}
						
			// 			new_total[0]["selected"] = true;

			// 			// console.log(new_total);

			// 		}

			// 		farmModel.getAllFarms(function(err, farms){
			// 			if(err)
			// 				throw err;
			// 			else{
			// 				html_data["farms"] = farms;
			// 			}

			// 			pestdiseaseModel.getTotalDiagnosesPerMonth(null, null, null, null, function(err, month_frequency){
			// 				if(err)
			// 					throw err;
			// 				else{
			// 					var i, highest = 0;
			// 					for(i = 0; i < month_frequency.length; i++){
			// 						//get highest
			// 						if(month_frequency[i].frequency > highest)
			// 							highest = month_frequency[i].frequency;
			// 					}
			// 					highest = Math.ceil(highest / 5) * 5;
			// 					for(i = 0; i < month_frequency.length; i++){
			// 						//update array for chart
			// 						month_frequency[i]["percent"] = (month_frequency[i].frequency * 1.0) / (highest * 1.0) * 100;
			// 					}

			// 					month_frequency[0]["month_label"] = "Jan";
			// 					month_frequency[1]["month_label"] = "Feb";
			// 					month_frequency[2]["month_label"] = "Mar";
			// 					month_frequency[3]["month_label"] = "Apr";
			// 					month_frequency[4]["month_label"] = "May";
			// 					month_frequency[5]["month_label"] = "Jun";
			// 					month_frequency[6]["month_label"] = "Jul";
			// 					month_frequency[7]["month_label"] = "Aug";
			// 					month_frequency[8]["month_label"] = "Sep";
			// 					month_frequency[9]["month_label"] = "Oct";
			// 					month_frequency[10]["month_label"] = "Nov";
			// 					month_frequency[11]["month_label"] = "Dec";

			// 					html_data["highest"] = highest;
			// 					html_data["middle"] = highest / 2;
								
			// 				}
			// 				pestdiseaseModel.getPestDiseaseList("Pest", function(err, pests){
			// 					if(err)
			// 						throw err;
			// 					else{
			// 						var i;
			// 						// console.log(pests);
			// 						for(i = 0; i < pests.length; i++){
			// 							pests[i]["pd_type"] = "Pest";
			// 							if(pests[i].last_diagnosed != null)
			// 							pests[i].last_diagnosed = dataformatter.formatDate(dataformatter.formatDate(new Date(pests[i].last_diagnosed)), 'YYYY-MM-DD');
			// 						}
			// 						html_data["pests"] = pests;
			// 					}
			// 					html_data["total"] = new_total;
			// 					html_data["month_frequency"] = month_frequency;
			// 				});
			// 			});
			// 		});
			// 	});
			// });
			
			html_data['outlook'] = req.outlook;
			farmModel.getAllFarms(function(err, farm_list) {
				if (err)
					throw err;
				else {
					// Change active filters as needed
					farm_list.forEach(function(item, index) {
							farm_list[index]['checked'] = true;
					});
					html_data['farm_list'] = { lowland: farm_list.filter(e=>e.land_type=='Lowland'), upland: farm_list.filter(e=>e.land_type=='Upland') };

					cropCalendarModel.getCropPlans(function(err, crop_plans) {
						if (err)
							throw err;
						else {
							const unique_cycles = [...new Set(crop_plans.map(e => e.crop_plan).map(item => item))];
							const unique_farms = [...new Set(farm_list.map(e => e.farm_id).map(item => item))];

							var cycle_cont = [], checked;
							unique_cycles.forEach(function(item, index) {
								if (index <= 6)
									checked = true;
								else
									checked = false;

								cycle_cont.push({ cycle_name: unique_cycles[index], checked: checked });
							});
							html_data['crop_plans'] = cycle_cont;

							if (unique_cycles.length != 0) {
								reportModel.getProductionOverview({ farm_id: unique_farms, cycles: unique_cycles }, function(err, production_chart_data) {
									if (err)
										throw err;
									else {
										var production_chart = chart_formatter.formatProductionChart(production_chart_data);
										html_data['production_chart'] = JSON.stringify(production_chart);

										reportModel.getFertilizerConsumption({ farm_id: unique_farms, cycles: unique_cycles }, function(err, nutrient_consumption_data) {
											if (err)
												throw err;
											else {
												var nutrient_consumption_chart = chart_formatter.formatConsumptionChart(nutrient_consumption_data);
												html_data['consumption_chart'] = JSON.stringify(nutrient_consumption_chart);

												reportModel.getPDOverview({ farm_id: unique_farms, cycles: unique_cycles }, function(err, pd_overview_data) {
													if (err)
														throw err;
													else {
														var pd_overview = chart_formatter.formatPDOverview(pd_overview_data);
														html_data['pd_overview_chart'] = { stage: JSON.stringify(pd_overview.stage), trend: JSON.stringify(pd_overview.trend) };
													
														html_data["notifs"] = req.notifs;

														res.render('home', html_data);
													}
												});
											}
										});

									}
								});
							}
							else {
								html_data["notifs"] = req.notifs;

								res.render('home', html_data);
							}	
						}
								
					});
				}
			});		
		}
	});
}

exports.getWorkOrdersDashboard_v2 = function(req, res) {
	var upcoming = [];
	var completed = [];
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'dashboard', req.session);

	var query = {
        order: [ 'work_order_table.date_completed desc', 'work_order_table.date_due ASC'],
		// limit: ['10']
    }

	workOrderModel.getWorkOrders(query, function(err, list) {
		if (err)
			throw err;
		else {
			for (var i = 0; i < list.length; i++) {

				if (list[i].status == 'Pending') {
					list[i].date_created = dataformatter.formatDate(new Date(list[i].date_created), 'YYYY-MM-DD');
					list[i].date_due = dataformatter.formatDate(new Date(list[i].date_due), 'YYYY-MM-DD');
					list[i].notes = list[i].notes == null ? 'N/A' : list[i].notes;

					upcoming.push(list[i]);
				}

				if (list[i].status == 'Completed') {
					list[i].date_created = dataformatter.formatDate(new Date(list[i].date_created), 'YYYY-MM-DD');
					list[i].date_due = dataformatter.formatDate(new Date(list[i].date_due), 'YYYY-MM-DD');
					list[i].date_completed = dataformatter.formatDate(new Date(list[i].date_completed), 'YYYY-MM-DD');
					list[i].notes = list[i].notes == null ? 'N/A' : list[i].notes;
	
					completed.push(list[i]);
				}
			}
			html_data['upcomingWoList'] = upcoming.slice(0, 10);
			html_data['completedWoList'] =  completed.slice(0, 10);

			reportModel.getCalendarList('old',function(err, fp_overview) {
				if (err)
					throw err;
				else {
					var calendar_arr = fp_overview.map(({ calendar_id }) => calendar_id);
					if (calendar_arr.length != 0) {
						reportModel.getInputResourcesUsed({ calendar_ids: calendar_arr }, function(err, input_resources) {
							if (err)
								throw err;
							else {
								reportModel.getCalendarList('new', function(err, fp_new) {
									if (err)
										throw err;
									else {
										var calendar_arr_new = fp_new.map(({ calendar_id }) => calendar_id);
										if (calendar_arr_new.length != 0) {
											reportModel.getInputResourcesUsed({ calendar_ids: calendar_arr_new }, function(err, input_new) {
												if (err)
													throw err;
												else {
													var fp_obj = {
														avg: analyzer.processMeanProductivity(fp_overview, input_resources),
														cur: analyzer.processMeanProductivity(fp_new, input_new),
														percentage: null,
														max: 100
													}
													fp_obj.percentage = ((fp_obj.cur / fp_obj.avg) * 100).toFixed(2);

													var standard = 100;
													while (standard < fp_obj.percentage) {
														standard += 100;
														fp_obj.max = standard;
													}
													html_data['fp'] = fp_obj;
												}
											});
										}
									}
								});		
							}
						});
					}
				}
			});
			
			html_data['outlook'] = req.outlook;
			
			farmModel.getAllFarms(function(err, farm_list) {
				if (err)
					throw err;
				else {
					// Change active filters as needed
					farm_list.forEach(function(item, index) {
							farm_list[index]['checked'] = true;
					});
					html_data['farm_list'] = { lowland: farm_list.filter(e=>e.land_type=='Lowland'), upland: farm_list.filter(e=>e.land_type=='Upland') };

					cropCalendarModel.getCropPlans(function(err, crop_plans) {
						if (err)
							throw err;
						else {
							const unique_cycles = [...new Set(crop_plans.map(e => e.crop_plan).map(item => item))];
							const unique_farms = [...new Set(farm_list.map(e => e.farm_id).map(item => item))];

							var cycle_cont = [], checked;
							unique_cycles.forEach(function(item, index) {
								if (index <= 6)
									checked = true;
								else
									checked = false;

								cycle_cont.push({ cycle_name: unique_cycles[index], checked: checked });
							});
							html_data['crop_plans'] = cycle_cont;

							if (unique_cycles.length != 0) {
								reportModel.getProductionOverview({ farm_id: unique_farms, cycles: unique_cycles }, function(err, production_chart_data) {
									if (err)
										throw err;
									else {
										var production_chart = chart_formatter.formatProductionChart(production_chart_data);
										html_data['production_chart'] = JSON.stringify(production_chart);

										reportModel.getFertilizerConsumption({ farm_id: unique_farms, cycles: unique_cycles }, function(err, nutrient_consumption_data) {
											if (err)
												throw err;
											else {
												var nutrient_consumption_chart = chart_formatter.formatConsumptionChart(nutrient_consumption_data);
												html_data['consumption_chart'] = JSON.stringify(nutrient_consumption_chart);

												reportModel.getPDOverview({ farm_id: unique_farms, cycles: unique_cycles }, function(err, pd_overview_data) {
													if (err)
														throw err;
													else {
														var pd_overview = chart_formatter.formatPDOverview(pd_overview_data);
														html_data['pd_overview_chart'] = { stage: JSON.stringify(pd_overview.stage), trend: JSON.stringify(pd_overview.trend) };
													
														html_data["notifs"] = req.notifs;

														res.render('home', html_data);
													}
												});
											}
										});

									}
								});
							}
							else {
								html_data["notifs"] = req.notifs;

								res.render('home_v2', html_data);
							}	
						}
								
					});
				}
			});		
		}
	});
}

exports.ajaxEditStatus = function(req, res) {
	var query = { status: 'In-Progress' };

	var wo_list_query = {
		where: {
			key: ['crop_calendar_id', 'type'],
			value: [req.query.calendar_id, 'Harvest']
		},
		order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
	};
	workOrderModel.getWorkOrders(wo_list_query, function(err, wo_list) {
		if (err)
			throw err;
		else {
			if (wo_list[0].status == 'Pending') {
				var filter = { work_order_id: wo_list[0].work_order_id };
				workOrderModel.updateWorkOrder(query, filter, function(err, edit_status) {
					if (err)
						throw err;
					else {
						res.send('Crop Calendar ID: '+req.query.calendar_id+' - began harvest stage!');
					}
				});
			}
			else {

				res.send('err');
			} 
		}
	});
}

function processHarvestDetails(sacks, type, stage, id) {
	var obj = {}
	var arr = [];
	for (var i = 0; i < sacks.length; i++) {
		obj = {
			sacks_harvested: sacks[i],
			stage_harvested: stage,
			type: type[i],
			cct_id: id
		}
		arr.push(obj);
	}
	return arr;
}

exports.editWorkOrder = function(req, res) {
	var next_stage = null;
	var query = {
		type: req.body.type,
		crop_calendar_id: req.body.crop_calendar_id,
		date_created: req.body.date_created,
		date_start: req.body.date_start,
		date_due: req.body.date_due,
		status: req.body.status,
		desc: null,
		notes: req.body.notes
	};
	var filter = {
		work_order_id: req.body.wo_id
	};
	var update_forecast = false;
	var completed = false;

	if (!Array.isArray(req.body.sacks_harvested))
		req.body.sacks_harvested = [req.body.true_sacks];
	if (!Array.isArray(req.body.harvest_type))
		req.body.harvest_type = [req.body.harvest_type];

	if (query.status == 'Completed') {
		query['date_completed'] = dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD');
		completed = true;
		if (query.type == 'Land Preparation') {
			next_stage = 'Sow Seed';
		}
		else if (query.type == 'Harvest') {
			next_stage = 'End';
		}
		else if (query.type == 'Fertilizer Application') {
			update_forecast = true;
		}
	}

	//add pesticide usage && update farm materials
	var type = req.body.type.split("-");
	// console.log(type);
	// console.log(req.body.status);
	// if((type[0] == "Apply pesticide" || type[0] == "Apply fungicide") && req.body.status == "Completed"){
	// 	//check if enough
	// 	workOrderModel.getDetailedWorkOrder({work_order_id : req.body.wo_id}, function(err, wo_details){
	// 		if(err)
	// 			throw err;
	// 		else{
	// 			materialModel.getFarmMaterials(wo_details[0].farm_id, function(err, farm_materials){
	// 				if(err)
	// 					throw err;
	// 				else{
	// 					var i; 
	// 					for(i = 0; i < farm_materials.length; i++){
							
	// 						if(farm_materials[i].item_type == "Pesticide" && farm_materials[i].item_name == type[1]){
	// 							// console.log( farm_materials[i].farm_mat_id);
	// 							// console.log("Found it");
	// 							// console.log(farm_materials[i].item_type);
	// 							// console.log(farm_materials[i].item_name);
	// 							// console.log(farm_materials[i].current_amount);
	// 							//check if enough
	// 							if(farm_materials[i].current_amount >= 5){
	// 								//subtract and add pesticide usage
	// 								materialModel.updateFarmMaterials({current_amount : farm_materials[i].current_amount - 5}, {farm_mat_id : farm_materials[i].farm_mat_id}, function(err, success){

	// 								});
	// 								var usage = {
	// 									pesticide_id : farm_materials[i].item_id,
	// 									farm_id : wo_details[0].farm_id,
	// 									amount : 5,
	// 									date_used : dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')
	// 								};
	// 								materialModel.addPesticideUsage(usage, function(err, success){

	// 								});
	// 							}
	// 							else{
	// 								console.log("not enough amount");
	// 								workOrderModel.updateWorkOrder({status : "In-Progress", date_completed : null}, filter, function(err, list){});
	// 							}
	// 							break;
	// 						}
	// 					}
	// 				}
	// 			});
	// 		}
	// 	});
	// }

	materialModel.getFarmMaterials(req.body.farm_id, function(err, farm_materials) {
		if (err)
			throw err;
		else {
			var resource_type = null;
			if (query.type == 'Pesticide Application') {
				resource_type = 'Pesticide';
			}
			else if (query.type == 'Fertilizer Application') {
				resource_type = 'Fertilizer'
			}
			else if (query.type == 'Sow Seed') {
				resource_type = 'Seed'
			}

			var inventory_control = true;
			// Check if there is sufficient inventory amount
			if (resource_type != null && query.status == 'Completed') {
				var query_arr = consolidateResources(resource_type, req.body[''+resource_type+'_id']
						, req.body[''+resource_type+'_qty'], filter.work_order_id);

				var filtered_mats;
				query_arr.forEach(function(item) {
					filtered_mats = farm_materials.filter(e => e.item_id == parseInt(item.item_id) && e.item_type == item.type)[0];

					if (parseInt(filtered_mats.current_amount) < parseInt(item.qty)) {
						inventory_control = false;
					}
				});
			}

			// Proceed to edit work order
			if (inventory_control) {
				workOrderModel.updateWorkOrder(query, filter, function(err, list) {
					if (err)
						throw err;
					else {
						workOrderModel.deleteResourceRecord(filter, function(err, resource_delete) {
							if (err)
								throw err;
							else {	
								// To add deduct farm material quantity here if next stage is null //
								if (resource_type != null) {
									var query_arr = consolidateResources(resource_type, req.body[''+resource_type+'_id']
										, req.body[''+resource_type+'_qty'], filter.work_order_id);

									workOrderModel.createWorkOrderResources(query_arr, function(err, resource_create) {
										if (err)
											throw err;
										else {
											if (completed) {
												materialModel.subtractFarmMaterial({ qty: req.body[''+resource_type+'_qty'] }, { item_type: resource_type, farm_id: req.body.farm_id, item_id: req.body[''+resource_type+'_id'] }, function(err, subtract_result) {
													if (err)
														throw err;
													else {
														console.log(subtract_result);
													}
												});
											}
											if (next_stage != null) {
												var wo_list_query = {
													where: {
														key: ['crop_calendar_id', 'type'],
														value: [query.crop_calendar_id, next_stage]
													},
													order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
												};
												workOrderModel.getWorkOrders(wo_list_query, function(err, wo_list) {
													if (err)
														throw err;
													else {
														var edit_next_query = {
															status: 'In-Progress'
														};
														workOrderModel.updateWorkOrder(edit_next_query, { work_order_id: wo_list[0].work_order_id }, function(err, next_status) {
															if (err)
																throw err;
															else {
																//Insert update crop calendar seed_planted here
																console.log('1');
																if (resource_type == 'Seed') {
																	var cct_query = { seed_planted: query_arr[0].item_id };
																	var cct_filter = { calendar_id: query.crop_calendar_id };
																	cropCalendarModel.updateCropCalendar(cct_query, cct_filter, function(err, cct) {
																		if (err)
																			throw err;
																		else {
																			res.redirect('/farms/work_order&id='+filter.work_order_id);
																		}
																	});
																}
																else {
																	res.redirect('/farms/work_order&id='+filter.work_order_id);
																}
															}
														});
													}
												});
											}
											else {
												//Insert update crop calendar seed_planted here
												console.log('2');
												if (resource_type == 'Seed') {
													var cct_query = { seed_planted: query_arr[0].item_id };
													var cct_filter = { calendar_id: query.crop_calendar_id };
													cropCalendarModel.updateCropCalendar(cct_query, cct_filter, function(err, cct) {
														if (err)
															throw err;
														else {
															res.redirect('/farms/work_order&id='+filter.work_order_id);
														}
													});
												}
												else {
													if (update_forecast) {
														console.log('update forecast!');
														// Get required farm details for updating yield forecast
														cropCalendarModel.getYieldForecastVariables({ calendar_id: query.crop_calendar_id }, function(err, calendar_var) {
															if (err)
																throw err;
															else {
																var farm_name = calendar_var[0].farm_name
																var start = dataformatter.formatDate(new Date(calendar_var[0].sowing_date), 'YYYY-MM-DD');
																var end = dataformatter.formatDate(new Date(calendar_var[0].harvest_date), 'YYYY-MM-DD');
																var redirect = 'work_order&id='+filter.work_order_id;
																res.redirect('/create_complete_yield_forecast/'+farm_name+'/'+start+'/'+end+'/'+redirect+'/'+query.crop_calendar_id);
															}
														});
																
													}
													else {
														res.redirect('/farms/work_order&id='+filter.work_order_id);
													}
												}
											}
										}
									})
								}
								else {
									if (next_stage == 'Sow Seed') {
										var wo_list_query = {
											where: {
												key: ['crop_calendar_id', 'type'],
												value: [query.crop_calendar_id, next_stage]
											},
											order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
										};
										workOrderModel.getWorkOrders(wo_list_query, function(err, wo_list) {
											if (err)
												throw err;
											else {
												var edit_next_query = {
													status: 'In-Progress'
												};
												console.log('Sow Seed');
												workOrderModel.updateWorkOrder(edit_next_query, { work_order_id: wo_list[0].work_order_id }, function(err, next_status) {
													if (err)
														throw err;
													else {
														res.redirect('/farms/work_order&id='+filter.work_order_id);
													}
												});
											}
										});
									}
									else if (next_stage == 'End') {
										// Insert partial harvests here
										harvestModel.deleteHarvestDetail({ cct_id: req.body.crop_calendar_id }, function(err, harvest_details) {
											if (err)
												throw err;
											else {
												// Get current stage of crop calendar
												cropCalendarModel.getCropCalendars({ status: ['Active','In-Progress', 'Completed'],
												where: { key: 'calendar_id', val: req.body.crop_calendar_id }, date: req.session.cur_date }, function(err, calendar) {
														if (err)
															throw err;
														else {

															// Process query data here
															var harvest_query = processHarvestDetails(req.body.sacks_harvested, 
																req.body.harvest_type, calendar[0].stage2, query.crop_calendar_id);
															harvestModel.createHarvestDetail(harvest_query, function(err, new_detail) {
																if (err)
																	throw err;
																else {
																	var total_sacks = 0;
																	for (var i = 0; i < req.body.sacks_harvested.length; i++)
																		total_sacks += parseInt(req.body.sacks_harvested[i]);
																	var calendar_query = {
																		harvest_yield: total_sacks,
																		status: 'Completed'
																	};
																	var calendar_filter = {
																		calendar_id: query.crop_calendar_id
																	}
																	cropCalendarModel.updateCropCalendar(calendar_query, calendar_filter, function(err, editCalendar) {
																		if (err)
																			throw err;
																		else {
																			// Update actual harvest in forecast record
																			var forecast_update = {
																				harvested: total_sacks
																			};
																			var forecast_filter = {
																				calendar_id: query.crop_calendar_id
																			}

																			farmModel.updateForecastYieldRecord(forecast_update, forecast_filter, function(err, update_status) {
																				if (err)
																					throw err;
																				else {
																					// Redirect
																					res.redirect('/farms/work_order&id='+filter.work_order_id);
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
									else if (query.type == 'Harvest') {
										// Insert partial harvests here
										harvestModel.deleteHarvestDetail({ cct_id: req.body.crop_calendar_id }, function(err, harvest_details) {
											if (err)
												throw err;
											else {
												// Get current stage of crop calendar
												cropCalendarModel.getCropCalendars({ status: ['Active','In-Progress'],
												where: { key: 'calendar_id', val: req.body.crop_calendar_id }, date: req.session.cur_date }, function(err, calendar) {
													if (err)
														throw err;
													else {

														// Process query data here
														var harvest_query = processHarvestDetails(req.body.sacks_harvested, 
															req.body.harvest_type, calendar[0].stage, query.crop_calendar_id);
														harvestModel.createHarvestDetail(harvest_query, function(err, new_detail) {
															if (err)
																throw err;
															else {
																res.redirect('/farms/work_order&id='+filter.work_order_id);
															}
														});
													}
												});
											}
										});
									}
									else {
										res.redirect('/farms/work_order&id='+filter.work_order_id);
									}
								}
							}
						});
					}
				});
			}
			// Send error message and redirect
			else {
				req.flash('error_msg', 'Update work order failed! Current inventory must be greater than desired value to be used!');
				res.redirect('/farms/work_order&id='+filter.work_order_id);
			}

		}
	});
}


exports.createWO = function(req, res){
	workOrderModel.createWorkOrder(req.body.wo, function(err, success){
		res.send("goods");
	});

}