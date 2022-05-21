function renew(type, farm){
	var year = $("#year_selected").val();

	$.get("/ajaxGetDiagnosisPDFrequency", {type : type, farm_id : farm, year : year}, function(freq_list){
		var i, table;
		var farm_name, year_name, type_name;
		if(farm == "all"){
			farm_name = "All Farms";
		}
		else{
			farm_name = $("#farm_selected option:selected").text();
		}
		if(year == ""){
			year_name = "Past 5 years";
		}
		else if(year == "all")
			year_name = "All-time";
		else{
			year_name = $("#year_selected option:selected").text();;
		}
		if(type == "all")
			type_name = "Pest/Disease";
		else{
			type_name = type;
		}
		$("#" + type.toLowerCase() +"_chart_title").text(year_name + " " + type_name+ " " + " Occurrences for " + farm_name);
		
		for(i = 0; i < freq_list.length; i++){
			table = "#" + type.toLowerCase() + "_frequency";
			// alert(freq_list[0].pd_name);
			$(table).append('<tr> <td>' + freq_list[0].pd_name +'</td> <td>' + freq_list[0].type +'</td> <td style="text-align: right">' + freq_list[0].total +'</td> <td>' + freq_list[0].frequent_stage +'</td> </tr>');

			for(i = 1; i < freq_list.length; i++){
				$(table).append('<tr><td>' + freq_list[i].pd_name +'</td> <td>' + freq_list[i].type +'</td> <td style="text-align: right">' + freq_list[i].total +'</td> <td>' + freq_list[i].frequent_stage +'</td> </tr>');
			}
		}
	});

	//For chart 1
	$.get("/ajaxUpdateChart", {type : type, farm_id : farm, year : year}, function(chart_details){
		var i, table;
		table = "#" + type.toLowerCase() + "_monthly_frequency"; 
		$(table).empty();
		for(i = 0; i < chart_details.month_frequency.length; i++){
			$(table).append('<li><div class="bar" value="' + chart_details.month_frequency[i].frequency + '" data-percentage="' + chart_details.month_frequency[i].percent + '"></div><span>' + chart_details.month_frequency[i].month_label + '</span></li>');
		}

		table = "#" + type.toLowerCase() + "_numbers"; 
		$(table).empty();
		$(table).append("<li><span>" + chart_details.highest + "</span></li>");
		$(table).append("<li><span>" + chart_details.middle + "</span></li>");

		$('.bars li .bar').each(function(key, bar){
			var percentage = $(this).data('percentage');
			$(this).animate({
				'height' : percentage + '%'
			},1000)
		});
	});	

}


function update_color_meter(){
    $(".probability_value").each(function(){
        var value = $(this).text().slice(0,-1);
		var meter;
		var text_val;
		if(parseInt(value) <= 35){
			meter = 5;
			text_val = "Low";
		}
		else if(parseInt(value) <= 65){
			text_val = "Medium";
			meter = 40;
		}
		else{
			meter = 90;
			text_val = "High";
		}
        var val = 214 - (meter * 2);
        var rgb = "color : rgb(214, " + val + ", 19); width: 170px;border-style: none;padding: 0px 12px;font-size: 25px;line-height: 40px;text-align: left;";
        $(this).attr("style",rgb);
        if(value != ""){
            $(this).text(parseInt(value) + " %");
            // $(this).text(text_val);
        }
    });
}

