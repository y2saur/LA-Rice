var mysql = require('./connectionModel');
mysql = mysql.connection;

function processOverviewFilter(data) {
	var str = '';
	if (data != null) {
		str += `where `;
		data.farm_id.forEach(function(item, index) {
			if (index == 0) {
				str += '(';
			}
			str += `ft.farm_id = ${item}`
			if (index != data.farm_id.length - 1)
				str += ` or `;
			else
				str += `) `;
		});

		if (data.farm_id.length >= 1) {
			str += ` and `;
		}
		data.cycles.forEach(function(item, index) {
			if (index == 0) {
				str += '(?';
			}
			str = mysql.format(str, { crop_plan: item });
			if (index != data.cycles.length - 1)
				str += ` or ?`;
			else
				str += `) `;
		});
	}
	return str;
}

exports.getUpcomingWOByStatus = function(data, next) {
	var sql = `select count(*) as count, wot.status, wot.crop_calendar_id  from work_order_table wot join crop_calendar_table cct on wot.crop_calendar_id = cct.calendar_id where cct.status != 'Completed' and (yearweek(date('${data.date}'), 0) >= yearweek(wot.date_start, 0)) and (yearweek(date('${data.date}'), 0)-yearweek(wot.date_start, 0) <= 1 and yearweek(date('${data.date}'), 0)-yearweek(wot.date_start, 0)  >= -1) group by wot.crop_calendar_id, wot.status`;
	mysql.query(sql, next);
}



exports.getCropCalendarNutrientRecommendations = function(data, next) {
	var sql = `select count(*) as count, 'Nutrient Generated Recommendation' as record_type, calendar_id from fertilizer_recommendation_plan frp join fertilizer_recommendation_items fri using (fr_plan_id) where ?`;
	for (var i = 0; i < data.calendar_ids.length; i++) {
		sql = mysql.format(sql, { 'calendar_id': data.calendar_ids[i] });
		if (i != data.calendar_ids.length - 1) {
			sql += " or ?";
		}
		else {
			sql += " ";
		}
	}
	while(sql.includes('cct_calendar_id')) {
		sql = sql.replace('cct_calendar_id', 'calendar_id');
	}
	sql += ' group by calendar_id';

	mysql.query(sql, next);
}

exports.getProductionOverview = function(data, next) {
	var str = processOverviewFilter(data);
	
	var sql = `select ft.farm_area, ft.land_type, cct.calendar_id, ft.farm_name, st.seed_name, cct.crop_plan, case when fy.harvested is null then 0 else fy.harvested end as harvested, case when fy.forecast = -1 then 0 else fy.forecast end as forecasted from crop_calendar_table cct join forecasted_yield fy using(calendar_id) join seed_table st using(seed_id) join farm_table ft using(farm_id) ${str}`;
	
	mysql.query(sql, next);
}

exports.getFertilizerConsumption = function(data, next) {
	var str = processOverviewFilter(data);
	var sql = `select N, P, K, cct.crop_plan, cct.calendar_id, ft.farm_name, fet.fertilizer_name, sum(wrt.qty) as qty, ft.farm_area from crop_calendar_table cct join work_order_table wot on cct.calendar_id = wot.crop_calendar_id join wo_resources_table wrt using (work_order_id) join fertilizer_table fet on wrt.item_id = fet.fertilizer_id join farm_table ft using(farm_id) ${str} group by crop_plan, farm_name, fertilizer_name`;
	
	mysql.query(sql, next);
}

exports.getPDOverview = function(data, next) {
	var str = processOverviewFilter(data);
	var sql = `select cct.crop_plan, count(*) as count, d.type, d.stage_diagnosed, ft.farm_id, case when d.type = 'Pest' then (select pest_name from pest_table where pd_id = pest_id) else (select disease_name from disease_table where pd_id = disease_id) end as pd_name from crop_calendar_table cct join diagnosis d using(calendar_id) join farm_table ft on cct.farm_id = ft.farm_id  ${str} group by crop_plan, stage_diagnosed, pd_name`;
	
	mysql.query(sql, next);
}

