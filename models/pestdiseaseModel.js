var mysql = require('./connectionModel');
mysql = mysql.connection;

exports.getAllSymptoms = function(next){
	var sql = 'SELECT * FROM symptoms_table;';
	mysql.query(sql, next); return(sql);
};

exports.getAllFactors = function(next){
	var sql = 'SELECT wt.weather_id as factor_id, wt.weather as factor_name, wt.weather_desc as description, "weather" as type FROM weather_table wt UNION SELECT s.stage_id as factor_id, s.stage_name as factor_name, s.stage_desc as description, "stages" FROM stages s UNION SELECT ss.season_id as factor_id, ss.season_name as factor_name, ss.season_desc as description, "season" FROM seasons ss UNION SELECT f.fertilizer_id as factor_id, f.fertilizer_name as factor_name, f.fertilizer_desc as description, "fertilizer" FROM fertilizer_table f UNION SELECT ft.farm_type_id as factor_id, ft.farm_type as factor_name, ft.farm_type_desc as description, "farm type" FROM farm_types ft;';
	mysql.query(sql, next); return(sql);
}

exports.getAllPreventions = function(next){
	var sql = 'SELECT * FROM prevention_table;';
	mysql.query(sql, next); return(sql);
}

exports.getAllSolutions = function(next){
	var sql = 'SELECT * FROM solution_table;';
	mysql.query(sql, next); return(sql);
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
	mysql.query(sql, next); return(sql);
}

exports.addSymptom = function(data, next){
	var sql = "INSERT INTO symptoms_table set ?";
	sql = mysql.format(sql, data);
	mysql.query(sql, next); return(sql);
}

exports.addPestDiseaseSymptom = function(type, id, symptom, next){
	var sql = "INSERT INTO ";
	var table;
	var variable;
	if(type == "Pest"){
		table = "symptoms_pest";
		variable = "pest_id";
	}
	else if(type == "Disease"){
		table = "symptoms_disease";
		variable = "disease_id";
	}

	sql = sql + table + " set symptom_id = ?, " + variable + "= ?";
	sql = mysql.format(sql, symptom);
	sql = mysql.format(sql, id);
	mysql.query(sql, next); return(sql);
}


exports.addPestDiseaseSolution = function(type, id, solution, next){
	var sql = "INSERT INTO ";
	var table;
	var variable;
	if(type == "Pest"){
		table = "solution_pest";
		variable = "pest_id";
	}
	else if(type == "Disease"){
		table = "solution_disease";
		variable = "disease_id";
	}

	sql = sql + table + " set solution_id = ?, " + variable + "= ?";
	sql = mysql.format(sql, solution);
	sql = mysql.format(sql, id);
	mysql.query(sql, next); return(sql);
}

exports.addPestDiseasePrevention = function(type, id, prevention, next){
	var sql = "INSERT INTO ";
	var table;
	var variable;
	if(type == "Pest"){
		table = "prevention_pest";
		variable = "pest_id";
	}
	else if(type == "Disease"){
		table = "prevention_disease";
		variable = "disease_id";
	}

	sql = sql + table + " set prevention_id = ?, " + variable + "= ?";
	sql = mysql.format(sql, prevention);
	sql = mysql.format(sql, id);
	mysql.query(sql, next); return(sql);
}

exports.addPestDiseaseFactor = function(factor_type, type, id, prevention, next){
	var sql = "INSERT INTO ";
	var table;
	var variable;
	var variable2;

	if(factor_type == "weather"){
		table = "weather";
		variable2 = "weather_id";
	}
	else if(factor_type == "season"){
		table = "season";
		variable2 = "season_id";

	}
	else if(factor_type == "fertilizer"){
		table = "fertilizer";
		variable2 = "fertilizer_id";

	}
	else if(factor_type == "farm type"){
		table = "farmtype";
		variable2 = "farm_type_id";

	}
	else if(factor_type == "stages"){
		table = "stages";
		variable2 = "stage_id";

	}


	if(type == "Pest"){
		table = table + "_pest";
		variable = "pest_id";
	}
	else if(type == "Disease"){
		table =  table + "_disease";
		variable = "disease_id";
	}

	sql = sql + table + " set " + variable2 + " = ?, " + variable + "= ?";
	sql = mysql.format(sql, prevention);
	sql = mysql.format(sql, id);

	mysql.query(sql, next); return(sql);
}

exports.getLastInserted = function(type, next){
	if(type == "Pest")
		mysql.query("SELECT LAST_INSERT_ID() as last FROM pest_table;", next);
	else if(type == "Diagnosis")
		mysql.query("SELECT LAST_INSERT_ID() as last FROM diagnosis;", next);
	else if(type == "Recommendation")
		mysql.query("SELECT LAST_INSERT_ID() as last FROM pd_recommendation;", next);
	else
		mysql.query("SELECT LAST_INSERT_ID() as last FROM disease_table;", next);
}
exports.getLast = function(next){
	mysql.query("SELECT LAST_INSERT_ID() as last;", next);
}

//PESTS
exports.getAllPests = function(next){
	var sql = "SELECT * FROM pest_table;";
	mysql.query(sql, next); return(sql);
}

exports.getPestDetails = function(id,next){
	var sql = "SELECT pest_id as pd_id, pest_name as pd_name, pest_desc as pd_desc, scientific_name, image_url FROM pest_table WHERE ?;";
	sql = mysql.format(sql, id);
	mysql.query(sql, next); return(sql);
}

exports.getPestSymptoms = function(pest_id, next){
    var sql = "SELECT st.symptom_id, st.symptom_name as detail_name, st.symptom_desc as detail_desc FROM pest_table p INNER JOIN symptoms_pest sp ON p.pest_id = sp.pest_id INNER JOIN symptoms_table st ON sp.symptom_id = st.symptom_id WHERE p.pest_id = ?;"
	sql = mysql.format(sql, pest_id);
	mysql.query(sql, next); return(sql);
}

exports.getPestFactors = function(pest_id, next){
	var sql = 'SELECT p.pest_id, p.pest_name, wt.weather as detail_name, wt.weather_desc as detail_desc, "weather" as type FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id LEFT JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE p.pest_id = ? UNION SELECT p.pest_id, p.pest_name, s.season_name as detail_name, s.season_desc as detail_desc, "season" as type FROM pest_table p INNER JOIN season_pest sp ON p.pest_id = sp.pest_id LEFT JOIN seasons s ON s.season_id = sp.season_id WHERE p.pest_id = ? UNION SELECT p.pest_id, p.pest_name, s.stage_name as detail_name, s.stage_desc as detail_desc, "stage" as type FROM pest_table p INNER JOIN stages_pest sp ON sp.pest_id = p.pest_id LEFT JOIN stages s ON s.stage_id = sp.stage_id WHERE p.pest_id = ? UNION SELECT p.pest_id, p.pest_name, ft.farm_type as detail_name, ft.farm_type_desc as detail_desc, "farm type" as type FROM pest_table p INNER JOIN farmtypes_pest ftp ON p.pest_id = ftp.pest_id LEFT JOIN farm_types ft ON ft.farm_type_id = ftp.farm_type_id WHERE p.pest_id = ? UNION SELECT p.pest_id, p.pest_name, ft.fertilizer_name as detail_name, ft.fertilizer_desc as detail_desc, "fertilizer" as type FROM pest_table p INNER JOIN fertilizer_pest fp ON p.pest_id = fp.pest_id LEFT JOIN fertilizer_table ft ON ft.fertilizer_id = ft.fertilizer_id WHERE p.pest_id = ?;';
	sql = mysql.format(sql, pest_id);
	sql = mysql.format(sql, pest_id);
	sql = mysql.format(sql, pest_id);
	sql = mysql.format(sql, pest_id);
	sql = mysql.format(sql, pest_id);

	mysql.query(sql, next); return(sql);
}

exports.getPestSolutions = function(pest_id, next){
	var sql ='SELECT st.solution_id, st.solution_name as detail_name, st.solution_desc as detail_desc FROM pest_table p INNER JOIN solution_pest sp ON sp.pest_id = p.pest_id INNER JOIN solution_table st ON st.solution_id = sp.solution_id WHERE p.pest_id = ?';
	sql = mysql.format(sql, pest_id);
	mysql.query(sql, next); return(sql);
}

exports.getPestPreventions = function(pest_id, next){
	var sql = 'SELECT st.prevention_name as detail_name, st.prevention_desc as detail_desc FROM pest_table p INNER JOIN prevention_pest sp ON sp.pest_id = p.pest_id INNER JOIN prevention_table st ON st.prevention_id = sp.prevention_id WHERE p.pest_id = ?'
	sql = mysql.format(sql, pest_id);

	mysql.query(sql, next); return(sql);
}

exports.addPest = function(pest, next){
	var sql = "INSERT INTO pest_table SET ?";
	sql = mysql.format(sql, pest);

	mysql.query(sql, next); return(sql);
}



exports.getPestDiseaseList = function(type, next){
	var sql_pest = "SELECT a.pest_id as pd_id, a.pest_name as pd_name, a.pest_desc as pd_desc,  a.scientific_name, MAX(a.last_diagnosed) as last_diagnosed FROM (SELECT *, null as last_diagnosed FROM pest_table UNION SELECT dt.*, d.date_diagnosed as last_diagnosed FROM pest_table dt INNER JOIN diagnosis d ON d.pd_id = dt.pest_id WHERE type = 'Pest') a GROUP BY pest_id";
	var sql_disease = "SELECT a.disease_id as pd_id, a.disease_name as pd_name, a.disease_desc as pd_desc, a.scientific_name, MAX(a.last_diagnosed) as last_diagnosed FROM (SELECT *, null as last_diagnosed FROM disease_table UNION SELECT dt.*, d.date_diagnosed as last_diagnosed FROM disease_table dt INNER JOIN diagnosis d ON d.pd_id = dt.disease_id WHERE type = 'disease') a GROUP BY disease_id;";

	if(type == "Pest"){
		mysql.query(sql_pest, next); return(sql_pest);
	}
	else if(type == "Disease"){
		mysql.query(sql_disease, next); return(sql_disease);
	}
	else{
		var sql = sql_pest + " UNION " + sql_disease;
		mysql.query(sql, next); return(sql);
	}
}


