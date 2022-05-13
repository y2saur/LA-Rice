const js = require('../public/js/session.js');
const smsModel = require('../models/smsModel.js');
const employeeModel = require('../models/employeeModel.js');
const woModel = require('../models/workOrderModel.js');
const notifModel = require('../models/notificationModel.js');
const cropCalendarModel = require('../models/cropCalendarModel.js');
const pestdiseaseModel = require('../models/pestdiseaseModel.js');
const farmModel = require('../models/farmModel.js');
var request = require("request");
const { text } = require('express');
const dataformatter = require('../public/js/dataformatter.js');
const { formatDate } = require('../public/js/dataformatter.js');

//API Key for WEATHER API
var key = '2ae628c919fc214a28144f699e998c0f'; // Paid API Key

var app_id = 'X4kxHEG59nuXkT8ynri5KGuyR4xzHLbr'; //final OLD
var app_secret = '280f39f528dc56db22e5f31a4a87dad0969d5cce23f659e3e3e888a2371fe585'; //final OLD
//var shortcode = '21585119'; //OLD
var shortcode = "21663543"; //NEW




var code = 'osg68ErhoXxaACygn5yS7yAqRfB6E49S7qE75Id6z4puxBayXhpGMdzFzxeb6FKded8uayLbE8kxroI4zEB8taBrxeseAbLdsebpBLf4Rgp9Udkz6gFrnLdjC7oe9xu6begLFEyMj7FnRapRhjazkAuxaEyEIAoEdLSL6ALMfaqnE5SqjxXnCdX8johkpeBRs';






var access_token = 'PGgaVczHMKbJ6jbccFXiuZE57d6zSW3AiwS7S3ChCrg'; //sample only
var address = '9173028128';
var clientCorrelator = '264801';
var message = 'THIS IS A REPLY TO YOU';

var options = { method: 'POST',
  url: 'https://devapi.globelabs.com.ph/smsmessaging/v1/outbound/' + shortcode + '/requests',
  qs: { 'access_token': access_token },
  headers: 
   { 'Content-Type': 'application/json' },
  body: 
   { 'outboundSMSMessageRequest': 
      { 'clientCorrelator': clientCorrelator,
        'senderAddress': shortcode,
        'outboundSMSTextMessage': { 'message': message },
        'address': address } },
  json: true };

exports.redirectPOSTurl = function(req, res){
  
}




