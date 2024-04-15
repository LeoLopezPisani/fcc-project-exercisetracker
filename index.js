const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

//#region basic configuration
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

const urlParser = bodyParser.urlencoded({extended: false});
app.use(urlParser);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
//#endregion

//#region User schema and model
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  count: {
    type: Number,
    required: true
  },
  log: [{
    description: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    date: {
      type: String,
      required: true
    }
  }]
});

const User = mongoose.model("User", userSchema);

//#endregion


app.route("/api/users")
//add a new user
  .post( (req, res) => {
  var username = req.body.username;
  var user = new User({
    username: username,
    count: 0
  });

  User.findOne({username: username}).then( (u) => {
    if(u != null) {
      res.json({username: u.username, _id: u._id});
    } else {
      user.save(function(err, data){
        if(err){
          res.json({error: 'Invalid User'});
        } else {
          console.log(data);
          res.json({username: data.username, _id: data._id});
        }
      });
    }
  })
  })
//get all users
  .get( (req, res) => {
    User.find({}, '_id, username', (err, obj) => {
      if(err) res.json({error: "Error finding users."});
      res.send(obj);
    });
  });

//Add an exercise session by Id
app.post("/api/users/:_id/exercises", (req, res) => {
  var id = req.params._id;
  var description = req.body.description;
  var duration = +req.body.duration;
  var date = new Date(req.body.date).toDateString();
  
  var exerciseObj = {
    description: description,
    duration: duration,
    date: date
  };

  User.findById(id).then( (user) => {
    user.log.push(exerciseObj);
    user.count++;
    user.save( (err, data) => {
      if(err) res.json({error: 'Exercise not registered. Please try again.'});
      res.json({_id: user._id, username: user.username, date: exerciseObj.date, duration: exerciseObj.duration, description: exerciseObj.description});
    });
  });
});


//Get exercise sessions by Id (from, to and limit optionals)
app.get("/api/users/:_id/logs", (req, res) => {
  var id = req.params._id;
  var from = new Date(req.query.from);
  var to = new Date(req.query.to);
  var limit = +req.query.limit;

  console.log(Date.parse(to));

  User.findById(id).then( (user) => {
    var userLogs = user.log;
    var filtered = false;
    var filteredLogs;
    if(!isNaN(Date.parse(from)) || !isNaN(Date.parse(to))) {
      if(!isNaN(Date.parse(from))) {
        if(!isNaN(Date.parse(to))) {
          filteredLogs = userLogs.filter(l => Date.parse(to) <= Date.parse(l.date) && Date.parse(l.date) >= Date.parse(from));
          console.log(filteredLogs);
          filtered = true;
        } else {
          filteredLogs = userLogs.filter(l => Date.parse(l.date) >= Date.parse(from));
          console.log(filteredLogs);
          filtered = true;
        }
      } else {
        filteredLogs = userLogs.filter(l => Date.parse(to) <= Date.parse(l.date));
        console.log(filteredLogs);
        filtered = true;
      }
    };

    if(!isNaN(limit)) {
      if(filtered) {
        filteredLogs.length = limit;
        console.log(filteredLogs);
      } else {
        userLogs.length = limit;
        console.log(userLogs);
      }
    };

    if(filtered) {
      res.json({_id: id, username: user.username, count: user.count, logs: filteredLogs});
    } else {
      res.json({_id: id, username: user.username, count: user.count, logs: userLogs});
    };
  })
});

