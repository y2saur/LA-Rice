const userModel = require('../models/userModel');
const employeeModel = require('../models/employeeModel');
const { validationResult } = require('express-validator');
const dataformatter = require('../public/js/dataformatter.js');
const bcrypt = require('bcrypt');
const js = require('../public/js/session.js');
const globe = require('../controllers/smsController.js');
const smsModel = require('../models/smsModel.js');

const saltRounds = 10;

function initializeSessionInfo(session, obj) {
	var date = new Date();
	date = dataformatter.formatDate(date, 'YYYY-MM-DD')

	session.authority = obj.access_level;
	session.username = obj.username;
	session.employee_id = obj.employee_id;
	
	if (!session.hasOwnProperty('cur_date')) {
		session.cur_date = date;
	}

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
										subscribed = true;
									}
								if(!subscribed)
									otp_msg = otp_msg + detail_result[i].username + ": " + detail_result[i].otp + "\n";
							}
							req.flash('error_msg', otp_msg);
							res.redirect('/registration');
						});
					}
				});
				
			}
		});
	}
	else {
		const messages = errors.array().map((item) => item.msg);
		req.flash('error_msg', messages.join(' '));
		res.redirect('/registration')
	}
};

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
				else {
					console.log(employee_details);
					// Send OTP to user's phone number
					//Check if subscribed
					smsModel.getEmployeeDetails({ key : "employee_id", value : employee_details[0].employee_id}, function(err, employee){
						console.log(employee);

						if(employee[0].access_token == null){
							req.flash("error_msg", "One Time Password: " + employee_details[0].otp);
						}
						else{
							globe.sendSMS(employee[0], "One Time Password:" + employee_details[0].otp);
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
							// Update session object once matched!
							req.session = initializeSessionInfo(req.session, user_details[0]);
							
							res.redirect('/home');	
						}
					});	
				}
			});
		});
	}
	else {
		req.flash('error_msg', 'Passwords do not match');
		res.redirect(`/initialize_account?username=${username}`);
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
										// Update session object once matched!
										req.session = initializeSessionInfo(req.session, user_details[0]);
										
										res.redirect('/crop_calendar');	
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
					req.flash('error_msg', 'Invalid username. please try again');
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