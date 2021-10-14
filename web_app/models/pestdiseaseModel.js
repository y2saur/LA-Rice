var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.getAllSymptoms = function(next){

};

exports.getAllFactors = function(next){
	var sql = 'SELECT wt.weather_id as factor_id, wt.weather as factor_name, wt.weather_desc as description, "weather" as type FROM weather_table wt UNION SELECT s.stage_id as factor_id, s.stage_name as factor_name, s.stage_desc as description, "stages" FROM stages s UNION SELECT ss.season_id as factor_id, ss.season_name as factor_name, ss.season_desc as description, "season" FROM seasons ss UNION SELECT f.fertilizer_id as factor_id, f.fertilizer_name as factor_name, f.fertilizer_desc as description, "fertilizer" FROM fertilizer_table f UNION SELECT ft.farm_type_id as factor_id, ft.farm_type as factor_name, ft.farm_type_desc as description, "farm type" FROM farm_types ft;';
	mysql.query(sql, next);
}

exports.addFactor = function(type, data, next){
	var sql = "INSERT INTO ";
	var table;
	switch (type){
		case "weather" : table = "weather_table"; break;
		case "season" : table = "seasons";break;
		case "farm type" : table = "farm_types";break;
		case "fertilizer" : table = "fertilizer_table";break;
		case "stage" : table = "stages"; break;
	}
	sql = sql + table + " set ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next);
}




exports.getAllPests = function(next){
	var sql = "SELECT * FROM pest_table;";
	mysql.query(sql, next);
}

exports.getPestDetails = function(id,next){
	var sql = "SELECT * FROM pest_table WHERE ?;";
	sql = mysql.format(sql, id);
	mysql.query(sql, next);
}

exports.getPestSymptoms = function(pest_id, next){
    var sql = "SELECT st.symptom_id, st.symptom_name, st.symptom_desc FROM pest_table p INNER JOIN symptoms_pest sp ON p.pest_id = sp.pest_id INNER JOIN symptoms_table st ON sp.symptom_id = st.symptom_id WHERE p.pest_id = ?;"
	sql = mysql.format(sql, pest_id);
	mysql.query(sql, next);
}

exports.getPestFactors = function(pest_id, next){
	var sql = 'SELECT p.pest_id, p.pest_name, wt.weather as factor, wt.weather_desc as description, "weather" as type FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE p.pest_id = ? UNION SELECT p.pest_id, p.pest_name, s.season_name as factor, s.season_desc as description, "season" as type FROM pest_table p INNER JOIN season_pest sp ON p.pest_id = sp.pest_id INNER JOIN seasons s ON s.season_id = sp.season_pest WHERE p.pest_id = ? UNION SELECT p.pest_id, p.pest_name, s.stage_name as factor, s.stage_desc as description, "stage" as type FROM pest_table p INNER JOIN stages_pest sp ON sp.pest_id = p.pest_id INNER JOIN stages s ON s.stage_id = sp.stages_pest_id WHERE p.pest_id = ? UNION SELECT p.pest_id, p.pest_name, ft.farm_type as factor, ft.farm_type_desc as description, "farm type" as type FROM pest_table p INNER JOIN farmtypes_pest ftp ON p.pest_id = ftp.pest_id INNER JOIN farm_types ft ON ft.farm_type_id = ftp.farm_type_id WHERE p.pest_id = ? UNION SELECT p.pest_id, p.pest_name, ft.fertilizer_name as factor, ft.fertilizer_desc as description, "fertilizer" as type FROM pest_table p INNER JOIN fertilizer_pest fp ON p.pest_id = fp.pest_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = ft.fertilizer_id WHERE p.pest_id = ?;';
	sql = mysql.format(sql, pest_id);
	sql = mysql.format(sql, pest_id);
	sql = mysql.format(sql, pest_id);
	sql = mysql.format(sql, pest_id);
	sql = mysql.format(sql, pest_id);
	mysql.query(sql, next);
}

exports.addPest = function(pest, next){
	var sql = "INSERT INTO pest_table SET ?";
	sql = mysql.format(sql, pest);
	mysql.query(sql, next);
}








//disease
exports.getAllDiseases = function(next){
	var sql = "SELECT * FROM disease_table;";
	mysql.query(sql, next);
}

exports.getDiseaseDetails = function(id,next){
	var sql = "SELECT * FROM disease_table WHERE ?;";
	sql = mysql.format(sql, id);
	mysql.query(sql, next);
}

exports.getDiseaseSymptoms = function(disease_id, next){
    var sql = 'SELECT st.symptom_id, st.symptom_name, st.symptom_desc FROM disease_table d INNER JOIN symptoms_disease sd ON d.disease_id = sd.disease_id INNER JOIN symptoms_table st ON sd.symptom_id = st.symptom_id WHERE d.disease_id = ?;';
	sql = mysql.format(sql, disease_id);
	mysql.query(sql, next);
}

exports.getDiseaseFactors = function(disease_id, next){
	var sql = 'SELECT d.disease_id, d.disease_name, wt.weather as factor, wt.weather_desc as pescription, "weather" as type FROM disease_table d INNER JOIN weather_disease wd ON d.disease_id = wd.disease_id INNER JOIN weather_table wt ON wt.weather_id = wd.weather_id WHERE d.disease_id = ? UNION SELECT d.disease_id, d.disease_name, s.season_name as factor, s.season_desc as description, "season" as type FROM disease_table d INNER JOIN seasons_disease sd ON d.disease_id = sd.disease_id INNER JOIN seasons s ON s.season_id = sd.seasons_disease_id WHERE d.disease_id = ? UNION SELECT d.disease_id, d.disease_name, s.stage_name as factor, s.stage_desc as description, "stage" as type FROM disease_table d INNER JOIN stages_disease sd ON sd.disease_id = d.disease_id INNER JOIN stages s ON s.stage_id = sd.stages_disease_id WHERE d.disease_id = ? UNION SELECT d.disease_id, d.disease_name, ft.farm_type as factor, ft.farm_type_desc as description, "farm type" as type FROM disease_table d INNER JOIN farm_types_disease ftd ON d.disease_id = ftd.disease_id INNER JOIN farm_types ft ON ft.farm_type_id = ftd.farm_type_id WHERE d.disease_id = ? UNION SELECT d.disease_id, d.disease_name, ft.fertilizer_name as factor, ft.fertilizer_desc as description, "fertilizer" as type FROM disease_table d INNER JOIN fertilizer_disease fd ON d.disease_id = fd.disease_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = ft.fertilizer_id WHERE d.disease_id = ?;';
	sql = mysql.format(sql, disease_id);
	sql = mysql.format(sql, disease_id);
	sql = mysql.format(sql, disease_id);
	sql = mysql.format(sql, disease_id);
	sql = mysql.format(sql, disease_id);
	mysql.query(sql, next);
}

exports.addDisease = function(disease, next){
	var sql = "INSERT INTO pest_table SET ?";
	sql = mysql.format(sql, disease);
	mysql.query(sql, next);
}