exports.getPDOccurence = function(data1, next) {
	var sql = "select *, case when type = 'Pest' then (select pest_name from pest_table where pest_id = pd_id) else (select disease_name from disease_table where disease_id = pd_id) end as pd_name, case when type = 'Pest' then (select pest_desc from pest_table where pest_id = pd_id) else (select disease_desc from disease_table where disease_id = pd_id) end as pd_desc, case when type = 'Pest' then (select scientific_name from pest_table where pest_id = pd_id) else (select scientific_name from disease_table where disease_id = pd_id) end as scientific_name from diagnosis where ?";
	for (var i = 0; i < data1.calendar_id.length; i++) {
		sql = mysql.format(sql, { calendar_id: data1.calendar_id[i] });
		if (i < data1.calendar_id.length - 1)
			sql += ' or ?';
	}
	// sql += " group by calendar_id";
	//console.log(sql);
	mysql.query(sql, next);
}

exports.getNutrientChart = function(data1, data2, next) {
	var sql = "select * from ( SELECT 'Applied' as application_type, case when fertilizer_name = 'Fertilizer 16-20-0' then 'P' when fertilizer_name = 'Potash 0-0-60' then 'K' when fertilizer_name = 'Urea 46-0-0' then 'N' end as nutrient_type, wot.date_completed, wrt.qty, ft.fertilizer_name, N, P, K, crop_calendar_id FROM work_order_table wot JOIN wo_resources_table wrt USING (work_order_id) JOIN fertilizer_table ft ON wrt.item_id = ft.fertilizer_id WHERE ? ";
	for (var i = 0; i < data1.crop_calendar_id.length; i++) {
		sql = mysql.format(sql, { crop_calendar_id: parseInt(data1.crop_calendar_id[i]) });
		if (i < data1.crop_calendar_id.length - 1)
			sql += ' or ?';
	}
	sql += " AND wot.type = 'Fertilizer Application' union SELECT 'Applied', case when fertilizer_name = 'Fertilizer 16-20-0' then 'N' when fertilizer_name = 'Potash 0-0-60' then 'K' when fertilizer_name = 'Urea 46-0-0' then 'N' end as type, wot.date_completed, wrt.qty, ft.fertilizer_name, N, P, K, crop_calendar_id FROM work_order_table wot JOIN wo_resources_table wrt USING (work_order_id) JOIN fertilizer_table ft ON wrt.item_id = ft.fertilizer_id WHERE ? ";
	for (var i = 0; i < data1.crop_calendar_id.length; i++) {
		sql = mysql.format(sql, { crop_calendar_id: parseInt(data1.crop_calendar_id[i]) });
		if (i < data1.crop_calendar_id.length - 1)
			sql += ' or ?';
	}
	sql += " AND wot.type = 'Fertilizer Application' and fertilizer_name = 'Fertilizer 16-20-0' union SELECT 'Recommended', CASE WHEN fertilizer_name = 'Fertilizer 16-20-0' THEN 'P' WHEN fertilizer_name = 'Potash 0-0-60' THEN 'K' WHEN fertilizer_name = 'Urea 46-0-0' THEN 'N' END AS nutrient_type, fri.target_application_date, fri.amount, ft.fertilizer_name, N, P, K, calendar_id FROM fertilizer_recommendation_plan frp JOIN fertilizer_recommendation_items fri USING (fr_plan_id) JOIN fertilizer_table ft USING (fertilizer_id) WHERE ? ";
	for (var i = 0; i < data2.calendar_id.length; i++) {
		sql = mysql.format(sql, { calendar_id: parseInt(data2.calendar_id[i]) });
		if (i < data2.calendar_id.length - 1)
			sql += ' or ?';
	}
	sql += ") as t group by crop_calendar_id, application_type, date_completed, nutrient_type";
	
	mysql.query(sql, next);
}