$(document).ready(function() {
	
	setInterval(function() {
		//Store recommendation to db
		$.get('/get_crop_plans', {status : ["Active", "In-Progress"]}, function(plans){
			//Loop through each active crop calendar
			var i; 
			$.get('/agroapi/polygon/readAll', {}, function(polygons) {
				var center = [];
				for(i =0 ; i < plans.length; i++){
					for (var x = 0; x < polygons.length; x++) {
						// console.log(polygons[x].name);
						if (plans[i].farm_name == polygons[x].name) {
							center = polygons[x].center;
							// console.log(plans[i].calendar_id);
							$.get("/getPossiblePD", {center:center, calendar_id : plans[i].calendar_id, farm_id : plans[i].farm_id}, function(possibilities){
								// alert(plans[i].farm_name);
								//Store in recommendated db
								// console.log(possibilities);
								var y; 
								for(y = 0; y < possibilities.length; y++){
									$.get("/storePDRecommendation", {calendar_id : plans[i].calendar_id, possibilities : possibilities[y], farm_id : plans[i].farm_id}, function(recommendation){
	
									});
								}
							});
						}
					}
				}
			});
		});
	}, 1000000);

	//CROP CALENDAR CREATION
	if (view == 'add_crop_calendar') {

		$('.next_step').on('click', function() {
			if (currentTab == 3) {
				// alert("Pestiicde recommendation");
				$.get('/ajaxGetDiagnoses', {farm_id : $("#farm_id").val()}, function(diagnoses){
					//Get Probabilities from DB
					$.get("/ajaxGetPastProbabilities", {farm_id : $("#farm_id").val()}, function(probabilities){
						var i, x;
						var possibilities = [];
						for(i = 0; i < probabilities.length; i++){
							// console.log(probabilities[i]);
							for(x = 0; x < diagnoses.length; x++){
								if(diagnoses[x].pd_id == probabilities[i].pd_id && diagnoses[x].type == probabilities[i].pd_type){
									// console.log(probabilities[i].pd_name);
									// console.log(probabilities[i].probability);
									// console.log("-------------------");
											// probabilities[i].probability = probabilities[i].probability * 1.1;
									// if($("#farm_id").val() == diagnoses[x].farm_id){
									// 	console.log("same farm " + diagnoses[x].farm_name);
									// 	probabilities[i].probability = probabilities[i].probability * 1.2;
									// }
									// else{
									// 	probabilities[i].probability = probabilities[i].probability * 1.1;
									// }
								}
							}
							if(probabilities[i].probability >= 0){//from 40
								// console.log("push");
								possibilities.push(probabilities[i]);
							}
						}
						console.log(probabilities);
						console.log(possibilities);
						$.get('/ajaxGetDiagnosisStageFrequency', {}, function(frequency){
							for(i = 0; i < possibilities.length; i++){
								var freq_stage = "N/A", stage_count = 0;
								for(x = 0; x < frequency.length; x++){
									if(possibilities[i].pd_type == frequency[x].type && possibilities[i].pd_id == frequency[x].pd_id){
										if(frequency[x].count > stage_count){
											stage_count = frequency[x].count;
											freq_stage = frequency[x].stage_diagnosed;
										}
									}
									possibilities[i]["frequent_stage"] = freq_stage;
								}
							}
						});
						console.log(possibilities);
						for(i = 0; i < possibilities.length; i++){ //possibilities.length
							//Add to pesticide application plan
							$.get("/getPDPreventions", {type : possibilities[i].pd_type, id : possibilities[i].pd_id, possibilities : possibilities[i], land_prep_date : $("#land_prep_date_start").val(), seed_id : $("#seed_id").val(), sowing_date : $("#sowing_date_start").val(), vegetation_date : $("#sowing_date_end").val()}, function(preventions){
								// console.log(preventions);
								var row = '<div class="row"> <div class="col-lg-5 col-xxl-4"> <div class="card shadow mb-4"> <div class="card-header mini py-3" style="background: #212529;"> <h6 class="fw-bold m-0" style="color: #FFFFFF;">Pest/Disease ' + (i + 1) + '<br></h6> </div> <div class="card-body" style="height: 250px;"> <div class="table-responsive" style="border-style: none;"> <table class="table" style="height : 250px;"> <thead> </thead> <tbody> <tr style="border-style: none;"> <td style="border-style: none;"><span class="d-xxl-flex justify-content-xxl-start" style="font-weight: bold;">Name<br></span> <span class="d-xxl-flex justify-content-xxl-start" id="">' + possibilities[i].pest_name + '<br></span></td> <td style="border-style: none;"><span class="d-xxl-flex justify-content-xxl-start" style="font-weight: bold;">Type<br></span><span class="d-xxl-flex justify-content-xxl-start" id="">' + possibilities[i].pd_type + '<br></span></td> </tr> <tr style="border-style: none;"> <td style="border-style: none;"><span class="d-xxl-flex justify-content-xxl-start" style="font-weight: bold;">Frequent Stage<br></span><span class="d-xxl-flex justify-content-xxl-start"  id="">' + possibilities[i].frequent_stage + '<br></span></td><td style="border-style: none;"><span class="d-xxl-flex justify-content-xxl-start" style="font-weight: bold;">Avg Probability<br></span><span class="d-xxl-flex justify-content-xxl-start"  id="">' + parseFloat(possibilities[i].probability).toFixed(2) + '%<br></span></td> </tr> </tbody> </table> </div> </div> </div> </div> <div class="col-lg-7 col-xxl-8"> <div class="card shadow mb-4"> <div class="card-header mini py-3" style="background: #212529;height: auto;"> <h6 class="fw-bold m-0" style="color: #FFFFFF;">Pesticide Application Plan ' + (i + 1) + ' Information<br></h6> </div> <div class="card-body table-responsive" style="height : 250px; padding-left : 1.5rem; padding-right : 1.5rem;"> <table class="table" id="pd_recommendation_table" style="width: 100%;"> <thead> <tr> <th style="text-align: left; width : 25%">Date</th> <th style="text-align: left; width : 30%">Prevention</th> <th style="text-align: left; width : 40%">Description</th> <th style="text-align: left; width : 5%"></th> </tr> </thead> <tbody style="overflow: auto;"> ';
								$("#body_step4").append();
								for(x = 0; x < preventions.length; x++){
									row = row + '<tr> <td style="text-align: left;">' + preventions[x].date + '</td> <td style="text-align: left;overflow: hidden;white-space: nowrap; text-overflow: ellipsis;">' + preventions[x].detail_name + '</td> <td style="text-align: left; overflow: hidden;white-space: nowrap; text-overflow: ellipsis;">' + preventions[x].detail_desc + '</td> <td style="text-align: left;"><input checked class="prevention_wo" type="checkbox" form="" id="" value="' + preventions[x].date + "|" + preventions[x].detail_name + "|" + possibilities[i].pest_name + ": " +  preventions[x].detail_desc + '"></td> </tr>';
								}
								row = row + '</tbody> </table> </div> </div> </div> </div>'
								$("#body_step4").append(row);
							});
						}
					});
				});
			}
		});
	}
	else if(view == "home"){
		// $.get('/get_crop_plans', {status : ["Active", "In-Progress"]}, function(plans){
		// 	//Loop through each active crop calendar
		// 	var i; 
		// 	$.get('/agroapi/polygon/readAll', {}, function(polygons) {
		// 		var center = [];
		// 		for(i =0 ; i < plans.length; i++){
		// 			for (var x = 0; x < polygons.length; x++) {
		// 				// console.log(polygons[x].name);
		// 				if (plans[i].farm_name == polygons[x].name) {
		// 					center = polygons[x].center;
		// 					// console.log(plans[i].calendar_id);
		// 					$.get("/getPossiblePD", {center:center, calendar_id : plans[i].calendar_id, farm_id : plans[i].farm_id}, function(possibilities){
		// 						// alert(plans[i].farm_name);
		// 						//Store in recommendated db
		// 						// console.log(possibilities);
		// 						var y; 
		// 						for(y = 0; y < possibilities.length; y++){
		// 							$.get("/storePDRecommendation", {calendar_id : plans[i].calendar_id, possibilities : possibilities[y], farm_id : plans[i].farm_id}, function(recommendation){
	
		// 							});
		// 						}
		// 					});
		// 				}
		// 			}
		// 		}
		// 	});
		// });

		//Update chart
		$('.bars li .bar').each(function(key, bar){
			var percentage = $(this).data('percentage');
			$(this).animate({
				'height' : percentage + '%'
			},1000)
		});


		$.get("/ajaxUpdateChart",  {type : type, farm_id : "all", year : null, pd_id: pd_id}, function(diagnosis_chart){
			$("#all_chart_title").text("Past 5 Years Pest/Disease Occurrences for All Farms");
			$("#chart_title").text("Past 5 Years " + $("#frequency_pd_id option:selected").text() + " Occurrences for All Farms");

			var i, table;


			$("#pd_highest_month").text(diagnosis_chart.highest_month);
			$("#pd_highest_month_count").text(diagnosis_chart.highest_month_count);
			table = "#diagnoses_chart"; 
			$(table).empty();
			for(i = 0; i < diagnosis_chart.month_frequency.length; i++){
				$(table).append('<li><div class="bar" value="' + diagnosis_chart.month_frequency[i].frequency + '" data-percentage="' + diagnosis_chart.month_frequency[i].percent + '"></div><span>' + diagnosis_chart.month_frequency[i].month_label + '</span></li>');
			}

			table = "#diagnoses_numbers"; 
			$(table).empty();
			$(table).append("<li><span>" + diagnosis_chart.highest + "</span></li>");
			$(table).append("<li><span>" + diagnosis_chart.middle + "</span></li>");
			$('.bars li .bar').each(function(key, bar){
				var percentage = $(this).data('percentage');
				$(this).animate({
					'height' : percentage + '%'
				},1000)
			});
		});


		$("#farm_selected, #year_selected").on("change", function(){
			//CHANGE OF FARM
			var id =$(".nav-link.active").attr("id");
			// alert(id);
			var farm_id = $("#farm_selected").val();
			var year = $("#year_selected").val();
			if(id == "all-tab"){
				$("#all_frequency").empty();
				renew("all", farm_id);
			}
			else if(id == "pests-tab"){
				$("#pest_frequency").empty();
				renew("Pest", farm_id);
			}
			else if(id == "diseases-tab"){
				$("#disease_frequency").empty();
				renew("Disease", farm_id);
			}

			// var pd = $("#frequency_pd_id").val();
			// pd = pd.split("|");
			// var pd_id = pd[0];
			// var type = pd[1];
			// $.get("/ajaxGetDiagnosisList", {pd_id: pd_id, type : type, farm_id : farm_id, year : year}, function(list){
			// 	$("#diagnoses_list_table").empty();
			// 	var i;
			// 	// $("#pd_name").text(list[0].pd_name);
			// 	// $("#pd_type").text(list[0].type);
			// 	// $("#pd_desc").text(list[0].pd_desc);
			// 	for(i = 0; i < list.length; i++){
			// 		$("#diagnoses_list_table").append('<tr><td>' + list[i].date_diagnosed + '</td> <td>' + list[i].date_solved + '</td> <td>' + list[i].farm_name + '</td> <td>' + list[i].crop_plan + '</td> <td>' + list[i].stage_diagnosed + '</td> <td> <div class="dropdown no-arrow" style="width : 50px;"> <button id="more" class="btn btn-primary btn-sm dropdown-toggle" aria-expanded="false" data-bs-toggle="dropdown" type="button"> <i class="fa fa-ellipsis-h d-lg-flex justify-content-lg-center"></i> </button> <div class="dropdown-menu notSidebar shadow dropdown-menu-end animated--fade-in"> <a class="dropdown-item notSidebar" href="/pest_and_disease/diagnose_details?id=' + list[i].diagnosis_id + '" >&nbsp;View Details</a> </div> </div> </td> </tr>');
			// 	}
			// });	

			var farm_id = $("#farm_selected").val();
			var year = $("#year_selected").val();
			var pd = $("#frequency_pd_id").val();
			pd = pd.split("|");
			var pd_id = pd[0];
			var type = pd[1];
		});
	}
	else if(view == "diagnosis_frequency"){

		var pd = $("#frequency_pd_id").val();
		pd = pd.split("|");
		var pd_id = pd[0];
		var type = pd[1];
		
		$.get("/ajaxGetDiagnosisList", {pd_id: pd_id, type : type}, function(list){
			$("#diagnoses_list_table").empty();
			$("#pd_common_stage").text(list[0].common_stage);
			$("#pd_stage_count").text(list[0].count);
			var i;
			// alert(list.length);

			// $("#pd_name").text(list[0].pd_name);
			// $("#pd_type").text(list[0].type);
			// $("#pd_desc").text(list[0].pd_desc);
			for(i = 0; i < list.length; i++){
				$("#diagnoses_list_table").append('<tr><td>' + list[i].date_diagnosed + '</td> <td>' + list[i].date_solved + '</td> <td>' + list[i].farm_name + '</td> <td>' + list[i].crop_plan + '</td> <td>' + list[i].stage_diagnosed + '</td> <td> <div class="dropdown no-arrow" style="width : 50px;"> <button id="more" class="btn btn-primary btn-sm dropdown-toggle" aria-expanded="false" data-bs-toggle="dropdown" type="button"> <i class="fa fa-ellipsis-h d-lg-flex justify-content-lg-center"></i> </button> <div class="dropdown-menu notSidebar shadow dropdown-menu-end animated--fade-in"> <a class="dropdown-item notSidebar" href="/pest_and_disease/diagnose_details?id=' + list[i].diagnosis_id + '" >&nbsp;View Details</a> </div> </div> </td> </tr>');
			}

		});	

		$.get("/ajaxUpdateChart",  {type : type, farm_id : "all", year : null, pd_id: pd_id}, function(diagnosis_chart){
			$("#all_chart_title").text("Past 5 Years Pest/Disease Occurrences for All Farms");
			$("#chart_title").text("Past 5 Years " + $("#frequency_pd_id option:selected").text() + " Occurrences for All Farms");

			var i, table;


			$("#pd_highest_month").text(diagnosis_chart.highest_month);
			$("#pd_highest_month_count").text(diagnosis_chart.highest_month_count);
			table = "#diagnoses_chart"; 
			$(table).empty();
			for(i = 0; i < diagnosis_chart.month_frequency.length; i++){
				$(table).append('<li><div class="bar" value="' + diagnosis_chart.month_frequency[i].frequency + '" data-percentage="' + diagnosis_chart.month_frequency[i].percent + '"></div><span>' + diagnosis_chart.month_frequency[i].month_label + '</span></li>');
			}

			table = "#diagnoses_numbers"; 
			$(table).empty();
			$(table).append("<li><span>" + diagnosis_chart.highest + "</span></li>");
			$(table).append("<li><span>" + diagnosis_chart.middle + "</span></li>");
			$('.bars li .bar').each(function(key, bar){
				var percentage = $(this).data('percentage');
				$(this).animate({
					'height' : percentage + '%'
				},1000)
			});
		});

		//Update chart
		$('.bars li .bar').each(function(key, bar){
			var percentage = $(this).data('percentage');
			$(this).animate({
				'height' : percentage + '%'
			},1000)
		});


		$.get('/generateRecommendationDiagnosis',{farm_name : "all", type : type, pd_id : pd_id}, function(result){
			$("#symptom_table").empty();
			for(i = 0; i < result.symptoms.length; i++){
				$("#symptom_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card details" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.symptoms[i].detail_name + '</h4> <p style="color: gray;">' + result.symptoms[i].detail_desc + '</p> </div>');
			}
			
			for(i = 0; i < result.preventions.length; i++){
				$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray; " hidden> <span style="color: gray;" hidden>Create work order</span> </row> </div>');
			}
		});

		$.get('/ajaxGetSingleProbability', {pd_id : pd_id, type : type, farm_id : "all"}, function(probability){
			$("#pd_probability").text(probability.probability + "%");
			update_color_meter();
		});

		$("#all-tab, #pests-tab, #diseases-tab").on("click", function(){
			var id = $(this).attr("id");
			var farm_id = $("#farm_selected").val();
			var year = $("#year_selected").val();
			if(id == "all-tab"){
				$("#all_frequency").empty();
				renew("all", farm_id);
			}
			else if(id == "pests-tab"){
				$("#pest_frequency").empty();
				renew("Pest", farm_id);
			}
			else if(id == "diseases-tab"){
				$("#disease_frequency").empty();
				renew("Disease", farm_id);
			}

			// var pd = $(".frequency_radio:checked").val();
			// pd = pd.split("|");
			// var pd_id = pd[0];
			// var type = pd[1];

			// //For chart 2
			// $.get("/ajaxUpdateChart",  {type : type, farm_id : farm_id, year : year, pd_id: pd_id}, function(diagnosis_chart){
			// 	var i, table;

			// 	var farm_name, year_name;
			// 	if(farm_id == "all"){
			// 		farm_name = "All Farms";
			// 	}
			// 	else{
			// 		farm_name = $("#farm_selected option:selected").text();
			// 	}
			// 	if(year == ""){
			// 		year_name = "Past 5 Years";
			// 	}
			// 	else if(year == "all")
			// 		year_name = "All-time";
			// 	else{
			// 		year_name = $("#year_selected option:selected").text();
			// 	}
			// 	$("#chart_title").text(year_name + " " + $("#pd_name").text() + " Occurrences for " + farm_name);



			// 	table = "#diagnoses_chart"; 
			// 	$(table).empty();
			// 	for(i = 0; i < diagnosis_chart.month_frequency.length; i++){
			// 		$(table).append('<li><div class="bar" value="' + diagnosis_chart.month_frequency[i].frequency + '" data-percentage="' + diagnosis_chart.month_frequency[i].percent + '"></div><span>' + diagnosis_chart.month_frequency[i].month_label + '</span></li>');
			// 	}

			// 	table = "#diagnoses_numbers"; 
			// 	$(table).empty();
			// 	$(table).append("<li><span>" + diagnosis_chart.highest + "</span></li>");
			// 	$(table).append("<li><span>" + diagnosis_chart.middle + "</span></li>");

			// 	$('.bars li .bar').each(function(key, bar){
			// 		var percentage = $(this).data('percentage');
			// 		$(this).animate({
			// 			'height' : percentage + '%'
			// 		},1000)
			// 	});
			// });
			
			
			// $.get("/ajaxGetDiagnosisList", {pd_id: pd_id, type : type, farm_id : farm_id}, function(list){
			// 	$("#diagnoses_list_table").empty();
			// 	var i;
			// 	// $("#pd_name").text(list[0].pd_name);
			// 	// $("#pd_type").text(list[0].type);
			// 	// $("#pd_desc").text(list[0].pd_desc);
			// 	for(i = 0; i < list.length; i++){
			// 		$("#diagnoses_list_table").append('<tr><td>' + list[i].date_diagnosed + '</td> <td>' + list[i].date_solved + '</td> <td>' + list[i].farm_name + '</td> <td>' + list[i].crop_plan + '</td> <td>' + list[i].stage_diagnosed + '</td> <td> <div class="dropdown no-arrow" style="width : 50px;"> <button id="more" class="btn btn-primary btn-sm dropdown-toggle" aria-expanded="false" data-bs-toggle="dropdown" type="button"> <i class="fa fa-ellipsis-h d-lg-flex justify-content-lg-center"></i> </button> <div class="dropdown-menu notSidebar shadow dropdown-menu-end animated--fade-in"> <a class="dropdown-item notSidebar" href="/pest_and_disease/diagnose_details?id=' + list[i].diagnosis_id + '" >&nbsp;View Details</a> </div> </div> </td> </tr>');
			// 	}
			// });	
		});


		$("#farm_selected, #year_selected").on("change", function(){
			//CHANGE OF FARM
			var id =$(".nav-link.active").attr("id");
			// alert(id);
			var farm_id = $("#farm_selected").val();
			var year = $("#year_selected").val();
			if(id == "all-tab"){
				$("#all_frequency").empty();
				renew("all", farm_id);
			}
			else if(id == "pests-tab"){
				$("#pest_frequency").empty();
				renew("Pest", farm_id);
			}
			else if(id == "diseases-tab"){
				$("#disease_frequency").empty();
				renew("Disease", farm_id);
			}

			// var pd = $("#frequency_pd_id").val();
			// pd = pd.split("|");
			// var pd_id = pd[0];
			// var type = pd[1];
			// $.get("/ajaxGetDiagnosisList", {pd_id: pd_id, type : type, farm_id : farm_id, year : year}, function(list){
			// 	$("#diagnoses_list_table").empty();
			// 	var i;
			// 	// $("#pd_name").text(list[0].pd_name);
			// 	// $("#pd_type").text(list[0].type);
			// 	// $("#pd_desc").text(list[0].pd_desc);
			// 	for(i = 0; i < list.length; i++){
			// 		$("#diagnoses_list_table").append('<tr><td>' + list[i].date_diagnosed + '</td> <td>' + list[i].date_solved + '</td> <td>' + list[i].farm_name + '</td> <td>' + list[i].crop_plan + '</td> <td>' + list[i].stage_diagnosed + '</td> <td> <div class="dropdown no-arrow" style="width : 50px;"> <button id="more" class="btn btn-primary btn-sm dropdown-toggle" aria-expanded="false" data-bs-toggle="dropdown" type="button"> <i class="fa fa-ellipsis-h d-lg-flex justify-content-lg-center"></i> </button> <div class="dropdown-menu notSidebar shadow dropdown-menu-end animated--fade-in"> <a class="dropdown-item notSidebar" href="/pest_and_disease/diagnose_details?id=' + list[i].diagnosis_id + '" >&nbsp;View Details</a> </div> </div> </td> </tr>');
			// 	}
			// });	

			var farm_id = $("#farm_selected").val();
			var year = $("#year_selected").val();
			var pd = $("#frequency_pd_id").val();
			pd = pd.split("|");
			var pd_id = pd[0];
			var type = pd[1];
			
			//empty tables and chart
			$("#diagnoses_list_table").empty();
			$("#diagnoses_numbers").empty();
			$("#pd_probability").text("0");
			$("#pd_common_stage").text("N/A");
			$("#pd_stage_count").text("0")
			$("#pd_highest_month").text("N/A");
			$("#pd_highest_month_count").text("0");
			
			$.get("/ajaxGetDiagnosisList", {pd_id: pd_id, type : type, farm_id : farm_id, year : year}, function(list){
				if(list.length > 0){
					$("#pd_common_stage").text(list[0].common_stage);
					$("#pd_stage_count").text(list[0].count);
				}
				

				var i;
				// $("#pd_name").text(list[0].pd_name);
				// $("#pd_type").text(list[0].type);
				// $("#pd_desc").text(list[0].pd_desc);
				for(i = 0; i < list.length; i++){
					$("#diagnoses_list_table").append('<tr><td>' + list[i].date_diagnosed + '</td> <td>' + list[i].date_solved + '</td> <td>' + list[i].farm_name + '</td> <td>' + list[i].crop_plan + '</td> <td>' + list[i].stage_diagnosed + '</td> <td> <div class="dropdown no-arrow" style="width : 50px;"> <button id="more" class="btn btn-primary btn-sm dropdown-toggle" aria-expanded="false" data-bs-toggle="dropdown" type="button"> <i class="fa fa-ellipsis-h d-lg-flex justify-content-lg-center"></i> </button> <div class="dropdown-menu notSidebar shadow dropdown-menu-end animated--fade-in"> <a class="dropdown-item notSidebar" href="/pest_and_disease/diagnose_details?id=' + list[i].diagnosis_id + '" >&nbsp;View Details</a> </div> </div> </td> </tr>');
				}
				
			});	


			//For chart 2
			$.get("/ajaxUpdateChart",  {type : type, farm_id : farm_id, year : year, pd_id: pd_id}, function(diagnosis_chart){
				var i, table;
				var farm_name, year_name;
				if(farm_id == "all"){
					farm_name = "All Farms";
				}
				else{
					farm_name = $("#farm_selected option:selected").text();
				}
				if(year == ""){
					year_name = "Past 5 years";
				}
				else if(year == "all")
					year_name = "All-time";
				else{
					year_name = $("#year_selected option:selected").text();
				}
				$("#chart_title").text(year_name + " " + $("#frequency_pd_id option:selected").text() + " Occurrences for " + farm_name);

				$("#pd_highest_month").text(diagnosis_chart.highest_month);
				$("#pd_highest_month_count").text(diagnosis_chart.highest_month_count);
				table = "#diagnoses_chart"; 
				$(table).empty();
				for(i = 0; i < diagnosis_chart.month_frequency.length; i++){
					$(table).append('<li><div class="bar" value="' + diagnosis_chart.month_frequency[i].frequency + '" data-percentage="' + diagnosis_chart.month_frequency[i].percent + '"></div><span>' + diagnosis_chart.month_frequency[i].month_label + '</span></li>');
				}

				table = "#diagnoses_numbers"; 
				$(table).append("<li><span>" + diagnosis_chart.highest + "</span></li>");
				$(table).append("<li><span>" + diagnosis_chart.middle + "</span></li>");

				$('.bars li .bar').each(function(key, bar){
					var percentage = $(this).data('percentage');
					$(this).animate({
						'height' : percentage + '%'
					},1000)
				});



				$.get('/generateRecommendationDiagnosis',{farm_name : farm_id, type : type, pd_id : pd_id}, function(result){
					//ADD THIS TO CHANGE OF CROP CALENDAR AND FARM TYPE
					if(farm_id == "all"){
						var radio = "hidden";
						var checked = "";
						for(i = 0; i < result.preventions.length; i++){
							$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" name="preventions['+i+']" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray;" '+ checked +' '+ radio +'> <span style="color: gray;" '+ radio +'>Create work order</span> </row> </div>');
						}
					}
					else{
						$("#prevention_table").empty();
						//Check if WO are existing
						$.get('/checkExistingPreventionWo', {preventions : result.preventions, farm_name : farm_id}, function(res2){
							var checked = "";
							var radio;
							if(res2.active_calendar){
								//NO EXISTING ID
								radio = "hidden";
								for(i = 0; i < result.preventions.length; i++){
									$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" name="preventions['+i+']" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray;" '+ checked +' '+ radio +'> <span style="color: gray;" '+ radio +'>Create work order</span> </row> </div>');
								}
							}
							else{
								$("#prevention_calendar_id").val(res2.calendar_id);
								radio = "";
								var i;
								for(i = 0; i < res2.preventions.length; i++){
									if(res2.preventions[i].made){
										checked = "checked disabled";
									}
									else
										checked = " ";
									$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" name="preventions['+i+']" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray;" '+ checked +' '+ radio +'> <span style="color: gray;" '+ radio +'>Create work order</span> </row> </div>');
								}
							}
						});
					}
				});

			});

			
			$.get('/ajaxGetSingleProbability', {pd_id : pd_id, type : type, farm_id : farm_id}, function(probability){
				$("#pd_probability").text(probability.probability + "%");
				update_color_meter();
			});
			
		});



		$("#frequency_type").on("change", function(){
        
			var type = $(this).val();
			$("#frequency_pd_id").empty();
			$.get("/ajaxGetPestandDisease", {type : type}, function(pd_list){
				var i; 
				for(i = 0; i < pd_list.length; i++){
					$("#frequency_pd_id").append('<option value="' + pd_list[i].pd_id +'|' + type + '">' + pd_list[i].pd_name +'</option>');
				}
			});

			var farm_id = $("#farm_selected").val();
			var year = $("#year_selected").val();
			var pd = $("#frequency_pd_id").val();
			pd = pd.split("|");
			var pd_id = pd[0];
			var type = pd[1];
			
			//empty tables and chart
			$("#diagnoses_list_table").empty();
			$("#diagnoses_numbers").empty();
			$("#pd_probability").text("0");
			$("#pd_common_stage").text("N/A");
			$("#pd_stage_count").text("0")
			$("#pd_highest_month").text("N/A");
			$("#pd_highest_month_count").text("0");


			$.get("/ajaxGetDiagnosisList", {pd_id: pd_id, type : type, farm_id : farm_id, year : year}, function(list){
				$("#diagnoses_list_table").empty();
				$("#pd_common_stage").text(list[0].common_stage);
				$("#pd_stage_count").text(list[0].count);
				var i;
				// $("#pd_name").text(list[0].pd_name);
				// $("#pd_type").text(list[0].type);
				// $("#pd_desc").text(list[0].pd_desc);
				for(i = 0; i < list.length; i++){
					$("#diagnoses_list_table").append('<tr><td>' + list[i].date_diagnosed + '</td> <td>' + list[i].date_solved + '</td> <td>' + list[i].farm_name + '</td> <td>' + list[i].crop_plan + '</td> <td>' + list[i].stage_diagnosed + '</td> <td> <div class="dropdown no-arrow" style="width : 50px;"> <button id="more" class="btn btn-primary btn-sm dropdown-toggle" aria-expanded="false" data-bs-toggle="dropdown" type="button"> <i class="fa fa-ellipsis-h d-lg-flex justify-content-lg-center"></i> </button> <div class="dropdown-menu notSidebar shadow dropdown-menu-end animated--fade-in"> <a class="dropdown-item notSidebar" href="/pest_and_disease/diagnose_details?id=' + list[i].diagnosis_id + '" >&nbsp;View Details</a> </div> </div> </td> </tr>');
				}
			});	


			//For chart 2
			$.get("/ajaxUpdateChart",  {type : type, farm_id : farm_id, year : year, pd_id: pd_id}, function(diagnosis_chart){
				var i, table;
				var farm_name, year_name;
				if(farm_id == "all"){
					farm_name = "All Farms";
				}
				else{
					farm_name = $("#farm_selected option:selected").text();
				}
				if(year == ""){
					year_name = "Past 5 years";
				}
				else if(year == "all")
					year_name = "All-time";
				else{
					year_name = $("#year_selected option:selected").text();
				}
				$("#chart_title").text(year_name + " " + $("#frequency_pd_id option:selected").text() + " Occurrences for " + farm_name);

				$("#pd_highest_month").text(diagnosis_chart.highest_month);
				$("#pd_highest_month_count").text(diagnosis_chart.highest_month_count);
				table = "#diagnoses_chart"; 
				$(table).empty();
				for(i = 0; i < diagnosis_chart.month_frequency.length; i++){
					$(table).append('<li><div class="bar" value="' + diagnosis_chart.month_frequency[i].frequency + '" data-percentage="' + diagnosis_chart.month_frequency[i].percent + '"></div><span>' + diagnosis_chart.month_frequency[i].month_label + '</span></li>');
				}

				table = "#diagnoses_numbers"; 
				$(table).empty();
				$(table).append("<li><span>" + diagnosis_chart.highest + "</span></li>");
				$(table).append("<li><span>" + diagnosis_chart.middle + "</span></li>");

				$('.bars li .bar').each(function(key, bar){
					var percentage = $(this).data('percentage');
					$(this).animate({
						'height' : percentage + '%'
					},1000)
				});
			});

			$.get('/generateRecommendationDiagnosis',{farm_name : farm_id, type : type, pd_id : pd_id}, function(result){
				$("#symptom_table").empty();
				for(i = 0; i < result.symptoms.length; i++){
					$("#symptom_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card details" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.symptoms[i].detail_name + '</h4> <p style="color: gray;">' + result.symptoms[i].detail_desc + '</p> </div>');
				}
				
				//ADD THIS TO CHANGE OF CROP CALENDAR AND FARM TYPE
				if(farm_id == "all"){
					var radio = "hidden";
					var checked = "";
					for(i = 0; i < result.preventions.length; i++){
						$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" name="preventions['+i+']" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray;" '+ checked +' '+ radio +'> <span style="color: gray;" '+ radio +'>Create work order</span> </row> </div>');
					}
				}
				else{
					$("#prevention_table").empty();
					//Check if WO are existing
					$.get('/checkExistingPreventionWo', {preventions : result.preventions, farm_name : farm_id}, function(res2){
						var checked = "";
						var radio;
						if(res2.active_calendar){
							//NO EXISTING ID
							radio = "hidden";
							for(i = 0; i < result.preventions.length; i++){
								$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" name="preventions['+i+']" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray;" '+ checked +' '+ radio +'> <span style="color: gray;" '+ radio +'>Create work order</span> </row> </div>');
							}
						}
						else{
							$("#prevention_calendar_id").val(res2.calendar_id);
							radio = "";
							var i;
							for(i = 0; i < res2.preventions.length; i++){
								if(res2.preventions[i].made){
									checked = "checked disabled";
								}
								else
									checked = " ";
								$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" name="preventions['+i+']" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray;" '+ checked +' '+ radio +'> <span style="color: gray;" '+ radio +'>Create work order</span> </row> </div>');
							}
						}
					});
				}
			});

			$.get('/ajaxGetSingleProbability', {pd_id : pd_id, type : type, farm_id : farm_id}, function(probability){
				$("#pd_probability").text(probability.probability + "%");
				update_color_meter();
			});
		});
	}
});


