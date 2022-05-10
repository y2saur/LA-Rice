const request = require('request');
const js = require('../public/js/session.js');
const materialModel = require('../models/materialModel');
const farmModel = require('../models/farmModel');
const dataformatter = require('../public/js/dataformatter.js');
const notifModel = require('../models/notificationModel.js');
const { Solve } = require('javascript-lp-solver');

exports.getMaterials = function(req,res){
    var html_data = {};
    html_data = js.init_session(html_data, 'role', 'name', 'username', 'farm', req.session);
    materialModel.getMaterials("Seed", null, function(err, seeds){
        if(err){
            throw err;
        }
        else{
            if(seeds.length != 0){
                html_data["seed"] = seeds;
                
				html_data["notifs"] = req.notifs;
                res.render('materials', html_data);
            }
            else{
                
            }
        }
    });

}

exports.ajaxGetMaterials = function(req, res) {
    materialModel.getMaterials(req.query.type, null, function(err, materials) {
        if (err){
            throw err;
        }
        else {
            
            res.send(materials);
        }
    });
}

exports.ajaxGetAllMaterials = function(req, res) {
    materialModel.getAllMaterials(req.query.type, req.query.filter, function(err, materials) {
        if (err)
            throw err;
        else {
            //
            res.send(materials);
        }
    });
}

exports.getAllMaterials = function(req, res) {
    materialModel.getAllMaterials(req.query.type, req.query.filter, function(err, materials) {
        if (err)
            throw err;
        else {
            //
            res.send(materials);
        }
    });
}

exports.ajaxGetResourcesUsed = function(req, res) {
    materialModel.readResourcesUsed(req.query.type, req.query.farm_id, req.query.calendar_id, function(err, result) {
        if (err)
            throw err;
        else {
            res.send(result);
        }
    })
}

exports.ajaxGetLowStocks = function(req, res) {
    materialModel.getLowStocks(null, function(err, result){
        if(err)
            throw err;
        else{
            res.send(result);
        }
    })
}














exports.test = function(req,res){
    //Check if item already exists

    //if exists, update

    //else add new
    
    html_data["notifs"] = req.notifs;
    res.render("test",{test_data : "ADDED NEW ITEM"});
}

exports.addMaterials = function(req,res){
    var type = req.query.type;
    var farm_id = req.query.farm_id;
    if(type == "Seed"){
        var data = {
            seed_name : req.query.seed_name,
            seed_desc : req.query.seed_desc,
            maturity_days : req.query.maturity_days
        }
    }
    else if(type == "Pesticide"){
        var data = {
            pesticide_name : req.query.pesticide_name,
            pesticide_desc : req.query.pesticide_desc,
        }
    }
    else if(type == "Fertilizer"){
        var data = {
            fertilizer_name : req.query.fertilizer_name,
            fertilizer_desc : req.query.fertilizer_desc,
        }
    }
    materialModel.registerMaterial(type, data, function(err, result){
            
    });
    res.send({msg : "ITEMA DDED."});
};
// exports.getMaterials = function(req,res){ //ajax
//     // materialModel.addPesticide(function(err,result){
//     // });
//     var filter = req.query.filter == undefined ? null : req.query.filter;
//     var type = req.query.type;

//     materialModel.getMaterials(type, filter, function(err, result){
//         if (err)
// 			throw err;
//         else{
//             for(var i = 0; i < result.length ; i++){
//
//             }

//             res.send(result);
//         }
//     });
// }
 exports.updateMaterial = function(req,res){

    var type = req.query.type;
    
    if(type == "Pesticide"){
        var filter = {
            pesticide_id : 1
        };
        var data = {
            pesticide_name : "Pesticide11"
        }
    }
    else if(type == "Seed"){
        var filter = {
            seed_id : 1
        };
        var data = {
            seed_name : "Dinarada"
        }
    }
    else if(type == "Fertilizer"){
        var filter = {
            fertilizer_id : 1
        };
        var data = {
            fertilizer_name : "Dinarada1"
        }
    }
    
     materialModel.updateMaterial(type, filter, data, function(err, result){
     });
     var html_data = {
        msg : "Data updated."
    }
    res.send(html_data);
 }

 exports.addFarmMaterial = function(req,res){
    var filter = [req.query.farm_id,req.query.item_type,req.query.item_id];
    materialModel.getFarmMaterialsMultiple(filter, function(err, result){
        //Checks if already exists
        if(result.length > 0){
            //add current ammount
            var id = {farm_mat_id : result[0].farm_mat_id};
            var cur_amount = result[0].current_amount + parseInt(req.query.current_amount);
            var data = {current_amount : cur_amount}
            materialModel.updateFarmMaterials(data, id, function(err, succ){
                
            });
        }
        else{
            materialModel.registerFarmMaterial(req.query, function(err, result2){
            });
        }
    });

    res.send({msg : "oks na"});
}

