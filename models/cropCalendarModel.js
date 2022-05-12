var mysql = require('./connectionModel');
mysql = mysql.connection;

//Crop Cycle
exports.createCycle = function(data, next) {
	var sql = "insert into crop_cycle_table (start_date, end_date, seed_planted) values ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
};

exports.getAllCalendars = function(next) {
	var sql = "select distinct crop_plan, regexp_substr(crop_plan, '[0-9]+') as year from crop_calendar_table join seed_table on seed_planted = seed_id order by year desc, crop_plan desc";
	mysql.query(sql, next);
}

exports.getCropPlans = function(next) {
	var sql = "select regexp_substr(crop_plan, '[0-9]+') as year, ft.farm_id, ft.farm_name, cct.calendar_id, cct.crop_plan from farm_table ft join crop_calendar_table cct where ft.farm_id = cct.farm_id order by year desc, crop_plan desc";
	mysql.query(sql, next);
}

exports.readCropCalendar = function(query, next) {
	var sql = "select * from crop_calendar_table join seed_table on seed_planted = seed_id where ?";
	sql = mysql.format(sql, query);
	//console.log(sql);
	mysql.query(sql, next);
}

//Crop Calendar
exports.createCropCalendar = function(data, next) {
	var sql = "insert into crop_calendar_table set ? ;";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
};

exports.getYieldForecastVariables = function(data, next) {
	var sql = "select sowing_date, harvest_date, farm_name from crop_calendar_table join farm_table using(farm_id) where ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
}

