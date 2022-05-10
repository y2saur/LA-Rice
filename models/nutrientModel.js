var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.deleteCNRAssignments = function(query, next) {
	var sql = `delete from custom_nutrient_recommendation_assignments where ?`;
	sql = mysql.format(sql, query);
	mysql.query(sql, next);
}

exports.deleteCNRItems = function(query, next) {
	var sql = `delete from custom_nutrient_recommendation_items where ?`;
	sql = mysql.format(sql, query);
	mysql.query(sql, next);
}

exports.getAggregatedCNR = function(next) {
	var sql = `SELECT cnr.cnr_id, cnr.cnr_name, cnri.* FROM custom_nutrient_recommendation cnr join custom_nutrient_recommendation_items cnri on cnr.cnr_id = cnri.cnr_id order by cnr.cnr_id;`;
	mysql.query(sql, next);
}

exports.getAggregatedCNRAssignment = function(next) {
	var sql = `select cnra.*, cnr.cnr_name from custom_nutrient_recommendation cnr join custom_nutrient_recommendation_assignments cnra on cnr.cnr_id = cnra.cnr_id`;
	mysql.query(sql, next);
}

exports.getCNRPlans = function(query, next) {
	var sql = `SELECT cnr.cnr_id, cnr.cnr_name, cnr_assignment_id, farm_id FROM custom_nutrient_recommendation cnr join custom_nutrient_recommendation_assignments cnra on cnr.cnr_id = cnra.cnr_id`;
	if (query != null) {
		sql += ` where ?`;
		sql = mysql.format(sql, query);
	}
	mysql.query(sql, next);
}

exports.createCNR = function(query, next) {
	var sql = `insert into custom_nutrient_recommendation set ?`;
	sql = mysql.format(sql, query);
	mysql.query(sql, next);
}

exports.createCNRAssignments = function(query, next) {
	var sql = `insert into custom_nutrient_recommendation_assignments (cnr_id, farm_id) values `;
	query.forEach(function(item, index) {
		if (index != 0) {
			sql += `, `;
		}
		sql += `(?, ?)`;
		sql = mysql.format(sql, item.cnr_id);
		sql = mysql.format(sql, item.farm_id);
	});
	mysql.query(sql, next);
}

exports.createCNRItems = function(query, next) {
	var sql = `insert into custom_nutrient_recommendation_items (dat, fertilizer_id, amount_equation, cnr_id) values `;
	query.forEach(function(item, index) {
		if (index != 0) {
			sql += `, `;
		}
		sql += `(?, ?, ?, ?)`;
		sql = mysql.format(sql, item.dat);
		sql = mysql.format(sql, item.fertilizer_id);
		sql = mysql.format(sql, item.amount_equation);
		sql = mysql.format(sql, item.cnr_id);
	});
	mysql.query(sql, next);
}

exports.addSoilRecord = function(data, next) {
	var sql = "insert into soil_quality_table set ?";
	sql = mysql.format(sql, data);
	while (sql.includes("`calendar_id` = ''")) {
		sql = sql.replace("`calendar_id` = ''", '`calendar_id` = '+null);
	}
	mysql.query(sql, next);
};

exports.getSoilRecord = function(data, next) {
	var sql = "select sqt.*, cct.method, ft.land_type, ft.farm_name, ft.farm_area from soil_quality_table sqt left join crop_calendar_table cct using(calendar_id) right join farm_table ft on sqt.farm_id = ft.farm_id where ? order by date_taken desc, soil_quality_id desc";
	sql = mysql.format(sql, data);
	var obj_length = Object.keys(data).length;
	while (sql.includes("`farm_id`")) {
		sql = sql.replace("`farm_id`", 'ft.farm_id');
	}
	while (sql.includes("`farm_name`")) {
		sql = sql.replace("`farm_name`", 'ft.farm_name');
	}

	if (obj_length > 1) {
		var temp_sql = sql.split('WHERE');
		temp_sql[0] += ' WHERE ';
		temp_sql[1] = temp_sql[1].replace(',',' and ');
		sql = temp_sql[0]+temp_sql[1];
	} 
	
	mysql.query(sql, next);
};