//RECEIVE SMS FROM USERS
exports.globe_inbound_msg = function(req, res){
    console.log(req.body);

    //CHECK IF UNSUBSCRIBE
    if("unsubscribed" in req.body){
        smsModel.removeAccessToken(req.body.unsubscribed.subscriber_number, req.body.unsubscribed.access_token, function(err, result){
        });
        
        smsModel.getEmployeeDetails({ key: "phone_number" , value : req.body.unsubscribed.subscriber_number}, function(err, employee_details){
            if(err)
                console.log(err);
            else{
                smsModel.insertOutboundMsg("YOU HAVE UNSUBSCRIBED", employee_details[0].employee_id, function(err, last_id){
                    if(err)
                        throw err;
                    else{
                        console.log("SUCCESSFULLY INSERTED OUTBOUND MSG");
                    }
                });
            }
        });
    }
    else{
        // console.log(req.body.inboundSMSMessage);

        //get employee details using phone number
        //SLICE 7 to remove 'tel:+63'
        smsModel.getEmployeeDetails({ key: "phone_number" , value : req.body.inboundSMSMessageList.inboundSMSMessage[0].senderAddress.slice(7)}, function(err, employee_details){
            if(err)
                console.log(err);
            else{
                
                if(employee_details.length > 0){
                    var message = req.body.inboundSMSMessageList.inboundSMSMessage[0].message;
                    var message_id = req.body.inboundSMSMessageList.inboundSMSMessage[0].messageId;
                    var employee_id = employee_details[0].employee_id;

                    //Store message to db
                    smsModel.insertInboundMsg(message, message_id, employee_id, function(err, success){
                        
                    });

                    //POCESS MESSAGE
                    var text_message = req.body.inboundSMSMessageList.inboundSMSMessage[0].message.split(" ");
                    var msg;

                    //CHECK FOR PAST OUTBOUND MESSAGE FROM USER
                    smsModel.getLastOutboundMessage({employee_id : employee_details[0].employee_id}, function(err, last_msg){
                        if (err)
                            throw err;
                        else{
                            var last_message = last_msg[0].message.split("\n");
                            //check last message

                            if(last_message[0].includes("Due Today")){ //Checks if last message is due today
                                dueTodayReply(employee_details[0], req.body.inboundSMSMessageList.inboundSMSMessage[0].message, last_message[0]);
                            }
                            else if(last_message[0].includes("PEST/DISEASE SYMPTOMS")){
                                //FOR PD SYMPTOMS

                                //CREATE NOTIF WITH CUSTOM URL
                                var symptoms_from_user = req.body.inboundSMSMessageList.inboundSMSMessage[0].message.split(",");
                                var url = "/pest_and_disease/diagnose?symptoms=";
                                for(var i = 0; i < symptoms_from_user.length; i++){
                                    url = url + symptoms_from_user[i];
                                    if(i != symptoms_from_user.length)
                                        url = url + "-";
                                }

                                //Create notif
                                var notif = {
                                    date : new Date(),
                                    farm_id : employee_details[0].farm_id,
                                    notification_title : "Symptoms Reported",
                                    url : url,
                                    icon : "fax",
                                    color : "warning"
                                };
                                notifModel.createNotif(notif, function(err, success){
                                    res.send("ok");
                                });
                                //SEND SMS REPLY
                                sendOutboundMsg(employee_details[0], "Maraming Salamat!");
                            }
                            else{
                                console.log(text_message[0].toLowerCase());
                                switch (text_message[0]){
                                    case "1" : msg = getWeatherForecastMsg(employee_details[0]); break; //Weather Forecast
                                    case "2" : msg = getIncomingWos(employee_details[0]); break; //SEND PENDING AND OVERDUE WOs
                                    case "3" : msg = sendPDSymptoms(employee_details[0]); break; //INCOMING WORK ORDERS
                                    case "tapos" : msg = updateWO(employee_details[0], text_message); break; //When user wants to update wo
                                    default : sendSMSActions(employee_details[0]); break;
                                } 
                            }
                        }
                    });
                }
            }
        });
    }
    console.log("--------------------");

    // this.globe_outbound_msg;
    // this.getAccessToken;
    return true;
}

function updateWO(emp, message){
    //Check if the message sent contains a number
    if(isNaN(message[1])){
        //Not a number send error message to employee
        var msg = "Mali ang work order ID na sinend. Pumili ng tamang work order ID.";
        sendOutboundMsg(emp, msg);
    }
    else{
        console.log("goods");
        //Check if wo id exists and matches farm id
        woModel.getDetailedWorkOrder({work_order_id : message[1]}, function(err, wo_details){
            console.log(wo_details);
            if(err){
                var msg = "Mali ang work order ID na sinend. Pumili ng tamang work order ID.";
                sendOutboundMsg(emp, msg);
                throw err;
            }
            else{
                //Check if same farm id
                if(wo_details[0].farm_id == emp.farm_id){
                    //Continue to update wo
                    var date = dataformatter.formatDate(new Date(), "YYYY-MM-DD");
                    woModel.updateWorkOrder({status : "Completed", date_completed : date}, {work_order_id : wo_details[0].work_order_id}, function(err, result){
                        var msg = "Maraming Salamat!";
                        sendOutboundMsg(emp, msg);
                    });
                }
                else{
                    var msg = "Mali ang work order ID na sinend (ibang farm). Pumili ng tamang work order ID.";
                    sendOutboundMsg(emp, msg);
                }
            }
        });
    }
}


// exports.sampleUpdateWO = function(req, res){ //Updates WO sent by farmer
//     var message = req.query.message.split(" ");
//     console.log(message);
//     smsModel.getEmployeeDetails({ key: "phone_number" , value : "9173028128"}, function(err, employee_details){
//         if(err)
//             throw err;
//         else{
//             console.log(employee_details[0]);

