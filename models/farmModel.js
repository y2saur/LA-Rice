var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.createForecastedYieldRecord = function(data, next) {
	var sql = "insert into forecasted_yield set ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
};

exports.getForecastedYieldRecord = function(data, next) {
	var sql = "SELECT temp, humidity, pressure, rainfall, seed_id, harvested, N, P, K, seed_rate, forecast FROM forecasted_yield where ";
	for (var i = 0; i < data.calendar_id.length; i++) {
		sql += 'calendar_id = '+data.calendar_id[i];
		if (i != data.calendar_id.length-1) {
			sql +=' or ';
		}
	}
	//console.log(sql);
	mysql.query(sql, next);
}

exports.getSpecificFarm = function(data, next) {
	var sql = "select * from farm_table where ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
}

exports.getForecastedYieldRecord1 = function(data, next) {
	if (data.calendar_id.length != 0) {
		var sql = "SELECT calendar_id, temp, humidity, pressure, rainfall, seed_id, harvested, N, P, K, seed_rate, forecast FROM forecasted_yield where ";
		for (var i = 0; i < data.calendar_id.length; i++) {
			sql += 'calendar_id = '+data.calendar_id[i];
			if (i != data.calendar_id.length-1) {
				sql +=' or ';
			}
		}
		//console.log(sql);
		mysql.query(sql, next);
	}
	else {
		return next();
	}
		
}

exports.getAllFarmswCalendar = function(next) {
	var sql = "select t1.*, farm_name, farm_area, land_type from ( select t.*, seed_name from ( SELECT *, @rn:=IF(@prev = farm_id, @rn + 1, 1) AS rn, @prev:=farm_id FROM crop_calendar_table cct JOIN (SELECT @prev:=NULL, @rn:=0) AS vars where status = 'Completed' ORDER BY farm_id , harvest_date DESC ) as t join seed_table on seed_planted = seed_id where rn =1 union select null, farm_id, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null from farm_table ) as t1 join farm_table using(farm_id) group by farm_id";
	mysql.query(sql, next);
}

exports.updateForecastYieldRecord = function(data, filter, next) {
	var sql = "update forecasted_yield set ? where ?";
	sql = mysql.format(sql, data);
	sql = mysql.format(sql, filter);
	//console.log(sql);
	mysql.query(sql, next);
}

exports.addFarm = function(data, next) {
	var sql = "insert into farm_table set ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
};

exports.addFarmPlot = function(data, next) {
	var sql = "insert into farm_plots (farm_id, x_coord, y_coord) values ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
};

exports.getFarmWithoutManager = function(next) {
	var sql = `select * from farm_table where farm_id not in (select farm_id from employee_table et join farm_assignment fa using(employee_id) where et.position = 'Farm Manager' and isActive = 1 and fa.status = 'Active')`;
	mysql.query(sql, next);
}

exports.assignFarmer = function(data, next) {
	var sql = 'insert into farm_assignment set ?';
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
}

exports.addAssignedFarmers = function(data, next) {
	var sql = "insert into farm_assignment (employee_id, farm_id, status) values ?";
	sql = mysql.format(sql, data);
	while (sql.includes("'")) {
		sql = sql.replace("'", '');
	}
	while (sql.includes("\\")) {
		sql = sql.replace("\\", '');
	}
	mysql.query(sql, next);
}

exports.filteredFarmDetails = function(data, next) {
	var sql = "select * from ( select * from ( select * from farm_table ft cross join (select farm_id, et.* from farm_assignment fa join employee_table et using(employee_id) ) as t using(farm_id) ) as t where position = 'Farm Manager' and ? union select *, null as employee_id, null as position, null as last_name, null as first_name, null as phone_number, null, null from farm_table ft ) as t1 where ? group by farm_id";
	sql = mysql.format(sql, data);
	sql = mysql.format(sql, data);

	mysql.query(sql, next);
}

