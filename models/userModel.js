var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.updateAccount = function(query, update, next) {
	var sql = `update user_table set ? where ?`;
	sql = mysql.format(sql, update);
	sql = mysql.format(sql, query);
	while (sql.includes("'null'")) {
		sql = sql.replace("'null'", null);
	};
	mysql.query(sql, next);
}

exports.registerUser = function(data, next) {
	var sql = "insert into user_table (employee_id, username, password, access_level, otp) values ";
	
	for (var i = 0; i < data.length; i++) {
		if (i != 0) {
			sql += ', ';
		}

		sql += '(?, ?, ?, ?, ?)';
		sql = mysql.format(sql, data[i].employee_id);
		sql = mysql.format(sql, data[i].username);
		sql = mysql.format(sql, 'null');
		sql = sql.replace("'null'", null);
		sql = mysql.format(sql, data[i].access_level);
		sql = mysql.format(sql, data[i].otp);
	}

	mysql.query(sql, next);
};

exports.createRegistrationDetails = function(data, next) {
	var str = '';
	for (var i = 0; i < data.length; i++) {
		if (i != 0) {
			str += ` or `;
		}
		str += `et.employee_id = ${data[i]}`;
	}
	var sql = `select concat(SUBSTRING(username, 1, CHAR_LENGTH(username) - 1), rownum) as username, otp from ( select username, otp, @row:=if(@prev=username,@row,0) + 1 as rownum, @prev:=username from ( select concat(lower(concat(et.last_name,'_' , et.first_name)), ((select count(*) from employee_table as t where concat(lower(et.last_name), lower(et.first_name)) = concat(lower(last_name), lower(first_name))) - 1 ) ) as username, (SELECT SUBSTRING(MD5(RAND()) FROM 1 FOR 6)) AS otp from employee_table as et where ${str} ) t ) t1`;
	
	mysql.query(sql, next);
}

exports.queryEmployee = function(data, next) {
	var sql = `select * from user_table where username = '${data}'`;
	mysql.query(sql, next);
}

exports.deleteUser = function(data, next) {
	var sql = `delete from user_table where ?`;
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
}

exports.getEmployeeDetails = function(employee_id, next){
	var sql = "SELECT * FROM employee_table et LEFT JOIN farm_assignment fa USING (employee_id) LEFT JOIN farm_table ft USING (farm_id) WHERE employee_id = ?;";

	sql = mysql.format(sql, employee_id);
	mysql.query(sql, next);
}