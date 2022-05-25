var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.getCurrentSettings = function(next) {
	var sql = `select * from system_settings_table`;
	mysql.query(sql, next);
}

exports.deleteActiveSettings = function(data, next) {
	var sql = `delete from system_settings_table where ?`;
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
}

exports.createActiveSettings = function(data, next) {
	var sql = `delete from system_settings_table; insert into system_settings_table set ?`;
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
}