//Purchase history
exports.addPurchase3 = function(req,res){
    res.redirect("orders");
    // var purchase = {
    //     item_type : "Pesticide",
    //     item_desc : "This is a test to add purchase.",
    //     item_id : 3,
    //     purchase_price : 100,
    //     amount : 45,
    //     units : "Kg",
    //     requested_by : 1,
    //     request_date : dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')
    // }
    // materialModel.addPurchase(purchase, function(err, result){
    // });


    // html_data = {msg : "Added."}
    // res.send(html_data);
}

exports.getPurchases = function(req, res){
    materialModel.getPurchases({purchase_id : 1}, function(err, result){
        if (err)
            throw err;
        else{
            var html_data = {
                msg : result[0].item_desc
            }
            res.send(html_data);
        }
    });
}



//API Test
exports.testAPI = function(req, res){
    html_data["notifs"] = req.notifs;
    res.render("api");
}

exports.getWeather = function(req, res){
    console.log(req)
    res.send({msg : "Weather"});
}





//ACTUAL USE

exports.getOrders = function(req, res){
    var html_data = {};
    html_data = js.init_session(html_data, 'role', 'name', 'username', 'orders_tab', req.session);
    materialModel.getAllPurchases(null,null, function(err, purchases){
        if(err)
            throw err;
        else{
            for(x = 0; x < purchases.length; x++){
                purchases[x].request_date = dataformatter.formatDate(purchases[x].request_date, 'YYYY-MM-DD');
                if(purchases[x].date_purchased != null)
                    purchases[x].date_purchased = dataformatter.formatDate(purchases[x].date_purchased, 'YYYY-MM-DD');
            }
            html_data["purchases"] = purchases;
        }

        farmModel.getAllFarms(function(err, farms){
            if(err)
                throw err;
            else{
                var i,x;
                for(i = 0; i < farms.length; i++){
                    var temp_arr = [];
                    for(x = 0; x < purchases.length; x++){
                        if(purchases[x].farm_id == farms[i].farm_id){
                            temp_arr.push(purchases[x]);
                        }
                        
                    }
                    farms[i]["farm_purchases"] = temp_arr;
                }
                html_data["farms"] = farms; 

                materialModel.getMaterials("Seed", null, function(err, seeds){
                    if(err)
                        throw err;
                    else{
                        html_data["seeds"] = seeds;
                    }

                    materialModel.getAllPurchases(null, {status : "Pending"} , function(err, pending){
                        if(err)
                            throw err;
                        else{
                            
                            var i;
                            for(i = 0; i < pending.length; i++){
                                if(pending[i].purchase_price == null)
                                    pending[i].purchase_price = "0.00";
                                //
                                pending[i].request_date = dataformatter.formatDate(pending[i].request_date, 'YYYY-MM-DD');
                            }
                            //
                            html_data["pending"] = pending;
                        }
                        materialModel.getAllPurchases(null, {status : "Processing"}, function(err, processing){
                            if(err)
                                throw err;
                            else{
                                for(i = 0; i < processing.length; i++){
                                    if(processing[i].purchase_price == null)
                                        processing[i].purchase_price = "0.00";
                                    if(processing[i].request_date != null)
                                    processing[i].request_date = dataformatter.formatDate(processing[i].request_date, 'YYYY-MM-DD');
                                }
                                html_data["processing"] = processing;
                            }
                            html_data["notifs"] = req.notifs;
                            res.render("orders", html_data);
                        });
                        
                    });
                    
                });
            }
            
        });
        
    });
}