//             //FROM HERE
//             //Check if the message sent contains a number
//             if(isNaN(message[1])){
//                 //Not a number send error message to employee
//                 var msg = "Mali ang work order ID na sinend. Pumili ng tamang work order ID.";
//                 sendOutboundMsg(employee_details[0], msg);
//             }
//             else{
//                 console.log("goods");
//                 //Check if wo id exists and matches farm id
//                 woModel.getDetailedWorkOrder({work_order_id : message[1]}, function(err, wo_details){
//                     console.log(wo_details);
//                     if(err){
//                         var msg = "Mali ang work order ID na sinend. Pumili ng tamang work order ID.";
//                         sendOutboundMsg(employee_details[0], msg);
//                         throw err;
//                     }
//                     else{
//                         //Check if same farm id
//                         if(wo_details[0].farm_id == employee_details[0].farm_id){
//                             //Continue to update wo
//                             var date = dataformatter.formatDate(new Date(), "YYYY-MM-DD");
//                             woModel.updateWorkOrder({status : "Completed", date_completed : date}, {work_order_id : wo_details[0].work_order_id}, function(err, result){
//                                 var msg = "Maraming Salamat!";
//                                 sendOutboundMsg(employee_details[0], msg);
//                             });
//                         }
//                         else{
//                             var msg = "Mali ang work order ID na sinend (ibang farm). Pumili ng tamang work order ID.";
//                             sendOutboundMsg(employee_details[0], msg);
//                         }
//                     }
//                 });
//             }
//         }
//     });
// }



//RUNS WHEN USER REGISTERS THROUGH SMS


exports.registerUser = function(req,res){
    console.log(req.query);
    //PROCESS
    //Search in user tables the same number
    smsModel.addAccessToken(req.query.subscriber_number, req.query.access_token, function(err, result){
        if(err){
            console.log(err);
        }
        else{
            console.log("SUCCESSFULLY UPDATED EMPLOYEE ACCESS TOKEN");
          
            //SEND WELCOME MESSAGE TO USER
            //create outbound message
            smsModel.getEmployeeDetails({ key : "access_token", value : req.query.access_token}, function(err, employee){
                if(err){
                  throw err;
                }
                else{
                    console.log(employee);
                    if(employee.length > 0){
                        var emp = employee[0];
                        var msg = "Welcome to LA Rice CMS, " + emp.first_name + " " + emp.last_name + "!";
                        console.log(msg);
                        sendOutboundMsg(emp, msg);
                        // smsModel.insertOutboundMsg(msg, emp.employee_id, function(err, last_id){
                        //     if(err)
                        //         throw err;
                        //     else{
                        //         var last = last_id.insertId;
                        //         console.log(last_id.insertId);
                        //         console.log(last);
                        //         var message = { method: 'POST',
                        //                         url: 'https://devapi.globelabs.com.ph/smsmessaging/v1/outbound/' + shortcode + '/requests',
                        //                         qs: { 'access_token': emp.access_token },
                        //                         headers: 
                        //                         { 'Content-Type': 'application/json' },
                        //                         body: 
                        //                         { 'outboundSMSMessageRequest': 
                        //                             { 'clientCorrelator': last,
                        //                             'senderAddress': shortcode,
                        //                             'outboundSMSTextMessage': { 'message': msg },
                        //                             'address': emp.phone_number } },
                        //                         json: true };
                        //         sendOutboundMsg(message);
                        //     }
                        // });
                    }
                }
            });
        }
    });
    return true;
}


//SEND MESSAGE TO USER FROM APP
exports.globe_outbound_msg = function(req, res){
    console.log("sending outbound message");
    console.log(req.query);
    var employee_id = req.query.employee_id;
    var message = req.query.message;
    //GET EMPLOYEE DETAILS
    smsModel.getEmployeeDetails({key : "employee_id", value : employee_id}, function(err, employee_details){
        if(err)
            throw err;
        else{
            if(employee_details.length > 0){
                var emp = employee_details[0];

                if(emp.access_token == null){
                    res.send("No access token");
                }
                else{
                    sendOutboundMsg(emp, message);
                    res.send("message sent");
                }
            }
        }
    });
}


