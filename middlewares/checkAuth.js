const systemSettingModel = require('../models/systemSettingModel.js');

// Access matrix following object (path) and array (read/write) format 
// Legend: 0 - Admin, 1 - Office Worker, 2 Purchasing Officer
// i.e '/inventory': ['02', '02'] = Only Office worker does not have access
const access_matrix = {
  '/': ['012', '012'],
  '/home': ['012', '012'], // Dashboard
  // Farms
  '/farms': ['012', '01'], // WO
  '/farms/work_order': ['012', '01'], // Detailed WO
  '/crop_calendar': ['012', '01'], // Crop Calendar
  '/crop_calendar/details': ['012', '01'], // Detailed Crop Calendar
  '/farm_monitoring_summarized': ['012', '01'], // Farm Monitoring
  '/nutrient_management': ['012', '01'], // Nutrient Management
  '/disaster_management': ['012', '01'], // Disaster Warning
  // Material Management
  '/inventory': ['02', '02'], // Inventory
  '/orders': ['02', '02'], // Orders
  '/orders/details': ['02', '02'],
  // Pest and Disease
  '/pest_and_disease/discover': ['012', '01'], // Discover
  '/pest_and_disease/diagnose': ['012', '01'], // Diagnose
  '/pest_and_disease/frequency': ['012', '01'], //Frequency
  '/pest_and_disease_details': ['012', '01'], // Detailed PD
  // SMS Management
  '/sms/subscriptions': ['01', '01'], // Subscriptions
  '/sms/messages': ['01', '01'], // Messages
  // User Management
  '/user_management': ['0', '0'], // User management
  // Farm Productivity
  '/farm_productivity_report': ['012', '012'], // FP Report
  '/farm_productivity/detailed': ['012', '012'], // Detailed FP
  '/harvest_report/:/summary': ['012', '012'], // Harvest Report
  '/harvest_report/:/detailed': ['012', '012']  // Harvest Report
};

const special_paths = [
  '/farms/work_order', '/harvest_report/:/summary', '/harvest_report/:/detailed' 
];

exports.isPrivate = (req, res, next) => {
  var path = req.path, closest, closest_index;
  // console.log(req.session.authority);
  // console.log(req.path);
  if (req.session.authority !== undefined) {
    systemSettingModel.getCurrentSettings(function(err, settings) {
      if (err)
        throw err;
      else {
        systemSettingModel.createActiveSettings({ system_date: req.session.cur_date }, function(err, create_status) {
          if (err)
            throw err;
          else {

          }
        });
      }
    });
    //Check if path belongs to special cases:
    if (!access_matrix.hasOwnProperty(path)) {
      //Check most similar from array
      for (var i = 0; i < special_paths.length; i++) {
        if (i == 0) {
          closest = similarity(special_paths[i], path);
          closest_index = i;
        }
        //console.log(`${similarity(special_paths[i], path)}`)
        if (i != 0 && closest < similarity(special_paths[i], path)) {
          closest = similarity(special_paths[i], path);
          closest_index = i;
        }
      }
      // console.log(`${closest} - ${path} - ${closest_index}`);
      // console.log(special_paths[closest_index]);
      path = special_paths[closest_index];
    }
    //Check if user has read access
    if (access_matrix[path][0].includes(req.session.authority)) {
        //Check if user has write access (actionable items)
        if (access_matrix[path][1].includes(req.session.authority))
          req.session['writeable'] = true;
        else
          req.session['writeable'] = false;
        
        return next();
    }
    else {
      console.log('Cannot access route!');
      req.flash('dialog_error_msg', 'Cannot access route!');
      res.redirect('/home')
    }
  } 
  else {
    req.flash('dialog_error_msg', 'Please login first!');
    res.redirect('/login');
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.session.authority !== '0') {
    req.flash('dialog_error_msg', 'Cannot access route!');
    res.redirect('/home')
  }
  else {
    return next();
  }
};

exports.isOffice = (req, res, next) => {
  if (!(req.session.authority === '0' || req.session.authority === '1')) {
    req.flash('dialog_error_msg', 'Cannot access route!');
    res.redirect('/home')
  }
  else {
    return next();
  }
}

exports.isPurchasing = (req, res, next) => {

  if (!(req.session.authority === '0' || req.session.authority === '2')) {
    req.flash('dialog_error_msg', 'Cannot access route!');
    res.redirect('/home')
  }
  else {
    return next();
  }
}

function similarity(s1, s2) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}