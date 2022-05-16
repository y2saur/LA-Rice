const dataformatter = require('./dataformatter.js');

exports.init_session = function(obj, role, name, username, tab, session) {
	var date = new Date();
	date = dataformatter.formatDate(date, 'YYYY-MM-DD');
	var role = session.authority;
	obj['writeable'] = session.writeable;
	obj['name'] = session.username;
	obj['username'] = session.username;
	obj['session'] = true;
	obj['cur_date'] = session.cur_date;
	obj['true_date'] = date;

	if (role === 0) 
		obj['admin_role'] = true;
	else if (role === 1)
		obj['office_role'] = true;
	else if (role === 2)
		obj['purchasing_role'] = true;

	if (tab === 'dashboard') {
		obj['home_tab'] = true;
		obj['title'] = `Dashboard | LA Rice Mill`;
	}
	else if (tab === 'farms') {
		obj['farm_tab'] = true;
		obj['farms_mgt_tab'] = true
		obj['title'] = `Work Orders | LA Rice Mill`;
	}
	else if (tab === 'monitor_farms') {
		obj['monitor_farms_tab'] = true;
		obj['farms_mgt_tab'] = true;
		obj['title'] = `Farm Monitoring | LA Rice Mill`;
	}
	// Crop Calendar Tab
	else if (tab === 'crop_calendar') {
		obj['calendar_tab'] = true;
		obj['farms_mgt_tab'] = true;
		obj['title'] = `Crop Calendars | LA Rice Mill`;
	}
	else if (tab === 'detailed_crop_calendar') {
		obj['calendar_tab'] = true;
		obj['farms_mgt_tab'] = true;
		obj['title'] = `Crop Calendar Details | LA Rice Mill`;
	}
	else if (tab === 'add_crop_calendar') {
		obj['calendar_tab'] = true;
		obj['farms_mgt_tab'] = true;
		obj['title'] = `Create Crop Calendar | LA Rice Mill`;
	}

	else if (tab === 'harvest_cycle') {
		obj['harvest_cycle_tab'] = true;
		obj['farms_mgt_tab'] = true;
		obj['title'] = `Harvest | LA Rice Mill`;
	}
	else if (tab === 'sms_subcription') {
		obj['sms_tab'] = true;
		obj['title'] = `SMS Subscriptions | LA Rice Mill`;
	}
	else if (tab === 'pest_and_disease') {
		obj['pest_and_disease_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}
	else if (tab === 'nutrient_mgt_diagnose') {
		obj['nutrient_diagnose_tab'] = true;
		obj['nutrient_mgt_tab'] = true
		obj['title'] = `Nutrient Management | LA Rice Mill`;
	}
	else if (tab === 'user_mgt') {
		obj['user_tab'] = true;
		obj['title'] = `User Management | LA Rice Mill`;
	}
	else if (tab === 'analytics') {
		obj['analytics_tab'] = true;
		obj['title'] = `Analytics | LA Rice Mill`;
	}
	else if (tab === 'inventory_tab') {
		obj['inventory_tab'] = true;
		obj['material_mgt_tab'] = true;
		obj['title'] = `Inventory | LA Rice Mill`;
	}
	else if (tab === 'orders_tab') {
		obj['orders_tab'] = true;
		obj['material_mgt_tab'] = true;
		obj['title'] = `Material Requests | LA Rice Mill`;
	}
	else if (tab === 'add_crop_calendar') {
		obj['farm_tab'] = true;
		obj['farms_mgt_tab'] = true;
		obj['title'] = `Create Crop Calendar | LA Rice Mill`;
	}
	else if (tab === 'add_farm') {
		obj['monitor_farms_tab'] = true;
		obj['farms_mgt_tab'] = true;
		obj['title'] = `Create Farm | LA Rice Mill`;
	}
	else if (tab === 'disaster') {
		obj['disaster'] = true;
		obj['farms_mgt_tab'] = true;
		obj['title'] = `Disaster Warnings | LA Rice Mill`;
	}

	// Nutrient Management Tab
	else if (tab === 'nutrient_mgt_discover') {
		obj['nutrient_mgt_discover'] = true;
		obj['nutrient_mgt_tab'] = true;
		obj['title'] = `Nutrient Management | LA Rice Mill`;
	}
	else if (tab === 'nutrient_mgt_plan') {
		obj['nutrient_mgt_plan'] = true;
		obj['nutrient_mgt_tab'] = true;
		obj['title'] = `Nutrient Management | LA Rice Mill`;
	}
	else if (tab === 'nutrient_mgt_reco') {
		obj['nutrient_mgt_reco'] = true;
		obj['nutrient_mgt_tab'] = true;
		obj['title'] = `Nutrient Management | LA Rice Mill`;
	}

	// Pest and Disease Diagnose Tab
	else if (tab === 'pest_and_disease_discover') {
		obj['pest_and_disease_discover'] = true;
		obj['pd_mgt_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}
	else if (tab === 'pest_and_disease_diagnoses') {
		obj['pest_and_disease_diagnoses'] = true;
		obj['pd_mgt_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}
	else if (tab === 'pest_and_disease_frequency') {
		obj['pest_and_disease_frequency'] = true;
		obj['pd_mgt_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}
	else if (tab === 'pest_and_disease_add_diagnosis') {
		obj['pest_and_disease_diagnoses'] = true;
		obj['pd_mgt_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}
	else if (tab === 'pest_and_disease_add_pest') {
		obj['pest_and_disease_diagnoses'] = true;
		obj['pd_mgt_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}
	else if (tab === 'pest_and_disease_add_disease') {
		obj['pest_and_disease_diagnoses'] = true;
		obj['pd_mgt_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}
	else if (tab === 'pest_and_disease_detailed_diagnosis') {
		obj['pest_and_disease_diagnoses'] = true;
		obj['pd_mgt_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}
	else if (tab === 'pest_and_disease_detailed_pest') {
		obj['pest_and_disease_diagnoses'] = true;
		obj['pd_mgt_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}
	else if (tab === 'pest_and_disease_detailed_disease') {
		obj['pest_and_disease_diagnoses'] = true;
		obj['pd_mgt_tab'] = true;
		obj['title'] = `Pest & Disease | LA Rice Mill`;
	}

	// SMS Management Tab
	else if (tab === 'sms_subscriptions') {
		obj['subscriptions_tab'] = true;
		obj['sms_mgt_tab'] = true;
		obj['title'] = `SMS Management | LA Rice Mill`;
	}
	else if (tab === 'sms_add_subscription') {
		obj['subscriptions_tab'] = true;
		obj['sms_mgt_tab'] = true;
		obj['title'] = `SMS Management | LA Rice Mill`;
	}
	else if (tab === 'sms_messages') {
		obj['messages_tab'] = true;
		obj['sms_mgt_tab'] = true;
		obj['title'] = `SMS Management | LA Rice Mill`;
	}

	// User Management
	else if (tab === 'user_management') {
		obj['users_tab'] = true;
		obj['title'] = `User Management | LA Rice Mill`;
	}

	// Reports
	else if (tab === 'reports') {
		obj['reports_tab'] = true;
		obj['title'] = `Farm Productivity Reports | LA Rice Mill`;
	}

	// Reports
	else if (tab === 'notification_tab') {
		obj['title'] = `Notifications | LA Rice Mill`;
	}
	
	return obj;
}

exports.innit_pagination = function(obj, start, end, total_record) {
	if (total_record > end) {
		obj['page_next'] = 'ajax(10, 10, "")';
	}
	if (start != '0') {
		obj['page_prev'] = (start - 10).toString();
	}
	return obj;
}

exports.innit_reports = function(obj, role, url) {
	var str;
	var roles = [
		{ name: 'System Admin' }, { name: 'Sales' }, { name: 'Purchasing' }, { name: 'Logistics' }
	];
	if (role === 'System Admin') {
		obj['report_url'] = url;
		obj['roles'] = roles;
	}
	else if (role === 'Sales Employee') {
		obj['report_url'] = url;
		obj['roles'] = [roles[1]];
	}
	else if (role === 'Purchasing Employee') {
		obj['report_url'] = url;
		obj['roles'] = [roles[2]];
	}
	else if (role === 'Logistics Employee') {
		obj['report_url'] = url;
		obj['roles'] = [roles[3]];
	}

	return obj;
}

exports.innitQuery_to_Arr = function(obj) {
	var keys = Object.keys(obj);

	for (var i = 0; i < keys.length; i++) {
		obj[keys[i]] = obj[keys[i]].split(',');
	}
	
	return obj;
}