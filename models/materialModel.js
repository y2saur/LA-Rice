var mysql = require('./connectionModel');
mysql = mysql.connection;

//Create and register valid materials
exports.registerMaterial = function(type, data, next) {
	var sql;
	if (type == "Seed") {
		sql = "insert into seed_table set ?";
	}
	else if (type == "Pesticide") {
		sql = "insert into pesticide_table set ?";
	}
	else if (type == "Fertilizer") {
		sql = "insert into fertilizer_table set ?"
	}

	sql = mysql.format(sql, data);

	mysql.query(sql, next);
}

// Material template for specific farm
// select ft.farm_id, ft.farm_name, fet.fertilizer_id, fet.fertilizer_name, fet.fertilizer_desc, fet.N, fet.P, fet.K, ifnull(t.current_amount, 0) as current_amount from fertilizer_table as fet cross join farm_table as ft 
// left join (
// select t1.fertilizer_id as fertilizer_id, t2.farm_id as farm_id, current_amount from farm_materials
// inner join fertilizer_table t1 on t1.fertilizer_id =  farm_materials.item_id
// inner join farm_table as t2 on t2.farm_id = farm_materials.farm_id
// where t2.farm_id = ? and farm_materials.item_type = 'Fertilizer'
// group by fertilizer_id, farm_id
// ) as t on t.fertilizer_id = fet.fertilizer_id and t.farm_id = ft.farm_id
// where ft.farm_id = ? order by farm_id, fertilizer_name

//get pesticides, seeds fertilizers
exports.getMaterials = function(type, filter, next){
	var sql;
	var table;
	if (type == "Seed") {
		table = "SELECT seed_id as id, seed_name as name, seed_desc as mat_desc, maturity_days, amount, units, average_yield FROM seed_table";
	
		if(filter == null){
			sql = table + ";";
		}
		else{
			sql = table +" WHERE ?";
			sql = mysql.format(sql, filter);
		}
	}
	else if (type == "Pesticide") {
		table = "SELECT pesticide_id as id, pesticide_name as name, pesticide_desc as mat_desc FROM pesticide_table";
	
		if(filter == null){
			sql = table + ";";
		}
		else{
			sql = table +" WHERE ?";
			sql = mysql.format(sql, filter);
		}
	}
	else if (type == "Fertilizer") {
		table = "select ft.farm_id, ft.farm_name, fet.fertilizer_id, fet.fertilizer_name, fet.fertilizer_desc, fet.N, fet.P, fet.K, ifnull(t.current_amount, 0) as current_amount, fet.price from fertilizer_table as fet cross join farm_table as ft left join ( select t1.fertilizer_id as fertilizer_id, t2.farm_id as farm_id, current_amount from farm_materials inner join fertilizer_table t1 on t1.fertilizer_id = farm_materials.item_id inner join farm_table as t2 on t2.farm_id = farm_materials.farm_id where t2.farm_id = ? and farm_materials.item_type = 'Fertilizer' group by fertilizer_id, farm_id ) as t on t.fertilizer_id = fet.fertilizer_id and t.farm_id = ft.farm_id where ft.farm_id = ? order by farm_id, fertilizer_name";
		
		while (table.includes("?")) {
			table = mysql.format(table, filter);
		}
		sql = table;
	}

	mysql.query(sql, next);
}

//Gets list of materials
exports.getMaterialsList = function(type, filter, next){
	var sql;
	var table;
	if (type == "Seed") {
		table = "SELECT seed_id as id, seed_name as name, seed_desc as mat_desc FROM seed_table";
	
		if(filter == null){
			sql = table + ";";
		}
		else{
			sql = table +" WHERE ?";
			sql = mysql.format(sql, filter);
		}
	}
	else if (type == "Pesticide") {
		table = "SELECT pesticide_id as id, pesticide_name as name, pesticide_desc as mat_desc FROM pesticide_table";
	
		if(filter == null){
			sql = table + ";";
		}
		else{
			sql = table +" WHERE ?";
			sql = mysql.format(sql, filter);
		}
	}
	else if (type == "Fertilizer") {
		table = "SELECT fertilizer_id as id, fertilizer_name as name, fertilizer_desc as mat_desc, N, P, K FROM fertilizer_table";
	
		if(filter == null){
			sql = table + ";";
		}
		else{
			sql = table +" WHERE ?";
			sql = mysql.format(sql, filter);
		}
	}

	mysql.query(sql, next);
}

