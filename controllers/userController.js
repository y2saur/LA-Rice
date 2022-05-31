const userModel = require('../models/userModel');
const employeeModel = require('../models/employeeModel');
const farmModel = require('../models/farmModel');
const systemSettingModel = require('../models/systemSettingModel.js');
const { validationResult } = require('express-validator');
const dataformatter = require('../public/js/dataformatter.js');
const bcrypt = require('bcrypt');
const js = require('../public/js/session.js');
const globe = require('../controllers/smsController.js');
const smsModel = require('../models/smsModel.js');
const e = require('connect-flash');

const saltRounds = 10;

function initializeSessionInfo(session, obj, system_settings) {
	var date = new Date();
	date = dataformatter.formatDate(date, 'YYYY-MM-DD')

	session.authority = obj.access_level;
	session.username = obj.username;
	session.employee_id = obj.employee_id;
	
	session.cur_date = system_settings.system_date;
	console.log(session.cur_date);
	return session;
}

exports.loadRegistration = function(req, res) {
	var html_data = {};
	html_data["title"] = "User Management";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'user_management', req.session);
	html_data["notifs"] = req.notifs;

	employeeModel.queryEmployee(null, function(err, result) {
		if (err)
			throw err;
		else {
			html_data['employee_list'] = { activeUsers: result.filter(e=>e.isAccActive == 1), isActiveEmployees: result.filter(e=>e.isActive == 1 && (e.isAccActive == null || e.isAccActive == 0)), 
				isInactiveEmployees: result.filter(e=>e.isActive == null || e.isActive == 0) };
			res.render('user_management', html_data );
		}
	});
}

exports.deactivateAccount = function(req, res) {
	employeeModel.queryEmployee({username:req.query.username}, function(err, emp) {
		if (err)
			throw err;
		else {
			if (emp.length != 0) {
				var status;
				if (req.query.status == 'deactivate') {
					status = 0;
					userModel.deleteUser({ username: req.query.username }, function(err, result) {
						if (err)
							throw err;
						else {
							req.flash('success_msg', "User account deactivated: " + req.query.username);
							res.redirect('/user_management');
						}
					});
				}
				else {
					//Err message
					res.redirect('/user_management');
				}
			}
			else {
				//Err message
				res.redirect('/user_management');
			}	
		}
	});
			
}

exports.registerUser = function(req, res) {
	const errors = validationResult(req);
	
	if (errors.isEmpty()) {
		const saltRounds = 10;
		var { register_checkbox, register_level } = req.body;
		console.log(Array.isArray(register_checkbox));
		if(!Array.isArray(register_checkbox)){
			register_checkbox = [];
			register_checkbox.push(req.body.register_checkbox);
		}
		userModel.createRegistrationDetails(register_checkbox, function(err, detail_result) {
			if (err)
				throw err;
			else {
				for (var i = 0; i < detail_result.length; i++) {
					detail_result[i]['employee_id'] = register_checkbox[i];
					detail_result[i]['access_level'] = register_level[i];
					detail_result[i]['password'] = null;
				}
				
				console.log(detail_result);
				userModel.registerUser(detail_result, function(err, result) {
					if (err)
						throw err;
					else {
						//Insert SMS msg of OTP for first login here
						smsModel.getSubscriptions(function(err, subs){
							var otp_msg = "";
							for(var i = 0; i < detail_result.length; i++){
								var subscribed = false;
								for(var x = 0; x < subs.length; x++)
									if(subs[x].employee_id == detail_result[i].employee_id && subs[x].access_token != null){
										//send sms
										globe.sendSMS(subs[x], "One Time Password: " + detail_result[i].otp);//add opt
										console.log(detail_result[i].employee_id + ": SEND SMS");
										req.flash('success_msg', "User account created for: " + detail_result[i].username + ". Instruct user to check their phone for the OTP.");
										subscribed = true;
									}
								if(!subscribed)
									// otp_msg = otp_msg + detail_result[i].username + ": " + detail_result[i].otp + "\n";
									otp_msg = otp_msg + "User account created for: " + detail_result[i].username + '. Instruct unsubscribed user to send "INFO" to 21663543 to receive ' + "OTP(" + detail_result[i].otp + ").";
							}
							req.flash('error_msg', otp_msg);
							res.redirect('/user_management');
						});
					}
				});
				
			}
		});
	}
	else {
		const messages = errors.array().map((item) => item.msg);
		req.flash('error_msg', messages.join(' '));
		res.redirect('/user_management')
	}
};

