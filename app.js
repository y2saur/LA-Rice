// All imports needed heres
const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const handlebars = require('handlebars');
const bodyParser = require('body-parser');
const mysql = require('./models/connectionModel');
const compression = require('compression')
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access');
const fs = require('fs');

const { envPort, sessionKey, dbDatabase } = require('./config');
// Routes imports
const authRouter = require('./routes/auth');


// Creates the express application
const app = express();
const port = envPort || 3000;

// Configure to use sessions
const session = require('express-session');
const flash = require('connect-flash');

// serve static files
app.use(express.static('public'));

// Listening to the port provided
app.listen(port, () => {
  console.log('App listening at port ' + port)
});

// Creates an engine called "hbs" using the express-handlebars package.
app.engine('hbs', exphbs({
  handlebars: allowInsecurePrototypeAccess(handlebars),
  extname: 'hbs',
  defaultView: 'main',
  layoutsDir: path.join(__dirname, '/views/layouts'),
  partialsDir: path.join(__dirname, '/views/partials'),
  helpers: {
    grouped_each: function(freq, context, options) {
      var out = "", subcontext = [], i;
      if (context && context.length > 0) {
          for (i = 0; i < context.length; i++) {
              if (i > 0 && i % freq === 0) {
                  out += options.fn(subcontext);
                  subcontext = [];
              }
              subcontext.push(context[i]);
          }
          out += options.fn(subcontext);
      }
      return out;
    },
    compareTwoValues: function(lvalue, rvalue, options) {
      if (arguments.length < 3)
          throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

      operator = options.hash.operator || "==";

      var operators = {
          '==':       function(l,r) { return l == r; },
          '===':      function(l,r) { return l === r; },
          '!=':       function(l,r) { return l != r; },
          '<':        function(l,r) { return l < r; },
          '>':        function(l,r) { return l > r; },
          '<=':       function(l,r) { return l <= r; },
          '>=':       function(l,r) { return l >= r; },
          'typeof':   function(l,r) { return typeof l == r; }
      }

      if (!operators[operator])
          throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

      var result = operators[operator](lvalue,rvalue);

      if( result ) {
          return options.fn(this);
      } else {
          return options.inverse(this);
      }
    }

  }
}));

// Setting the view engine to the express-handlebars engine we created
app.set('view engine', 'hbs');

// Configuration for handling API endpoint data
app.use(bodyParser.json({parameterLimit: 100000, limit: '500mb', extended: true}));
app.use(bodyParser.urlencoded({parameterLimit: 100000, limit: '500mb',extended: true}));

// serve static files
app.use(express.static('public'));

// Sessions
app.use(session({
  secret: sessionKey,
  store: mysql,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 600 * 60 * 3 }
}));

// Flash
app.use(flash());

// Global messages vars
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.dialog_error_msg = req.flash('dialog_error_msg');
  res.locals.dialog_success_msg = req.flash('dialog_success_msg');
  next();
});

// Prevents going back to logged in pages after logout
app.use(function(req, res, next) { 
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'); 
  next(); 
});

app.use('/', authRouter); // Login/registration routes