//Joins list of all filtered materials and combines with farm material inventory
exports.getAllMaterials = function(type, filter, next) {
	var sql;

	if (type == "Seed") {
		sql = "SELECT seed_id as id, seed_name as name, seed_desc as mat_desc FROM seed_table";
	
		while (sql.includes("?")) {
			sql = mysql.format(sql, filter);
		}
	}
	else if (type == "Pesticide") {
		sql = "select ft.farm_id, ft.farm_name, fet.pesticide_id, fet.pesticide_name, fet.pesticide_desc, ifnull(t.current_amount, 0) as current_amount from pesticide_table as fet cross join farm_table as ft left join ( select t1.pesticide_id as pesticide_id, t2.farm_id as farm_id, current_amount from farm_materials inner join pesticide_table t1 on t1.pesticide_id = farm_materials.item_id inner join farm_table as t2 on t2.farm_id = farm_materials.farm_id where t2.farm_id = ? and farm_materials.item_type = 'Pesticide' group by pesticide_id, farm_id ) as t on t.pesticide_id = fet.pesticide_id and t.farm_id = ft.farm_id where ft.farm_id = ? order by farm_id, pesticide_name";
		
		while (sql.includes("?")) {
			sql = mysql.format(sql, filter);
		}
	}
	else if (type == "Fertilizer") {
		sql = "select ft.farm_id, ft.farm_name, fet.fertilizer_id, fet.fertilizer_name, fet.fertilizer_desc, fet.N, fet.P, fet.K, ifnull(t.current_amount, 0) as current_amount, fet.price from fertilizer_table as fet cross join farm_table as ft left join ( select t1.fertilizer_id as fertilizer_id, t2.farm_id as farm_id, current_amount from farm_materials inner join fertilizer_table t1 on t1.fertilizer_id = farm_materials.item_id inner join farm_table as t2 on t2.farm_id = farm_materials.farm_id where t2.farm_id = ? and farm_materials.item_type = 'Fertilizer' group by fertilizer_id, farm_id ) as t on t.fertilizer_id = fet.fertilizer_id and t.farm_id = ft.farm_id where ft.farm_id = ? order by farm_id, fertilizer_name";
		
		while (sql.includes("?")) {
			sql = mysql.format(sql, filter);
		}
	}


	mysql.query(sql, next);
}

exports.readResourcesUsed = function(type, data, calendar, next) {

	if (type == 'Seed') {

	}
	else if (type == 'Fertilizer') {
		var sql = "select *, case when max(total_used) is null then 0 else max(total_used) end as resources_used from ( select N, P, K, fertilizer_id, fertilizer_name, fertilizer_desc, null as total_used,price from fertilizer_table union select null, null, null, wort.item_id, null, null, sum(wort.qty) as total_used, null from wo_resources_table wort where wort.work_order_id in (select wot.work_order_id from work_order_table as wot where wot.crop_calendar_id = (select cct.calendar_id from farm_table as ft join crop_calendar_table as cct using (farm_id) where ft.farm_name = ? and cct.calendar_id = ?) and wot.status = 'Completed') and wort.type = 'Fertilizer' group by wort.item_id ) as t group by t.fertilizer_id";
		sql = mysql.format(sql, data);
		sql = mysql.format(sql, calendar);
	}
	else if (type == 'Pesticide') {

	}

	mysql.query(sql, next);
}

exports.updateMaterial = function(type, filter, data, next){
	var sql;
	if (type == "Seed") {
		sql = "UPDATE seed_table set ?";
	}
	else if (type == "Pesticide") {
		sql = "UPDATE pesticide_table set ?";
	}
	else if (type == "Fertilizer") {
		sql = "UPDATE fertilizer_table set ?"
	}
	sql = mysql.format(sql, data);
	if(filter != null){
		sql = sql + " WHERE ?";
		sql = mysql.format(sql, filter);
	}
	mysql.query(sql, next);
}

// exports.materialAddUpdate = function(type, filter, data, next){
// 	var sql;
// 	if (type == "Seed") {
// 		sql = "UPDATE seed_table set current_amount = current_amount + ? WHERE seed_id = " + filter.item_id;
// 	}
// 	else if (type == "Pesticide") {
// 		sql = "UPDATE pesticide_table set current_amount = current_amount + ? WHERE pesticide_id = " + filter.item_id;
// 	}
// 	else if (type == "Fertilizer") {
// 		sql = "UPDATE fertilizer_table set current_amount = current_amount + ? WHERE pesticide_id = " + filter.item_id;
// 	}
// 	sql = mysql.format(sql, data);
// 	// if(filter != null){
// 	// 	sql = sql + " WHERE ?";
// 	// 	sql = mysql.format(sql, filter);
// 	// }
// 	console.log(sql);
// 	mysql.query(sql, next);
// }