exports.addDiagnosisSymptom = function(diagnosis_id, symptom_id, next ){
	var sql = "INSERT INTO diagnosis_symptom SET diagnosis_id = ?, symptom_id = ?";
	sql = mysql.format(sql, diagnosis_id);
	sql = mysql.format(sql, symptom_id);

	mysql.query(sql, next); return(sql);
}

exports.updateDiagnosis = function(diagnosis_id, solve_date, next){
	var sql = "UPDATE diagnosis set date_solved = ?, status = 'Solved' WHERE ?";
	sql = mysql.format(sql, solve_date);
	sql = mysql.format(sql, diagnosis_id);

	mysql.query(sql, next); return(sql);
}


//disease
exports.getAllDiseases = function(next){
	var sql = "SELECT * FROM disease_table;";
	mysql.query(sql, next); return(sql);
}

exports.getDiseaseDetails = function(id,next){
	var sql = "SELECT *, disease_id as pd_id, disease_name as pd_name, disease_desc as pd_desc FROM disease_table WHERE ?;";
	sql = mysql.format(sql, id);
	
	mysql.query(sql, next); return(sql);
}

exports.getDiseaseSymptoms = function(disease_id, next){
    var sql = 'SELECT st.symptom_id, st.symptom_name as detail_name, st.symptom_desc as detail_desc FROM disease_table d INNER JOIN symptoms_disease sd ON d.disease_id = sd.disease_id INNER JOIN symptoms_table st ON sd.symptom_id = st.symptom_id WHERE d.disease_id = ?;';
	sql = mysql.format(sql, disease_id);
	mysql.query(sql, next); return(sql);
}

exports.getDiseaseFactors = function(disease_id, next){
	var sql = 'SELECT d.disease_id, d.disease_name, wt.weather as detail_name, wt.weather_desc as detail_desc, "weather" as type FROM disease_table d INNER JOIN weather_disease wd ON d.disease_id = wd.disease_id LEFT JOIN weather_table wt ON wt.weather_id = wd.weather_id WHERE d.disease_id = ? UNION SELECT d.disease_id, d.disease_name, s.season_name as detail_name, s.season_desc as detail_desc, "season" as type FROM disease_table d INNER JOIN season_disease sd ON d.disease_id = sd.disease_id LEFT JOIN seasons s ON s.season_id = sd.season_id WHERE d.disease_id = ? UNION SELECT d.disease_id, d.disease_name, s.stage_name as detail_name, s.stage_desc as detail_desc, "stage" as type FROM disease_table d INNER JOIN stages_disease sd ON sd.disease_id = d.disease_id LEFT JOIN stages s ON s.stage_id = sd.stage_id WHERE d.disease_id = ? UNION SELECT d.disease_id, d.disease_name, ft.farm_type as detail_name, ft.farm_type_desc as detail_desc, "farm type" as type FROM disease_table d INNER JOIN farm_types_disease ftd ON d.disease_id = ftd.disease_id LEFT JOIN farm_types ft ON ft.farm_type_id = ftd.farm_type_id WHERE d.disease_id = ? UNION SELECT d.disease_id, d.disease_name, ft.fertilizer_name as detail_name, ft.fertilizer_desc as detail_desc, "fertilizer" as type FROM disease_table d INNER JOIN fertilizer_disease fd ON d.disease_id = fd.disease_id LEFT JOIN fertilizer_table ft ON ft.fertilizer_id = ft.fertilizer_id WHERE d.disease_id = ?;';
	sql = mysql.format(sql, disease_id);
	sql = mysql.format(sql, disease_id);
	sql = mysql.format(sql, disease_id);
	sql = mysql.format(sql, disease_id);
	sql = mysql.format(sql, disease_id);
	mysql.query(sql, next); return(sql);
}

exports.getDiseaseSolutions = function(disease_id, next){
	var sql ='SELECT *, st.solution_name as detail_name, st.solution_desc as detail_desc FROM disease_table p INNER JOIN solution_disease sp ON sp.disease_id = p.disease_id INNER JOIN solution_table st ON st.solution_id = sp.solution_id WHERE p.disease_id = ?';
	sql = mysql.format(sql, disease_id);
	mysql.query(sql, next); return(sql);
}

exports.getDiseasePreventions = function(disease_id, next){
	var sql = 'SELECT *, st.prevention_name as detail_name, st.prevention_desc as detail_desc FROM disease_table p INNER JOIN prevention_disease sp ON sp.disease_id = p.disease_id INNER JOIN prevention_table st ON st.prevention_id = sp.prevention_id WHERE p.disease_id = ?'
	sql = mysql.format(sql, disease_id);
	mysql.query(sql, next); return(sql);
}

exports.addDisease = function(disease, next){
	var sql = "INSERT INTO disease_table SET ?";
	sql = mysql.format(sql, disease);
	mysql.query(sql, next); return(sql);
}




//PEST AND DISEASE MANAGEMENT
exports.addNewPD = function(type, next){

};

exports.addNewPDRecommendation = function(reco, next){
	var sql = "INSERT INTO pd_recommendation SET ?";
	sql = mysql.format(sql, reco);
	mysql.query(sql, next); return(sql);

}

exports.getPestsBasedWeather = function(weather, next){
	var sql = "SELECT * FROM (SELECT p.pest_id, p.pest_name, wt.max_temp, wt.min_temp, wt.weather, wt.humidity, wt.precipitation, wt.soil_moisture FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id) a WHERE ";
	
	var first = false;
	if(weather.min_temp != null){
		first = true;
		sql = sql + "a.min_temp <= " + weather.min_temp;
	}
	if(weather.max_temp != null){
		if(first)
			sql = sql + "&& ";
		else
			first = true;
		sql = sql + "a.max_temp >= " + weather.max_temp;
	}
	if(weather.precipitation != null){
		if(first)
			sql = sql + "|| ";
		else
			first = true;
		sql = sql + " a.precipitation = " + weather.precipitation;
	}
	if(weather.humidity != null){
		if(first)
			sql = sql + "|| ";
		else
			first = true;
		sql = sql + " a.precipitation = " + weather.humidity;
	}
	sql = sql + " GROUP BY a.pest_name";

	mysql.query(sql, next); return(sql);
}

exports.getDiseaseBasedWeather = function(weather, next){
	var sql = "SELECT * FROM (SELECT p.disease_id, p.disease_name, wt.max_temp, wt.min_temp, wt.weather, wt.humidity, wt.precipitation, wt.soil_moisture FROM disease_table p INNER JOIN weather_disease wd ON p.disease_id = wd.disease_id INNER JOIN weather_table wt ON wt.weather_id = wd.weather_id) a WHERE ";
	
	var first = false;
	if(weather.min_temp != null){
		first = true;
		sql = sql + "a.min_temp <= " + weather.min_temp;
	}
	if(weather.max_temp != null){
		if(first)
			sql = sql + " && ";
		else
			first = true;
		sql = sql + "a.max_temp >= " + weather.max_temp;
	}
	if(weather.precipitation != null){
		if(first)
			sql = sql + " || ";
		else
			first = true;
		sql = sql + " a.precipitation = " + weather.precipitation;
	}
	if(weather.humidity != null){
		if(first)
			sql = sql + " || ";
		else
			first = true;
		sql = sql + " a.precipitation = " + weather.humidity;
	}
	// sql = sql + " GROUP BY a.disease_name";

	mysql.query(sql, next); return(sql);
}