exports.resendOTP = function(req, res) {
	employeeModel.queryEmployee({username:req.query.username}, function(err, emp) {
		if (err)
			throw err;
		else {
			if (emp.length != 0) {
				var status;
				if (req.query.status == 'resend') {
					status = 0;
					smsModel.getSubscriptions(function(err, subs){
						var otp_msg = "";
						for(var i = 0; i < emp.length; i++){
							var subscribed = false;
							for(var x = 0; x < subs.length; x++)
								if(subs[x].employee_id == emp[i].employee_id && subs[x].access_token != null){
									//send sms
									globe.sendSMS(subs[x], "One Time Password: " + emp[i].otp);//add opt
									console.log(emp[i].employee_id + ": SEND SMS");
									subscribed = true;
									req.flash('success_msg', "OTP sent to: " + emp[i].username);
								}
							if(!subscribed)
								otp_msg = otp_msg + 'User not subscribed (OTP: ' + emp[i].otp + '). ' + 'Instruct user to send "INFO" to 21663543.';
								// otp_msg = otp_msg + emp[i].username + ": " + emp[i].otp + "\n";
						}
						req.flash('error_msg', otp_msg);
						res.redirect('/user_management');
					});
				}
				else {
					//Err message
					req.flash('error_msg', "User not found. Please Try Again.");
					res.redirect('/user_management');
				}
			}
			else {
				//Err message
				res.redirect('/user_management');
			}	
		}
	});
			
}

exports.resetPassword = function(req, res) {
	var { username } = req.body;

	//Update user details in db => password to null and set new OTP
	userModel.updateAccount({ username: username }, { password: null, otp: [...Array(6)].map(() => Math.random().toString(36)[2]).join('') }, function(err, result) {
		if (err)
			throw err;
		else {
			//Get employee phone number
			employeeModel.queryEmployee({ username: username }, function(err, employee_details) {
				if (err)
					throw err;
				else if (employee_details[0] == null) {
					req.flash('error_msg', 'Invalid username. Please try again.');
					res.redirect('/reset_password');
				}
				else {
					console.log(employee_details);
					// Send OTP to user's phone number
					//Check if subscribed
					smsModel.getEmployeeDetails({ key : "employee_id", value : employee_details[0].employee_id}, function(err, employee){
						console.log(employee);

						if(employee[0].access_token == null){
							req.flash("error_msg", 'You are not subscribed. Send "INFO" to 21663543.');
							// res.redirect('/reset_password');
						}
						else{
							req.flash('success_msg', 'OTP sent to: ' + employee_details[0].username);
							globe.sendSMS(employee[0], "One Time Password: " + employee_details[0].otp);
						}
						res.redirect('/login');
					});
				}
			});
		}
	});
}

exports.getInitializePassword = function(req, res) {
	var html_data = { username: req.query.username, title: 'Account Setup | LA Rice Mill' };

	res.render('initialize_pass', html_data);
}

exports.initializePassword = function(req, res) {
	var { password, password1, username } = req.body
	var html_data = {};

	if (password == password1) {
		bcrypt.hash(password, saltRounds, (err, hashed) => {
			userModel.updateAccount({ username: username }, { password: hashed, otp: null }, function(err, result) {
				if (err)
					throw err;
				else {
					employeeModel.queryEmployee({ username: username }, function(err, user_details) {
						if (err)
							throw err;
						else {
							systemSettingModel.getCurrentSettings(function(err, system_settings) {
								if (err)
									throw err;
								else {
									// Update session object once matched!
									req.session = initializeSessionInfo(req.session, user_details[0], system_settings[0]);

									req.flash('success_msg', 'Password changed for: ' + user_details[0].username);
									
									res.redirect('/login');	
								}
							});
									
						}
					});	
				}
			});
		});
	}
	else {
		req.flash('error_msg', 'Passwords do not match. Please try again.');
		res.redirect(`/initialize_account?username=${username}`);
	}
}

