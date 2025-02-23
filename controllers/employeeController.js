const employeeModel = require('../models/employeeModel');
const js = require('../public/js/session.js');
const farmModel = require('../models/farmModel');
const e = require('connect-flash');

exports.ajaxEmployees = function(req, res) {
	var query = req.query;

	employeeModel.queryEmployee(query, function(err, list) {
		if (err)
			throw err;
		else {
			res.send({ employee_list: list, success: true });
		}
	});

}

exports.ajaxFilterFarmers = function(req, res) {
	var query = req.query;
	employeeModel.filterFarmers(query, function(err, farmers) {
		if (err)
			throw err;
		else {
			res.send(farmers);
		}
	})
}

exports.getUsers = function(req, res) {
	var html_data = {};
	html_data["title"] = "User Management";
	html_data = js.init_session(html_data, 'role', 'name', 'username', 'user_management', req.session);
	html_data["notifs"] = req.notifs;
	res.render('user_management', html_data);
}

exports.updateEmployeeDetails = function(req, res) {
	var position = req.body.position; 
	var last_name = req.body.last_name;
	var first_name = req.body.first_name;
	var phone_number = req.body.phone_number.substring(1);
	var employee_id = req.body.employee_id;
	
	employeeModel.queryEmployee({phone_number: phone_number}, function(err, emp) {
		if (err)
			throw err;
		else if ((emp.length !== 0) && ((emp[0].employee_id != employee_id) && (emp[0].phone_number == phone_number))) {
			req.flash('error_msg', 'Mobile Number "' + req.body.phone_number + '" is already taken. Please input a different number.');
			res.redirect(`/user_management/employee_details&id=${employee_id}`);	
		}
		else {
			employeeModel.updateAccount({ employee_id: employee_id }, { last_name: last_name, first_name: first_name, phone_number: phone_number, position: position}, function(err, result) {
				if (err)
					throw err;
				else {
					if (req.body.farm_assignment != '...') {
						farmModel.queryAssignedFarmer({ employee_id: req.body.employee_id}, function(err, assignments) {
							if (err)
								throw err;
							else if (assignments.length !== 0) {
								farmModel.updateAssignedFarmer({ employee_id: req.body.employee_id}, { employee_id: req.body.employee_id, farm_id: req.body.farm_assignment, status: 'Active'}, function(err, result) {
									if (err)
										throw err;
									else {
										console.log(result);
									}
								});
							}
							else {
								farmModel.assignFarmer({ employee_id: req.body.employee_id, farm_id: req.body.farm_assignment, status: 'Active'}, function(err, result) {
									if (err)
										throw err;
									else {
										console.log(result);
									}
								});
							}
						});
					}
					else if (req.body.farm_assignment == '...') {
						farmModel.deleteAssignedFarmer({ employee_id: req.body.employee_id}, function(err, result) {
							if (err)
								throw err;
							else {
								console.log(result);
							}
						});
					}
					req.flash('success_msg', "Employee record updated for: " + first_name + ' ' + last_name);
					res.redirect(`/user_management/employee_details&id=${employee_id}`);	
				}
			});
		}
	});
	
}

exports.makeInactive = function(req, res) {	
	employeeModel.updateAccount({ employee_id: req.query.employee_id }, { isActive: 0}, function(err, result) {
		if (err)
			throw err;
		else {
			if (req.query.status == 'inactive') {
			req.flash('success_msg', "Employee now inactive: Employee ID " + req.query.employee_id);
			res.redirect(`/user_management`);	
			}
			else {
				//Err message
				res.redirect('/user_management');
			}
		}
	});	
}

exports.makeActive = function(req, res) {	
	employeeModel.updateAccount({ employee_id: req.query.employee_id }, { isActive: 1}, function(err, result) {
		if (err)
			throw err;
		else {
			if (req.query.status == 'active') {
			req.flash('success_msg', "Employee now active: Employee ID " + req.query.employee_id);
			res.redirect(`/user_management`);	
			}
			else {
				//Err message
				res.redirect('/user_management');
			}
		}
	});
}

exports.deleteEmployee = function(req, res) {	
	employeeModel.deleteEmployee({ employee_id: req.query.employee_id }, function(err, result) {
		if (err)
			throw err;
		else {
			if (req.query.status == 'delete') {
			req.flash('success_msg', "Employee deleted: Employee ID " + req.query.employee_id);
			res.redirect(`/user_management`);	
			}
			else {
				//Err message
				res.redirect('/user_management');
			}
		}
	});
}