exports.getPestPossibilities = function(weather, season, fertilizer, stage, next){
	select_qry = 'SELECT a.pest_id, a.pest_name, a.pest_desc, a.weather_id, a.max_temp, a.min_temp, a.weather, max(a.stage_name) as t_stage_name, max(a.avg_duration) as avg, max(a.stage_id) as stage_id, max(a.season_id) as season_id, max(a.season_name) as season_name, max(a.season_desc) as season_desc, max(a.fertilizer_id) as fertilizer_id, max(a.fertilizer_name) as fertilizer_name, max(fertilizer_desc) as fertilizer_desc  FROM (';
	weather_qry = 'SELECT p.pest_id, p.pest_name, p.pest_desc,wt.weather_id, wt.max_temp, wt.min_temp, wt.weather, wt.humidity, wt.precipitation, wt.soil_moisture,  null as stage_id, null as stage_name, null as avg_duration,null as season_id, null as season_name, null as season_desc, null as season_temp, null as season_humidity, null as fertilizer_id, null as fertilizer_name, null as fertilizer_desc FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	stages_qry = 'SELECT p.pest_id, p.pest_name,p.pest_desc, null as weather_id,null as max_temp, null as min_temp, null as weather, null as humidity, null as precipitation, null as soil_moisture, s.stage_id, s.stage_name, s.avg_duration,null as season_id, null as season_name, null as season_desc, null as season_temp, null as season_humidity, null as fertilizer_id, null as fertilizer_name, null as fertilizer_desc FROM pest_table p INNER JOIN stages_pest sp ON p.pest_id = sp.pest_id INNER JOIN stages s ON s.stage_id = sp.stage_id WHERE ';
	season_qry = 'SELECT p.pest_id, p.pest_name, p.pest_desc,null as weather_id,null as max_temp, null as min_temp, null as weather, null as humidity, null as precipitation, null as soil_moisture, null as stage_id, null as stage_name, null as avg_duration, s.season_id, s.season_name, s.season_desc, s.season_temp, s.season_humidity, null as fertilizer_id, null as fertilizer_name, null as fertilizer_desc FROM pest_table p INNER JOIN season_pest sp ON sp.pest_id = p.pest_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';
	fertilzier_qry = 'SELECT p.pest_id, p.pest_name, p.pest_desc, null as weather_id,null as max_temp, null as min_temp, null as weather, null as humidity, null as precipitation, null as soil_moisture, null as stage_id, null as stage_name, null as avg_duration, null as season_id, null as season_name, null as season_desc, null as season_temp, null as season_humidity, ft.fertilizer_id, ft.fertilizer_name, ft.fertilizer_desc FROM pest_table p INNER JOIN fertilizer_pest fp ON fp.pest_id = p.pest_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = fp.fertilizier_id WHERE ';
	end_qry = ') a group by a.pest_id;';

	sql = select_qry;
	first_table = false
	if(weather != null){
		first = false;
		first_table = true;
		sql = sql + weather_qry;
		if(weather.min_temp != null){
			first = true;
			sql = sql + "min_temp <= " + weather.min_temp;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " && ";
			else
				first = true;
			sql = sql + "max_temp >= " + weather.max_temp;
		}
		if(weather.precipitation != null){
			if(first)
				sql = sql + " || ";
			else
				first = true;
			sql = sql + " precipitation = " + weather.precipitation;
		}
		if(weather.humidity != null){
			if(first)
				sql = sql + " || ";
			else
				first = true;
			sql = sql + " humidity = " + weather.humidity;
		}		
	}

	if(season != null){
		first = false;
		if(first_table)
			sql = sql + " UNION ";
		else
			first_table = true;
		sql = sql + season_qry;
		if(season.season_temp != null){
			first = true;
			min = season.season_temp - 5;
			max = season.season_temp + 5;
			sql = sql + "season_temp >= " + min;
			sql = sql + " && season_temp <= " + max;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " || ";
			else
				first = true;
			sql = sql + " season_humidity >= " + season.season_humidity;
		}	
	}

	if(stage != null){
		first = false;
		if(first_table)
			sql = sql + " UNION ";
		else
			first_table = true;
		sql = sql + stages_qry;
		if(stage.stage_name != null){
			first = true;
		sql = sql + " ? ";
		sql = mysql.format(sql, stage);
			
		}
	}

	// if(farmtype == null){
		
	// }
	sql = sql + end_qry;

	mysql.query(sql, next); return(sql);
}

exports.getDiseasePossibilities = function(weather, season, fertilizer, stage, next){
	select_qry = 'SELECT a.disease_id, a.disease_name, a.disease_desc, a.weather_id, a.max_temp, a.min_temp, a.weather, max(a.stage_name) as t_stage_name, max(a.avg_duration) as avg, max(a.stage_id) as stage_id, max(a.season_id) as season_id, max(a.season_name) as season_name, max(a.season_desc) as season_desc, max(a.fertilizer_id) as fertilizer_id, max(a.fertilizer_name) as fertilizer_name, max(fertilizer_desc) as fertilizer_desc  FROM (';
	weather_qry = 'SELECT p.disease_id, p.disease_name, p.disease_desc,wt.weather_id, wt.max_temp, wt.min_temp, wt.weather, wt.humidity, wt.precipitation, wt.soil_moisture,  null as stage_id, null as stage_name, null as avg_duration,null as season_id, null as season_name, null as season_desc, null as season_temp, null as season_humidity, null as fertilizer_id, null as fertilizer_name, null as fertilizer_desc FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	stages_qry = 'SELECT p.disease_id, p.disease_name,p.disease_desc, null as weather_id,null as max_temp, null as min_temp, null as weather, null as humidity, null as precipitation, null as soil_moisture, s.stage_id, s.stage_name, s.avg_duration,null as season_id, null as season_name, null as season_desc, null as season_temp, null as season_humidity, null as fertilizer_id, null as fertilizer_name, null as fertilizer_desc FROM disease_table p INNER JOIN stages_disease sp ON p.disease_id = sp.disease_id INNER JOIN stages s ON s.stage_id = sp.stage_id WHERE ';
	season_qry = 'SELECT p.disease_id, p.disease_name, p.disease_desc,null as weather_id,null as max_temp, null as min_temp, null as weather, null as humidity, null as precipitation, null as soil_moisture, null as stage_id, null as stage_name, null as avg_duration, s.season_id, s.season_name, s.season_desc, s.season_temp, s.season_humidity, null as fertilizer_id, null as fertilizer_name, null as fertilizer_desc FROM disease_table p INNER JOIN season_disease sp ON sp.disease_id = p.disease_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';
	fertilzier_qry = 'SELECT p.disease_id, p.disease_name, p.disease_desc, null as weather_id,null as max_temp, null as min_temp, null as weather, null as humidity, null as precipitation, null as soil_moisture, null as stage_id, null as stage_name, null as avg_duration, null as season_id, null as season_name, null as season_desc, null as season_temp, null as season_humidity, ft.fertilizer_id, ft.fertilizer_name, ft.fertilizer_desc FROM disease_table p INNER JOIN fertilizer_disease fp ON fp.disease_id = p.disease_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = fp.fertilizier_id WHERE ';
	end_qry = ') a group by a.disease_id;';

	sql = select_qry;
	first_table = false
	if(weather != null){
		first = false;
		first_table = true;
		sql = sql + weather_qry;
		if(weather.min_temp != null){
			first = true;
			sql = sql + "min_temp <= " + weather.min_temp;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " && ";
			else
				first = true;
			sql = sql + "max_temp >= " + weather.max_temp;
		}
		if(weather.precipitation != null){
			if(first)
				sql = sql + " || ";
			else
				first = true;
			sql = sql + " precipitation = " + weather.precipitation;
		}
		if(weather.humidity != null){
			if(first)
				sql = sql + " || ";
			else
				first = true;
			sql = sql + " humidity = " + weather.humidity;
		}		
	}

	if(season != null){
		first = false;
		if(first_table)
			sql = sql + " UNION ";
		else
			first_table = true;
		sql = sql + season_qry;
		if(season.season_temp != null){
			first = true;
			min = season.season_temp - 5;
			max = season.season_temp + 5;
			sql = sql + "season_temp >= " + min;
			sql = sql + " && season_temp <= " + max;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " || ";
			else
				first = true;
			sql = sql + " season_humidity >= " + season.season_humidity;
		}	
	}

	if(stage != null){
		first = false;
		if(first_table)
			sql = sql + " UNION ";
		else
			first_table = true;
		sql = sql + stages_qry;
		if(stage.stage_name != null){
			first = true;
		sql = sql + " ? ";
		sql = mysql.format(sql, stage);
			
		}
	}


	sql = sql + end_qry;

	mysql.query(sql, next); return(sql);

}

//Gets probability of pests occuring based on number of symptoms matched with current factors
exports.getPestProbability = function(weather, season, fertilizer, stage, next){
	sql = "";
	start = "SELECT a.pest_id, a.pest_name, COUNT(a.pest_id) as count FROM (";
	end = ") a GROUP BY a.pest_id ORDER BY COUNT(a.pest_id) DESC;";
	weather_temp = 'SELECT p.pest_id, p.pest_name, "Weather temp" AS factor, (wt.min_temp + wt.max_temp) / 2 AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_humidity = 'SELECT p.pest_id, p.pest_name, "Weather humidity" AS factor, wt.humidity AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_precipitation = 'SELECT p.pest_id, p.pest_name, "Weather precipitation" AS factor, wt.precipitation AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_soil_moisture = 'SELECT p.pest_id, p.pest_name, "Weather soil moisture" AS factor, wt.soil_moisture AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';

	season_temp = 'SELECT p.pest_id, p.pest_name, "Season temp" AS factor, s.season_temp AS value FROM pest_table p INNER JOIN season_pest sp ON sp.pest_id = p.pest_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';
	season_humidity = 'SELECT p.pest_id, p.pest_name, "Season humidity" AS factor, s.season_humidity AS value FROM pest_table p INNER JOIN season_pest sp ON sp.pest_id = p.pest_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';

	stages_qry = 'SELECT p.pest_id, p.pest_name, "Stage" AS factor, s.stage_name AS value FROM pest_table p INNER JOIN stages_pest sp ON p.pest_id = sp.pest_id INNER JOIN stages s ON s.stage_id = sp.stage_id WHERE ';

	fertilzier_qry = 'SELECT p.pest_id, p.pest_name, "Stage" AS factor, s.stage_name AS value FROM pest_table p INNER JOIN fertilizer_pest fp ON fp.pest_id = p.pest_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = fp.fertilizier_id WHERE ';

	sql = start;
	first = false;

	//WEATHER
	if(weather.min_temp != null && weather.max_temp != null){
		sql = sql + weather_temp;

		if(weather.min_temp != null){
			first = true;
			sql = sql + " min_temp <= " + weather.min_temp;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " && ";
			else
				first = true;
			sql = sql + " max_temp >= " + weather.max_temp;
		}
		first = true;
	}

	if(weather.humidity != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + weather_humidity;
		sql = sql + " humidity = " + weather.humidity;
	}
	if(weather.precipitation != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_precipitation;
		sql = sql + " precipitation - 5 <= " + weather.precipitation + " && precipitation + 5 >= " + weather.precipitation;
	}
	if(weather.soil_moisture != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_soil_moisture;
		sql = sql + " soil_moisture = " + weather.soil_moisture;
	}

	//SEASON
	if(season.season_temp != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_temp;
		sql = sql + " season_temp - 5 <= " + season.season_temp + " && season_temp + 5 >= " + season.season_temp;
			
	}

	if(season.season_humidity != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_humidity;
		sql = sql + " season_humidity - 5 <= " + season.season_humidity + " && season_humidity + 5 >= " + season.season_humidity;
			
	}


	//STAGE
	if(stage.stage_name != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		
		sql = sql + stages_qry;
		sql = sql + " s.stage_name = '" + stage.stage_name + "'";
	}


	sql = sql + end;

	mysql.query(sql, next); return(sql);

}