exports.addMaterials = function(type,name, desc, next){
	var table = "";
	sql = "INSERT INTO ";
	if(type == "Seed")
		sql = sql + "seed_table (seed_name, seed_desc) VALUES (?,?)";
	else if(type == "Pesticide")
		sql = sql + "pesticide_table (pesticide_name, pesticide_desc) VALUES (?,?)";
	else if(type == "Fertilizer")
		sql = sql + "fertilizer_table (fertilizer_name, fertilizer_desc) VALUES (?,?)";

	sql = mysql.format(sql, name);
	sql = mysql.format(sql, desc);

	mysql.query(sql, next);
}

exports.registerFarmMaterial = function(data, next) {
	var sql = "insert into farm_materials set ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
}

exports.subtractFarmMaterial = function(data, filter, next) {
	var sql = ``;
	data.qty.forEach(function(item, index) {
		sql += `update farm_materials set current_amount = (current_amount - ${data.qty[index]}) where farm_id = ${filter.farm_id} and item_id = ${filter.item_id[index]} and item_type = "${filter.item_type}";`;
	})

	mysql.query(sql, next);
}

exports.updateFarmMaterials = function(data, farm_mat_id, next){
	var sql = "UPDATE farm_materials set ? WHERE ?";
	sql = mysql.format(sql, data);
	sql = mysql.format(sql, farm_mat_id);

	mysql.query(sql, next);
}

exports.addFarmMaterials = function(amount, farm_mat_id, next){
	var sql = "UPDATE farm_materials set current_amount = current_amount + ? WHERE farm_mat_id = ?";
	sql = mysql.format(sql, amount);
	sql = mysql.format(sql, farm_mat_id);

	mysql.query(sql, next);
}


exports.addNewFarmMaterial = function(material, next){
	var sql = "INSERT INTO farm_materials SET ?";
	sql = mysql.format(sql, material);
	mysql.query(sql, next);
}

exports.getFarmMaterials = function(farm_id, next){
	var sql = 'select * from (SELECT fm.*, ft.farm_name, st.seed_name as item_name, st.seed_desc as item_desc,units FROM farm_materials fm INNER JOIN farm_table ft ON ft.farm_id = fm.farm_id INNER JOIN seed_table st ON fm.item_type = "Seed" && fm.item_id = st.seed_id UNION SELECT fm.*, ft.farm_name, pt.pesticide_name as item_name, pt.pesticide_desc as item_desc, units FROM farm_materials fm INNER JOIN farm_table ft ON ft.farm_id = fm.farm_id INNER JOIN pesticide_table pt ON fm.item_type = "Pesticide" && fm.item_id = pt.pesticide_id UNION SELECT fm.*, ft.farm_name, fr.fertilizer_name as item_name, fr.fertilizer_desc as item_desc, units FROM farm_materials fm INNER JOIN farm_table ft ON ft.farm_id = fm.farm_id INNER JOIN fertilizer_table fr ON fm.item_type = "Fertilizer" && fm.item_id = fr.fertilizer_id ) as t ';
	var farm = " WHERE farm_id = ?;";

	if(farm_id != null){
		sql = sql + farm;
		sql = mysql.format(sql, farm_id);
	}

	mysql.query(sql, next);
}