function sendOutboundMsg(emp, message){
    smsModel.insertOutboundMsg(message, emp.employee_id, function(err, last_id){
        if(err)
            throw err;
        else{
            console.log("SUCCESSFULLY INSERTED OUTBOUND MSG");
            var last = last_id.insertId;
            var send_message = { method: 'POST',
                            url: 'https://devapi.globelabs.com.ph/smsmessaging/v1/outbound/' + shortcode + '/requests',
                            qs: { 'access_token': emp.access_token },
                            headers: 
                            { 'Content-Type': 'application/json' },
                            body: 
                            { 'outboundSMSMessageRequest': 
                                { 'clientCorrelator': last,
                                'senderAddress': shortcode,
                                'outboundSMSTextMessage': { 'message': message },
                                'address': emp.phone_number } },
                            json: true };
            request(send_message, function (error, response, body) {
                if (error) throw new Error(error);
                console.log(body);
                });
        }
    });
}


function getWeatherForecastMsg(employee){
    var message = "-";
    //Get assigned farm
    employeeModel.queryEmployee({employee_id: employee.employee_id}, function(err, emp){ //change 24 to employee_id
        if(err)
            console.log(err);
        else{
            // console.log(emp);
            var farm_name = emp[0].farm_name;
            //get farm plots
            var url = 'http://api.agromonitoring.com/agro/1.0/polygons?appid='+key;
            request(url, {json : true}, function(err, polygon_list){
                if (err)
                    console.log(err);
                else{
                    var lat;
                    var lon;
                    // console.log(farm_name);
                    // console.log(polygon_list.body);
                    for(var i = 0 ; i < polygon_list.body.length; i++){
                        // console.log(polygon_list.body[i]);
                        if(polygon_list.body[i].name == farm_name){
                            // console.log(polygon_list.body[i]);
                            lat = polygon_list.body[i].center[1];
						    lon = polygon_list.body[i].center[0];
                            break;
                        }
                    }
                    //get weather for farm
                    var forecast_url = 'https://api.agromonitoring.com/agro/1.0/weather/forecast?lat='+lat+'&lon='+lon+'&appid='+key;
                    request(forecast_url, { json: true }, function(err, response, forecast_body){
                        if(err)
                            console.log(err);
                        else{
                            console.log(forecast_body);
                            forecast_body.dt = dataformatter.unixtoDate(forecast_body.dt);
                            var hour_arr = [];
                            for (var i = 0; i < forecast_body.length; i++) {
                                forecast_body[i].dt = dataformatter.unixtoDate((forecast_body[i].dt));
                                forecast_body[i]["date"] = dataformatter.formatDate(forecast_body[i].dt, 'mm DD, YYYY');
                                hour_arr.push(dataformatter.formatDate(forecast_body[i].dt, 'HH:m'))
                            }

                            var dates = [];
                            for(var i = 0; i < forecast_body.length; i++) {
                                if(dates.includes(forecast_body[i].date)){
                                    //dont add
                                }
                                else{
                                    dates.push(forecast_body[i].date);
                                }
                            }

                            var daily_weather = [];
                            for(var i = 0; i < dates.length; i++){
                                var temp = 0;
                                var ctr = 0;
                                var weather;
                                for(var x = 0; x < forecast_body.length; x++){
                                    if(forecast_body[x].date == dates[i]){
                                        weather = forecast_body[x].weather[0].description;
                                        temp =+ forecast_body[x].main.temp;
                                        ctr++;
                                    }
                                }
                                daily_weather.push({date : dates[i], weather : weather, temp : temp - 273.15});
                            }
                            console.log(daily_weather);
                            //***** Get unique hour timestamps from forecast and filter data
                            hour_arr = [...new Map(hour_arr.map(item => [item, item])).values()];

                            //SET MESSAGE LAYOUT
                            message = "WEATHER FORECAST\nFarm: " + farm_name;
                            for(var i = 0 ; i < daily_weather.length; i++){
                                message = message + "\n\nDate: " + daily_weather[i].date + "\nWeather: " + daily_weather[i].weather + "\nTemp: " + daily_weather[i].temp.toFixed(2) + " C";
                            }
                            console.log(message);
                            
                            
                            sendOutboundMsg(employee, message);
                        }
                    });
                }
            })
        }
    });
}