//Gets probability of disease occuring based on number of symptoms matched with current factors
exports.getDiseaseProbability = function(weather, season, fertilizer, stage, next){
	sql = "";
	start = "SELECT a.disease_id, a.disease_name, COUNT(a.disease_id) as count FROM (";
	end = ") a GROUP BY a.disease_id ORDER BY COUNT(a.disease_id) DESC;";
	weather_temp = 'SELECT p.disease_id, p.disease_name, "Weather temp" AS factor, (wt.min_temp + wt.max_temp) / 2 AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_humidity = 'SELECT p.disease_id, p.disease_name, "Weather humidity" AS factor, wt.humidity AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_precipitation = 'SELECT p.disease_id, p.disease_name, "Weather precipitation" AS factor, wt.precipitation AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_soil_moisture = 'SELECT p.disease_id, p.disease_name, "Weather soil moisture" AS factor, wt.soil_moisture AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';

	season_temp = 'SELECT p.disease_id, p.disease_name, "Season temp" AS factor, s.season_temp AS value FROM disease_table p INNER JOIN season_disease sp ON sp.disease_id = p.disease_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';
	season_humidity = 'SELECT p.disease_id, p.disease_name, "Season humidity" AS factor, s.season_humidity AS value FROM disease_table p INNER JOIN season_disease sp ON sp.disease_id = p.disease_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';

	stages_qry = 'SELECT p.disease_id, p.disease_name, "Stage" AS factor, s.stage_name AS value FROM disease_table p INNER JOIN stages_disease sp ON p.disease_id = sp.disease_id INNER JOIN stages s ON s.stage_id = sp.stage_id WHERE ';

	fertilzier_qry = 'SELECT p.disease_id, p.disease_name, "Stage" AS factor, s.stage_name AS value FROM disease_table p INNER JOIN fertilizer_disease fp ON fp.disease_id = p.disease_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = fp.fertilizier_id WHERE ';

	sql = start;
	first = false;

	//WEATHER
	if(weather.min_temp != null && weather.max_temp != null){
		sql = sql + weather_temp;

		if(weather.min_temp != null){
			first = true;
			sql = sql + " min_temp <= " + weather.min_temp;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " && ";
			else
				first = true;
			sql = sql + " max_temp >= " + weather.max_temp;
		}
		first = true;
	}

	if(weather.humidity != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + weather_humidity;
		sql = sql + " humidity = " + weather.humidity;
	}
	if(weather.precipitation != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_precipitation;
		sql = sql + " precipitation - 5 <= " + weather.precipitation + " && precipitation + 5 >= " + weather.precipitation;
	}
	if(weather.soil_moisture != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_soil_moisture;
		sql = sql + " soil_moisture = " + weather.soil_moisture;
	}

	//SEASON
	if(season.season_temp != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_temp;
		sql = sql + " season_temp - 5 <= " + season.season_temp + " && season_temp + 5 >= " + season.season_temp;
			
	}

	if(season.season_humidity != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_humidity;
		sql = sql + " season_humidity - 5 <= " + season.season_humidity + " && season_humidity + 5 >= " + season.season_humidity;
			
	}


	//STAGE
	if(stage.stage_name != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		
		sql = sql + stages_qry;
		sql = sql + " s.stage_name = '" + stage.stage_name + "'";
	}


	sql = sql + end;

	mysql.query(sql, next); return(sql);

}

exports.getPestProbabilityPercentage = function(weather, season, farmtype, stage, next){
	sql = "";
	start = "SELECT 'Pest' as type, a.pest_id as pd_id, a.pest_name as pd_name, a.pest_desc as pd_desc, COUNT(a.pest_id) AS count, b.factor_count AS factor_count, ROUND(COUNT(a.pest_id) /  10* 100,2) AS probability FROM (";
	end = ") a ";
	weather_temp = 'SELECT p.pest_id, p.pest_name, p.pest_desc, "Weather temp" AS factor, (wt.min_temp + wt.max_temp) / 2 AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_humidity = 'SELECT p.pest_id, p.pest_name, p.pest_desc,"Weather humidity" AS factor, wt.humidity AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_precipitation = 'SELECT p.pest_id, p.pest_name, p.pest_desc,"Weather precipitation" AS factor, wt.precipitation AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_soil_moisture = 'SELECT p.pest_id, p.pest_name, p.pest_desc,"Weather soil moisture" AS factor, wt.soil_moisture AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';

	season_temp = 'SELECT p.pest_id, p.pest_name, p.pest_desc,"Season temp" AS factor, s.season_temp AS value FROM pest_table p INNER JOIN season_pest sp ON sp.pest_id = p.pest_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';
	season_humidity = 'SELECT p.pest_id, p.pest_name, p.pest_desc,"Season humidity" AS factor, s.season_humidity AS value FROM pest_table p INNER JOIN season_pest sp ON sp.pest_id = p.pest_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';

	stages_qry = 'SELECT p.pest_id, p.pest_name, p.pest_desc, "Stage" AS factor, s.stage_name AS value FROM pest_table p INNER JOIN stages_pest sp ON p.pest_id = sp.pest_id INNER JOIN stages s ON s.stage_id = sp.stage_id WHERE ';

	farmtype_qry = 'SELECT p.pest_id, p.pest_name, p.pest_desc, "Farmtype" AS factor, ft.farm_type AS value FROM pest_table p INNER JOIN farmtypes_pest fp ON fp.pest_id = p.pest_id INNER JOIN farm_types ft ON ft.farm_type_id = fp.farm_type_id WHERE ';

	sql = start;
	first = false;

	//WEATHER
	if(weather.min_temp != null && weather.max_temp != null){
		sql = sql + weather_temp;

		if(weather.min_temp != null){
			first = true;
			sql = sql + " min_temp <= " + weather.min_temp;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " && ";
			else
				first = true;
			sql = sql + " max_temp >= " + weather.max_temp;
		}
		first = true;
	}

	if(weather.humidity != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + weather_humidity;
		sql = sql + " humidity = " + weather.humidity;
	}
	if(weather.precipitation != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_precipitation;
		sql = sql + " precipitation - 5 <= " + weather.precipitation + " && precipitation + 5 >= " + weather.precipitation;
	}
	if(weather.soil_moisture != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_soil_moisture;
		sql = sql + " soil_moisture = " + weather.soil_moisture;
	}

	//SEASON
	if(season.season_temp != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_temp;
		sql = sql + " season_temp - 5 <= " + season.season_temp + " && season_temp + 5 >= " + season.season_temp;
			
	}

	if(season.season_humidity != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_humidity;
		sql = sql + " season_humidity - 5 <= " + season.season_humidity + " && season_humidity + 5 >= " + season.season_humidity;
			
	}


	//STAGE
	if(stage.stage_name != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		
		sql = sql + stages_qry;
		sql = sql + " s.stage_name = '" + stage.stage_name + "'";
	}


	//FARMTYPE
	if(farmtype.length != 0){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		var i;
		sql = sql + farmtype_qry;
		for(i = 0; i < farmtype.length; i++){
			if(i != 0  )
				sql = sql + " || ";
			sql = sql + " farm_type = '" + farmtype[i] + "'";
		}
	}

	sql = sql + end;


	var sql2 = ' INNER JOIN (SELECT a.pest_id, a.pest_name, COUNT(a.pest_id) AS factor_count FROM (SELECT p.pest_id, p.pest_name, wt.weather as factor, wt.weather_desc as description, "weather" as type FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id UNION SELECT p.pest_id, p.pest_name, s.season_name as factor, s.season_desc as description, "season" as type FROM pest_table p INNER JOIN season_pest sp ON p.pest_id = sp.pest_id INNER JOIN seasons s ON s.season_id = sp.season_pest UNION SELECT p.pest_id, p.pest_name, s.stage_name as factor, s.stage_desc as description, "stage" as type FROM pest_table p INNER JOIN stages_pest sp ON sp.pest_id = p.pest_id INNER JOIN stages s ON s.stage_id = sp.stages_pest_id UNION SELECT p.pest_id, p.pest_name, ft.farm_type as factor, ft.farm_type_desc as description, "farm type" as type FROM pest_table p INNER JOIN farmtypes_pest ftp ON p.pest_id = ftp.pest_id INNER JOIN farm_types ft ON ft.farm_type_id = ftp.farm_type_id UNION SELECT p.pest_id, p.pest_name, ft.fertilizer_name as factor, ft.fertilizer_desc as description, "fertilizer" as type FROM pest_table p INNER JOIN fertilizer_pest fp ON p.pest_id = fp.pest_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = ft.fertilizer_id) a GROUP BY pest_id) b ON a.pest_id = b.pest_id GROUP BY a.pest_id ORDER BY probability DESC;';

	sql = sql + sql2;

	mysql.query(sql, next); return(sql);
}