exports.getLowStocks = function(farm_id, next){
	var farm = " && ft.farm_id = ?;";
	var sql_1 = 'SELECT fm.*, st.seed_name as item_name, st.seed_desc as item_desc, units, ft.farm_name FROM farm_materials fm INNER JOIN farm_table ft ON ft.farm_id = fm.farm_id INNER JOIN seed_table st ON fm.item_type = "Seed" && fm.item_id = st.seed_id WHERE fm.current_amount < 5 ';
	if(farm_id != null){
		sql_1 = sql_1 + farm;
		sql_1 = mysql.format(sql_1, farm_id);
	}
	var sql_2 = 'SELECT fm.*, pt.pesticide_name as item_name, pt.pesticide_desc as item_desc, units, ft.farm_name FROM farm_materials fm INNER JOIN farm_table ft ON ft.farm_id = fm.farm_id INNER JOIN pesticide_table pt ON fm.item_type = "Pesticide" && fm.item_id = pt.pesticide_id WHERE fm.current_amount < 5 ';
	if(farm_id != null){
		sql_2 = sql_2 + farm;
		sql_2 = mysql.format(sql_2, farm_id);
	}
	var sql_3 = 'SELECT fm.*, fr.fertilizer_name as item_name, fr.fertilizer_desc as item_desc, units, ft.farm_name FROM farm_materials fm INNER JOIN farm_table ft ON ft.farm_id = fm.farm_id INNER JOIN fertilizer_table fr ON fm.item_type = "Fertilizer" && fm.item_id = fr.fertilizer_id WHERE fm.current_amount < 5 ';
	if(farm_id != null){
		sql_3 = sql_3 + farm;
		sql_3 = mysql.format(sql_3, farm_id);
	}
	var sql = sql_1 + " UNION " + sql_2 + " UNION " + sql_3;

	mysql.query(sql, next);
}

exports.getFarmMaterialsSpecific = function(farm_id, item_type, next){
	var sql;
	if(item_type.item_type == "Seed")
		sql = "SELECT farm_mat_id, item_id, item_type, current_amount, seed_name as item_name, units FROM farm_materials m INNER JOIN seed_table st ON m.item_id = st.seed_id WHERE ? && ?";
	else if(item_type.item_type == "Fertilizer")
		sql = "SELECT farm_mat_id, item_id, item_type, current_amount, fertilizer_name as item_name, units FROM farm_materials m INNER JOIN fertilizer_table st ON m.item_id = st.fertilizer_id WHERE ? && ?";
	else if(item_type.item_type == "Pesticide")
		sql = "SELECT farm_mat_id, item_id, item_type, current_amount, pesticide_name as item_name, units FROM farm_materials m INNER JOIN pesticide_table st ON m.item_id = st.pesticide_id WHERE ? && ?";
	sql = mysql.format(sql, farm_id);
	sql = mysql.format(sql, item_type);

	mysql. query(sql, next);
}


exports.getFarmMaterialsMultiple = function(filter, next){
	var sql = "SELECT * FROM farm_materials WHERE farm_id = ? && item_type = ? && item_id = ?";
	sql = mysql.format(sql, filter[0]);
	sql = mysql.format(sql, filter[1]);
	sql = mysql.format(sql, filter[2]);

	mysql.query(sql, next);
}

//Purchase history
exports.addPurchase = function(data, next){
	var sql;
	sql = "INSERT INTO purchase_table SET ?";
	sql = mysql.format(sql, data);

	mysql.query(sql, next);
}

exports.getPurchases = function(filter, next){
	var sql;
	if(filter == null){
		sql = "SELECT * FROM purchase_table;";
	}
	else{
		sql = "SELECT * FROM purchase_table WHERE ? ";
		sql = mysql.format(sql, filter);
	}
	mysql.query(sql, next);
}

exports.updatePurchase = function(id, data, next){
	var sql = "UPDATE purchase_table SET ? WHERE ?;";
	sql = mysql.format(sql, data);
	sql = mysql.format(sql, id);

	mysql.query(sql, next);
};

exports.getPurchasesPerFarm = function(type, farm_id, status, next){
	var fertilizer = 'SELECT pt.*, st.fertilizer_name AS item_name, st.fertilizer_desc AS description FROM purchase_table pt INNER JOIN fertilizer_table st ON pt.item_id = st.fertilizer_id && item_type = "Fertilizer" WHERE pt.farm_id = ? ';
	var seed = "SELECT pt.*, st.seed_name AS item_name, st.seed_desc AS description FROM purchase_table pt INNER JOIN seed_table st ON pt.item_id = st.seed_id && item_type = 'Seed' WHERE pt.farm_id = ? ";
	var pesticide = "SELECT pt.*, st.pesticide_name AS item_name, st.pesticide_desc AS description FROM purchase_table pt INNER JOIN pesticide_table st ON pt.item_id = st.pesticide_id && item_type = 'Pesticide' WHERE pt.farm_id = ?";
	var sql;
	if(type == null){
		sql = fertilizer + " UNION " + seed + " UNION " + pesticide;
		sql = mysql.format(sql, farm_id.farm_id);
		sql = mysql.format(sql, farm_id.farm_id);
		sql = mysql.format(sql, farm_id.farm_id);
	}
	else if (type == "Seed"){
		sql = seed;
		sql = mysql.format(sql, farm_id.farm_id);
	}
	else if(type == "Fertilizer"){
		sql = fertilizer;
		sql = mysql.format(sql, farm_id.farm_id);
	}
	else if(type == "Pesticide"){
		sql = pesticide;
		sql = mysql.format(sql, farm_id.farm_id);
	}

	if(status != null){
		sql = "SELECT * FROM (" + sql + ") a WHERE purchase_status = ?";
		sql = mysql.format(sql, status.status);
	}
	
	mysql.query(sql, next);

}