exports.getSeedChart = function(farm,data, next) {
	var sql = "select * from crop_calendar_table join seed_table on seed_id = seed_planted join farm_table ft using(farm_id) where (? ";
	for (var i = 0; i < farm.length; i++) {
		sql = mysql.format(sql, { farm_name: farm[i] });
		if (i < farm.length - 1)
			sql += ' or ?';
		else {
			sql += ') ';
		}
	}
	if (data != null) {
		sql += 'and (?';
		for (var i = 0; i < data.length; i++) {
			sql = mysql.format(sql, { crop_plan: data[i] });
			if (i < data.length - 1) {
				sql += ' or ?';
			}
			else {
				sql += ') ';
			}
		}
	}

	sql += 'and crop_calendar_table.status = "Completed" order by harvest_date asc, calendar_id asc';

	
	mysql.query(sql, next);
}

exports.getFarmProductivity = function(next) {
	var sql = "select * from ( SELECT *, MAX(prev_calendar) AS max_prev_calendar, MAX(previous_yield) AS max_previous_yield FROM (SELECT st.seed_name, ft.farm_area, fy.forecast_yield_id, cct.calendar_id, NULL AS prev_calendar, cct.status, ft.farm_id, ft.farm_name, cct.crop_plan, fy.forecast AS forecast_yield, cct.harvest_yield AS current_yield, NULL AS previous_yield FROM crop_calendar_table cct LEFT JOIN crop_calendar_table AS cct1 ON (cct.farm_id = cct1.farm_id AND cct.harvest_date < cct1.harvest_date) JOIN seed_table st ON cct.seed_planted = st.seed_id JOIN forecasted_yield fy ON (cct.calendar_id = fy.calendar_id AND cct.seed_planted = fy.seed_id) JOIN farm_table ft ON cct.farm_id = ft.farm_id WHERE cct1.harvest_date IS NULL UNION SELECT NULL, NULL, NULL, NULL, t1.calendar_id, NULL, t1.farm_id, NULL, NULL, NULL, NULL, t1.harvest_yield FROM (SELECT *, @rn:=IF(@prev = farm_id, @rn + 1, 1) AS rn, @prev:=farm_id FROM crop_calendar_table JOIN (SELECT @prev:=NULL, @rn:=0) AS vars ORDER BY farm_id , harvest_date DESC) AS t1 WHERE rn = 2) AS t2 GROUP BY t2.farm_id ) as t3 union select st.seed_name, ft.farm_area, null, cct.calendar_id, null, cct.status, ft.farm_id, ft.farm_name, cct.crop_plan, forecast, cct.harvest_yield, null, null, null from crop_calendar_table cct join seed_table st on seed_planted = seed_id join farm_table ft using(farm_id) left join forecasted_yield fy on fy.calendar_id = cct.calendar_id where cct.status = 'Completed' and cct.farm_id not in ( SELECT farm_id FROM (SELECT st.seed_name, ft.farm_area, fy.forecast_yield_id, cct.calendar_id, NULL AS prev_calendar, cct.status, ft.farm_id, ft.farm_name, cct.crop_plan, fy.forecast AS forecast_yield, cct.harvest_yield AS current_yield, NULL AS previous_yield FROM crop_calendar_table cct LEFT JOIN crop_calendar_table AS cct1 ON (cct.farm_id = cct1.farm_id AND cct.harvest_date < cct1.harvest_date) JOIN seed_table st ON cct.seed_planted = st.seed_id JOIN forecasted_yield fy ON (cct.calendar_id = fy.calendar_id AND cct.seed_planted = fy.seed_id) JOIN farm_table ft ON cct.farm_id = ft.farm_id WHERE cct1.harvest_date IS NULL UNION SELECT NULL, NULL, NULL, NULL, t1.calendar_id, NULL, t1.farm_id, NULL, NULL, NULL, NULL, t1.harvest_yield FROM (SELECT *, @rn:=IF(@prev = farm_id, @rn + 1, 1) AS rn, @prev:=farm_id FROM crop_calendar_table JOIN (SELECT @prev:=NULL, @rn:=0) AS vars ORDER BY farm_id , harvest_date DESC) AS t1 WHERE rn = 2) AS t2 GROUP BY t2.farm_id) ";
	

	mysql.query(sql, next);
};