function getIncomingWos(employee){
    employeeModel.queryEmployee({employee_id: employee.employee_id}, function(err, emp){
        if(err)
            console.log(err);
        else{
            //Get active crop calendar
            var farm_name = emp[0].farm_name;
            cropCalendarModel.getCurrentCropCalendar({farm_name : farm_name}, function(err, crop_calendar){
                if(err)
                    throw err;
                else{
                    console.log(crop_calendar);
                    //Get work orders
                    var wo_query = {
                        where: {
                            key: ['crop_calendar_id'],
                            value: [crop_calendar[0].calendar_id]
                        },
                        order: ['work_order_table.date_start ASC']
                    };
                    woModel.getWorkOrders(wo_query, function(err, wos){
                        if(err)
                            throw err;
                        else{
                            var message = "WORK ORDERS\nFarm: " + farm_name + "\n";
                            console.log(wos);
                            var not_completed = [];
                            for(var i = 0; i < wos.length; i++){
                                if(wos[i].status != "Completed"){
                                    not_completed.push(wos[i]); 
                                    wos[i].date_start = dataformatter.formatDate(wos[i].date_start, 'mm DD, YYYY');
                                    wos[i].date_due = dataformatter.formatDate(wos[i].date_due, 'mm DD, YYYY');
                                    message = message + "\n\nWork Order ID: "+ wos[i].work_order_id + "\n" + wos[i].type + " (" + wos[i].notif_type + ")"+ "\nSimula: " + wos[i].date_start + "\nTapos: " + wos[i].date_due + "\nStatus: " + wos[i].status;
                                }
                            }
                            console.log(message);

                            //Send outbound message
                            sendOutboundMsg(employee, message);
                        }
                    });    
                }
            });
        }
    });
}


//SEND LIST OF PD SYMPTOMS
function sendPDSymptoms(emp){
    var msg = "PEST/DISEASE SYMPTOMS\n\nUpang magulat ng mga sintomas ng peste at sakit, piliin ang katumbas na numero sa ilalim at lagyan ng kuwit sa pagitan nito.\nHalimbawa: 1,5,2\n\n";
    pestdiseaseModel.getAllSymptoms(function(err, symptoms){
        if(err)
            throw err;
        else{
            for(var i = 0; i < symptoms.length; i++){
                msg = msg + symptoms[i].symptom_id + " - " + symptoms[i].symptom_name + "\n";
            }

            //Send to user
            sendOutboundMsg(emp, msg);
        }
    });
}


//DUE TODAY REPLY
function dueTodayReply(emp, message, wo){
    console.log(message);
    var wo_id = wo.split(" ");
    if(message.toLowerCase() == "oo"){
        //update wo to completed
        var date = dataformatter.formatDate(new Date(), "YYYY-MM-DD");
        woModel.updateWorkOrder({status : "Completed", date_completed : date}, {work_order_id : wo_id[2]}, function(err, result){
            if(err)
                throw err;
        });

        //SEND SMS
        var msg = "Maraming Salamat!";
    }
    else{
        //send SMS
        var msg = "Tapusin ang work order.";
        //send
    }
    sendOutboundMsg(emp, msg);
}




exports.incomingWO = function(req, res){
    employeeModel.queryEmployee({employee_id: 24}, function(err, emp){
        if(err)
            console.log(err);
        else{
            //Get active crop calendar
            var farm_name = emp[0].farm_name;
            cropCalendarModel.getCurrentCropCalendar({farm_name : farm_name}, function(err, crop_calendar){
                if(err)
                    throw err;
                else{
                    console.log(crop_calendar);
                    //Get work orders
                    var wo_query = {
                        where: {
                            key: ['crop_calendar_id'],
                            value: [crop_calendar[0].calendar_id]
                        },
                        order: ['work_order_table.date_start ASC']
                    };
                    woModel.getWorkOrders(wo_query, function(err, wos){
                        if(err)
                            throw err;
                        else{
                            var message = "WORK ORDERS\nFarm: " + farm_name;
                            console.log(wos);
                            var not_completed = [];
                            for(var i = 0; i < wos.length; i++){
                                if(wos[i].status != "Completed"){
                                    not_completed.push(wos[i]); 
                                    wos[i].date_start = dataformatter.formatDate(wos[i].date_start, 'mm DD, YYYY');
                                    wos[i].date_due = dataformatter.formatDate(wos[i].date_due, 'mm DD, YYYY');
                                    message = message + "\n\n" + wos[i].type + " (" + wos[i].notif_type + ")"+ "\nStart: " + wos[i].date_start + "\nDue: " + wos[i].date_due + "\nStatus: " + wos[i].status;
                                }
                            }
                            console.log(message);

                            //Send outbound message
                            sendOutboundMsg(employee, message);
                        }
                    });    
                }
            });
        }
    });
}