exports.getDiseaseProbabilityPercentage = function(weather, season, farmtype, stage, next){
	sql = "";
	start = "SELECT 'Disease' as type, a.disease_id as pd_id, a.disease_name as pd_name, a.disease_desc as pd_desc, COUNT(a.disease_id) AS count, b.factor_count AS factor_count, ROUND(COUNT(a.disease_id) /  10* 100,2) AS probability FROM (";
	end = ") a ";
	weather_temp = 'SELECT p.disease_id, p.disease_name, p.disease_desc, "Weather temp" AS factor, (wt.min_temp + wt.max_temp) / 2 AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_humidity = 'SELECT p.disease_id, p.disease_name, p.disease_desc, "Weather humidity" AS factor, wt.humidity AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_precipitation = 'SELECT p.disease_id, p.disease_name, p.disease_desc, "Weather precipitation" AS factor, wt.precipitation AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_soil_moisture = 'SELECT p.disease_id, p.disease_name,p.disease_desc,  "Weather soil moisture" AS factor, wt.soil_moisture AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';

	season_temp = 'SELECT p.disease_id, p.disease_name, p.disease_desc, "Season temp" AS factor, s.season_temp AS value FROM disease_table p INNER JOIN season_disease sp ON sp.disease_id = p.disease_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';
	season_humidity = 'SELECT p.disease_id, p.disease_name, p.disease_desc, "Season humidity" AS factor, s.season_humidity AS value FROM disease_table p INNER JOIN season_disease sp ON sp.disease_id = p.disease_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';

	stages_qry = 'SELECT p.disease_id, p.disease_name, p.disease_desc, "Stage" AS factor, s.stage_name AS value FROM disease_table p INNER JOIN stages_disease sp ON p.disease_id = sp.disease_id INNER JOIN stages s ON s.stage_id = sp.stage_id WHERE ';

	farmtype_qry = 'SELECT p.disease_id, p.disease_name, p.disease_desc, "Farmtype" AS factor, ft.farm_type AS value FROM disease_table p INNER JOIN farm_types_disease fp ON fp.disease_id = p.disease_id INNER JOIN farm_types ft ON ft.farm_type_id = fp.farm_type_id WHERE';

	sql = start;
	first = false;

	//WEATHER
	if(weather.min_temp != null && weather.max_temp != null){
		sql = sql + weather_temp;

		if(weather.min_temp != null){
			first = true;
			sql = sql + " min_temp <= " + weather.min_temp;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " && ";
			else
				first = true;
			sql = sql + " max_temp >= " + weather.max_temp;
		}
		first = true;
	}

	if(weather.humidity != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + weather_humidity;
		sql = sql + " humidity = " + weather.humidity;
	}
	if(weather.precipitation != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_precipitation;
		sql = sql + " precipitation - 5 <= " + weather.precipitation + " && precipitation + 5 >= " + weather.precipitation;
	}
	if(weather.soil_moisture != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_soil_moisture;
		sql = sql + " soil_moisture = " + weather.soil_moisture;
	}

	//SEASON
	if(season.season_temp != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_temp;
		sql = sql + " season_temp - 5 <= " + season.season_temp + " && season_temp + 5 >= " + season.season_temp;
			
	}

	if(season.season_humidity != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_humidity;
		sql = sql + " season_humidity - 5 <= " + season.season_humidity + " && season_humidity + 5 >= " + season.season_humidity;
			
	}


	//STAGE
	if(stage.stage_name != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		
		sql = sql + stages_qry;
		sql = sql + " s.stage_name = '" + stage.stage_name + "'";
	}

	//FARMTYPE
	if(farmtype.length != 0){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		var i;
		sql = sql + farmtype_qry;
		for(i = 0; i < farmtype.length; i++){
			if(i != 0  )
				sql = sql + " || ";
			sql = sql + " farm_type = '" + farmtype[i] + "'";
		}
	}
	sql = sql + end;


	var sql2 = ' INNER JOIN (SELECT a.disease_id, a.disease_name, COUNT(a.disease_id) AS factor_count FROM (SELECT p.disease_id, p.disease_name, wt.weather as factor, wt.weather_desc as description, "weather" as type FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id UNION SELECT p.disease_id, p.disease_name, s.season_name as factor, s.season_desc as description, "season" as type FROM disease_table p INNER JOIN season_disease sp ON p.disease_id = sp.disease_id INNER JOIN seasons s ON s.season_id = sp.season_id UNION SELECT p.disease_id, p.disease_name, s.stage_name as factor, s.stage_desc as description, "stage" as type FROM disease_table p INNER JOIN stages_disease sp ON sp.disease_id = p.disease_id INNER JOIN stages s ON s.stage_id = sp.stages_disease_id UNION SELECT p.disease_id, p.disease_name, ft.farm_type as factor, ft.farm_type_desc as description, "farm type" as type FROM disease_table p INNER JOIN farm_types_disease ftp ON p.disease_id = ftp.disease_id INNER JOIN farm_types ft ON ft.farm_type_id = ftp.farm_type_id UNION SELECT p.disease_id, p.disease_name, ft.fertilizer_name as factor, ft.fertilizer_desc as description, "fertilizer" as type FROM disease_table p INNER JOIN fertilizer_disease fp ON p.disease_id = fp.disease_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = ft.fertilizer_id) a GROUP BY disease_id) b ON a.disease_id = b.disease_id GROUP BY a.disease_id ORDER BY probability DESC;';

	sql = sql + sql2;

	mysql.query(sql, next); return(sql);

}

