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

exports.getAllNotifs = function(next){
    var sql = "SELECT * FROM notification_table ORDER BY date desc, notification_id DESC";
    mysql.query(sql, next);
};

exports.createNotif = function(notif, next){
    if (Array.isArray(notif)) {

        var sql = "insert into notification_table (date, notification_title, notification_desc, farm_id, url, icon, color, status) values ";
        for (var i = 0; i < notif.length; i++) {
            if (i != 0) {
                sql += ', ';
            }
            sql += ' ('+(Object.values(notif[i])).join(',')+')';
        }
        // while (sql.includes('null')) {
        //     sql = sql.replace('null', null);
        // }
    }
    else {
        var sql = "INSERT INTO notification_table SET ?";
        sql = mysql.format(sql, notif);
    }

    mysql.query(sql, next);
};