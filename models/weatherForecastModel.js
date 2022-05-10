var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.getPrecipHistory = function(data, next) {
	var str = ``;
	str = `where date > '${data.date}' and date <= '${data.end_date}'`;
	var sql = `select date, round(sum(precipitation_mean),2) as precipitation_mean, (select round(sum(precipitation_mean),2) from weather_data_table where date_sub(wdt.date, interval 1 year) <= date and date < wdt.date and month(wdt.date) = month(date)) as year_1_lag, (select round(sum(precipitation_mean) / 3,2) from weather_data_table where date_sub(wdt.date, interval 3 year) <= date and date < wdt.date and month(wdt.date) = month(date)) as year_3_lag, (select round(sum(precipitation_mean) / 30,2) from weather_data_table where date_sub(wdt.date, interval 30 year) <= date and date < wdt.date and month(wdt.date) = month(date)) as year_30_lag from weather_data_table wdt ${str} group by year(date), month(date)`;

	mysql.query(sql, next);
}

exports.getWeatherChart = function(data, next) {
	var str = ``;
	if (data.hasOwnProperty('start_date')) {
		str = data != null ? `where date >= '${data.start_date}' and date <= '${data.end_date}'` : ``;
	}
	if (data.type == 'grouped') {
		var sql = `select date, year(date) year, month(date) as month, max(temp_max) temp_max, min(temp_min) as temp_min, round(avg(temp_mean),2) as temp,round(sum(precipitation_mean),2) precip from weather_data_table ${str} group by year(date), month(date) order by year(date), month(date)`;
	}
	else {
		var sql = `select date, year(date) year, month(date) as month, (temp_max) temp_max, (temp_min) as temp_min, round((temp_mean),2) as temp,round((precipitation_mean),2) precip from weather_data_table ${str} order by date`;
	}
	mysql.query(sql, next);
}

exports.getWeatherData = function(next) {
	var sql = `select year(date) year, month(date) year, round(sum(precipitation_mean),2) precip from weather_data_table group by year(date), month(date)`;
	mysql.query(sql, next);
}

exports.lastWeatherData = function(next) {
	var sql = `SELECT * FROM weather_data_table order by date desc limit 1`;
	mysql.query(sql, next);
}

exports.saveWeatherData = function(data, next) {
	var sql = `insert into weather_data_table (date, temp_mean, temp_min, temp_max, pressure_mean, humidity_mean, precipitation_mean) values `;
	data.forEach(function(item, index) {
		if (index != 0)
			sql += `, `;

		sql += ' (?, ?, ?, ?, ?, ?, ?)';
		sql = mysql.format(sql, item.date);
		sql = mysql.format(sql, item.temp_mean);
		sql = mysql.format(sql, item.temp_min);
		sql = mysql.format(sql, item.temp_max);
		sql = mysql.format(sql, item.pressure_mean);
		sql = mysql.format(sql, item.humidity_mean);
		sql = mysql.format(sql, item.precipitation_mean);
	});
	mysql.query(sql, next);
}

exports.saveForecastResults = function(data, next) {
	var sql = "insert into weather_forecast_table set ?;";
	for (var i = 0; i < data.length; i++) {
		if (i != 0) {
			sql += "insert into weather_forecast_table set ?;";
		}
		sql = mysql.format(sql, data[i]);
	}
	mysql.query(sql, next);
}

exports.readWeatherForecast = function(next) {
	var sql = 'select * from weather_forecast_table';
	mysql.query(sql, next);
}

exports.clearRecords = function(next) {
	var sql = 'delete from weather_forecast_table;';
	mysql.query(sql, next);
}