exports.getPDProbabilityPercentage = function(weather, season, farmtype, stage, next){
	sql = "";
	start = "(SELECT a.disease_id as pd_id, a.disease_name as pd_name, 'Disease' as type, COUNT(a.disease_id) AS count, b.factor_count AS factor_count, ROUND(COUNT(a.disease_id) /  10* 100,2) AS probability FROM (";
	end = ") a ";
	weather_temp = 'SELECT p.disease_id, p.disease_name, "Weather temp" AS factor, (wt.min_temp + wt.max_temp) / 2 AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_humidity = 'SELECT p.disease_id, p.disease_name, "Weather humidity" AS factor, wt.humidity AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_precipitation = 'SELECT p.disease_id, p.disease_name, "Weather precipitation" AS factor, wt.precipitation AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_soil_moisture = 'SELECT p.disease_id, p.disease_name, "Weather soil moisture" AS factor, wt.soil_moisture AS value FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';

	season_temp = 'SELECT p.disease_id, p.disease_name, "Season temp" AS factor, s.season_temp AS value FROM disease_table p INNER JOIN season_disease sp ON sp.disease_id = p.disease_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';
	season_humidity = 'SELECT p.disease_id, p.disease_name, "Season humidity" AS factor, s.season_humidity AS value FROM disease_table p INNER JOIN season_disease sp ON sp.disease_id = p.disease_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';

	stages_qry = 'SELECT p.disease_id, p.disease_name, "Stage" AS factor, s.stage_name AS value FROM disease_table p INNER JOIN stages_disease sp ON p.disease_id = sp.disease_id INNER JOIN stages s ON s.stage_id = sp.stage_id WHERE ';

	farmtype_qry = 'SELECT p.disease_id, p.disease_name, "Farmtype" AS factor, ft.farm_type AS value FROM disease_table p INNER JOIN farm_types_disease fp ON fp.disease_id = p.disease_id INNER JOIN farm_types ft ON ft.farm_type_id = fp.farm_type_id WHERE';

	sql = start;
	first = false;

	//WEATHER
	if(weather.min_temp != null && weather.max_temp != null){
		sql = sql + weather_temp;

		if(weather.min_temp != null){
			first = true;
			sql = sql + " min_temp <= " + weather.min_temp;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " && ";
			else
				first = true;
			sql = sql + " max_temp >= " + weather.max_temp;
		}
		first = true;
	}

	if(weather.humidity != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + weather_humidity;
		sql = sql + " humidity = " + weather.humidity;
	}
	if(weather.precipitation != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_precipitation;
		sql = sql + " precipitation - 5 <= " + weather.precipitation + " && precipitation + 5 >= " + weather.precipitation;
	}
	if(weather.soil_moisture != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_soil_moisture;
		sql = sql + " soil_moisture = " + weather.soil_moisture;
	}

	//SEASON
	if(season.season_temp != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_temp;
		sql = sql + " season_temp - 5 <= " + season.season_temp + " && season_temp + 5 >= " + season.season_temp;
			
	}

	if(season.season_humidity != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_humidity;
		sql = sql + " season_humidity - 5 <= " + season.season_humidity + " && season_humidity + 5 >= " + season.season_humidity;
			
	}


	//STAGE
	if(stage.stage_name != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		
		sql = sql + stages_qry;
		sql = sql + " s.stage_name = '" + stage.stage_name + "'";
	}

	//FARMTYPE
	if(farmtype.length != 0){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		var i;
		sql = sql + farmtype_qry;
		for(i = 0; i < farmtype.length; i++){
			if(i != 0  )
				sql = sql + " || ";
			sql = sql + " farm_type = '" + farmtype[i] + "'";
		}
	}
	sql = sql + end;


	var sql2 = ' INNER JOIN (SELECT a.disease_id, a.disease_name, COUNT(a.disease_id) AS factor_count FROM (SELECT p.disease_id, p.disease_name, wt.weather as factor, wt.weather_desc as description, "weather" as type FROM disease_table p INNER JOIN weather_disease wp ON p.disease_id = wp.disease_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id UNION SELECT p.disease_id, p.disease_name, s.season_name as factor, s.season_desc as description, "season" as type FROM disease_table p INNER JOIN season_disease sp ON p.disease_id = sp.disease_id INNER JOIN seasons s ON s.season_id = sp.season_id UNION SELECT p.disease_id, p.disease_name, s.stage_name as factor, s.stage_desc as description, "stage" as type FROM disease_table p INNER JOIN stages_disease sp ON sp.disease_id = p.disease_id INNER JOIN stages s ON s.stage_id = sp.stages_disease_id UNION SELECT p.disease_id, p.disease_name, ft.farm_type as factor, ft.farm_type_desc as description, "farm type" as type FROM disease_table p INNER JOIN farm_types_disease ftp ON p.disease_id = ftp.disease_id INNER JOIN farm_types ft ON ft.farm_type_id = ftp.farm_type_id UNION SELECT p.disease_id, p.disease_name, ft.fertilizer_name as factor, ft.fertilizer_desc as description, "fertilizer" as type FROM disease_table p INNER JOIN fertilizer_disease fp ON p.disease_id = fp.disease_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = ft.fertilizer_id) a GROUP BY disease_id) b ON a.disease_id = b.disease_id GROUP BY a.disease_id ORDER BY probability DESC ';

	sql = sql + sql2;
	sql = sql + ") UNION ";


//==============================UNION=================================//

	start = "(SELECT a.pest_id as pd_id, a.pest_name as pd_name, 'Pest' as type, COUNT(a.pest_id) AS count, b.factor_count AS factor_count, ROUND(COUNT(a.pest_id) /  10* 100,2) AS probability FROM (";
	end = ") a ";
	weather_temp = 'SELECT p.pest_id, p.pest_name, "Weather temp" AS factor, (wt.min_temp + wt.max_temp) / 2 AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_humidity = 'SELECT p.pest_id, p.pest_name, "Weather humidity" AS factor, wt.humidity AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_precipitation = 'SELECT p.pest_id, p.pest_name, "Weather precipitation" AS factor, wt.precipitation AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';
	weather_soil_moisture = 'SELECT p.pest_id, p.pest_name, "Weather soil moisture" AS factor, wt.soil_moisture AS value FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id WHERE ';

	season_temp = 'SELECT p.pest_id, p.pest_name, "Season temp" AS factor, s.season_temp AS value FROM pest_table p INNER JOIN season_pest sp ON sp.pest_id = p.pest_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';
	season_humidity = 'SELECT p.pest_id, p.pest_name, "Season humidity" AS factor, s.season_humidity AS value FROM pest_table p INNER JOIN season_pest sp ON sp.pest_id = p.pest_id INNER JOIN seasons s ON s.season_id = sp.season_id WHERE ';

	stages_qry = 'SELECT p.pest_id, p.pest_name, "Stage" AS factor, s.stage_name AS value FROM pest_table p INNER JOIN stages_pest sp ON p.pest_id = sp.pest_id INNER JOIN stages s ON s.stage_id = sp.stage_id WHERE ';

	farmtype_qry = 'SELECT p.pest_id, p.pest_name, "Farmtype" AS factor, ft.farm_type AS value FROM pest_table p INNER JOIN farmtypes_pest fp ON fp.pest_id = p.pest_id INNER JOIN farm_types ft ON ft.farm_type_id = fp.farm_type_id WHERE ';

	sql = sql + start;
	first = false;

	//WEATHER
	if(weather.min_temp != null && weather.max_temp != null){
		sql = sql + weather_temp;

		if(weather.min_temp != null){
			first = true;
			sql = sql + " min_temp <= " + weather.min_temp;
		}
		if(weather.max_temp != null){
			if(first)
				sql = sql + " && ";
			else
				first = true;
			sql = sql + " max_temp >= " + weather.max_temp;
		}
		first = true;
	}

	if(weather.humidity != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + weather_humidity;
		sql = sql + " humidity = " + weather.humidity;
	}
	if(weather.precipitation != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_precipitation;
		sql = sql + " precipitation - 5 <= " + weather.precipitation + " && precipitation + 5 >= " + weather.precipitation;
	}
	if(weather.soil_moisture != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;

		sql = sql + weather_soil_moisture;
		sql = sql + " soil_moisture = " + weather.soil_moisture;
	}

	//SEASON
	if(season.season_temp != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_temp;
		sql = sql + " season_temp - 5 <= " + season.season_temp + " && season_temp + 5 >= " + season.season_temp;
			
	}

	if(season.season_humidity != null){
		
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		sql = sql + season_humidity;
		sql = sql + " season_humidity - 5 <= " + season.season_humidity + " && season_humidity + 5 >= " + season.season_humidity;
			
	}


	//STAGE
	if(stage.stage_name != null){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		
		sql = sql + stages_qry;
		sql = sql + " s.stage_name = '" + stage.stage_name + "'";
	}

	

	//FARMTYPE
	if(farmtype.length != 0){
		if(first)
			sql = sql + " UNION ";
		else
			first = true;
		var i;
		sql = sql + farmtype_qry;
		for(i = 0; i < farmtype.length; i++){
			if(i != 0  )
				sql = sql + " || ";
			sql = sql + " farm_type = '" + farmtype[i] + "'";
		}
	}

	sql = sql + end;
	var sql2 = ' INNER JOIN (SELECT a.pest_id, a.pest_name, COUNT(a.pest_id) AS factor_count FROM (SELECT p.pest_id, p.pest_name, wt.weather as factor, wt.weather_desc as description, "weather" as type FROM pest_table p INNER JOIN weather_pest wp ON p.pest_id = wp.pest_id INNER JOIN weather_table wt ON wt.weather_id = wp.weather_id UNION SELECT p.pest_id, p.pest_name, s.season_name as factor, s.season_desc as description, "season" as type FROM pest_table p INNER JOIN season_pest sp ON p.pest_id = sp.pest_id INNER JOIN seasons s ON s.season_id = sp.season_pest UNION SELECT p.pest_id, p.pest_name, s.stage_name as factor, s.stage_desc as description, "stage" as type FROM pest_table p INNER JOIN stages_pest sp ON sp.pest_id = p.pest_id INNER JOIN stages s ON s.stage_id = sp.stages_pest_id UNION SELECT p.pest_id, p.pest_name, ft.farm_type as factor, ft.farm_type_desc as description, "farm type" as type FROM pest_table p INNER JOIN farmtypes_pest ftp ON p.pest_id = ftp.pest_id INNER JOIN farm_types ft ON ft.farm_type_id = ftp.farm_type_id UNION SELECT p.pest_id, p.pest_name, ft.fertilizer_name as factor, ft.fertilizer_desc as description, "fertilizer" as type FROM pest_table p INNER JOIN fertilizer_pest fp ON p.pest_id = fp.pest_id INNER JOIN fertilizer_table ft ON ft.fertilizer_id = ft.fertilizer_id) a GROUP BY pest_id) b ON a.pest_id = b.pest_id GROUP BY a.pest_id ORDER BY probability DESC';


	sql = sql + sql2 + ") ORDER BY probability DESC";

	mysql.query(sql, next); return(sql);
}

exports.getDiagnosisDetails = function(diagnosis_id, next){
	var sql = "";
	var pest_diagnosis = 'SELECT * FROM (SELECT d.*, pt.pest_name as name, pt.pest_desc as description, cct.crop_plan, ft.farm_name FROM diagnosis d INNER JOIN pest_table pt ON pt.pest_id = d.pd_id  LEFT JOIN crop_calendar_table cct ON d.calendar_id = cct.calendar_id INNER JOIN farm_table ft ON ft.farm_id = d.farm_id WHERE type = "Pest" ';
	var disease_diagnosis = ' SELECT d.*, pt.disease_name as name, pt.disease_desc as description, cct.crop_plan, ft.farm_name FROM diagnosis d INNER JOIN disease_table pt ON pt.disease_id = d.pd_id LEFT JOIN crop_calendar_table cct ON d.calendar_id = cct.calendar_id INNER JOIN farm_table ft ON ft.farm_id = d.farm_id WHERE type = "Disease") a';
	sql = pest_diagnosis + " UNION " + disease_diagnosis + " WHERE diagnosis_id = ?;";
	sql = mysql.format(sql, diagnosis_id);

	mysql.query(sql, next); return(sql);
}


exports.getDiagnosis = function(farm_id, type, next){
	var sql = "";
	var pest_diagnosis = 'SELECT d.*, pt.pest_name as name, pt.pest_desc as description, cct.crop_plan, ft.farm_name, "Pest" as type FROM diagnosis d INNER JOIN pest_table pt ON pt.pest_id = d.pd_id  LEFT JOIN crop_calendar_table cct ON d.calendar_id = cct.calendar_id INNER JOIN farm_table ft ON ft.farm_id = d.farm_id WHERE type = "Pest"';
	var disease_diagnosis = 'SELECT d.*, pt.disease_name as name, pt.disease_desc as description, cct.crop_plan, ft.farm_name, "Disease" as type FROM diagnosis d INNER JOIN disease_table pt ON pt.disease_id = d.pd_id LEFT JOIN crop_calendar_table cct ON d.calendar_id = cct.calendar_id INNER JOIN farm_table ft ON ft.farm_id = d.farm_id WHERE type = "Disease"';

	if(farm_id == null){
		
	}
	else{

		pest_diagnosis = pest_diagnosis + " && d.farm_id = ? ";
		pest_diagnosis = mysql.format(pest_diagnosis, farm_id.farm_id);
		disease_diagnosis = disease_diagnosis + " && d.farm_id = ? ";
		disease_diagnosis = mysql.format(disease_diagnosis, farm_id.farm_id);
	}

	if(type == null){
		sql = pest_diagnosis + " UNION " + disease_diagnosis;
	}
	else if(type == "Pest")
		sql = pest_diagnosis;
	else if(type == "Disease")
		sql = disease_diagnosis;

	mysql.query(sql, next); return(sql);
}

exports.testFunc = function(next){
	mysql.query("SELECT * FROM pest_table", next);
	return("SELECT * FROM pest_table");
}