exports.getDetailedUser = function(req, res) {
	var query = { user_id: req.params.user_id };
	var html_data = {};
	html_data["title"] = "User Management";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'user_management', req.session);
	html_data["notifs"] = req.notifs;

	employeeModel.queryEmployee(query, function(err, user_details) {
		if (err)
			throw err;
		else {
			console.log(user_details[0]);
			html_data["user_id"] = user_details[0].user_id;
			html_data["username"] = user_details[0].username;
			html_data["access_level"] = user_details[0].access_level;
			html_data["last_name"] = user_details[0].last_name;
			html_data["first_name"] = user_details[0].first_name;
			html_data["position"] = user_details[0].position;
			html_data["otp"] = user_details[0].otp;
			html_data["access_token"] = user_details[0].access_token;
			html_data["phone_number"] = '0' + user_details[0].phone_number;

			var query2 = { employee_id: user_details[0].employee_id };

			employeeModel.aggregatedEmployeeDetail(query2, function(err, employee_details) {
				if (err)
					throw err;
				else {
					farmModel.getAllFarms(function(err, farm_list) {
						if (err)
							throw err;
						else {
							//console.log(employee_details);
							html_data['employee_details'] = employee_details[0];
							html_data['farm_list'] = farm_list;
		
							if (employee_details[0].farm_id !== null) {
								farmModel.getAssignedFarmManagers(function(err, farm_mngrs) {
									if (err)
										throw err;
									else {
										html_data['farm_mngr'] = farm_mngrs.filter(e => e.farm_id == employee_details[0].farm_id)[0];
										console.log(html_data);
										res.render('detailed_user', html_data);
									}
								});
							}
							else {
								res.render('detailed_user', html_data);
							}
						}
					});
							
				}
			});
			
		}
	});
}

exports.getDetailedEmployee = function(req, res) {
	var query = { employee_id: req.params.employee_id };
	var html_data = {};
	html_data["title"] = "User Management";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'user_management', req.session);
	html_data["notifs"] = req.notifs;

	employeeModel.aggregatedEmployeeDetail(query, function(err, employee_details) {
		if (err)
			throw err;
		else {
			farmModel.getAllFarms(function(err, farm_list) {
				if (err)
					throw err;
				else {
					//console.log(employee_details);
					html_data['employee_details'] = employee_details[0];
					html_data['farm_list'] = farm_list;

					if (employee_details[0].farm_id != null) {
						farmModel.getAssignedFarmManagers(function(err, farm_mngrs) {
							if (err)
								throw err;
							else {
								html_data['farm_mngr'] = farm_mngrs.filter(e => e.farm_id == employee_details[0].farm_id)[0];
								console.log(html_data);
								res.render('detailed_employee', html_data);
							}
						});
					}
					else {
						res.render('detailed_employee', html_data);
					}
				}
			});
					
		}
	});
}

exports.getAddEmployee = function(req, res) {
	var html_data = {};
	html_data["title"] = "User Management";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'user_management', req.session);
	html_data["notifs"] = req.notifs;

	res.render('add_employee', html_data);
}

exports.registerEmployee = function(req, res) {
	var employee_obj = {
		position: req.body.position,
		last_name: req.body.last_name,
		first_name: req.body.first_name,
		phone_number: req.body.phone_number.substring(1)
	}

	var phone_number = req.body.phone_number.substring(1);

	employeeModel.queryEmployee({phone_number: phone_number}, function(err, emp) {
		if (err)
			throw err;
		else if (emp.length !== 0) {
			req.flash('error_msg', 'Mobile Number "' + req.body.phone_number + '" is already taken. Please input a different number.');
			res.redirect(`/user_management/add_employee`);	
		}
		else {
			employeeModel.addSingleEmployee(employee_obj, function(err, add_status) {
				if (err)
					throw err;
				else {
					if (req.body.farm_assignment != '...') {
						farmModel.assignFarmer({ employee_id: add_status.insertId, farm_id: req.body.farm_assignment, status: 'Active'}, function(err, assign_status) {
							if (err)
								throw err;
							else {
								console.log(assign_status);
							}
						});
					}
					req.flash('success_msg', "Employee record added for: " + req.body.first_name + ' ' + req.body.last_name);
					res.redirect('/user_management')
				}
			});	
		}
	});
}

exports.updateUserDetails = function(req, res) {
	var { username, access_level, password, password1, user_id} = req.body

	if (password == password1) {
		bcrypt.hash(password, saltRounds, (err, hashed) => {
			userModel.updateAccount({ username: username }, { password: hashed, access_level: access_level, otp: null}, function(err, result) {
				if (err)
					throw err;
				else {
					req.flash('success_msg', "User account updated for: " + username);
					res.redirect(`/user_management&id=${user_id}`);	
				}
			});
		});
	}

	else {
		req.flash('error_msg', 'Passwords do not match. Please try again.');
		res.redirect(`/user_management&id=${user_id}`);	
	}
	
}