exports.getNutrientDetails = function(query, next) {
	if (query.specific) {
		var sql = "SELECT t1.calendar_id, t1.harvest_yield, t1.N * 30.515 * t1.farm_area AS N, t1.P * 30.515 * t1.farm_area AS P, t1.K * 30.515 * t1.farm_area AS K, CASE WHEN MAX(t1.applied_N) IS NULL THEN 0 ELSE MAX(t1.applied_N) END AS applied_N, CASE WHEN MAX(t1.applied_P) IS NULL THEN 0 ELSE MAX(t1.applied_P) END AS applied_P, CASE WHEN MAX(t1.applied_K) IS NULL THEN 0 ELSE MAX(t1.applied_K) END AS applied_K, CASE WHEN t1.N * 30.515 * t1.farm_area - case when MAX(t1.applied_N) is null then 0 else MAX(t1.applied_N) end < 0 OR t1.N * 30.515 * t1.farm_area - case when MAX(t1.applied_N) is null then 0 else MAX(t1.applied_N) end IS NULL THEN 0 ELSE t1.N * 30.515 * t1.farm_area - case when MAX(t1.applied_N) is null then 0 else MAX(t1.applied_N) end END AS deficient_N, CASE WHEN t1.P * 30.515 * t1.farm_area - case when MAX(t1.applied_P) is null then 0 else MAX(t1.applied_P) end < 0 OR t1.P * 30.515 * t1.farm_area - case when MAX(t1.applied_P) is null then 0 else MAX(t1.applied_P) end IS NULL THEN 0 ELSE t1.P * 30.515 * t1.farm_area - case when MAX(t1.applied_P) is null then 0 else MAX(t1.applied_P) end END AS deficient_P, CASE WHEN t1.K * 30.515 * t1.farm_area - case when MAX(t1.applied_K) is null then 0 else MAX(t1.applied_K) end < 0 OR t1.K * 30.515 * t1.farm_area - case when MAX(t1.applied_K) is null then 0 else MAX(t1.applied_K) end IS NULL THEN 0 ELSE t1.K * 30.515 * t1.farm_area - case when MAX(t1.applied_K) is null then 0 else MAX(t1.applied_K) end END AS deficient_K FROM (SELECT ft.farm_area, cct.calendar_id, cct.harvest_yield, CASE WHEN (SELECT n_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) IS NULL THEN 7.75 ELSE (SELECT n_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) END AS N, CASE WHEN (SELECT p_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) IS NULL THEN 4.0 ELSE (SELECT p_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) END AS P, CASE WHEN (SELECT k_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) IS NULL THEN 8.75 ELSE (SELECT k_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) END AS K, NULL AS applied_N, NULL AS applied_P, NULL AS applied_K FROM crop_calendar_table cct JOIN farm_table ft USING (farm_id) UNION SELECT NULL, t.crop_calendar_id, NULL AS harvest_yield, NULL AS N, NULL AS P, NULL AS K, SUM(t.total_N) AS total_N, SUM(t.total_P) AS total_P, SUM(t.total_K) AS total_K FROM (SELECT wot.work_order_id, wot.crop_calendar_id, SUM(wort.qty) * ft.N AS total_N, SUM(wort.qty) * ft.P AS total_P, SUM(wort.qty) * ft.K AS total_K FROM work_order_table wot JOIN wo_resources_table wort USING (work_order_id) JOIN fertilizer_table ft ON ft.fertilizer_id = wort.item_id WHERE wot.type = 'Fertilizer Application' AND wot.status = 'Completed' GROUP BY crop_calendar_id , fertilizer_id) AS t GROUP BY crop_calendar_id) AS t1 where ? GROUP BY calendar_id";
		sql = mysql.format(sql, query.specific);
	}
	else {
		var sql = "SELECT t1.calendar_id, t1.harvest_yield, t1.N * 30.515 * t1.farm_area AS N, t1.P * 30.515 * t1.farm_area AS P, t1.K * 30.515 * t1.farm_area AS K, CASE WHEN MAX(t1.applied_N) IS NULL THEN 0 ELSE MAX(t1.applied_N) END AS applied_N, CASE WHEN MAX(t1.applied_P) IS NULL THEN 0 ELSE MAX(t1.applied_P) END AS applied_P, CASE WHEN MAX(t1.applied_K) IS NULL THEN 0 ELSE MAX(t1.applied_K) END AS applied_K, CASE WHEN t1.N * 30.515 * t1.farm_area - case when MAX(t1.applied_N) is null then 0 else MAX(t1.applied_N) end < 0 OR t1.N * 30.515 * t1.farm_area - case when MAX(t1.applied_N) is null then 0 else MAX(t1.applied_N) end IS NULL THEN 0 ELSE t1.N * 30.515 * t1.farm_area - case when MAX(t1.applied_N) is null then 0 else MAX(t1.applied_N) end END AS deficient_N, CASE WHEN t1.P * 30.515 * t1.farm_area - case when MAX(t1.applied_P) is null then 0 else MAX(t1.applied_P) end < 0 OR t1.P * 30.515 * t1.farm_area - case when MAX(t1.applied_P) is null then 0 else MAX(t1.applied_P) end IS NULL THEN 0 ELSE t1.P * 30.515 * t1.farm_area - case when MAX(t1.applied_P) is null then 0 else MAX(t1.applied_P) end END AS deficient_P, CASE WHEN t1.K * 30.515 * t1.farm_area - case when MAX(t1.applied_K) is null then 0 else MAX(t1.applied_K) end < 0 OR t1.K * 30.515 * t1.farm_area - case when MAX(t1.applied_K) is null then 0 else MAX(t1.applied_K) end IS NULL THEN 0 ELSE t1.K * 30.515 * t1.farm_area - case when MAX(t1.applied_K) is null then 0 else MAX(t1.applied_K) end END AS deficient_K FROM (SELECT ft.farm_area, cct.calendar_id, cct.harvest_yield, CASE WHEN (SELECT n_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) IS NULL THEN 7.75 ELSE (SELECT n_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) END AS N, CASE WHEN (SELECT p_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) IS NULL THEN 4.0 ELSE (SELECT p_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) END AS P, CASE WHEN (SELECT k_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) IS NULL THEN 8.75 ELSE (SELECT k_lvl FROM soil_quality_table WHERE calendar_id = cct.calendar_id ORDER BY soil_quality_id DESC LIMIT 1) END AS K, NULL AS applied_N, NULL AS applied_P, NULL AS applied_K FROM crop_calendar_table cct JOIN farm_table ft USING (farm_id) WHERE cct.status = 'Completed' UNION SELECT NULL, t.crop_calendar_id, NULL AS harvest_yield, NULL AS N, NULL AS P, NULL AS K, SUM(t.total_N) AS total_N, SUM(t.total_P) AS total_P, SUM(t.total_K) AS total_K FROM (SELECT wot.work_order_id, wot.crop_calendar_id, SUM(wort.qty) * ft.N AS total_N, SUM(wort.qty) * ft.P AS total_P, SUM(wort.qty) * ft.K AS total_K FROM work_order_table wot JOIN wo_resources_table wort USING (work_order_id) JOIN fertilizer_table ft ON ft.fertilizer_id = wort.item_id WHERE wot.type = 'Fertilizer Application' AND wot.status = 'Completed' GROUP BY crop_calendar_id , fertilizer_id) AS t GROUP BY crop_calendar_id) AS t1 ";
		sql += 'GROUP BY calendar_id';
	}
	
	mysql.query(sql, next);
}

