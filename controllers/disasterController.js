var request = require('request');
const dataformatter = require('../public/js/dataformatter.js');
const weatherForecastModel = require('../models/weatherForecastModel.js');
const cropCalendarModel = require('../models/cropCalendarModel.js');
const farmModel = require('../models/farmModel.js');
const workOrderModel = require('../models/workOrderModel.js');
const disasterModel = require('../models/disasterModel.js');
const nutrientModel = require('../models/nutrientModel.js');
const notifModel = require('../models/notificationModel.js');
const js = require('../public/js/session.js');

const _MS_PER_DAY = 1000 * 60 * 60 * 24;

exports.getDisasterManagement = function(req, res) {
	var html_data = {};

	html_data = js.init_session(html_data, 'role', 'name', 'username', 'disaster', req.session);
	var cur_date = new Date(req.session.cur_date);
	var true_date = new Date();

	disasterModel.getDisasterLogs(null, function(err, disasters) {
		if (err)
			throw err;
		else {
			cropCalendarModel.getCropCalendars({ status: ['In-Progress', 'Active'], date: html_data.cur_date}, function(err, active_calendars) {
				if (err)
					throw err;
				else {
					var active_disasters = disasters.filter(e => e.status == 1 && ( (e.type == 'Heavy Rainfall' && cur_date <= new Date(e.target_date)) || (e.type == 'Drought' || e.type == 'Dry Spell' || e.type == 'Dry Condition') ) ), inactive_disasters = disasters.filter(e => e.status == 0);
					var active_rainfall = active_disasters.filter(e => e.type == 'Heavy Rainfall'), 
					inactive_rainfall = inactive_disasters.filter(e => e.type == 'Heavy Rainfall');
					var active_drought = active_disasters.filter(e => e.type == 'Drought' || e.type == 'Dry Spell' || e.type == 'Dry Condition'), 
					inactive_drought = inactive_disasters.filter(e => e.type == 'Drought' || e.type == 'Dry Spell' || e.type == 'Dry Condition');

					var active_rainfall_arr = [], inactive_rainfall_arr = [];


					for (var i = 0; i < active_rainfall.length; i++) {
						active_rainfall_arr.push(prepareRainfallDisaster(active_rainfall[i], active_calendars, html_data));
					}
					var len = inactive_rainfall.length > 3 ? 3 : inactive_rainfall.length; 
					for (var i = 0; i < len; i++) {
						inactive_rainfall_arr.push(prepareRainfallDisaster(inactive_rainfall[i], active_calendars, html_data));
					}

					active_drought.forEach(function(item, index) {
						active_drought[index].date_recorded = dataformatter.formatDate(new Date(item.date_recorded), 'YYYY-MM-DD');
					});
					inactive_drought.forEach(function(item, index) {
						inactive_drought[index].date_recorded = dataformatter.formatDate(new Date(item.date_recorded), 'YYYY-MM-DD');
					});
					//
					html_data['active_rainfall'] = active_rainfall_arr;
					html_data['inactive_rainfall'] = inactive_rainfall_arr;
					html_data['notifs'] = req.notifs;
					html_data['active_drought'] = active_drought;
					html_data['inactive_drought'] = inactive_drought;
					

					html_data['precip_data'] = req.precip_data;
					res.render('disaster_warnings', html_data);					
				}
			});
		}
	});
}

exports.ajaxGetRecommendations = function(req, res) {
	var html_data = {};
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'disaster', req.session);

	disasterModel.getDisasterLogs({ status: 1 }, function(err, disasters) {
		if (err)
			throw err;
		else {
			cropCalendarModel.getCropCalendars({ where: { key: 'calendar_id', val: req.query.calendar_id }, status: [], date: html_data.cur_date }, function(err, active_calendars) {
				if (err)
					throw err;
				else {
					var nutrient_query = active_calendars.map(e => ({ farm_id: e.farm_id, calendar_id: e.calendar_id }));
					nutrientModel.getUpcomingImportantNutrients(nutrient_query, '', function(err, nutrients) {
						if (err)
							throw err;
						else {
							var rainfall = disasters.filter(e => e.type == 'Heavy Rainfall'), drought = disasters.filter(e => e.type == 'Drought');
							var rainfall_arr = [], drought_arr = [];

							for (var i = 0; i < rainfall.length; i++) {
								rainfall_arr.push(prepareRainfallDisaster(rainfall[i], active_calendars));
							}

							//
							res.send(consolidateRecommendations(nutrients, rainfall_arr));
						}
					});			
				}
			});
		}
	});
}

function consolidateRecommendations(nutrients, rainfall) {
	var obj = { disasters: [], nutrients: nutrients };
	var temp_obj;

	for (var i = 0; i < nutrients.length; i++) {
		nutrients[i].target_application_date = dataformatter.formatDate(new Date(nutrients[i].target_application_date), 'mm DD, YYYY');
	}
	obj.nutrients = nutrients;
	for (var i = 0; i < rainfall.length; i++) {
		temp_obj = { description: `Weather forecast alert with classification ${rainfall[i].details.classification} expected on ${rainfall[i].details.target_date}`, recommendation: [] };
		for (var x = 0; x < rainfall[i].farms.length; x++) {
			temp_obj.recommendation.push(rainfall[i].farms[x].recommendation);
		}
		obj.disasters.push(temp_obj);
	}

	return obj;
}