exports.getMaterialsAjax = function(req, res){
    var type = req.query.type;
    
    materialModel.getMaterialsList(type, null, function(err, seeds){
        if(err){
            throw err;
        }
        else{
            res.send(seeds);
        } 
    });
}

exports.getInventory = function(req, res){
    var html_data = {};
    html_data = js.init_session(html_data, 'role', 'name', 'username', 'inventory_tab', req.session);

    materialModel.getFarmMaterials(null, function(err, materials){
        if(err)
            throw err;
        else{
            var ctr2 = materials.length;
            if(materials == null)
                ctr2 = 10;
            while(ctr2 < 10){
                materials.push({blank : true});
                ctr2++;
            };
            html_data["materials"] = materials;
            farmModel.getAllFarms(function(err, farms){
                if(err)
                    throw err;
                else{
                }
                materialModel.getFarmMaterials(null, function(err, materials){
                    if(err)
                        throw err;
                    else{
                        var i,x;
                        for(i = 0; i < farms.length; i++){
                            var temp_arr = [];
                            for(x = 0; x < materials.length; x++){
                                if(materials[x].farm_id == farms[i].farm_id){
                                    temp_arr.push(materials[x]);
                                }
                            }
                            farms[i]["farm_materials"] = temp_arr;
                        }
                        // html_data["materials"] = materials;
                    }

                    materialModel.getLowStocks(null, function(err, low_stocks){
                        if(err)
                            throw err;
                        else{

                        }
                        html_data["farms"] = farms;
                        html_data["low_stocks"] = low_stocks;
                        html_data["notifs"] = req.notifs;
                        res.render("inventory", html_data);
                    });
                   
                });
    
            });
        }
    });

}

exports.ajaxGetInventory = function(req, res){
    var html_data = {};
    var type = req.params.type;
    if(type == "all_farms"){
        materialModel.getFarmMaterials(null, function(err, materials){
            if(err)
                throw err;
            else{
                var ctr2 = materials.length;
                if(materials == null)
                    ctr2 = 10;
                while(ctr2 < 10){
                    materials.push({blank : true});
                    ctr2++;
                };
                html_data["materials"] = materials;
            }
            res.send(html_data);
        });
    }
    else if(type == "per_farm"){
        farmModel.getAllFarms(function(err, farms){
            if(err)
                throw err;
            else{
                html_data["farms"] = farms;
            }
            materialModel.getFarmMaterials(null, function(err, materials){
                if(err)
                    throw err;
                else{
                    html_data["materials"] = materials;
                }
                res.send(html_data);
            });

        });
    }
}

exports.newMaterial = function(req, res){

    var item_name = req.body.item_name;
    var item_desc = req.body.item_desc;
    var item_type = req.body.item_type;
    materialModel.addMaterials(item_type, item_name, item_desc, function(err){
        if(err){
            throw err;
        }
    });

    res.redirect("/inventory");
}


exports.addPurchase = function(req,res){
    //
    var farm_id = req.body.farm;

    var i;

    materialModel.getAllPurchases(null, {status : "Pending"}, function(err, purchases){
        if(err)
            throw err;
        else{
            

            for(i = 0; i < req.body.item.length; i++){
                var purchase = {
                    purchase_status : "Pending",
                    requested_by : 1,
                    farm_id : farm_id,
                    item_type : req.body.item[i].type,
                    item_desc : req.body.item_desc,
                    item_id : req.body.item[i].item,
                    amount : req.body.item[i].amount,
                    request_date : dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')
                }

                var cont = true;
                for(x = 0; x < purchases.length; x++){
                    if(farm_id == purchases[x].farm_id && purchase.item_type == purchases[x].item_type && purchase.item_id == purchases[x].item_id)
                        cont = false;
                }
                if(cont)
                    materialModel.addPurchase(purchase, function(err, add){
                        if(err) {

                        }
                        else{
                            //Create Notification
                            var notif = {
                                date : new Date(req.session.cur_date),
                                farm_id : farm_id,
                                notification_title : "New pending order",
                                url : "/orders/details?id=" + add.insertId,
                                icon : "fax",
                                color : "primary"
                            };
                            notifModel.createNotif(notif, function(err, success){

                            });
                        }
                    });
            }
        }
        
    });
    
        
    res.redirect("orders");
    // var purchase = {
    //     item_type : "Pesticide",
    //     item_desc : "This is a test to add purchase.",
    //     item_id : 3,
    //     purchase_price : 100,
    //     amount : 45,
    //     units : "Kg",
    //     requested_by : 1,
    //     request_date : dataformatter.formatDate(new Date(req.session.cur_date), 'YYYY-MM-DD')
    // }
    // materialModel.addPurchase(purchase, function(err, result){
    // });


    // html_data = {msg : "Added."}
    // res.send(html_data);
}