exports.getAllPurchases = function(type, status, next){
	var fertilizer = 'SELECT pt.*, ft.farm_name as farm_name, st.fertilizer_name AS item_name, st.fertilizer_desc AS description, st.units FROM purchase_table pt INNER JOIN fertilizer_table st ON pt.item_id = st.fertilizer_id && item_type = "Fertilizer" INNER JOIN farm_table ft ON ft.farm_id = pt.farm_id ';
	var seed = "SELECT pt.*,ft.farm_name as farm_name, st.seed_name AS item_name, st.seed_desc AS description, st.units FROM purchase_table pt INNER JOIN seed_table st ON pt.item_id = st.seed_id && item_type = 'Seed' INNER JOIN farm_table ft ON ft.farm_id = pt.farm_id ";
	var pesticide = "SELECT pt.*, ft.farm_name as farm_name, st.pesticide_name AS item_name, st.pesticide_desc AS description, st.units FROM purchase_table pt INNER JOIN pesticide_table st ON pt.item_id = st.pesticide_id && item_type = 'Pesticide' INNER JOIN farm_table ft ON ft.farm_id = pt.farm_id ";
	var sql;
	if(type == null){
		sql = fertilizer + " UNION " + seed + " UNION " + pesticide;
	}
	else if (type == "Seed"){
		sql = seed;
	}
	else if(type == "Fertilizer"){
		sql = fertilizer;
	}
	else if(type == "Pesticide"){
		sql = pesticide;
	}

	if(status != null){
		sql = "SELECT * FROM (" + sql + ") a WHERE purchase_status = ?";
		sql = mysql.format(sql, status.status);
	}
	sql = sql + " ORDER BY purchase_status"

	mysql.query(sql, next);

}

exports.getDetailsPurchase = function(purchase_id, next){
	var fertilizer = 'SELECT pt.*, ft.farm_name as farm_name, st.fertilizer_name AS item_name, st.fertilizer_desc AS description FROM purchase_table pt INNER JOIN fertilizer_table st ON pt.item_id = st.fertilizer_id && item_type = "Fertilizer" INNER JOIN farm_table ft ON ft.farm_id = pt.farm_id ';
	var seed = "SELECT pt.*,ft.farm_name as farm_name, st.seed_name AS item_name, st.seed_desc AS description FROM purchase_table pt INNER JOIN seed_table st ON pt.item_id = st.seed_id && item_type = 'Seed' INNER JOIN farm_table ft ON ft.farm_id = pt.farm_id ";
	var pesticide = "SELECT pt.*, ft.farm_name as farm_name, st.pesticide_name AS item_name, st.pesticide_desc AS description FROM purchase_table pt INNER JOIN pesticide_table st ON pt.item_id = st.pesticide_id && item_type = 'Pesticide' INNER JOIN farm_table ft ON ft.farm_id = pt.farm_id ";
	var sql;
	sql = "SELECT * FROM (" + fertilizer + " UNION " + seed + " UNION " + pesticide + ") a WHERE ?";
	sql = mysql.format(sql, purchase_id);

	mysql.query(sql, next);

}
//FARM FERTILIZERS
exports.getAllElements = function(next){
	var sql = "SELECT * FROM elements_table;"
	mysql.query(sql, next);
}

exports.getFertilizerElements = function(fertilizer_id, next){
	var sql = "SELECT * FROM fertilizer_table ft INNER JOIN fertilizer_elements fe ON fe.fertilizer_id = ft.fertilizer_id INNER JOIN element_table et ON et.element_id = fe.element_id WHERE ft.fertilizer_id = ?;"
	sql = mysql.format(sql, fertilizer_id);
	mysql.query(sql, next);
}

exports.addPesticideUsage = function(usage, next){
	var sql = "INSERT INTO pesticide_usage SET ?";
	sql = mysql.format(sql, usage);

	mysql.query(sql, next);
}