exports.getProfile = function(req, res) {

	var username, query;
	var html_data = {};

	username = req.session.username;
	query = { username: username };

	html_data["title"] = "Profile";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'profile', req.session);
	html_data["notifs"] = req.notifs;

	employeeModel.queryEmployee(query, function(err, user_details) {
		if (err)
			throw err;
		else {
			console.log(user_details[0]);
			html_data["user_id"] = user_details[0].user_id;
			html_data["username"] = user_details[0].username;
			html_data["access_level"] = user_details[0].access_level;
			html_data["last_name"] = user_details[0].last_name;
			html_data["first_name"] = user_details[0].first_name;
			html_data["position"] = user_details[0].position;
			html_data["phone_number"] = '0' + user_details[0].phone_number;

			res.render('profile', html_data);
			
		}
	});
}

exports.updateProfile = function(req, res) {
	var { username, access_level, password, password1, user_id} = req.body

	if (password == password1) {
		bcrypt.hash(password, saltRounds, (err, hashed) => {
			userModel.updateAccount({ username: username }, { password: hashed, otp: null}, function(err, result) {
				if (err)
					throw err;
				else {
					req.flash('success_msg', 'Profile updated.');
					res.redirect('/profile');
				}
			});
		});
	}

	else {
		req.flash('error_msg', 'Passwords do not match. Please try again.');
		res.redirect(`/profile`);	
	}
	
}


exports.loginUser = function(req, res) {
	const errors = validationResult(req);

	if(errors.isEmpty()) {
		//

		var {username, password, cur_date} = req.body;
		req.session.cur_date = cur_date;
		userModel.queryEmployee(username, function(err, userQuery) {
			if (err) throw err;
			else {
				if (userQuery.length == 1) {
					//Check if password is null then validate password through otp 
					if (userQuery[0].password == null && userQuery[0].otp == password) {
						//If login success redirect to page to set initial password
						res.redirect(`/initialize_account?username=${userQuery[0].username}`);
					}
					//Else if password is not null then check with stored password
					else if (userQuery[0].password !== null && userQuery[0].otp == null) {
						bcrypt.compare(password, userQuery[0].password, (err, result) => {
							// passwords match (result == true)
							if (result) {
								employeeModel.queryEmployee({ username: username }, function(err, user_details) {
									if (err)
										throw err;
									else {
										systemSettingModel.getCurrentSettings(function(err, system_settings) {
											if (err)
												throw err;
											else {
												// Update session object once matched!
												req.session = initializeSessionInfo(req.session, user_details[0], system_settings[0]);

												req.flash('success_msg', 'Password changed for: ' + user_details[0].username);
												
												res.redirect('/');	
											}
										});
									}
								});								
							} 
							else {
								// passwords don't match
								req.flash('error_msg', 'Incorrect password. Please try again.');
								res.redirect('/login')
							}
						});
					}
					else {
						req.flash('error_msg', 'Incorrect password. Please try again.');
						res.redirect('/login')
					}
				}
				else if (userQuery.length > 1) {

				}
				else {
					req.flash('error_msg', 'Invalid username. Please try again.');
					res.redirect('/login')
				}
			}
		});

	}
	else {
		const messages = errors.array().map((item) => item.msg);
		req.flash('error_msg', messages.join(' '));
		res.redirect('/login')
	}
};

exports.editSystemDate = function(req, res) {
	req.session.cur_date = req.query.change_date;
	res.redirect(req.get('Referrer'));
}

exports.logout = function(req, res) {
	if (req.session) {
		var date = req.session.cur_date;

		req.session.destroy();

		res.redirect(`/login?cur_date=${date}`);
		// req.session.destroy(() => {
		// 	res.clearCookie('connect.sid');
		// 	req.session.cur_date = date;
		//
		// 	res.redirect('/login');
  //   	});
  	}
};

exports.getEmployeeDetails = function(req, res){
	if(req.query.employee_id != null)
		userModel.getEmployeeDetails(req.query.employee_id, function(err, details){
			if(err)
				throw err;
			else{
				res.send(details[0]);
			}
		});
	else
		res.send(true);
}