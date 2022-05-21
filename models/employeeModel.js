var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.addEmployee = function(data, next) {
	var sql = "insert into employee_table (position, last_name, first_name, phone_number) values ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
};

exports.queryEmployee = function(data, next) {
	var str = '';
	if (data != null)
		str = 'where ? ';

	var sql = `SELECT * FROM (SELECT MAX(isAccActive) AS isAccActive, MAX(isActive) AS isActive, MAX(user_id) AS user_id, MAX(employee_id) AS employee_id, MAX(last_name) AS last_name, MAX(first_name) AS first_name, MAX(position) AS position, MAX(phone_number) AS phone_number, MAX(farm_id) AS farm_id, MAX(farm_name) AS farm_name, MAX(username) AS username, MAX(password) AS password, MAX(otp) AS otp, MAX(access_level) AS access_level, COUNT(*) - 1 AS num_assignments FROM (SELECT NULL AS isAccActive, NULL AS isActive, NULL AS user_id, fa.employee_id, et.last_name, et.first_name, et.position, et.phone_number, fa.farm_id, ft.farm_name, NULL AS username, NULL AS password, NULL AS otp, NULL AS access_level FROM farm_assignment fa JOIN employee_table et ON fa.employee_id = et.employee_id JOIN farm_table ft ON fa.farm_id = ft.farm_id UNION SELECT NULL, isActive, NULL, employee_id, last_name, first_name, position, phone_number, NULL, NULL, NULL, NULL, NULL, NULL FROM employee_table UNION SELECT isActive, NULL, user_id, employee_id, NULL, NULL, NULL, NULL, NULL, NULL, username, password, otp, access_level FROM user_table) AS t1 GROUP BY employee_id ORDER BY position , farm_id , employee_id , num_assignments) AS t5 ${str}`;
	if (data != null)
		sql = mysql.format(sql, data);
	//console.log(sql);
	mysql.query(sql, next);
}

exports.filterFarmers = function(data, next) {
	var sql = 'select et.*, fa.farm_id, fa.status from employee_table et join farm_assignment fa on et.employee_id = fa.employee_id where ?';
	sql = mysql.format(sql, data);

	sql = sql
   .split('').reverse().join('')
   .replace(',', ' - ').replace(',', ' - ')
   .split('').reverse().join('');

   while (sql.includes(" - ")) {
		sql = sql.replace(" - ", ' and ');
	}

	mysql.query(sql, next);
}



exports.getRelatedEmployees = function(data, next){
	var sql = "SELECT * FROM employee_table et LEFT JOIN farm_assignment fa USING (employee_id) WHERE ? AND access_token is not null;";

	sql = mysql.format(sql, data);

	mysql.query(sql, next);
	return sql;
}