function dateDiffInDays(a, b) {
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function prepareRainfallDisaster(rainfall, active_calendars, html_data) {
	var rainfall_obj = {};
	var stage = null, recommendation, damages, risk_lvl, text_color, damage_color, risk_n;
	rainfall['mph'] = Math.round(rainfall.wind_speed * 2.237 * 100)/100;
	rainfall['classification'] = rainfall.mph < 38 ? 
	'Heavy Rain' : rainfall.mph < 73 ?
	'Tropical Depression' : rainfall.mph < 74 ?
	'Tropical Storm' : rainfall.mph < 111 ?
	'Hurricane' : rainfall.mph >= 111 ?
	'Major Hurricane' : 'Major Hurricane';
	rainfall.days = dateDiffInDays(new Date(html_data.cur_date), new Date(rainfall.target_date));
	rainfall.date_recorded = dataformatter.formatDate(new Date(rainfall.date_recorded), 'YYYY-MM-DD');
	rainfall.target_date = dataformatter.formatDate(new Date(rainfall.target_date), 'mm DD, YYYY');

	rainfall_obj = { details: rainfall, farms: [] };

	for (var x = 0; x < active_calendars.length; x++) {
		active_calendars[x].sowing_date = dataformatter.formatDate(new Date(active_calendars[x].sowing_date), 'YYYY-MM-DD');
		
		if (active_calendars[x].sow_date_completed != null) {
			active_calendars[x].sow_date_completed = dataformatter.formatDate(new Date(active_calendars[x].sow_date_completed), 'YYYY-MM-DD');
		}
		else {
			active_calendars[x].sow_date_completed = active_calendars[x].sowing_date;
		}

		dat = dateDiffInDays(new Date(active_calendars[x].sow_date_completed), new Date(rainfall.target_date));

		maturity_days = active_calendars[x].maturity_days;

		if (stage == null) {
			if (dat > maturity_days && dat < (maturity_days + 35) ) {
				stage = 'Reproductive';
			}
			else if (dat >= (maturity_days + 35) && dat < (maturity_days + 65) ) {
				stage = 'Ripening';
			}
			else if (dat >= (maturity_days + 65) ) {
				stage = 'Harvesting';
			}
			else {
				stage = 'Vegetation';
			}
		}

		if (stage == 'Vegetation' || stage == 'Reproductive') {
			if (rainfall.mph < 38) {
				recommendation = 'Monitor fields closely and drain fields before, during, and after the target date.';
			}
			else {
				recommendation = 'N/A - no suitable action';
			}
		}
		else {
			if (rainfall.mph < 38) {
				recommendation = "Monitor fields closely and drain fields before, during, and after the target date. Early harvest up to owner's discretion.";
			}
			else {
				recommendation = 'Conduct early harvest before '+rainfall.target_date;
			}
		}

		if (rainfall.classification == 'Heavy Rain') {
			if (stage == 'Harvesting') {
				damages = 'Low';
				risk_lvl = 'Low';
				text_color = 'text-dark';
				damage_color = 'text-dark';
				risk_n = 1; 
			}
			else if (stage == 'Ripening') {
				damages = 'Low';
				risk_lvl = 'Low';
				text_color = 'text-dark';
				damage_color = 'text-warning';
				risk_n = 1;
			}
			else if (stage == 'Reproductive') {
				damages = 'Medium';
				risk_lvl = 'Medium';
				text_color = 'text-warning';
				damage_color = 'text-warning';
				risk_n = 2;
			}
			else {
				damages = 'Medium';
				risk_lvl = 'Medium';
				text_color = 'text-warning';
				damage_color = 'text-warning';
				risk_n = 2;									
			}
		}
		else if (rainfall.classification == 'Tropical Depression') {
			risk_lvl = 'Medium';
			text_color = 'text-danger';
			damages = 'Medium'
			damage_color = 'text-warning';
			risk_n = 2;
		}
		else if (rainfall.classification == 'Tropical Storm') {
			risk_lvl = 'High';
			text_color = 'text-danger';
			damages = 'High'
			damage_color = 'text-danger';
			risk_n = 3;
		}
		else if (rainfall.classification == 'Hurricane') {
			risk_lvl = 'High';
			text_color = 'text-danger';
			damages = 'Critical'
			damage_color = 'text-danger';
			risk_n = 3;
		}
		else if (rainfall.classification == 'Major Hurricane') {
			risk_lvl = 'High';
			text_color = 'text-danger';
			damages = 'Critical'
			damage_color = 'text-danger';
			risk_n = 3;
		}

		farm_obj = { farm_name: active_calendars[x].farm_name, seed_name: active_calendars[x].seed_name, 
			dat: dat, stage: stage, severity: { val: risk_lvl, color: text_color, 
				damage: damages, damage_color: damage_color, risk_n: risk_n }, recommendation: recommendation };

		stage = null;
		//
		rainfall_obj.farms.push(farm_obj);
	}
	rainfall_obj.farms.sort((a, b) => b.severity.risk_n - a.severity.risk_n);
	
	return rainfall_obj;
}