exports.getFarmData = function(data, next) {
	//var sql = 'select ft.*, et.* from farm_table ft join farm_assignment fa on ft.farm_id = fa.farm_id join employee_table et on fa.employee_id = et.employee_id';
	var sql = 'select * from( select ft.*, et.* from farm_table ft join farm_assignment fa on ft.farm_id = fa.farm_id join employee_table et on fa.employee_id = et.employee_id union select *, null, null, null, null, null, null, null from farm_table ) as t1 ';
	if (JSON.stringify(data) != '{ }') {
		if (data.hasOwnProperty('where') && data.where != null) {
			if (data.where.hasOwnProperty('key') && data.where.key != null) {
				if (data.where.type != 'Data validation') {
					sql += ' where '+data.where.key+' = ?';
					sql = mysql.format(sql, data.where.value);
				}
				else {
					sql += ' where '+data.where.key+' '+data.where.value;
				}
			}
			else {
				sql += ' where '+data.where;
			}
		}

		if (data.hasOwnProperty('group')) {
			sql += ' group by '+data.group;
		
		}
	}
	
	mysql.query(sql, next);
};

//added farm_desc
exports.getAllFarms = function(next) {
	var sql = "SELECT t1.farm_id, t1.farm_name, t1.farm_desc, t1.land_type, MAX(t1.employee_id) AS employee_id, CONCAT(MAX(t1.ln), ', ', MAX(t1.fn)) AS employee_name, MAX(t1.cp) AS cp FROM (SELECT  t.farm_id, t.employee_id, MAX(t.farm_name) AS farm_name, MAX(t.land_type) AS land_type, NULL AS ln,  NULL AS fn,  NULL AS cp, MAX(t.farm_desc) AS farm_desc FROM (SELECT   farm_id, employee_id, NULL AS farm_name, NULL AS land_type, NULL AS farm_desc FROM farm_assignment WHERE status = 'Active' UNION SELECT  farm_id, NULL, farm_name, land_type, farm_desc FROM farm_table WHERE status = 'Active') AS t GROUP BY t.farm_id  UNION SELECT fa.farm_id,et.employee_id, NULL AS farm_name, NULL AS land_type, et.last_name, et.first_name,et.phone_number, NULL AS farm_desc FROM employee_table et JOIN farm_assignment fa ON et.employee_id = fa.employee_id WHERE et.position = 'Farm Manager') AS t1 where farm_name is not null GROUP BY farm_id;"; 
	mysql.query(sql, next);
}

// exports.getAllFarms = function(next) {
// 	var sql = 'select t1.farm_id, t1.farm_name, t1.land_type, max(t1.employee_id) as employee_id, concat(max(t1.ln), ", ", max(t1.fn)) as employee_name, max(t1.cp) as cp from (select t.farm_id, t.employee_id, max(t.farm_name) as farm_name, max(t.land_type) as land_type, null as ln, null as fn, null as cp from (select farm_id, employee_id, null as farm_name, null as land_type from farm_assignment where status = "Active" union select farm_id, null, farm_name, land_type from farm_table where status = "Active") as t group by t.farm_id union select fa.farm_id, et.employee_id, null as farm_name, null as land_type, et.last_name, et.first_name, et.phone_number from employee_table et join farm_assignment fa on et.employee_id = fa.employee_id where et.position = "Farm Manager" )as t1 group by farm_id';
// 	mysql.query(sql, next);
// }

exports.updateFarm = function(data, filter, next) {
	var sql = 'update farm_table set ? where ?';
	sql = mysql.format(sql, data);
	sql = mysql.format(sql, filter);
	mysql.query(sql, next);
}

exports.getPlotData = function(data, next) {
	var sql;

	if (!data) {
		sql = "select * from farm_plots";
	}
	else {
		sql = "select * from farm_plots where ?";
		sql = mysql.format(sql, data);
	}
	mysql.query(sql, next);
}


exports.getFarmerQueries = function(farm_id, employee_id, next){
	var sql = "SELECT * FROM farmer_queries fq INNER JOIN employee_table et ON et.employee_id = fq.employee_id INNER JOIN farm_assignment fa ON fa.employee_id = fq.employee_id";

	if(farm_id != null){
		sql = sql + " WHERE farm_id = ?";
		sql = mysql.format(sql, farm_id);
	}
	else if(employee_id != null){
		sql = sql + ' fa.employee_id = ?';
		sql = mysql.format(sql, employee_id);
	}

	mysql.query(sql, next);
}