//New sql with calendar stage based on seed maturity days
// stages : Land Prepation / Sowing / Vegetation / Reproductive / Ripening / Harvesting
exports.getCropCalendars = function(query, next) {
	var str_date = `date('${query.date}')`;
	var filter;

	//var sql = "select t.*, case when max(t.type) = 'Sow Seed' then case when max(t.date_completed) is null then 'Sowing' when datediff(now(), max(t.date_completed)) < maturity_days then 'Vegetation' when datediff(now(), max(t.date_completed)) >= maturity_days && datediff(now(), max(t.date_completed)) < (maturity_days+35) then 'Reproductive' when datediff(now(), max(t.date_completed)) >= (maturity_days+35) && datediff(now(), max(t.date_completed)) < (maturity_days+65) then 'Ripening' when datediff(now(), max(t.date_completed)) >= (maturity_days+65) then 'Harvesting' end else 'Land Preparation' end as stage from ( select cct.*, ft.farm_name, ft.land_type, st.seed_name, st.maturity_days, null as type, null as date_completed from crop_calendar_table cct join farm_table ft on cct.farm_id = ft.farm_id join seed_table st on cct.seed_planted = st.seed_id ";
	//var sql = "select t.*, case when max(t.lp_type) is not null then case when max(sow_date_completed) is null then 'Sowing' when datediff(now(), max(sow_date_completed)) < maturity_days then 'Vegetation' when datediff(now(), max(sow_date_completed)) >= maturity_days && datediff(now(), max(sow_date_completed)) < (maturity_days+35) then 'Reproductive' when datediff(now(), max(sow_date_completed)) >= (maturity_days+35) && datediff(now(), max(sow_date_completed)) < (maturity_days+65) then 'Ripening' when datediff(now(), max(sow_date_completed)) >= (maturity_days+65) then 'Harvesting' end else 'Land Preparation' end as stage from ( select cct.*, ft.farm_name, ft.land_type, st.seed_name, st.maturity_days, null as sow_type, null as sow_date_completed, null as lp_type, null as lp_date_completed from crop_calendar_table cct join farm_table ft on cct.farm_id = ft.farm_id join seed_table st on cct.seed_planted = st.seed_id ";
	var sql = `select *,case when status = 'Completed' then 'Completed' else case WHEN MAX(lp_type) IS NOT NULL THEN CASE WHEN MAX(true_sow) IS NULL THEN 'Sowing' WHEN DATEDIFF(${str_date}, MAX(true_sow)) < maturity_days THEN 'Vegetation' WHEN DATEDIFF(${str_date}, MAX(true_sow)) >= maturity_days && DATEDIFF(${str_date}, MAX(true_sow)) < (maturity_days + 35) THEN 'Reproductive' WHEN DATEDIFF(${str_date}, MAX(true_sow)) >= (maturity_days + 35) && DATEDIFF(${str_date}, MAX(true_sow)) < (maturity_days + 65) THEN 'Ripening' WHEN DATEDIFF(${str_date}, MAX(true_sow)) >= (maturity_days + 65) THEN 'Harvesting' ELSE 'Sowing' END ELSE 'Land Preparation' END end AS stage2 from ( SELECT case when max(sow_date_completed) is not null then case when method = 'Transplanting' then date_sub(max(sow_date_completed), interval 15 day) else max(sow_date_completed) end else null end as true_sow,max(farm_area) as farm_area, max(calendar_id) as calendar_id, max(farm_id) as farm_id, max(land_prep_date) as land_prep_date, max(sowing_date) as sowing_date, max(harvest_date) as harvest_date, max(planting_method) as planting_method, max(seed_planted) as seed_planted, max(status) as status, max(seed_rate) as seed_rate, max(harvest_yield) as harvest_yield, max(crop_plan) as crop_plan, max(method) as method, max(farm_name) as farm_name, max(land_type) as land_type, max(seed_name) as seed_name, max(maturity_days) as maturity_days, max(sow_type) as sow_type, max(sow_date_completed) as sow_date_completed, max(lp_type) as lp_type, max(lp_date_completed) as lp_date_completed, CASE WHEN MAX(t.lp_type) IS NOT NULL THEN CASE WHEN MAX(sow_date_completed) IS NULL THEN 'Sowing' WHEN DATEDIFF(${str_date}, MAX(sow_date_completed)) < maturity_days THEN 'Vegetation' WHEN DATEDIFF(${str_date}, MAX(sow_date_completed)) >= maturity_days && DATEDIFF(${str_date}, MAX(sow_date_completed)) < (maturity_days + 35) THEN 'Reproductive' WHEN DATEDIFF(${str_date}, MAX(sow_date_completed)) >= (maturity_days + 35) && DATEDIFF(${str_date}, MAX(sow_date_completed)) < (maturity_days + 65) THEN 'Ripening' WHEN DATEDIFF(${str_date}, MAX(sow_date_completed)) >= (maturity_days + 65) THEN 'Harvesting' ELSE 'Sowing' END ELSE 'Land Preparation' END AS stage FROM (SELECT cct.*, ft.farm_area, ft.farm_name, ft.land_type, st.seed_name, st.maturity_days, NULL AS sow_type, NULL AS sow_date_completed, NULL AS lp_type, NULL AS lp_date_completed FROM crop_calendar_table cct JOIN farm_table ft ON cct.farm_id = ft.farm_id JOIN seed_table st ON cct.seed_planted = st.seed_id`;
	for (var i = 0; i < query.status.length; i++) {
		if (i == 0) {
			sql += ' where ';
			sql += 'cct.status = "'+query.status[i]+'"';
		}
		else {
			sql += ' or cct.status = "'+query.status[i]+'"';
		}

	}

	if (query.where != null || query.where != undefined) {
		sql += ' and '+query.where.key +' = ?';
		sql = mysql.format(sql, query.where.val);
	}
	//sql += " union select crop_calendar_id, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, type, date_completed from work_order_table where type = 'Sow Seed' ) as t group by calendar_id";
	//sql += " union select crop_calendar_id, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, type, date_completed,null, null from work_order_table where type = 'Sow Seed' and status = 'Completed' union select crop_calendar_id, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,type, date_completed from work_order_table where type = 'Land Preparation' and status = 'Completed' ) as t where farm_id is not null group by calendar_id order by farm_id";
	sql += ` UNION select t1.crop_calendar_id, farm_id, land_prep_date, sowing_date, harvest_date, planting_method, seed_planted, status, seed_rate, harvest_yield, crop_plan, method, null,farm_name, land_type, seed_name, maturity_days, max(type) as sow_type, max(date_completed) as sow_date_completed, max(lp_type) as lp_type, max(lp_date) as lp_date from ( SELECT crop_calendar_id, NULL as farm_id, NULL as land_prep_date, NULL as sowing_date, NULL as harvest_date, NULL as planting_method, NULL as seed_planted, NULL as status, NULL as seed_rate, NULL as harvest_yield, NULL as crop_plan, NULL as method, null, NULL as farm_name, NULL as land_type, NULL as seed_name, 1 as maturity_days, type , date_completed, NULL as lp_type, NULL as lp_date FROM work_order_table WHERE type = 'Sow Seed' AND status = 'Completed' UNION SELECT crop_calendar_id, NULL, NULL, NULL, NULL, NULL, null, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, type, date_completed FROM work_order_table WHERE type = 'Land Preparation' AND status = 'Completed') as t1 group by crop_calendar_id ) AS t GROUP BY calendar_id ORDER BY farm_id ) as t_final where farm_id is not null group by calendar_id order by land_prep_date asc, farm_id`;
	//console.log(sql);
	//console.log(sql);
	mysql.query(sql, next);
	return sql;
}