$(document).on("change","#frequency_pd_id", function(){
	// alert("sad");
	var farm_id = $("#farm_selected").val();
	var year = $("#year_selected").val();
	var pd = $("#frequency_pd_id").val();
	pd = pd.split("|");
	var pd_id = pd[0];
	var type = pd[1];
	
	//empty tables and chart
	$("#diagnoses_list_table").empty();
	$("#diagnoses_numbers").empty();
	$("#pd_probability").text("0");
	$("#pd_common_stage").text("N/A");
	$("#pd_stage_count").text("0")
	$("#pd_highest_month").text("N/A");
	$("#pd_highest_month_count").text("0");
	
	$.get("/ajaxGetDiagnosisList", {pd_id: pd_id, type : type, farm_id : farm_id, year : year}, function(list){
		$("#diagnoses_list_table").empty();
		$("#pd_common_stage").text(list[0].common_stage);
		$("#pd_stage_count").text(list[0].count);
		var i;
		// $("#pd_name").text(list[0].pd_name);
		// $("#pd_type").text(list[0].type);
		// $("#pd_desc").text(list[0].pd_desc);
		for(i = 0; i < list.length; i++){
			$("#diagnoses_list_table").append('<tr><td>' + list[i].date_diagnosed + '</td> <td>' + list[i].date_solved + '</td> <td>' + list[i].farm_name + '</td> <td>' + list[i].crop_plan + '</td> <td>' + list[i].stage_diagnosed + '</td> <td> <div class="dropdown no-arrow" style="width : 50px;"> <button id="more" class="btn btn-primary btn-sm dropdown-toggle" aria-expanded="false" data-bs-toggle="dropdown" type="button"> <i class="fa fa-ellipsis-h d-lg-flex justify-content-lg-center"></i> </button> <div class="dropdown-menu notSidebar shadow dropdown-menu-end animated--fade-in"> <a class="dropdown-item notSidebar" href="/pest_and_disease/diagnose_details?id=' + list[i].diagnosis_id + '" >&nbsp;View Details</a> </div> </div> </td> </tr>');
		}
		
	});	

	


	//For chart 2
	$.get("/ajaxUpdateChart",  {type : type, farm_id : farm_id, year : year, pd_id: pd_id}, function(diagnosis_chart){
		var i, table;
		var farm_name, year_name;
		if(farm_id == "all"){
			farm_name = "All Farms";
		}
		else{
			farm_name = $("#farm_selected option:selected").text();
		}
		if(year == ""){
			year_name = "Past 5 years";
		}
		else if(year == "all")
			year_name = "All-time";
		else{
			year_name = $("#year_selected option:selected").text();
		}
		$("#chart_title").text(year_name + " " + $("#frequency_pd_id option:selected").text() + " Occurrences for " + farm_name);

		$("#pd_highest_month").text(diagnosis_chart.highest_month);
		$("#pd_highest_month_count").text(diagnosis_chart.highest_month_count);
		table = "#diagnoses_chart"; 
		$(table).empty();
		for(i = 0; i < diagnosis_chart.month_frequency.length; i++){
			$(table).append('<li><div class="bar" value="' + diagnosis_chart.month_frequency[i].frequency + '" data-percentage="' + diagnosis_chart.month_frequency[i].percent + '"></div><span>' + diagnosis_chart.month_frequency[i].month_label + '</span></li>');
		}

		table = "#diagnoses_numbers"; 
		$(table).empty();
		$(table).append("<li><span>" + diagnosis_chart.highest + "</span></li>");
		$(table).append("<li><span>" + diagnosis_chart.middle + "</span></li>");

		$('.bars li .bar').each(function(key, bar){
			var percentage = $(this).data('percentage');
			$(this).animate({
				'height' : percentage + '%'
			},1000)
		});
	});

	$.get('/generateRecommendationDiagnosis',{farm_name : "all", type : type, pd_id : pd_id}, function(result){
		$("#symptom_table").empty();
		for(i = 0; i < result.symptoms.length; i++){
			$("#symptom_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card details" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.symptoms[i].detail_name + '</h4> <p style="color: gray;">' + result.symptoms[i].detail_desc + '</p> </div>');
		}


		//ADD THIS TO CHANGE OF CROP CALENDAR AND FARM TYPE
		if(farm_id == "all"){
			var radio = "hidden";
			var checked = "";
			$("#prevention_table").empty();
			for(i = 0; i < result.preventions.length; i++){
				$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p class="ellipsis" style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" name="preventions['+i+']" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray;" '+ checked +' '+ radio +'> <span style="color: gray;" '+ radio +'>Create work order</span> </row> </div>');
			}
		}
		else{
			$("#prevention_table").empty();
			//Check if WO are existing
			$.get('/checkExistingPreventionWo', {preventions : result.preventions, farm_name : farm_id}, function(res2){
				var checked = "";
				var radio;
				if(res2.active_calendar){
					//NO EXISTING ID
					radio = "hidden";
					for(i = 0; i < result.preventions.length; i++){
						$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p <p class="ellipsis" style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" name="preventions['+i+']" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray;" '+ checked +' '+ radio +'> <span style="color: gray;" '+ radio +'>Create work order</span> </row> </div>');
					}
				}
				else{
					$("#prevention_calendar_id").val(res2.calendar_id);
					radio = "";
					var i;
					for(i = 0; i < res2.preventions.length; i++){
						if(res2.preventions[i].made){
							checked = "checked disabled";
						}
						else
							checked = " ";
						$("#prevention_table").append('<div class="card-body card cards-shadown aos-init mini-card symptom-card" data-aos="flip-left" data-aos-duration="350" > <h4 class="card-title" style="color: #657429 !important;">' + result.preventions[i].detail_name + '</h4> <p style="height : 60%; color: gray;">'+ result.preventions[i].detail_desc +'</p> <row class="text-right" style="bottom: 0px; align: right;"> <input type="checkbox" name="preventions['+i+']" form="create_preventions_form" value="'+i+'|'+result.preventions[i].detail_name+'|'+result.preventions[i].detail_desc + '" style="padding-right : 10px; color: gray;" '+ checked +' '+ radio +'> <span style="color: gray;" '+ radio +'>Create work order</span> </row> </div>');
					}
				}
			});
		}
	});

	$.get('/ajaxGetSingleProbability', {pd_id : pd_id, type : type, farm_id : farm_id}, function(probability){
		$("#pd_probability").text(probability.probability + "%");
		update_color_meter();
	});
});
