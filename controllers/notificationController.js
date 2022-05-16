const notifModel = require('../models/notificationModel.js');
const workOrderModel = require('../models/workOrderModel.js');
const employeeModel = require('../models/employeeModel.js');
const dataformatter = require('../public/js/dataformatter.js');
const smsModel = require('../models/smsModel.js');
const js = require('../public/js/session.js');
const globe = require('../controllers/smsController.js');
var request = require('request');


exports.getNotification = function(req, res, next) {
    var html_data = {};

    var wo_list_query = {
        where: {
            key: ['work_order_table.status', 'work_order_table.status', ''],
            value: ['Pending', 'In-Progress', 'date_due < date_add(now(), interval 7 day)']
        },
        order: ['work_order_table.status ASC', 'work_order_table.date_due DESC']
    };
    workOrderModel.getWorkOrders(wo_list_query, function(err, wo_list) {
        if (err)
            throw err;
        else {
            var notif_obj_arr = [];
            var title, desc, url, icon, color;

            // LOOKS FOR WORKORDERS THAT ARE OVERDUE, DUE SOON OR DUE IN A WEEK
            for (var i = 0; i < wo_list.length; i++) {
                switch (wo_list[i].notif_type) {
                    case "Due Today" : 
                    title = `"Due today work order: ${wo_list[i].work_order_id}"`;
                    desc = `"${wo_list[i].type} for ${wo_list[i].farm_name} with WO ${wo_list[i].work_order_id} Due today"`;
                    color = `"warning"`;
                    break;
                    case 'Overdue':
                    title = `"Overdue work order: ${wo_list[i].work_order_id}"`;
                    desc = `"Overdue ${wo_list[i].type} for ${wo_list[i].farm_name} with WO ${wo_list[i].work_order_id}"`;
                    color = `"danger"`;
                    break;
                    case 'Due soon':
                    title = `"Incoming work order: ${wo_list[i].work_order_id} due soon"`;
                    desc = `"${wo_list[i].type} for ${wo_list[i].farm_name} with WO ${wo_list[i].work_order_id} due soon"`;
                    color = `"warning"`;
                    break;
                    case 'Due in a week':
                    title = `"Incoming work order: ${wo_list[i].work_order_id} due in a week"`;
                    desc = `"${wo_list[i].type} for ${wo_list[i].farm_name} with WO ${wo_list[i].work_order_id} due in a week"`;
                    color = `"warning"`;
                    break;
                }
                var time = new Date();
                time = time.toLocaleTimeString();

                notif_obj_arr.push({
                    date: '"'+dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')+'"',
                    notification_title: title,
                    notification_desc: desc,
                    farm_id: wo_list[i].farm_id,
                    url: `"/farms/work_order&id=${wo_list[i].work_order_id}"`,
                    icon: '"exclamation-triangle"',
                    color: color,
                    status: 1,
                    type: "'WO_REMINDER'",
                    time: time
                });
            }
            notifModel.getAllNotifs(function(err, notif_list) {
                if (err)
                    throw err;
                else {
                    var notif_query = [];
                    var list_index;

                    //Remove existing notification records from array
                    for (var i = 0; i < notif_obj_arr.length; i++) {
                        list_index = notif_list.filter(e => '"'+e.notification_title+'"' == notif_obj_arr[i].notification_title && 
                            '"'+e.notification_desc+'"' == notif_obj_arr[i].notification_desc);
                        if (list_index.length == 0) {
                            notif_query.push(notif_obj_arr[i]);
                        }
                    }

                    //Creates notification if it is not yet created
                    if (notif_query.length != 0) {
                        notifModel.createNotif(notif_query, function(err, create_status) {
                            if (err) {
                                throw err;
                            }
                            else {
                                notifModel.createUserNotif(function(err, user_notif_status) {
                                    if (err)
                                        throw err;
                                    else {

                                    }
                                });
                            }
                        });

                        //CODE: OSMS1
                        //CREATE SMS FOR NECESSARY PEOPLE 
                        
                        //CODE OSMS5
                        //CHECK FOR WOS DUE TODAY
                        //Get list of all farmers
                        smsModel.getSMSEmployees({position: "Farmer"}, function(err, farmers){
                            if(err)
                                throw err;
                            else{
                                console.log("TEST SEND SMS --------------------------------------");
                                //look for workerorders due today
                                for(var i = 0; i < notif_query.length; i++){
                                    console.log(notif_query[i].notification_title);
                                    if(notif_query[i].notification_title.includes("Due today")){
                                        console.log("entered");
                                        console.log(farmers);
                                        var wo_id = notif_query[i].url.split("=");
                                        
                                        var msg = "Work Order " + wo_id[1].replace('"', "") + " Due Today\n\n" + notif_query[i].notification_desc + "\n\nTapos na ba ang work order na ito?\n\nMagreply ng 'OO' o 'HINDI'";
                                        //Loop through farmer with same farm
                                        for(var x = 0; x < farmers.length; x++){
                                            if(farmers[x].farm_id == notif_query[i].farm_id){
                                                //SEND SMS
                                                console.log("SEND SMS --------------------------------------");
                                                globe.sendSMS(farmers[x], msg);
                                            }
                                        }
                                    }
                                }

                            }
                        });

                    }

                    notifModel.getUserNotifs({ employee_id: req.session.employee_id }, function(err, user_notif_list) {
                        if (err)
                            throw err;
                        else {
                            user_notif_list.forEach(function(item, index) {
                                user_notif_list[index].date = dataformatter.formatDate(new Date(item.date), 'mm DD, YYYY');
                            })
                            var notif_obj = { new: [], earlier: [], disaster: [] };
                            notif_obj.new = user_notif_list.filter(e => e.isSeen == 0);
                            notif_obj.earlier = user_notif_list.filter(e => e.isSeen == 1);
                            notif_obj.earlier = notif_obj.earlier.slice(0, 10);
                            notif_obj.disaster = user_notif_list.filter(e => e.isSeen == 1 && e.type == 'DISASTER_WARNING' && dataformatter.dateDiff(req.session.cur_date, e.date) >=0 && dataformatter.dateDiff(req.session.cur_date, e.date) <= 30);
                            //console.log(notif_obj.disaster);
                            req.notifs = notif_obj;

                            return next();
                        }
                    });

                            
                }
             });     
        }
    });
}

