$(document).ready(function() {
	jQuery.ajaxSetup({async: false });

	if (view == 'add_crop_calendar') {
		var farm_name;
		var chosen_seed;
		var training_set = [];
		var testing_set = [];
		$('.next_step').on('click', function() {
			if (currentTab == 1) {
				farm_name = $('#farm_id option:selected').text();
				chosen_seed = $('#seed_id option:selected').val();
				//console.log(chosen_seed);
				$.get('/agroapi/polygon/readAll', {}, function(polygons) {
					var selected = polygons.filter(e => e.name == farm_name)[0];
					console.log(selected);
					$.get('/get_calendar_variables', { farm_name: selected.name }, function(cal_item) {
						console.log(cal_item);
						if (cal_item.result != null || cal_item.result != undefined) {
							cal_item = cal_item.result;

							$.get('/get_forecast_records', { calendar_id: cal_item.map(({ calendar_id }) => calendar_id) }, function(forecast_records) {
								delete forecast_records.forecast;

								for (var o = 0; o < forecast_records.length; o++) {
									training_set.push(Object.values(forecast_records[o]));
								}
								console.log(training_set);
								testing_set = training_set.slice();
				
								for (var i = 0; i < testing_set.length/2; i++) {
									testing_set.shift();
								}
								testing_set[testing_set.length-1][4] = chosen_seed;
								$.ajax({
									url: '/create_yield_forecast',
									type: 'GET',
									data: { training: training_set, testing: testing_set },
									contentType: "application/json; charset=utf-8",
									dataType: "json",
									success: function(forecast) {
										console.log(forecast);
										var forecasted_yield = forecast[0][5];
										$('#seed_expected_yield').val(Math.round(forecasted_yield));
										$('#seed_expected_yield1').html(`${Math.round(forecasted_yield)} cavans/ha`);
									},
									error: function(err) {
										console.log('Oops something went wrong!');
										$('#seed_expected_yield').val('Insufficient data cannot make forecast!!');
										$('#seed_expected_yield1').html('Insufficient historical data to make forecast');
									}
								})
							});			
						}
						else {
							console.log('Insufficient historical data to make forecast');
							$('#seed_expected_yield').val('Insufficient historical data to make forecast');
							$('#seed_expected_yield1').html('Insufficient historical data to make forecast');
						}

					});

				});
			}
		});

		$('#farm_id').on('change', function() {
			farm_name = $('#farm_id option:selected').text();
		});

		$('#seed_id').on('change', function() {
			chosen_seed = $('#seed_id option:selected').val();
			console.log(training_set);
			testing_set[testing_set.length-1][4] = chosen_seed;
			$.ajax({
				url: '/create_yield_forecast',
				type: 'GET',
				data: { training: training_set, testing: testing_set },
				contentType: "application/json; charset=utf-8",
				dataType: "json",
				success: function(forecast) {
					console.log(forecast);
					var forecasted_yield = forecast[0][5];
					$('#seed_expected_yield').val(Math.round(forecasted_yield));
				},
				error: function(err) {
					console.log('Oops something went wrong!');
					$('#seed_expected_yield').val('Insufficient data cannot make forecast!!');
				}
			})
		});
	}
	else if (view == 'farm_monitoring' || view == 'farm_monitoring_test') {
		var selected_farm;
		var curr_calendar;

		curr_calendar = parseInt($("#crop_calendar_list").val());
			console.log('Calendar: '+curr_calendar);

		if (curr_calendar != null && !Number.isNaN(curr_calendar)) {
			$.get('/get_forecast_records', { calendar_id: [curr_calendar] }, function(forecast_records) {
				console.log(forecast_records);
				$('#forecast_yield').html('N/A');
				if (forecast_records.length != 0) {
					var str = forecast_records[0].forecast != -1 ? (Math.round(forecast_records[0].forecast))+' sacks/ha' : 'N/A';
					$('#forecast_yield').html(str);
				}
			});
		}
		else {
			console.log('Error handling!');
			$('#forecast_yield').html('N/A');
		}

		//On active farm change
		$('#monitor_farm_list').on('click', '.farm_li', function() {
			//Initialize selected farm and active calendar
			//selected_farm = $($('#monitor_farm_list').children()[0]).html();
			//curr_calendar = $("#crop_calendar_list").val();
			selected_farm = $(this).html();
			curr_calendar = null;
			curr_calendar = $("#crop_calendar_list").val();
			console.log('Calendar: '+curr_calendar);

			if (curr_calendar != null && !Number.isNaN(curr_calendar)) {
				$.get('/get_forecast_records', { calendar_id: [curr_calendar] }, function(forecast_records) {
					console.log(forecast_records);
					$('#forecast_yield').html('N/A');
					if (forecast_records.length != 0) {
						var str = forecast_records[0].forecast != -1 ? (Math.round(forecast_records[0].forecast))+' sacks/ha' : 'N/A';
						$('#forecast_yield').html(str);
					}
				});
			}
			else {
				console.log('No existing crop calendar record cannot make forecast!');
				$('#forecast_yield').html('N/A');
			}

		});
	
		//On active calendar change
		$('#detailed_cont').on('change', '#crop_calendar_list', function() {
			curr_calendar = null;
			curr_calendar = $("#crop_calendar_list").val();
			console.log('Calendar: '+curr_calendar);

			$.get('/get_forecast_records', { calendar_id: [curr_calendar] }, function(forecast_records) {
				console.log(forecast_records);
				$('#forecast_yield').html('N/A');
				if (forecast_records.length != 0) {
					var str = forecast_records[0].forecast != -1 ? (Math.round(forecast_records[0].forecast))+' sacks/ha' : 'N/A';
					$('#forecast_yield').html(str);
				}
			});
		});
	}

});