exports.getPDDetails = function(type, pd_id, detail_type, next){
	if(type == "Pest"){
		if(detail_type == "Factors")
			mysql.query(this.getPestFactors(pd_id), next);
		else if(detail_type == "Symptoms")
			mysql.query(this.getPestSymptoms(pd_id), next);
		else if(detail_type == "Solutions")
			mysql.query(this.getPestSolutions(pd_id), next);
		else if(detail_type == "Preventions")
			mysql.query(this.getPestPreventions(pd_id), next);
	}
	else if(type == "Disease"){
		if(detail_type == "Factors")
			mysql.query(this.getDiseaseFactors(pd_id), next);
		else if(detail_type == "Symptoms")
			mysql.query(this.getDiseaseSymptoms(pd_id), next);
		else if(detail_type == "Solutions")
			mysql.query(this.getDiseaseSolutions(pd_id), next);
		else if(detail_type == "Preventions")
			mysql.query(this.getDiseasePreventions(pd_id), next);
	}
	
	
}

exports.addDiagnosis = function(diagnosis, next){
	var sql = "INSERT INTO diagnosis SET ?";
	sql = mysql.format(sql, diagnosis);

	mysql.query(sql, next); return(sql);
}

exports.getDiagnosisSymptoms = function(diagnosis_id, next){
	var sql = "SELECT d.*, st.symptom_id, st.symptom_name, st.symptom_desc FROM diagnosis d INNER JOIN diagnosis_symptom ds ON d.diagnosis_id = ds.diagnosis_id INNER JOIN symptoms_table st ON st.symptom_id = ds.symptom_id WHERE d.diagnosis_id = ?";
	sql = mysql.format(sql, diagnosis_id);

	mysql.query(sql, next); return(sql);
}

exports.getPossibilitiesBasedOnSymptoms = function(symptom_ids, next){
	var pest_qry = 'SELECT st.symptom_id, st.symptom_name as detail_name, st.symptom_desc as detail_desc, p.pest_id as pd_id, p.pest_name as pd_name, "Pest" as pd_type, COUNT(st.symptom_id) as count FROM pest_table p INNER JOIN symptoms_pest sp ON p.pest_id = sp.pest_id INNER JOIN symptoms_table st ON sp.symptom_id = st.symptom_id '; 
	var disease_qry = 'SELECT st.symptom_id, st.symptom_name as detail_name, st.symptom_desc as detail_desc, d.disease_id as pd_id, d.disease_name as pd_name, "Disease" as pd_type, COUNT(st.symptom_id) as count FROM disease_table d INNER JOIN symptoms_disease sd ON d.disease_id = sd.disease_id INNER JOIN symptoms_table st ON sd.symptom_id = st.symptom_id ';

	var i;

	for(i = 0; i < symptom_ids.length; i++){
		if(i == 0){
			pest_qry = pest_qry + " WHERE ";
			disease_qry = disease_qry + " WHERE ";
		}
		else{
			pest_qry = pest_qry + " || ";
			disease_qry = disease_qry + " || ";
		}

		pest_qry = pest_qry + " st.symptom_id = " + symptom_ids[i]; 
		disease_qry = disease_qry + " st.symptom_id = " + symptom_ids[i]; 
	}

	var sql = pest_qry + " GROUP BY pd_name UNION " + disease_qry + " GROUP BY pd_name";

	mysql.query(sql, next); return(sql);
}


exports.getPDProbability = function(date, type, id, farm_id, next){
	sql = "SELECT * FROM pd_probabilities WHERE ? && pd_type = ? && pd_id = ? && farm_id = ?";

	sql = mysql.format(sql, date);
	sql = mysql.format(sql, type);
	sql = mysql.format(sql, id);
	sql = mysql.format(sql, farm_id);

	mysql.query(sql, next); return(sql);
}

exports.getSinglePDProbability = function(pd_id, pd_type, farm_id, next){
	sql = "SELECT * FROM pd_probabilities WHERE pd_type = ? && pd_id = ? ";
	sql = mysql.format(sql, pd_type);
	sql = mysql.format(sql, pd_id);

	if(farm_id != null){
		sql = sql + " && farm_id = ? ";
		sql = mysql.format(sql, farm_id);
	}
	sql = sql + " ORDER BY date DESC";

	mysql.query(sql, next); return(sql);
}

exports.addPDProbability = function(data, next){
	sql = "INSERT INTO pd_probabilities SET ?";
	sql = mysql.format(sql, data);

	mysql.query(sql, next); return(sql);
};

exports.updatePDProbability = function(probability_id, probability, next){
	sql = "UPDATE pd_probability set probability = ? WHERE ?";
	sql = mysql.format(sql, probability);
	sql = mysql.format(sql, probability_id);
	mysql.query(sql, next); return(sql);
}

exports.getProbabilities = function(type, id, next){
	sql = 'SELECT *, AVG(pp.probability), MAX(date) FROM pd_probabilities pp INNER JOIN pest_table pt ON pt.pest_id = pp.pd_id JOIN farm_table using (farm_id) WHERE pp.pd_type = "Pest" ';
	if(id != null && id != ""){
		sql = sql + " && farm_id = " + id.farm_id;
	}
	sql = sql + ' GROUP BY pd_id UNION SELECT *, AVG(pp.probability), MAX(date)  FROM pd_probabilities pp INNER JOIN disease_table pt ON pt.disease_id = pp.pd_id  JOIN farm_table using (farm_id) WHERE pp.pd_type = "Disease" ';
	if(id != null && id != ""){
		sql = sql + " && farm_id = " + id.farm_id;
	}
	sql = sql + " GROUP BY pd_id;";
	console.log(sql);
	mysql.query(sql, next); return(sql);
};

exports.getDiagnosisFrequentStage = function(farm_id,year, next){
	sql = 'SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed is null GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Land Preparation" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Sowing" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Vegetation" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Reproduction" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Ripening" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Harvesting" ';
	

	if(farm_id != null && farm_id != ""){
		sql = sql + " && farm_id = " + farm_id;
	}
	//Add date
	if(year != null && year != ""){
		sql = sql + " && YEAR(date_diagnosed) = " + year;
	}

	sql = sql + " GROUP BY pest_id ";


	sql = sql + " UNION " + 'SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed is null GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Land Preparation" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Sowing" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Vegetation" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Reproduction" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Ripening" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Harvesting" ';
	
	if(farm_id != null && farm_id != ""){
		sql = sql + " && farm_id = " + farm_id;
	}
	//Add date
	if(year != null && year != ""){
		sql = sql + " && YEAR(date_diagnosed) = " + year;
	}

	sql = sql + " GROUP BY disease_id ";

	mysql.query(sql, next); return(sql);
};

exports.getDiagnosisFrequentStage2 = function(farm_id, year, pd_id, type, next){
	var pest = "SELECT pd_id, pest_name as pd_name, type, date_diagnosed, farm_id, calendar_id, stage_diagnosed, COUNT(stage_diagnosed) as count FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = 'Pest' ";
	var disease = "SELECT pd_id, disease_name as pd_name, type, date_diagnosed, farm_id, calendar_id, stage_diagnosed, COUNT(stage_diagnosed) as count FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = 'Disease' ";
	var end_query = ' GROUP BY pd_id, stage_diagnosed';
	var sql;
	var first = true;


	if(farm_id != null && farm_id != ""){
		if(first){
			first = false;
			pest = pest + " WHERE ";
			disease = disease + " WHERE ";
		}
		pest = pest + " farm_id = " + farm_id;
		disease = disease + " farm_id = " + farm_id;
	}
	
	
	if(year != null && year != ""){
		if(first){
			first = false;
			pest = pest + " WHERE ";
			disease = disease + " WHERE ";
		}
		else{
			pest = pest + " && ";
			disease = disease + " && ";
		}
		pest = pest + " YEAR(d.date_diagnosed) = " + year;
		disease = disease + " YEAR(d.date_diagnosed) = " + year;
	}
	
	
	if(pd_id != null && pd_id != ""){
		if(first){
			first = false;
			pest = pest + " WHERE ";
			disease = disease + " WHERE ";
		}
		else{
			pest = pest + " && ";
			disease = disease + " && ";
		}
		pest = pest + " pd_id = " + pd_id;
		disease = disease + " pd_id = " + pd_id;
	}
	if(type == null || type == ""){
		sql = pest + end_query + " UNION " + disease + end_query;
	}
	else if(type == "Pest"){
		sql = pest + end_query;

	}
	else if(type == "Disease"){
		sql = disease + end_query;
	}

	//sql = pest + end_query + " UNION " + disease + end_query;

	mysql.query(sql, next); return(sql);
}



//For frequency
exports.getTotalDiagnosesPerPD = function(farm_id, next){
	var sql = 'SELECT * FROM (SELECT a.*, SUM(a.count) as total FROM (SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed is null GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Land Preparation" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Sowing" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Vegetation" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Reproduction" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Ripening" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE stage_diagnosed = "Harvesting" GROUP BY pest_id) a GROUP BY pd_name ';
	sql = sql + ' UNION ';
	sql = sql + 'SELECT b.*, SUM(b.count) as total FROM (SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed is null GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Land Preparation" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Sowing" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Vegetation" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Reproduction" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Ripening" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE stage_diagnosed = "Harvesting" GROUP BY disease_id) b GROUP BY pd_name) a ';
	
	var sql2 = 'SELECT * FROM (SELECT a.*, SUM(a.count) as total FROM (SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE farm_id = ? && stage_diagnosed is null GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE farm_id = ? && stage_diagnosed = "Land Preparation" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE farm_id = ? && stage_diagnosed = "Sowing" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE farm_id = ? && stage_diagnosed = "Vegetation" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE farm_id = ? && stage_diagnosed = "Reproduction" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE farm_id = ? && stage_diagnosed = "Ripening" GROUP BY pest_id UNION SELECT a.pest_id as pd_id, a.type , a.pest_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = "Pest") a WHERE farm_id = ? && stage_diagnosed = "Harvesting" GROUP BY pest_id) a GROUP BY pd_name ';
	sql2 = sql2 + ' UNION ';
	sql2 = sql2 + 'SELECT b.*, SUM(b.count) as total FROM (SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE farm_id = ? && stage_diagnosed is null GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE farm_id = ? && stage_diagnosed = "Land Preparation" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE farm_id = ? && stage_diagnosed = "Sowing" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE farm_id = ? && stage_diagnosed = "Vegetation" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE farm_id = ? && stage_diagnosed = "Reproduction" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE farm_id = ? && stage_diagnosed = "Ripening" GROUP BY disease_id UNION SELECT a.disease_id as pd_id, a.type , a.disease_name as pd_name, MAX(a.date_diagnosed) as last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) as count, a.farm_id FROM (SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = "disease") a WHERE farm_id = ? && stage_diagnosed = "Harvesting" GROUP BY disease_id) b GROUP BY pd_name) a ';
	
	if(farm_id != null && farm_id != ""){
		sql = sql2;
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
		sql = mysql.format(sql, farm_id);
	}

	sql = sql + " ORDER BY total DESC";
	
	mysql.query(sql, next); return(sql);
}