exports.updateSeenStatus = function(req, res) {
    if (req.session.employee_id != null) {
        notifModel.updateUserNotif({ isSeen: 1 }, { isSeen: 0, user_id: req.session.employee_id }, function(err, user_notif) {
            if (err)
                throw err;
            else {
                res.send(user_notif);
            }
        });
    }
    else {
        res.send('Error!');
    }
}

exports.ajaxNotifList = function(req, res) {
    if (req.session) {
        notifModel.getUserNotifs({ employee_id: req.session.employee_id }, function(err, user_notif_list) {
            if (err)
                throw err;
            else {
                user_notif_list = user_notif_list.filter(e => e.isSeen == 0);
                user_notif_list.forEach(function(item, index) {
                    user_notif_list[index].date = dataformatter.formatDate(new Date(item.date), 'mm DD, YYYY');
                });

                res.send(user_notif_list);
            }
        });
    }
    else {
        var date = req.session.cur_date;

        req.session.destroy();

        res.redirect(`/login?cur_date=${date}`);
    }
        
}

exports.getNotificationTab = function(req,res){
    var html_data = {};
    html_data = js.init_session(html_data, 'role', 'name', 'username', 'notification_tab', req.session);
    notifModel.getAllNotifs(function(err, notifs){
        if(err)
            throw err;
        else{
            var i;
            for(i = 0; i < notifs.length; i++){
                notifs[i].date = dataformatter.formatDate(new Date(notifs[i].date), 'mm DD, YYYY');
                if(notifs[i].status == 0)
                    notifs[i]["done"] = true;
            }
            html_data["all"] = notifs;

            //FILTER NOTIFS
            var danger = [];
            var primary = [];
            var warning = [];
            for(var i = 0; i < notifs.length; i++){
                switch(notifs[i].color){
                    case "danger" : danger.push(notifs[i]); break;
                    case "primary" : primary.push(notifs[i]); break;
                    case "warning" : warning.push(notifs[i]); break;
                }
            }

            html_data["danger"] = danger;
            html_data["primary"] = primary;
            html_data["warning"] = warning;
        }
        html_data["notifs"] = req.notifs;
        res.render("notifications", html_data);
    });
}

