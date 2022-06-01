function processModalStep(origin, selector) {
	var step = selector.replace(/\D/g, "");
	var proceed = true;
	if (view == 'add_farm') {
		proceed = dataValidation(step);
	}

	else if (view == 'add_crop_calendar') {
		proceed = dataValidation(step);
	}

	if (proceed) {
		$('#'+origin).toggleClass('hide');
		$('#body'+origin).toggleClass('hide');

		$('#'+selector).toggleClass('hide');
		$('#body'+selector).toggleClass('hide');
	}
}

function resetForm(form_id) {
	$('#'+form_id).trigger('reset');

	$('.modal_body_content, .modal_footer_content').addClass('hide');

	$('#body_step1').removeClass('hide');
	$('#_step1').removeClass('hide');
}

function dataValidation(step) {
	var pass = true;
	var inp = [];
	var val;
	$('.inp-error').remove();

	if (view == 'add_farm') {
		if (step == 2) {
			inp = ['#farmName', '#farm_mngr_cont'];
		}
		else if (step == 3) {
			pass = validatePolygon();

			if (!pass) {
				$('#geotag_lbl').after().append('<label class="inp-error">Please select at least 4 points</label>');
			}
		}
	}

	else if (view == 'add_crop_calendar') {
		if (step == 2) {
			inp = ['#crop_plan', '#farm_id', '#land_prep_date_start', '#land_prep_date_end'];
		}

		else if (step == 3) {
			inp = ['#seed_id', '#seed_rate', '#method', '#sowing_date_start', '#sowing_date_end', '#harvest_date_start', '#harvest_date_end'];
		}

		else if (step == 4) {
			inp = ["input[name='manual_date']", "select[name='manual_fertilizer']", "textarea[name='manual_desc']", "input[name='manual_amt']"];
		}
	}

	for (var i = 0; i < inp.length; i++) {
		var m = $(inp[i]).map(function(){return $(this).val();}).get();

		for (var x = 0; x < m.length; x++) {
			if (inp[i] == '#seed_rate') {
				if (isNaN(m[x]) || m[x] == '') {
					var parent = $(inp[i]).eq(x).parent().append('<label class="inp-error">This field is required</label>');
					pass = false;
				}
			}
			else {
				if (m[x] == '' || m[x] == undefined) {
					var parent = $(inp[i]).eq(x).parent().append('<label class="inp-error">This field is required</label>');
					pass = false;
				}
			}
				
		}	
	}

	return pass;
}

function validatePolygon() {
	var pass = false;

	if (coordinate_arr.length >= 4) {
		pass = true;
	}

	return pass;
}

$(document).ready(function() {

	$('.prev_step, .next_step').on('click', function() {
		if($(this).attr("id") == "add_diagnosis_btn1"){
			var today = new Date();
			if(!$("#date_diagnosed").val() || $("#date_diagnosed").val() > (today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate())){
				alert("Enter proper date");
			}
			else if($("input:radio.diagnosis_radio:checked").length == 0 )
				alert("Select Pest/Disease");
			else if($(".symptom-checkbox:checkbox:checked").length == 0)
				alert("Select Symptoms");
			else{
				//GENERATE RECOMMENDATION
				var diagnosis = $("input:radio.diagnosis_radio:checked").val();
				diagnosis = diagnosis.split("|");
				var id = diagnosis[0];
				var type = diagnosis[1];
				$.get('/generateRecommendationDiagnosis',{farm_name : $("#farm_id option:selected").text(), type : type, pd_id : id}, function(result){
					var i;
					console.log(result.symptoms);
					console.log(result.recommend_solutions);
					$("#symptom_list").empty();
					$("#recommended_solutions").empty()
					// for(i = 0; i < result.symptoms.length; i++)
					// 	$("#symptom_list").append('<div class="row"><div class="col-xl-12"><div class="form-check" style="margin-left: 15px;"><input name="symptom[' + i + ']" id="" class="form-check-input symptom-checkbox" type="checkbox" value="' + result.symptoms[i].symptom_id +'" form="add_diagnosis_form" checked><label class="form-check-label font-weight-bold" for="formCheck-2" >' + result.symptoms[i].detail_name +'</label></div></div></div>');
					for(i = 0; i < result.recommended_solutions.length; i++)
						$("#recommended_solutions").append('<div class="row"><div class="col-lg-3"><label class="form-check-label font-weight-bold" for="formCheck-2" >' + result.recommended_solutions[i].date_words + '</label></div><div class="col-lg-3"><label class="form-check-label font-weight-bold" for="formCheck-2" >' + result.recommended_solutions[i].type + '</label></div><div class="col-lg-5"><label class="form-check-label font-weight-bold" for="formCheck-2" style="max-width: 350px;overflow: hidden;white-space: nowrap; text-overflow: ellipsis;">' + result.recommended_solutions[i].desc + '</label></div><div class="col-lg-1"><input  checked name="solution[' + i + ']" id="" class="form-check-input symptom-checkbox" type="checkbox" value="' + result.recommended_solutions[i].date + '|' + result.recommended_solutions[i].type + '|' + result.recommended_solutions[i].desc + '" form="add_diagnosis_form"></div></div>');
				});
				processModalStep($(this).parent().attr('id'), $(this).val());
				
			}
		}
		else{
			processModalStep($(this).parent().attr('id'), $(this).val());
		}
	});
	$('[data-dismiss="modal"]').on('click', function() {
		if($("#update_purchase_btn").val() == "Pending"){
			$("#process_step").toggle("show");
		}
		else if($("#update_purchase_btn").val() == "Processing"){
		   $("#purchase_step").toggle("show");
		}
		resetForm($(this).val());
	});
})