exports.updateSoilRecord = function(update, filter, next) {
	var sql = "update soil_quality_table set ? where ?";
	sql = mysql.format(sql, update);
	sql = mysql.format(sql, filter);
	mysql.query(sql, next);
}

exports.updateNutrientPlan = function(update, filter, next) {
	var sql = "update fertilizer_recommendation_plan set ? where ?";
	sql = mysql.format(sql, update);
	sql = mysql.format(sql, filter);
	mysql.query(sql, next);
}

exports.createNutrientPlan = function(data, next) {
	var sql = "insert into fertilizer_recommendation_plan set ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
}

exports.createNutrientItem = function(data, next) {
	var sql = "insert into fertilizer_recommendation_items set ?";
	sql = mysql.format(sql, data);
	
	while (sql.includes("'true'")) {
		sql = sql.replace("'true'", true);
	}

	while (sql.includes("'false'")) {
		sql = sql.replace("'false'", false);
	}

	while (sql.includes("`wo_id` = ''")) {
		sql = sql.replace("`wo_id` = ''", '`wo_id` = '+null);
	}

	mysql.query(sql, next);
}

exports.getUpcomingImportantNutrients = function(query, type, next) {
    var sql = "SELECT farm_id,fri.*, ft.fertilizer_name FROM fertilizer_recommendation_items fri join fertilizer_table ft using(fertilizer_id) join fertilizer_recommendation_plan using(fr_plan_id) where fr_plan_id in (SELECT fr_plan_id FROM fertilizer_recommendation_plan where ";
    for (var i = 0; i < query.length; i++) {
    	if (i != 0) {
    		sql += ' or '; 
    	}
    	sql += `(farm_id = ${query[i].farm_id} and calendar_id = ${query[i].calendar_id}) `;
    }
    sql += ")";
    if (type == 'summary') {
    	sql += ' and datediff(target_application_date, now()) >= 0'
    }
    else {

    }
    sql += ' order by target_application_date';
    mysql.query(sql, next);
}