exports.createNotif = function(req,res) {
    var notif = {
        date : new Date(req.session.cur_date),
        farm_id : farm_id,
        notification_title : "New pending order",
        url : "/orders/details?id=" + add.insertId,
        icon : "fax",
        color : "primary"
    };
    notifModel.createNotif(notif, function(err, success){
        res.send("ok");
    });
}
// exports.getNotification = function(req, res, next){
//
//     notifModel.getNotifs(function(err, prenotifs){
//         if(err)
//             throw err;
//         else{
//             workOrderModel.getDueWorkorders(function(err, due){
//                 if(err)
//                     throw err;
//                 else{
//                     //loop through
//                     var i,x;
//
//

//                     for(i = 0; i < due.length; i++){
//                         var create = true;
//                         for(x = 0; x < prenotifs.length; x++){
//                             var id = prenotifs[x].notification_title.split('-');
//
//                             if(due[i].work_order_id == id[1]){
//
//                                 create = false;
//                             }
//                         }
//                         if(create){
//                             var notif = {
//                                 date : new Date(req.session.cur_date),
//                                 farm_id : due[i].farm_id,
//                                 notification_title : "Work Order due today: WO-"+due[i].work_order_id,
//                                 url : "/farms/work_order&id=" + due[i].work_order_id,
//                                 icon : "exclamation-triangle",
//                                 color : "warning"
//                             };
//                             notifModel.createNotif(notif, function(err, success){
//                             });
//                         }
//                     }

//                     workOrderModel.getOverdueWorkorders(function(err, overdue){
//                         if(err)
//                             throw err;
//                         else{
//                             //loop through
//                             var i,x;
//                             for(i = 0; i < overdue.length; i++){
//                                 var create = true;
//                                 for(x = 0; x < prenotifs.length; x++){
//                                     var id = prenotifs[x].notification_title.split('-');
//                                     if(overdue[i].work_order_id == id[1]){
//
//                                         create = false;
//                                     }
//                                 }
//                                 if(create){
//                                     var notif = {
//                                         date : new Date(req.session.cur_date),
//                                         farm_id : overdue[i].farm_id,
//                                         notification_title : "Work Order Overdue: WO-"+overdue[i].work_order_id,
//                                         url : "/farms/work_order&id=" + overdue[i].work_order_id,
//                                         icon : "exclamation-triangle",
//                                         color : "danger"
//                                     };
//                                     notifModel.createNotif(notif, function(err, success){
//                                     });
//                                 }
//                             }
//                         }
//                     });
//                 }
//             });
//         }
//     });
    
    
//     notifModel.getNotifs(function(err, notifs){
//         if(err)
//             throw err;
//         else{
//             //


//             for(i = 0; i < notifs.length; i++){
// 				notifs[i].date = dataformatter.formatDate(new Date(notifs[i].date), 'mm DD, YYYY');
// 			}

//             req.notifs = notifs;
//             // res.send
//             return next();
//         }
       
//     });
    
// }

exports.updateNotif = function(req,res){
    var id = req.query.notification_id;
    //
    notifModel.updateNotif(id, function(err, success){});
    res.send("ok");
};