exports.getCalendarList = function(data, next) {
	var sql = "select * from ( SELECT *, @rn:=IF(@prev = farm_id, @rn + 1, 1) AS rn, @prev:=farm_id FROM crop_calendar_table JOIN (SELECT @prev:=NULL, @rn:=0) AS vars where status = 'Completed' ORDER BY farm_id , harvest_date DESC ) as t where ";
	if (data == 'new') {
		sql += 'rn = 1';
	}
	else {
		sql += 'rn != 1';
	}
	mysql.query(sql, next);
}

exports.getInputResourcesUsed = function(data, next) {
	var sql = "select cct.calendar_id, wort.item_id, wort.type, sum(wort.qty) as qty, t2.price, sum(wort.qty) * t2.price as total_cost, case when wort.type = 'Fertilizer' then (select fertilizer_name from fertilizer_table where fertilizer_id = wort.item_id) when wort.type = 'Pesticide' then (select pesticide_name from pesticide_table where pesticide_id = wort.item_id) when wort.type = 'Seed' then (select seed_name from seed_table where seed_id = wort.item_id) end as resource_name, case when wort.type = 'Fertilizer' then (select units from fertilizer_table where fertilizer_id = wort.item_id) when wort.type = 'Pesticide' then (select units from pesticide_table where pesticide_id = wort.item_id) when wort.type = 'Seed' then (select units from seed_table where seed_id = wort.item_id) end as resource_unit from work_order_table wot right join wo_resources_table wort using(work_order_id) join crop_calendar_table cct on cct.calendar_id = wot.crop_calendar_id join farm_table ft using(farm_id) left join ( select item_id, farm_id, price from ( select item_id, farm_id, purchase_price / amount as price, @rn := if(@prev = item_id, @rn + 1, 1) as rn, @prev := item_id from purchase_table join (select @prev := null, @rn := 0) as vars where purchase_status = 'Purchased' order by farm_id, item_id, date_purchased desc ) as t1 where rn = 1 ) as t2 on (ft.farm_id = t2.farm_id and wort.item_id = t2.item_id) where ? ";
	for (var i = 0; i < data.calendar_ids.length; i++) {
		sql = mysql.format(sql, { calendar_id: data.calendar_ids[i] });
		if (i != data.calendar_ids.length - 1) {
			sql += " or ?";
		}
		else {
			sql += " ";
		}
	}
	sql += "and wot.status = 'Completed' group by calendar_id, item_id";

	mysql.query(sql, next);
}

exports.getHarvestReports = function(next) {
	var sql = "SELECT REGEXP_SUBSTR(crop_plan,'[0-9]+') as year,group_concat(calendar_id , '') as calendar_ids, crop_plan, count(*) as count, DATE_FORMAT(min(land_prep_date), '%b %d, %Y') as min_start, DATE_FORMAT(max(harvest_date), '%b %d, %Y') as max_end, case when max(status) != 'Completed' then 'Partially Complete' else 'Completed' end as status FROM crop_calendar_table where status = 'Completed' group by crop_plan order by year desc ,crop_plan desc, max(harvest_date) desc;";
	
	mysql.query(sql, next);
}

exports.getHarvestSummaryChart = function(data, next) {
	var sql = "select cct.crop_plan, ft.farm_name, st.seed_name, fy.* from crop_calendar_table cct join seed_table st on st.seed_id = cct.seed_planted join farm_table ft using(farm_id) join forecasted_yield fy using(calendar_id) where ?";
	if (data.hasOwnProperty('calendar_ids')) {
		for (var i = 0; i < data.calendar_ids.length; i++) {
			sql = mysql.format(sql, { 'cct.calendar_id': data.calendar_ids[i] });
			if (i != data.calendar_ids.length - 1) {
				sql += " or ?";
			}
			else {
				sql += " ";
			}
		}
	}
	else {
		sql = mysql.format(sql, { crop_plan: data.crop_plan });
		if (data.hasOwnProperty('status')) {
			sql += ' and cct.status = "'+data.status+'"';
		}
	}

	
	mysql.query(sql, next);
}

