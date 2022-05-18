var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.createWorkOrder = function(query, next) {
	var sql = "insert into work_order_table set ?;";
	sql = mysql.format(sql, query);

	mysql.query(sql, next);
}

exports.createWorkOrderResources = function(query, next) {
	var sql = "insert into wo_resources_table (work_order_id, type, qty, item_id) values ";
	for (var i = 0; i < query.length; i++) {
		if (i != 0) {
			sql += ', ';
		}

		sql += '(?, ?, ?, ?)';
		sql = mysql.format(sql, query[i].work_order_id);
		sql = mysql.format(sql, query[i].type);
		sql = mysql.format(sql, query[i].qty);
		sql = mysql.format(sql, query[i].item_id);
	}

	mysql.query(sql, next);
}

exports.getDetailedWorkOrder = function(query, next) {
	var sql = "select wot.date_completed, cct.crop_plan, wot.work_order_id, wot.type, wot.crop_calendar_id, date_created, date_due, date_start, wot.status, wot.desc, notes, cct.harvest_yield, ft.farm_id, ft.farm_name, ft.farm_desc from work_order_table as wot join crop_calendar_table cct on wot.crop_calendar_id = cct.calendar_id join farm_table ft using(farm_id) where ?;";
	sql = mysql.format(sql, query);
	//console.log(sql);
	mysql.query(sql, next);
}

exports.getResourceDetails = function(query, type, next) {
	var table_name;
	var column_names = [];
	var sql;
	if (type == 'Pesticide') {
		table_name = 'pesticide_table';
		column_names = ['pesticide_id', 'pesticide_name', 'pesticide_desc'];
		columns = column_names.join();
	}
	else if (type == 'Fertilizer') {
		table_name = 'fertilizer_table';
		column_names = ['fertilizer_id', 'fertilizer_name', 'fertilizer_desc'];
		columns = column_names.join();
	}
	else if (type == 'Seed') {
		table_name = 'seed_table';
		column_names = ['seed_id', 'seed_name', 'seed_desc'];
		columns = column_names.join();
	}

	sql = "select max(wo_resources_id) as wo_resources_id, max(work_order_id) as work_order_id, max(type) as type, max(units) as units, case when isnull(max(qty)) then 0 else max(qty) end as qty, max(item_id) as item_id, max(material_name) as material_name, max(material_desc) as material_desc from ( SELECT *, null as material_name, null as material_desc FROM wo_resources_table where ? union select null, null, null, null, null, "+column_names+" from "+table_name+") as t group by item_id order by item_id asc";

	sql = mysql.format(sql, query);
	//console.log(sql);
	mysql.query(sql, next);
}

exports.getGroupedWO = function(type, filter, next) {
	var sql = "select t.*, date_add(target_application_date, interval 7 day) as target_date_end, case when target_application_date is not null then case when (date_completed >= target_application_date and date_completed <= date_add(target_application_date, interval 7 day)) then 'Followed' else 'Unfollowed' end else 'N/A' end as followed from ( SELECT case when work_order_id in (select wo_id from fertilizer_recommendation_items where wo_id = work_order_id) then 'Generated Recommendation' else 'User Generated' end as record_type, (select target_application_date from fertilizer_recommendation_items where wo_id = work_order_id) as target_application_date, wot.*, wrt.item_id, ft.fertilizer_name, wrt.qty FROM work_order_table wot JOIN wo_resources_table wrt USING (work_order_id) JOIN fertilizer_table ft ON wrt.item_id = ft.fertilizer_id WHERE wot.crop_calendar_id = ? AND wot.type = ? ) as t";
	sql = mysql.format(sql, filter);
	sql = mysql.format(sql, type);

	mysql.query(sql, next);
}

exports.getWorkOrders = function(query, next) {
	var sql = 'select case when DATE(now()) = date_due then "Due Today" when now() > date_due then "Overdue" when date_add(now(), interval 3 day) >= date_due then "Due soon" else  "Due in a week" end as notif_type, crop_plan, work_order_table.*, case when notes is null then "N/A" else notes end as wo_notes , farm_table.farm_name, farm_table.farm_id from work_order_table join crop_calendar_table on crop_calendar_id = calendar_id join farm_table using (farm_id) ';
	if (JSON.stringify(query) != '{ }') {
		if (query.hasOwnProperty('where') && query.where != null) {
			for (var i = 0; i < query.where.key.length; i++) {
				if (i == 0) {
					if (query.where.key[i] == 'work_order_table.crop_calendar_id') {
						sql += ' where ('+query.where.key[i];
					}
					else {
						sql += ' where '+query.where.key[i];
					}
					
				}
				else {
					if (query.where.key[i-1] == query.where.key[i]) {
						sql += ' or '+query.where.key[i];
					}
					else {
						if (query.where.key[i-1] == 'work_order_table.crop_calendar_id') {
							sql += ' and '+query.where.key[i]+'****';
						}
						else {
							sql += ' and '+query.where.key[i];
						}
						
					}	
				}

				if (query.where.key[i] != '') {
					if(query.where.value[i][0] != '!') {
						sql += ' = ?';
					}
					else {
						sql += ' != ?';
						query.where.value[i] = query.where.value[i].replace('!', '');
					}
					
					sql = mysql.format(sql, query.where.value[i]);
				}
				else {
					sql += query.where.value[i];
				}
			}
		}

		if (query.hasOwnProperty('group')) {
			sql += ' group by '+query.group;
			
		}

		if (query.hasOwnProperty('order')) {
			for (var i = 0; i < query.order.length; i++) {
				if (i == 0) {
					sql += ' order by '+query.order[i];
				}
				else {
					sql += ' , '+query.order[i];
				}
			}
		}

		if (query.hasOwnProperty('limit')) {
			sql += ' limit '+query.limit;
			
		}
	}

	mysql.query(sql, next);
}

exports.updateWorkOrder = function(query, filter, next) {
	var sql = "update work_order_table set ? where ?"
	sql = mysql.format(sql, query);
	sql = mysql.format(sql, filter);
	console.log(sql);
	mysql.query(sql, next);
}

exports.deleteResourceRecord = function(query, next) {
	var sql = "delete from wo_resources_table where ?"
	sql = mysql.format(sql, query);
	mysql.query(sql, next);
}


exports.getDueWorkorders = function(next){
	var sql = "SELECT wot.*, ft.farm_id, ft.farm_name FROM work_order_table wot INNER JOIN crop_calendar_table cct ON cct.calendar_id = wot.crop_calendar_id INNER JOIN farm_table ft ON ft.farm_id = cct.farm_id WHERE DATEDIFF(DATE(now()) , date_due) = 0 && wot.status != 'Completed';"
	mysql.query(sql, next);
}

exports.getOverdueWorkorders = function(next){
	var sql = "SELECT wot.*, ft.farm_id, ft.farm_name FROM work_order_table wot INNER JOIN crop_calendar_table cct ON cct.calendar_id = wot.crop_calendar_id INNER JOIN farm_table ft ON ft.farm_id = cct.farm_id WHERE DATEDIFF(DATE(now()) , date_due) > 0 && wot.status != 'Completed';"
	mysql.query(sql, next);
}