exports.getCurrentCropCalendar = function(query, next) {
	var sql = "select cct.calendar_id from farm_table as ft join crop_calendar_table as cct using (farm_id) where ? and cct.status = 'In-Progress' or cct.status = 'Active'";
	sql = mysql.format(sql, query);
	//console.log(sql);
	mysql.query(sql, next);
}

exports.updateCropCalendar = function(query, filter, next) {
	var sql = "update crop_calendar_table set ? where ?"
	sql = mysql.format(sql, query);
	sql = mysql.format(sql, filter);
	mysql.query(sql, next);
}

exports.getCropCalendarByID = function(query, id, next){
	var sql = "SELECT * FROM (" + this.getCropCalendars(query) + ") a WHERE calendar_id = ? ORDER BY land_prep_date DESC";
	sql = mysql.format(sql, id);
	// console.log(sql);
	mysql.query(sql, next);
}
exports.getRequiredMaterials = function(query, next) {
	var sql1 = "select t3.*, case when max(current_amount) is null then 0 else max(current_amount) end as inventory  from (select *, case when type = 'Fertilizer' then (select fertilizer_name from fertilizer_table where fertilizer_id = item_id) when type = 'Seed' then (select seed_name from seed_table where seed_id = item_id) when type = 'Pesticide' then (select pesticide_name from pesticide_table where pesticide_id = item_id) end as item_name, case when (current_amount - qty ) < 0 then abs(current_amount - qty )  ELSE case when (current_amount is null) then qty else 'N/A' end end as deficient_qty from ( select farm_id, type, qty, item_id, max(current_amount) as current_amount from ( select cct.farm_id, wort.type, sum(wort.qty) as qty, wort.item_id, null as current_amount from crop_calendar_table cct join work_order_table wot on cct.calendar_id = wot.crop_calendar_id join wo_resources_table wort using(work_order_id) where ";
	var sql2 = " group by farm_id, wort.type, wort.item_id union select farm_id, fm.item_type, null, fm.item_id, fm.current_amount from crop_calendar_table cct join farm_materials fm using(farm_id) where ";
	var sql3 = " and isActive = 1 ) as t1 group by farm_id, t1.type, t1.item_id ) as t2 join farm_table ft using(farm_id) where t2.qty is not null ) as t3 group by farm_id,type"
	for (var i = 0; i < query.calendar_id.length; i++) {
		if (i > 0 && i <= query.calendar_id.length - 1) {
			sql1 += ' or ';
			sql2 += ' or ';
		}
		sql1 += ' cct.calendar_id = '+query.calendar_id[i];
		sql2 += ' cct.calendar_id = '+query.calendar_id[i];
	}
	sql1 = sql1 + sql2 + sql3;
	//console.log(sql1);
	mysql.query(sql1, next);
}