exports.getNutrientRecommendationDetails = function(data, next) {
	var sql = "select count(*) as count, t.*, date_add(target_application_date, interval 7 day) as target_date_end, case when target_application_date is not null then case when (date_completed >= target_application_date and date_completed <= date_add(target_application_date, interval 7 day)) then 'Followed' else 'Unfollowed' end else 'N/A' end as followed from ( SELECT case when work_order_id in (select wo_id from fertilizer_recommendation_items where wo_id = work_order_id) then 'Nutrient Generated Recommendation' else 'Nutrient User Generated' end as record_type, (select target_application_date from fertilizer_recommendation_items where wo_id = work_order_id) as target_application_date, wot.date_completed, wot.status, cct.calendar_id, wot.work_order_id FROM work_order_table wot JOIN crop_calendar_table cct on wot.crop_calendar_id = cct.calendar_id join wo_resources_table wrt USING (work_order_id) JOIN fertilizer_table ft ON wrt.item_id = ft.fertilizer_id WHERE ?";
	for (var i = 0; i < data.calendar_ids.length; i++) {
		sql = mysql.format(sql, { 'calendar_id': data.calendar_ids[i] });
		if (i != data.calendar_ids.length - 1) {
			sql += " or ?";
		}
		else {
			sql += " ";
		}
	}
	while(sql.includes('cct_calendar_id')) {
		sql = sql.replace('cct_calendar_id', 'cct.calendar_id');
	}
	sql += ` AND wot.type = 'Fertilizer Application' and wot.status = 'Completed') as t group by calendar_id, record_type, followed, status`;

	mysql.query(sql, next);
}

exports.getEarlyHarvestDetails = function(data, next) {
	var sql = "SELECT t.* FROM (SELECT farm_name, COUNT(*) AS frequency, SUM(sacks_harvested) AS harvest, stage_harvested, type, cct_id FROM harvest_details join crop_calendar_table on calendar_id = cct_id join farm_table using(farm_id) WHERE ? ";
	for (var i = 0; i < data.calendar_ids.length; i++) {
		sql = mysql.format(sql, { cct_id: data.calendar_ids[i] });
		if (i != data.calendar_ids.length - 1) {
			sql += " or ?";
		}
		else {
			sql += " ";
		}
	}
	sql += "group by cct_id, stage_harvested ) as t where t.stage_harvested != 'Harvesting'";
	
	mysql.query(sql, next);
}

exports.getHistoricalYieldQuery = function(data, next) {
	var sql = " select * from ( select * from ( select *, @rn := if(@prev = farm_id, @rn + 1, 1) as rn, @prev := farm_id from crop_calendar_table join (select @prev := null, @rn := 0) as vars order by farm_id, harvest_date desc ) as t ) as t1 where t1.calendar_id in ( select calendar_id from crop_calendar_table where ?";
	for (var i = 0; i < data.calendar_ids.length; i++) {
		sql = mysql.format(sql, { calendar_id: data.calendar_ids[i] });
		if (i != data.calendar_ids.length - 1) {
			sql += " or ?";
		}
		else {
			sql += " ";
		}
	}
	sql += " )";
	mysql.query(sql, next);
}

exports.getHistoricalYield = function(data, next) {
	var sql = "select farm_name, count(*) as count, sum(harvest_yield) / count(*) as avg_yield from ( select farm_name, cct.*, @rn := if(@prev = cct.farm_id, @rn + 1, 1) as rn, @prev := cct.farm_id from crop_calendar_table cct join (select @prev := null, @rn := 0) as vars join farm_table using(farm_id) order by farm_id, harvest_date desc ) as t where ";
	for (var i = 0; i < data.length; i++) {
		if (i != 0)
			sql += ' or ';
		sql += '(farm_id = '+data[i].farm_id+' and rn > '+data[i].rn+')';
	}
	sql += ' group by farm_id';
	mysql.query(sql, next);
}