function preparePolygonCoordinates(data) {
	var result_arr = [];
	var temp_arr = [];

	data.push(data[0]);
	for (var i = 0; i < data.length; i++) {
		temp_arr.push([ data[i].lng, data[i].lat ]);
	}
	result_arr.push(temp_arr);
	return result_arr;
}

function prepareWorkerIDs(emp_arr, farm_id, status) {
	var str = '';
	for (var i = 0; i < emp_arr.length; i++) {
		if (str != 0)
			str += ', ';
		str += "("+emp_arr[i].value+","+farm_id+',"'+status+'")'
	}
	return str;
}

$(document).ready(function() {
	$('#forecast_check').on('click', function() {
		var d1 = new Date(Date.now());
		var d2 = new Date(Date.now());
		d2.setDate(d2.getDate() - 15);

		$.get('/agroapi/weather/forecast', { start: d2, end: d1 }, function(result) {
			for (var i = 0; i < result.forecast.length; i++) {
				console.log(result.forecast[i]);
			}
		});
	});

	$('#test_historical').on('click', function() {
		var d1 = new Date(Date.now());
		var d2 = new Date(Date.now());
		d2.setDate(d2.getDate() - 365);

		$.get('/agroapi/weather/history', { start: d2, end: d1 }, function(result) {
			console.log(result);
		});
	});

	$('.farm_delete').on('click', function() {
		var delete_name = $(this).val();
		var polyid, name;
		$.get('/agroapi/polygon/readAll', { }, function(list) {
			for (var i = 0; i < list.polygon_list.length; i++) {
				polyid = list.polygon_list[i].id;
				name = list.polygon_list[i].name

				if (delete_name === name)
					i == list.polygon_list.length
			}

			$.get('/agroapi/polygon/delete', { polyid: polyid }, function(result) {
				window.location.href = "/deleteFarmRecord/"+name;
			});
		});
	})

	$('#create_farm_form').on('submit', function(e) {
		e.preventDefault();

		var form_data = $('#create_farm_form').serializeJSON();
		
		form_data.coordinates = [];

		form_data.coordinates.push(preparePolygonCoordinates(coordinate_arr));
		console.log(form_data);
		$.post('/readFarmDetails', form_data, function(farm_record) {
			console.log(farm_record);
			if (farm_record.farm_list.length == 0) {

				$.post('/agroapi/polygon/create', form_data, function(result) {
					// Create db record of farm
					console.log(result);
		        	if (result.success) {
		        		$.post('/createFarmRecord', form_data, function(db_record) {
		        			if (db_record.success) {
		        				var workers = $('[name="worker_checkbox"]').serializeArray();

		        				if (workers.length != 0) {
		        					var status = 'Active';
		        					var m = prepareWorkerIDs(workers, db_record.farm_id, status);

		        					$.post('/assign_farmers', { query: m }, function(assign_farmer) {
			        					console.log(assign_farmer);
			        					if (assign_farmer.success) {
			        						console.log('success');
			        						window.location.href = "/farms";
			        					}
			        					else {

			        					}
			        				});
		        				}
		        				else {
		        					window.location.href = "/farms";
		        				}
		        				
		        			}
		        			// Show error message
		        			else {
		        				console.log('db error:');
		        				console.log(db_record);
		        			}
		        		});
		        	}
		        	// Something went wrong with API create error message
		        	else {
		        		console.log('api err:');
		        		console.log(result);
		        	}
		        });
			}
			// Create error message that farm name already exists
			else {
				console.log('get farm error');
			}

		});
	});


})