function sendSMSActions(employee){
    var msg = 'Below are the list of actions that can be performed.\n1 - Weather Forecast\n2 - Incoming work orders\n3 - Report Pest/Disease Symptoms\n\nUpang magreport ng work order na tapos na, magsend ng "TAPOS<space>Word order ID" sa 21663543\n\nTo complete action, send <number of desired action> to 21663543';

    sendOutboundMsg(employee, msg);
}






//EXTERNAL SMS SEND
exports.sendSMS = function(emp, message){
    // console.log(emp);
    smsModel.insertOutboundMsg(message, emp.employee_id, function(err, last_id){
        if(err)
            throw err;
        else{
            
            var last = last_id.insertId;
            var send_message = { method: 'POST',
                            url: 'https://devapi.globelabs.com.ph/smsmessaging/v1/outbound/' + shortcode + '/requests',
                            qs: { 'access_token': emp.access_token },
                            headers: 
                            { 'Content-Type': 'application/json' },
                            body: 
                            { 'outboundSMSMessageRequest': 
                                { 'clientCorrelator': last,
                                'senderAddress': shortcode,
                                'outboundSMSTextMessage': { 'message': message },
                                'address': emp.phone_number } },
                            json: true };
            request(send_message, function (error, response, body) {
                if (error) throw new Error(error);
                console.log(error);
                console.log(body);
                console.log("SUCCESSFULLY INSERTED OUTBOUND MSG");
            });
        }
    });
}



















//SMS Pages
exports.getSubscriptions = function(req, res) {
	var html_data = {};
    html_data["title"] = "SMS Management > Subscriptions";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'sms_subscriptions', req.session);
    html_data["notifs"] = req.notifs;

    smsModel.getSubscriptionsList(function(err, list){
        if(err)
            throw err;
        else{
            html_data["list"] = list;
        }
        res.render('sms_subscriptions', html_data);
    });

	
}

exports.getAddSubscription = function(req, res) {
	var html_data = {};
  html_data["title"] = "SMS Management > Subscriptions";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'sms_add_subscription', req.session);
  html_data["notifs"] = req.notifs;
	res.render('add_subscription', html_data);
}

exports.getMessages = function(req, res) {
	var html_data = {};
    html_data["title"] = "SMS Management > Messages";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'sms_messages', req.session);
    html_data["notifs"] = req.notifs;

    //Gets list of users registered to SMS feature
    smsModel.getSubscriptions(function(err, subscriptions){
        if(err)
            throw err;
        else{
            subscriptions[0].first = true;
            for(var i = 0; i < subscriptions.length; i++){
                subscriptions[i].last_message = dataformatter.formatDate(new Date(subscriptions[i].last_message), 'mm DD, YYYY');
            }
            html_data["subscriptions"] = subscriptions;

            
        }
        res.render('sms_messages', html_data);
    });
}

exports.getUserConversation = function(req,res){
    if(req.query.employee_id != null)
        smsModel.getUserConverstation(req.query.employee_id, function(err, messages){
            if(err)
                throw err;
            else{
                for(var i = 0; i < messages.length; i++){
                    messages[i].date = dataformatter.formatDate(new Date(messages[i].date), 'mm DD, YYYY');
                }
                // console.log(messages);
                res.send(messages);
            }
        }); 
     else
        res.send(true);
}