exports.getTotalDiagnosesPerPD2 = function(farm_id, year, next){
	var sql = "SELECT a.pd_id, a.type, a.pd_name, a.last_diagnosed, SUM(a.count) AS total FROM (SELECT a.pest_id AS pd_id, a.type, a.pest_name AS pd_name, MAX(a.date_diagnosed) AS last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) AS count FROM ( SELECT * FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = 'Pest' ";
	
	if(farm_id != null && farm_id != ""){
		sql = sql + " WHERE farm_id = " + farm_id;
		if(year != null && year != ""){
			sql = sql + " && YEAR(date_diagnosed) = " + year;
		}
	}
	else{
		if(year != null && year != ""){
			sql = sql + " WHERE YEAR(date_diagnosed) = " + year;
		}
	}

	sql = sql + ") a GROUP BY pd_id, stage_diagnosed UNION SELECT a.disease_id AS pd_id, a.type, a.disease_name AS pd_name, MAX(a.date_diagnosed) AS last_diagnosed, a.stage_diagnosed, COUNT(stage_diagnosed) AS count FROM ( SELECT * FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = 'Disease' ";
	
	
	if(farm_id != null && farm_id != ""){
		sql = sql + " WHERE farm_id = " + farm_id;
		if(year != null && year != ""){
			sql = sql + " && YEAR(date_diagnosed) = " + year;
		}
	}
	else{
		if(year != null && year != ""){
			sql = sql + " WHERE YEAR(date_diagnosed) = " + year;
		}
	}

	sql = sql + ") a GROUP BY pd_id, stage_diagnosed) a GROUP BY a.pd_name ORDER BY total DESC"; 
	
	mysql.query(sql, next); return(sql);
}

exports.getTotalDiagnosesPerMonth = function(farm_id, year, pd_id, type, next){
	var temp_end = ") a  GROUP BY a.month";
	var month_pest = "SELECT null as month_num, a.month, a.type, COUNT(month) as frequency FROM ( SELECT pd_id, pest_id as pd_name, type, farm_id, calendar_id, stage_diagnosed, date_diagnosed, MONTHNAME(date_diagnosed) as month FROM pest_table pt INNER JOIN diagnosis d ON d.pd_id = pt.pest_id && d.type = 'Pest' ";
	var month_disease = "SELECT null as month_num, a.month, a.type, COUNT(month) as frequency FROM ( SELECT pd_id, disease_id as pd_name, type, farm_id, calendar_id, stage_diagnosed, date_diagnosed, MONTHNAME(date_diagnosed) as month FROM disease_table pt INNER JOIN diagnosis d ON d.pd_id = pt.disease_id && d.type = 'Disease' ";
	var months = "SELECT * FROM (SELECT 1 as month_num,'January' AS month, NULL AS type, 0 AS frequency UNION SELECT 2 as month_num,'February' AS month, NULL AS type, 0 AS frequency UNION SELECT 3 as month_num,'March' AS month, NULL AS type, 0 AS frequency UNION SELECT 4 as month_num,'April' AS month, NULL AS type, 0 AS frequency UNION SELECT 5 as month_num,'May' AS month, NULL AS type, 0 AS frequency UNION SELECT 6 as month_num,'June' AS month, NULL AS type, 0 AS frequency UNION SELECT 7 as month_num,'July' AS month, NULL AS type, 0 AS frequency UNION SELECT 8 as month_num,'August' AS month, NULL AS type, 0 AS frequency UNION SELECT 9 as month_num,'September' AS month, NULL AS type, 0 AS frequency UNION SELECT 10 as month_num,'October' AS month, NULL AS type, 0 AS frequency UNION SELECT 11 as month_num,'November' AS month, NULL AS type, 0 AS frequency UNION SELECT 12 as month_num,'December' AS month, NULL AS type, 0 AS frequency) a GROUP BY a.month";
	var first = true;
	var sql = "";

	if(farm_id != null && farm_id != ""){
		if(first){
			first = false;
			month_pest = month_pest + " WHERE ";
			month_disease = month_disease + " WHERE ";
		}
		month_pest = month_pest + " farm_id = " + farm_id;
		month_disease = month_disease + " farm_id = " + farm_id;
	}


	if(year != null && year != ""){
		if(first){
			first = false;
			month_pest = month_pest + " WHERE ";
			month_disease = month_disease + " WHERE ";
		}
		else{
			month_pest = month_pest + " && ";
			month_disease = month_disease + " && ";
		}
		month_pest = month_pest + " YEAR(d.date_diagnosed) = " + year;
		month_disease = month_disease + " YEAR(d.date_diagnosed) = " + year;
	}


	if(pd_id != null && pd_id != ""){
		if(first){
			first = false;
			month_pest = month_pest + " WHERE ";
			month_disease = month_disease + " WHERE ";
		}
		else{
			month_pest = month_pest + " && ";
			month_disease = month_disease + " && ";
		}
		month_pest = month_pest + " pd_id = " + pd_id;
		month_disease = month_disease + " pd_id = " + pd_id;
	}

	month_pest = month_pest + temp_end;
	month_disease = month_disease + temp_end;
	if(type == null || type == ""){
		sql = 'SELECT MAX(a.month_num) as month_num, a.month, a.type, a.frequency, SUM(a.frequency) as frequency FROM (' + month_pest + " UNION " + month_disease + ' UNION ' + months + ") a GROUP BY month ORDER BY month_num ASC"; 
	}
	else if(type == "Pest"){
		sql = 'SELECT MAX(a.month_num) as month_num, a.month, a.type, a.frequency, SUM(a.frequency) as frequency FROM (' + month_pest + " UNION " + months + ") a GROUP BY month ORDER BY month_num ASC"; 

	}
	else if(type == "Disease"){
		sql = 'SELECT MAX(a.month_num) as month_num, a.month, a.type, a.frequency, SUM(a.frequency) as frequency FROM (' + month_disease + ' UNION ' + months + ") a GROUP BY month ORDER BY month_num ASC"; 
	}

	mysql.query(sql, next); return(sql);
}

exports.getDiagnosisList = function(pd_id, type, farm_id, year, next){
	var sql = 'SELECT * FROM (SELECT d.*, pt.pest_name as pd_name, pt.pest_desc as pd_desc, ft.farm_name, cct.crop_plan FROM diagnosis d INNER JOIN farm_table ft ON d.farm_id = ft.farm_id INNER JOIN crop_calendar_table cct ON cct.calendar_id = d.calendar_id INNER JOIN pest_table pt ON d.pd_id = pt.pest_id && d.type = "Pest" UNION SELECT d.*, pt.disease_name as pd_name, pt.disease_desc as pd_desc, ft.farm_name, cct.crop_plan FROM diagnosis d INNER JOIN farm_table ft ON d.farm_id = ft.farm_id INNER JOIN crop_calendar_table cct ON cct.calendar_id = d.calendar_id INNER JOIN disease_table pt ON d.pd_id = pt.disease_id && d.type = "Disease") a WHERE a.pd_id = ? && a.type = ? ';


	if(pd_id != null && pd_id != "")
		sql = mysql.format(sql, pd_id);

	if(type != null && type != "")
		sql = mysql.format(sql, type);

	if(farm_id != null && farm_id != "")
		sql = sql + " && farm_id = " + farm_id;
	
	if(year != null && year != "")
		sql = sql + " && YEAR(a.date_diagnosed) = " + year;

	sql = sql + " ORDER BY date_diagnosed DESC";

	mysql.query(sql, next); return(sql);
};



exports.getDiagnosisSymptomsSummarized = function(farm_id, next){
	var sql = 'SELECT DISTINCT symptom_name, a.*, ds.* FROM (SELECT d.*, pest_name as pd_name, pest_desc as pd_desc FROM diagnosis d INNER JOIN pest_table pt ON pt.pest_id = d.pd_id && d.type = "Pest" UNION SELECT d.*, disease_name as pd_name, disease_desc as pd_desc FROM diagnosis d INNER JOIN disease_table dt ON dt.disease_id = d.pd_id && d.type = "Disease") a INNER JOIN diagnosis_symptom ds ON ds.diagnosis_id = a.diagnosis_id INNER JOIN symptoms_table st ON st.symptom_id = ds.symptom_id WHERE status = "Present";';
	if(farm_id != null && farm_id != ""){
		sql = '&& a.farm_id = ' + farm_id;
	}

	mysql.query(sql, next); return(sql);
}


exports.getDBProbabilities = function(farm_id, next){
	var sql = "SELECT * FROM capstone_agriculture_db.pd_probabilities pp WHERE NOT EXISTS(SELECT 1 FROM pd_probabilities pp2 WHERE pp.date < pp2.date) AND farm_id = ?;";
	if(farm_id != null && farm_id != ""){
		sql = mysql.format(sql, farm_id);
	}

	mysql.query(sql, next); return(sql);
}