exports.getMostActiveFRPlan = function(query, next) {
	var sql = "select * from ( select fr_plan_id, calendar_id, last_updated, farm_id, max(status) as status from ( select max(fr_plan_id) as fr_plan_id, max(calendar_id) as calendar_id, last_updated, (select farm_id from crop_calendar_table where calendar_id = frp.calendar_id) as farm_id, null as status from fertilizer_recommendation_plan frp group by farm_id union select null, calendar_id, null, farm_id, status from crop_calendar_table ) as t where ? group by t.calendar_id ) as t1 where fr_plan_id is not null "
	sql = mysql.format(sql, query);

	mysql.query(sql, next);
}

exports.deleteNutrientItems = function(query, next) {
	var sql = "delete from fertilizer_recommendation_items where ?"
	sql = mysql.format(sql, query);
	mysql.query(sql, next);
}

exports.getNutrientPlanDetails = function(data, next) {
	var sql = "select * from fertilizer_recommendation_plan where ? order by last_updated desc, fr_plan_id desc";
	sql = mysql.format(sql, data);

	mysql.query(sql, next);
}

exports.getNutrientPlanItems = function(data, next) {
	var sql = "select ft.fertilizer_name, frp.calendar_id, frp.last_updated, fri.* from fertilizer_recommendation_items fri join fertilizer_table ft using (fertilizer_id) join fertilizer_recommendation_plan frp using (fr_plan_id) where ? order by target_application_date asc";
	sql = mysql.format(sql, data);

	mysql.query(sql, next);
}

exports.getNutrientPlanItemsCompleted = function(data, next) {
	var sql = "select ft.fertilizer_name, frp.calendar_id, frp.last_updated, fri.*, wot.work_order_id, wot.date_completed, wot.status from fertilizer_recommendation_items fri join fertilizer_table ft using (fertilizer_id) join fertilizer_recommendation_plan frp using (fr_plan_id) left join work_order_table wot ON wot.work_order_id = fri.wo_id where ? order by target_application_date asc";
	sql = mysql.format(sql, data);

	mysql.query(sql, next);
}