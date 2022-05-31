const js = require('../public/js/session.js');
const smsModel = require('../models/smsModel.js');
const employeeModel = require('../models/employeeModel.js');
const woModel = require('../models/workOrderModel.js');
const notifModel = require('../models/notificationModel.js');
const cropCalendarModel = require('../models/cropCalendarModel.js');
const pestdiseaseModel = require('../models/pestdiseaseModel.js');
const materialModel = require('../models/materialModel.js');
const systemSettingModel = require('../models/systemSettingModel.js');
const workOrderModel = require('../models/workOrderModel.js');
const farmModel = require('../models/farmModel.js');
var request = require("request");
const { text } = require('express');
const dataformatter = require('../public/js/dataformatter.js');
const { formatDate } = require('../public/js/dataformatter.js');
const translator = require('../public/js/translator.js');

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
                systemSettingModel.getCurrentSettings(function(err, system_settings) {
                    if(err)
                        throw err;
                    else{
                        smsModel.insertOutboundMsg("YOU HAVE UNSUBSCRIBED", employee_details[0].employee_id, system_settings[0].system_date, function(err, last_id){
                            if(err)
                                throw err;
                            else{
                                console.log("SUCCESSFULLY INSERTED OUTBOUND MSG");
                            }
                        });
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
                    systemSettingModel.getCurrentSettings(function(err, system_settings) {
                        if (err)
                            throw err;
                        else {
                            //Store message to db
                            smsModel.insertInboundMsg(message, message_id, employee_id, system_settings[0].system_date, function(err, success){
                                
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
                                    else if(last_message[0].includes("PESTE/SAKIT SINTOMAS")){
                                        //FOR PD SYMPTOMS

                                        //CREATE NOTIF WITH CUSTOM URL
                                        var symptoms_from_user = req.body.inboundSMSMessageList.inboundSMSMessage[0].message.split(",");
                                        var url = "/pest_and_disease/diagnose?symptoms=";
                                        for(var i = 0; i < symptoms_from_user.length; i++){
                                            url = url + symptoms_from_user[i];

                                            //Check if symptom is in db


                                            if(i != symptoms_from_user.length - 1)
                                                url = url + "-";
                                        }

                                        url = url + "&farm=" + employee_details[0].farm_id;

                                        // system_settings[0].system_date
                                        //Create notif
                                        var notif = {
                                            date : dataformatter.formatDate(new Date(system_settings[0].system_date), 'YYYY-MM-DD'),
                                            farm_id : employee_details[0].farm_id,
                                            notification_title : "Symptoms Reported",
                                            url : url,
                                            icon : "fax",
                                            color : "warning"
                                        };
                                        notifModel.createNotif(notif, function(err, success){
                                            res.send("ok");
                                            notifModel.createUserNotif(function(err, user_notif_status) {
                                                if (err)
                                                    throw err;
                                                else {
                                                    
                                                }
                                            });
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
                                            case "4" : msg = getExistingDiagnosis(employee_details[0]); break; //Get existing pest/disease
                                            case "5" : msg = wosToday(employee_details[0]); break; //Get workorders that start today
                                            case "TAPOS1" : msg = updateWO(employee_details[0], text_message, req); break; //When user wants to update wo
                                            case "TAPOS2" : msg = updateDiagnosis(employee_details[0], text_message); break;
                                            case "TULONG" : sendSMSActions(employee_details[0]); break;
                                            default : sendOutboundMsg(employee_details[0], 'Natanggap namin ang iyong tugon.\n\nPara sa karagdagang kaalaman, magsend ng "TULONG" sa 21663543'); break; //Change to storing to db
                                        } 
                                    }
                                }
                            });
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


function wosToday(employee){
    systemSettingModel.getCurrentSettings(function(err, system_settings) {
        if(err)
            throw err;
        else{
            employeeModel.queryEmployee({employee_id: employee.employee_id}, function(err, emp){ //employee.employee_id
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

                            //ADD ERROR HANDLING
                            if(crop_calendar.length == 0){
                                var message = "Walang aktibong crop calendar sa ngayon para sa " + farm_name + ".\n\nPara sa karagdagang impormasyon, makipag-ugnayan sa mga empleyado sa opisina.";
                                sendOutboundMsg(employee, message);
                            }
                            else{
                                //Get work orders
                                var wo_query = {
                                    where: {
                                        key: ['crop_calendar_id'],
                                        value: [crop_calendar[0].calendar_id]
                                    },
                                    order: ['work_order_table.date_start ASC']
                                };
                                woModel.getWorkOrders(wo_query, async function(err, wos){
                                    if(err)
                                        throw err;
                                    else{
                                        var message = "WORK ORDERS NGAYON ARAW\nFarm: " + farm_name + "\n";
                                        console.log(wos);
                                        var not_completed = [];
                                        for(var i = 0; i < wos.length; i++){
                                            if(dataformatter.formatDate(wos[i].date_start, "YYYY-MM-DD") == system_settings[0].system_date && wos[i].status != "Completed"){
                                                var wo_type = await translator.translateText(wos[i].type);
                                                not_completed.push(wos[i]); 
                                                wos[i].date_start = dataformatter.formatDate(wos[i].date_start, 'mm DD, YYYY');
                                                wos[i].date_due = dataformatter.formatDate(wos[i].date_due, 'mm DD, YYYY');
                                                message = message + "\n\nWork Order ID: "+ wos[i].work_order_id + "\n" + wo_type.data[0].translations[0].text + " (" + wos[i].notif_type + ")"+ "\nSimula: " + wos[i].date_start + "\nTapos: " + wos[i].date_due + "\nKalagayan: " + wos[i].status;
                                            }
                                        }  
                                        message = message + '\n\nUpang magreport ng work order na tapos na, magsend ng "TAPOS1<space>Word order ID" sa 21663543';
                                        console.log(message);

                                        //Send outbound message
                                        sendOutboundMsg(employee, message);
                                    }
                                }); 
                            }   
                        }
                    });
                }
            });
        }
    });
    
}

function updateDiagnosis(employee, message){
    //Check if the message sent contains a number
    if(isNaN(message[1])){
        //Not a number send error message to employee
        var msg = "Mali ang Diagnosis ID na sinend. Pumili ng tamang diagnosis ID.";
        sendOutboundMsg(emp, msg);
    }
    else{
        console.log("goods");
        //Check if diagnosis id exists and matches farm id
        pestdiseaseModel.getDiagnosisDetails(message[1], function(err, diagnosis_details){
            console.log(diagnosis_details);
            if(err)
                throw err;
            else{
                //Check if same farm_id
                if(diagnosis_details[0].farm_id == employee.farm_id){

                    systemSettingModel.getCurrentSettings(function(err, system_settings) {
                        if (err)
                            throw err;
                        else {
                            // system_settings[0].system_date
                            //Continue to update diagnosis
                            var date = dataformatter.formatDate(new Date(system_settings[0].system_date), "YYYY-MM-DD");
                            pestdiseaseModel.updateDiagnosis(message[1], new Date(system_settings[0].system_date), function(err, success){
                                var msg = "Maraming Salamat!\n\nNaresulba na ang diagnosis " + message[1] + ".\n" + diagnosis_details[0].name + "\n" + diagnosis_details[0].crop_plan;
                                sendOutboundMsg(employee, msg);
                            });
                        }
                    });

                            
                }
                else{
                    var msg = "Mali ang diagnosis ID na sinend (ibang farm). Pumili ng tamang diagnosis ID.";
                    sendOutboundMsg(emp, msg);
                }
            }
        });
    }
}

function getExistingDiagnosis(employee){
    employeeModel.queryEmployee({employee_id: employee.employee_id}, function(err, emp){
        if(err)
            console.log(err);
        else{
            //Get active crop calendar
            var farm_name = emp[0].farm_name;
            var farm_id = emp[0].farm_id;
            cropCalendarModel.getCurrentCropCalendar({farm_name : farm_name}, function(err, crop_calendar){
                if(err)
                    throw err;
                else{
                    console.log(crop_calendar);
                    if(crop_calendar.length == 0){
                        var message = "Walang aktibong crop calendar sa ngayon para sa " + farm_name + ".\n\nPara sa karagdagang impormasyon, makipag-ugnayan sa mga empleyado sa opisina.";
                        sendOutboundMsg(employee, message);
                    }
                    else{
                        var message = "LISTAHAN NG MGA PESTE/SAKIT\n";
                        pestdiseaseModel.getDiagnosis({farm_id : farm_id}, null, function(err, diagnoses){
                            if(err)
                                throw err;
                            else{
                                //Loop throgh present diagnoses
                                var ctr = 0;
                                for(var i = 0; i < diagnoses.length; i++){
                                    if(diagnoses[i].status == "Present"){
                                        ctr++;
                                        //Add to message
                                        var type;
                                        if(diagnoses[i].type == "Pest"){
                                            type = "PESTE";
                                        }
                                        else{
                                            type = "SAKIT";
                                        }

                                        message = message + "\nDIAGNOSE ID: " + diagnoses[i].diagnosis_id + "\n" + type + ": " + diagnoses[i].name + "\nPETSA: " + dataformatter.formatDate(diagnoses[i].date_diagnosed, "mm DD, YYYY") + "\n";
                                    }
                                }
                                console.log(message);
                                if(ctr == 0){
                                    message = message + "\nWalang lumalaganap na peste/sakit.";
                                }
                                else{
                                    message = message + '\nUpang magreport ng peste/sakit na naresulba na, magsend ng "TAPOS2<space>Diagnosis ID" sa 21663543';
                                }
                                //Send outbound message
                                sendOutboundMsg(employee, message);
                            }
                        });
                    }
                }
            });
        }
    });
}

function updateWO(emp, message, req){
    //Check if the message sent contains a number
    if(isNaN(message[1])){
        //Not a number send error message to employee
        var msg = "Mali ang work order ID na sinend. Pumili ng tamang work order ID.";
        sendOutboundMsg(emp, msg);
    }
    else{
        console.log("goods");
        systemSettingModel.getCurrentSettings(function(err, system_settings) {
            if (err)
                throw err;
            else {
                console.log(system_settings[0].system_date);
                //Check if wo id exists and matches farm id
                woModel.getDetailedWorkOrder({work_order_id : message[1]}, function(err, wo_details){
                    console.log(wo_details);
                    if(err){
                        var msg = "Mali ang work order ID na sinend. Pumili ng tamang work order ID.";
                        sendOutboundMsg(emp, msg);
                        throw err;
                    }
                    else {
                        //Check if same farm id
                        if(wo_details[0].farm_id == emp.farm_id) {
                            // Data validation (stock control)
                            var success = true;
                            if (wo_details[0].type == 'Fertilizer Application' || wo_details[0].type == 'Pesticide Application' || wo_details[0].type == 'Sow Seed') {
                                materialModel.getFarmMaterials(wo_details[0].farm_id, function(err, farm_materials) {
                                    if (err)
                                        throw err;
                                    else {
                                        // Check if there is sufficient stock
                                        var sufficient = true;

                                        var resource_qty = [];
                                        var resource_ids = [];
                                        resource_details.forEach(function(item, index) {
                                            filter_mats = farm_materials.filter(e => e.item_name == item.material_name)[0];
                                            resource_qty.push(item.qty);
                                            resource_ids.push(item.item_id);

                                            if (!(filter_mats.current_amount >= item.qty)) {
                                                sufficient = false;
                                            }
                                        });

                                        if (sufficient) {
                                            materialModel.subtractFarmMaterial({ qty: resource_qty }, { item_type: resource_type, farm_id: wo_details[0].farm_id, item_id: resource_ids }, function(err, subtract_result) {
                                                if (err)
                                                    throw err;
                                                else {
                                                    //Continue to update wo
                                                    var date = dataformatter.formatDate(new Date(), "YYYY-MM-DD");
                                                    woModel.updateWorkOrder({status : "Completed", date_completed : system_settings[0].system_date}, {work_order_id : wo_details[0].work_order_id}, function(err, result){
                                                        if (err)
                                                            throw err;
                                                        else {
                                                            var msg = "Maraming Salamat!\n\nTapos na ang work order " + message[1] + ".\n" + wo_details[0].type + "\n" + wo_details[0].crop_plan;
                                                            
                                                            //Create notif
                                                            var time = new Date();
                                                            time = time.toLocaleTimeString();

                                                            var notif = {
                                                                date : system_settings[0].system_date,
                                                                farm_id : wo_details[0].farm_id,
                                                                notification_title : `Completed Work Order: ${wo_details[0].work_order_idd}`,
                                                                notification_desc: ``,
                                                                url : `/farms/work_order&id=${wo_details[0].work_order_id}`,
                                                                icon : "digging",
                                                                color : "primary",
                                                                type: `NEW_WO`,
                                                                time: time
                                                            };
                                                            notifModel.createNotif(notif, function(err, success){
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

                                                            sendOutboundMsg(emp, msg);
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                        else if (wo_details[0].type == 'Fertilizer Application') {
                                            resource_type = 'Fertilizer'
                                        }
                                            
                                    }
                                });
                            }
                            else if(wo_details[0].type == 'Harvest'){
                                var msg = "Upang mag-ani, makipag-ugnayan sa opisina.";
                                sendOutboundMsg(emp, msg);
                            }
                            else{
                                //Continue to update wo
                                var date = system_settings[0].system_date;
                                woModel.updateWorkOrder({status : "Completed", date_completed : date}, {work_order_id : wo_details[0].work_order_id}, function(err, result){
                                    if (err)
                                        throw err;
                                    else {
                                        var msg = "Maraming Salamat!\n\nTapos na ang work order " + message[1] + ".\n" + wo_details[0].type + "\n" + wo_details[0].crop_plan;
                                        
                                        //Create notif
                                        var time = new Date();
                                        time = time.toLocaleTimeString();

                                        var notif = {
                                            date : date,
                                            farm_id : wo_details[0].farm_id,
                                            notification_title : `Completed Work Order: ${wo_details[0].work_order_idd}`,
                                            notification_desc: ``,
                                            url : `/farms/work_order&id=${wo_details[0].work_order_id}`,
                                            icon : "digging",
                                            color : "primary",
                                            type: `NEW_WO`,
                                            time: time
                                        };
                                        notifModel.createNotif(notif, function(err, success){
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
                                        sendOutboundMsg(emp, msg);
                                    }
                                });
                            }
                        }
                        else{
                            var msg = "Mali ang work order ID na sinend (ibang farm). Pumili ng tamang work order ID.";
                            sendOutboundMsg(emp, msg);
                        }
                    }
                    // else {
                    //     //Continue to update wo
                    //     var date = dataformatter.formatDate(new Date(), "YYYY-MM-DD");
                    //     woModel.updateWorkOrder({status : "Completed", date_completed : date}, {work_order_id : wo_details[0].work_order_id}, function(err, result){
                    //         if (err)
                    //             throw err;
                    //         else {
                    //             var msg = "Maraming Salamat!\n\nTapos na ang work order " + message[1] + ".\n" + wo_details[0].type + "\n" + wo_details[0].crop_plan;
                                
                    //             //Create notif
                    //             var time = new Date();
                    //             time = time.toLocaleTimeString();

                    //             var notif = {
                    //                 date : dataformatter.formatDate(new Date(), 'YYYY-MM-DD'),
                    //                 farm_id : wo_details[0].farm_id,
                    //                 notification_title : `Completed Work Order: ${wo_details[0].work_order_idd}`,
                    //                 notification_desc: ``,
                    //                 url : `/farms/work_order&id=${wo_details[0].work_order_id}`,
                    //                 icon : "digging",
                    //                 color : "primary",
                    //                 type: `NEW_WO`,
                    //                 time: time
                    //             };
                    //             notifModel.createNotif(notif, function(err, success){
                    //                 if (err) {
                    //                     throw err;
                    //                 }
                    //                 else {
                    //                     notifModel.createUserNotif(function(err, user_notif_status) {
                    //                         if (err)
                    //                             throw err;
                    //                         else {
                    //                             // Check if there is sufficient stock
                    //                             var sufficient = true;

                    //                             var resource_qty = [];
                    //                             var resource_ids = [];
                    //                             resource_details.forEach(function(item, index) {
                    //                                 filter_mats = farm_materials.filter(e => e.item_name == item.material_name)[0];
                    //                                 resource_qty.push(item.qty);
                    //                                 resource_ids.push(item.item_id);

                    //                                 if (!(filter_mats.current_amount >= item.qty)) {
                    //                                     sufficient = false;
                    //                                 }
                    //                             });

                    //                             if (sufficient) {
                    //                                 materialModel.subtractFarmMaterial({ qty: resource_qty }, { item_type: resource_type, farm_id: wo_details[0].farm_id, item_id: resource_ids }, function(err, subtract_result) {
                    //                                     if (err)
                    //                                         throw err;
                    //                                     else {
                    //                                         //Continue to update wo
                    //                                         var date = dataformatter.formatDate(new Date(system_settings[0].system_date), "YYYY-MM-DD");
                    //                                         woModel.updateWorkOrder({status : "Completed", date_completed : date}, {work_order_id : wo_details[0].work_order_id}, function(err, result){
                    //                                             if (err)
                    //                                                 throw err;
                    //                                             else {
                    //                                                 var msg = "Maraming Salamat!\n\nTapos na ang work order " + message[1] + ".\n" + wo_details[0].type + "\n" + wo_details[0].crop_plan;
                                                                    
                    //                                                 //Create notif
                    //                                                 var time = new Date();
                    //                                                 time = time.toLocaleTimeString();

                    //                                                 var notif = {
                    //                                                     date : dataformatter.formatDate(new Date(system_settings[0].system_date), 'YYYY-MM-DD'),
                    //                                                     farm_id : wo_details[0].farm_id,
                    //                                                     notification_title : `Completed Work Order: ${wo_details[0].work_order_idd}`,
                    //                                                     notification_desc: ``,
                    //                                                     url : `/farms/work_order&id=${wo_details[0].work_order_id}`,
                    //                                                     icon : "digging",
                    //                                                     color : "primary",
                    //                                                     type: `NEW_WO`,
                    //                                                     time: time
                    //                                                 };
                    //                                                 notifModel.createNotif(notif, function(err, success){
                    //                                                     if (err) {
                    //                                                         throw err;
                    //                                                     }
                    //                                                     else {
                    //                                                         notifModel.createUserNotif(function(err, user_notif_status) {
                    //                                                             if (err)
                    //                                                                 throw err;
                    //                                                             else {
                                                                                    
                    //                                                             }
                    //                                                         });
                    //                                                     }
                    //                                                 });

                    //                                                 sendOutboundMsg(emp, msg);
                    //                                             }
                    //                                         });
                    //                                     }
                    //                                 });
                    //                             }
                    //                             else {
                    //                                 var msg = "Kulang ang sinaunang items hindi maaring kumpletuhin - kontakin ang employado sa opisina";
                    //                                 console.log('Insufficient!');
                    //                                 sendOutboundMsg(emp, msg);
                    //                             }
                                                    
                    //                         }
                    //                     });
                    //                 }
                    //             });  
                    //         }
                    //         else {
                    //             //Continue to update wo
                    //             var date = dataformatter.formatDate(new Date(system_settings[0].system_date), "YYYY-MM-DD");
                    //             woModel.updateWorkOrder({status : "Completed", date_completed : date}, {work_order_id : wo_details[0].work_order_id}, function(err, result){
                    //                 if (err)
                    //                     throw err;
                    //                 else {
                    //                     var msg = "Maraming Salamat!\n\nTapos na ang work order " + message[1] + ".\n" + wo_details[0].type + "\n" + wo_details[0].crop_plan;
                                        
                    //                     //Create notif
                    //                     var time = new Date();
                    //                     time = time.toLocaleTimeString();

                    //                     var notif = {
                    //                         date : dataformatter.formatDate(new Date(system_settings[0].system_date), 'YYYY-MM-DD'),
                    //                         farm_id : wo_details[0].farm_id,
                    //                         notification_title : `Completed Work Order: ${wo_details[0].work_order_idd}`,
                    //                         notification_desc: ``,
                    //                         url : `/farms/work_order&id=${wo_details[0].work_order_id}`,
                    //                         icon : "digging",
                    //                         color : "primary",
                    //                         type: `NEW_WO`,
                    //                         time: time
                    //                     };
                    //                     notifModel.createNotif(notif, function(err, success){
                    //                         if (err) {
                    //                             throw err;
                    //                         }
                    //                         else {
                    //                             notifModel.createUserNotif(function(err, user_notif_status) {
                    //                                 if (err)
                    //                                     throw err;
                    //                                 else {
                                                        
                    //                                 }
                    //                             });
                    //                         }
                    //                     });
                    //                     sendOutboundMsg(emp, msg);
                    //                 }
                    //             });
                    //         }
                    //     }
                    //     else{
                    //         var msg = "Mali ang work order ID na sinend (ibang farm). Pumili ng tamang work order ID.";
                    //         sendOutboundMsg(emp, msg);
                    //     }
                    // }
                });
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
                        var msg = "Welcome to LA Rice CMS, " + emp.first_name + " " + emp.last_name + '!\n\nPara sa karagdagang kaalaman, magsend ng "TULONG" sa 21663543';
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
                    else{
                        var msg = "Sorry, hindi po kayo naka-register sa LA Rice Mill. Makipagugnayan sa nasa office. Maraming salamat.";
                        sendUnregisteredOutboundMsg({phone_number : req.query.subscriber_number, access_token : req.query.access_token}, msg);
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
    // var translated_msg = await translator.translateText(message);

    
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
    systemSettingModel.getCurrentSettings(function(err, system_settings) {
        if(err)
            throw err;
        else{
            smsModel.insertOutboundMsg(message, emp.employee_id, system_settings[0].system_date, function(err, last_id){
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
    });
    
}

function sendUnregisteredOutboundMsg(emp, message){

    console.log("SUCCESSFULLY INSERTED OUTBOUND MSG");
    systemSettingModel.getCurrentSettings(function(err, system_settings) {
        if (err)
            throw err;
        else {
            // system_settings[0].system_date
            var last = new Date(system_settings[0].system_date);
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
                    request(forecast_url, { json: true }, async function(err, response, forecast_body){
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
                                var weather_desc = translator.localTranslate(daily_weather[i].weather);
                                message = message + "\n\nPetsa: " + daily_weather[i].date + "\nPanahon: " + weather_desc + "\nTemp: " + daily_weather[i].temp.toFixed(2) + " C";
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
    employeeModel.queryEmployee({employee_id: employee.employee_id}, function(err, emp){ //employee.employee_id
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

                    //ADD ERROR HANDLING
                    if(crop_calendar.length == 0){
                        var message = "Walang aktibong crop calendar sa ngayon para sa " + farm_name + ".\n\nPara sa karagdagang impormasyon, makipag-ugnayan sa mga empleyado sa opisina.";
                        sendOutboundMsg(employee, message);
                    }
                    else{
                        //Get work orders
                        var wo_query = {
                            where: {
                                key: ['crop_calendar_id'],
                                value: [crop_calendar[0].calendar_id]
                            },
                            order: ['work_order_table.date_start ASC']
                        };
                        woModel.getWorkOrders(wo_query, async function(err, wos){
                            if(err)
                                throw err;
                            else{
                                var message = "WORK ORDERS\nFarm: " + farm_name + "\n";
                                console.log(wos);
                                var not_completed = [];
                                for(var i = 0; i < wos.length; i++){
                                    if(wos[i].status != "Completed"){
                                        var wo_type = await translator.translateText(wos[i].type);
                                        not_completed.push(wos[i]); 
                                        wos[i].date_start = dataformatter.formatDate(wos[i].date_start, 'mm DD, YYYY');
                                        wos[i].date_due = dataformatter.formatDate(wos[i].date_due, 'mm DD, YYYY');
                                        message = message + "\n\nWork Order ID: "+ wos[i].work_order_id + "\n" + wo_type.data[0].translations[0].text + " (" + wos[i].notif_type + ")"+ "\nSimula: " + wos[i].date_start + "\nTapos: " + wos[i].date_due + "\nKalagayan: " + wos[i].status;
                                    }
                                }  

                                message = message + '\n\nUpang magreport ng work order na tapos na, magsend ng "TAPOS1<space>Word order ID" sa 21663543';
                                console.log(message);

                                //Send outbound message
                                sendOutboundMsg(employee, message);
                            }
                        }); 
                    }   
                }
            });
        }
    });
}



//SEND LIST OF PD SYMPTOMS
function sendPDSymptoms(emp){
    var msg = "PESTE/SAKIT SINTOMAS\n\nUpang mag-ulat ng mga sintomas ng peste at sakit, piliin ang katumbas na numero sa ilalim at lagyan ng kuwit sa pagitan nito.\nHalimbawa: 1,5,2\n\n";
    pestdiseaseModel.getAllSymptoms( async function(err, symptoms){
        if(err)
            throw err;
        else{
            for(var i = 0; i < symptoms.length; i++){
                // var name = await translator.translateText(symptoms[i].symptom_name);
                msg = msg + symptoms[i].symptom_id + " - " + symptoms[i].tagalog_name + "\n";
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
        systemSettingModel.getCurrentSettings(function(err, system_settings) {
            if (err)
                throw err;
            else {
                // system_settings[0].system_date
                var date = dataformatter.formatDate(new Date(system_settings[0].system_date), "YYYY-MM-DD");
                woModel.updateWorkOrder({status : "Completed", date_completed : date}, {work_order_id : wo_id[2]}, function(err, result){
                    if(err)
                        throw err;
                });

                //SEND SMS
                var msg = "Maraming Salamat!";
            }
        });
                
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
    var msg = 'Nakalagay sa baba ang mga aksyon na pwedeng gawin.\n\n1 - Weather Forecast\n2 - Mga kailangan gawin\n3 - Mag-ulat ng mga sintomas\n4 - Lumalaganap na Pesta/Sakit\n5 - Works Orders para sa araw ngayon\n\nUpang magreport ng work order na tapos na, magsend ng "TAPOS1<space>Word order ID" sa 21663543\n\nUpang magreport ng peste/sakit na naresulba na, magsend ng "TAPOS2<space>Diagnosis ID" sa 21663543\n\nUpang magsagawa ng aksyon, mag-send ng <numero ng aksyon> sa 21663543';

    sendOutboundMsg(employee, msg);
}






//EXTERNAL SMS SEND
exports.sendSMS = function(emp, message){
    // console.log(emp);

    systemSettingModel.getCurrentSettings(function(err, system_settings) {
        if(err)
            throw err;
        else{
            smsModel.insertOutboundMsg(message, emp.employee_id, system_settings[0].system_date, function(err, last_id){
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
    });
}

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

//TRANSLATION TEST
exports.testTranslation = function(req, res){

    var key = "85f608a71b654ef8bbdef5dbaaa0c416";
    var endpoint = "https://api.cognitive.microsofttranslator.com";
    

    // Add your location, also known as region. The default is global.
    // This is required if using a Cognitive Services resource.
    var location = "southeastasia";

    axios({
        baseURL: endpoint,
        url: '/translate',
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0',
            'from': 'en',
            'to': 'fil'
        },
        data: [{
            'text': 'Good morning!'
        }],
        responseType: 'json'
    }).then(function(response){
        console.log(JSON.stringify(response.data, null, 4));
    });

}


//GET NUMBER OF REPORTED SYMPTOMS FOR THE PAST 7 DAYS
exports.getReportedSymptoms = function(req, res){
    //Get notifications on reported symptoms
    systemSettingModel.getCurrentSettings(function(err, system_settings) {
        if(err)
            throw err;
        else{
            smsModel.getReportedSymptoms(7,0, system_settings[0].system_date, function(err, reported){
                if(err)
                    throw err;
                else{
                    //process
                    var symptoms = [];
                    for(var i = 0; i < reported.length; i++){
                        var temp = reported[i].url.split("=");
                        var temp2 = temp[1].replace("&farm", "");
                        var temp3 = temp2.split("-");
                        for(var x =0; x < temp3.length; x++){
                            symptoms.push(temp3[x]);
                        }
                    }
                    res.send({symptoms : symptoms});
                }
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


