var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.getNotifs = function(next){
    var sql = "SELECT * FROM notification_table WHERE status = 1 ORDER BY notification_id DESC";
    mysql.query(sql, next);
}

exports.updateNotif = function(notification_id, next){
    var sql = "UPDATE notification_table SET status = 0 WHERE notification_id = ?";
    sql = mysql.format(sql, notification_id);
    mysql.query(sql, next);
}

exports.updateUserNotif = function(data, filter, next) {
    var sql = `update user_notification_table set ? `;
    var filter_sql = `where ?`;
    sql = mysql.format(sql, data);
    filter_sql = mysql.format(filter_sql, filter);
    while(filter_sql.includes(',')) {
        filter_sql = filter_sql.replace(',', ' and ');
    }
    var temp_str = `(select user_id from user_table where employee_id = ${filter.user_id})`;
    filter_sql = filter_sql.replace(filter.user_id, temp_str);
    sql += filter_sql;

    mysql.query(sql, next);
}

exports.getAllNotifs = function(next){
    var sql = "SELECT * FROM notification_table ORDER BY date desc, notification_id DESC";
    mysql.query(sql, next);
};

exports.getUserNotifs = function(data, next) {
    var sql = `select unt.*, nt.* from notification_table nt join user_notification_table unt on nt.notification_id = unt.notif_id where user_id = (select user_id from employee_table et join user_table ut using(employee_id) where et.employee_id = ?) order by date desc, color, notification_id`;
    sql = mysql.format(sql, data.employee_id);
    mysql.query(sql, next);
}

// Create notifs according to user role and notif type notif types = WO_REMINDER, MATERIAL_REQUEST, NEW_WO, SMS_QUERY, DISASTER_WARNING, RECOMMENDATION, LOW_STOCK, PD_DIAGNOSED
exports.createUserNotif = function(next) {
    var sql = `insert into user_notification_table (notif_id, user_id) ( (SELECT nt.notification_id, ut.user_id FROM notification_table nt JOIN user_table ut WHERE notification_id NOT IN (SELECT notif_id FROM user_notification_table) AND (type = 'WO_REMINDER' AND access_level IN (0 , 1) OR type = 'MATERIAL_REQUEST' AND access_level IN (2) OR type = 'NEW_WO' AND access_level IN (1) OR type = 'SMS_QUERY' AND access_level IN (0 , 1) OR type = 'LOW_STOCK' AND access_level IN (0 , 1, 2) OR type = 'PD_DIAGNOSED' AND access_level IN (0 , 1, 2) OR type = 'DISASTER_WARNING' AND access_level IN (0 , 1, 2) OR type = 'RECOMMENDATION' AND access_level IN (0 , 1)) ) )`;
    mysql.query(sql, next);
}

exports.createNotif = function(notif, next){
    if (Array.isArray(notif)) {

        var sql = "insert into notification_table (date, notification_title, notification_desc, farm_id, url, icon, color, status, type, time) values ";
        for (var i = 0; i < notif.length; i++) {
            if (i != 0) {
                sql += ', ';
            }
            sql += ' ('+(Object.values(notif[i])).join(',')+')';
        }
        while (sql.includes('"null"')) {
            sql = sql.replace('"null"', null);
        }
    }
    else {
        var sql = "INSERT INTO notification_table SET ?";
        sql = mysql.format(sql, notif);
    }

    mysql.query(sql, next);
};