exports.getPurchaseDetails = function(req,res){
    var html_data = {};
    html_data = js.init_session(html_data, 'role', 'name', 'username', 'orders_tab', req.session);
    var purchase_id = req.query.id;

    materialModel.getDetailsPurchase({purchase_id : purchase_id}, function(err, details){
        if(err)
            throw err;
        else{
            details[0].request_date = dataformatter.formatDate(details[0].request_date, 'YYYY-MM-DD');
            if(details[0].date_purchased != null)
                details[0].date_purchased = dataformatter.formatDate(details[0].date_purchased, 'YYYY-MM-DD');
            else
            details[0].date_purchased = "not yet purchased";
            html_data['details'] = details[0];
        }
        html_data["cur_date"] = dataformatter.formatDate(new Date(req.session.cur_date),'YYYY-MM-DD');
        html_data["notifs"] = req.notifs;
        res.render("purchaseDetails", html_data);
    });
}


exports.updatePurchase = function(req, res){
    var id = {purchase_id : req.body.purchase_id};
    var amount = {amount : req.body.amount};
    var date_purchased = {date_purchased : req.body.date_purchased};
    var purchase_price = {purchase_price : req.body.purchase_price};

    if(purchase_price.purchase_price == ""){
        materialModel.updatePurchase(id, {purchase_status : "Processing"}, function(err, result){
        });
    }
    else if(purchase_price.purchase_price != ""){
        var data = {
            purchase_status : "Purchased",
            amount : amount.amount,
            date_purchased : date_purchased.date_purchased,
            purchase_price : purchase_price.purchase_price
        }
        materialModel.updatePurchase(id, data, function(err, result){
        });

        //Add to Farm materials
        materialModel.getDetailsPurchase(id, function(err, purchase_id){
            if(err)
                throw err;
            else{
                
                materialModel.getFarmMaterialsSpecific({farm_id : purchase_id[0].farm_id}, {item_type : purchase_id[0].item_type}, function(err, farm_materials){
                    if(err) {
                        throw err;
                    }
                    else{
                        var i, farm_mat_id = null;
                        for(i = 0; i < farm_materials.length; i++){
                            if(purchase_id[0].item_id == farm_materials[i].item_id){
                                farm_mat_id = farm_materials[i].farm_mat_id;
                                break;
                            }
                        }
                        if(farm_mat_id == null){
                            //create new farm_material
                            var material = {
                                farm_id : purchase_id[0].farm_id, 
                                item_id : purchase_id[0].item_id,
                                item_type: purchase_id[0].item_type,
                                current_amount : purchase_id[0].amount
                            }
                            materialModel.addNewFarmMaterial(material, function(err, resss){
                                if(err) {
                                    throw err;
                                }
                            });
                        }
                        else{
                            materialModel.addFarmMaterials(amount.amount, farm_mat_id, function(err, result){
                                if(err) {
                                    throw err;
                                }
                            });
                        }
                        
                    }
                });
            }
        });
        
    }

    res.redirect("/orders/details?id="+id.purchase_id);
    // var status = req.query.status;
    // var type = req.query.type;
    // var item_id = req.query.item_id;
    // var amount = req.query.amount;
    // var purchase_id = req.query.purchase_id;
    // var farm_mat_id = req.query.farm_mat_id;
    // if(status == "Purchased"){
    //     //should add to Materials
    //
        // materialModel.addFarmMaterials(amount, farm_mat_id, function(err, result){
        // });
    // }
    // var data = {
    //     item_desc : "New description from website.",
    //     purchase_status : status
    // };
    // materialModel.updatePurchase(purchase_id, data, function(err, result){
    // });
    // var html_data = {
    //     msg : "Data updated."
    // }
    // res.send(html_data);
}