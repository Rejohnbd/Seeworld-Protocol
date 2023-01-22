var gps = require("./lib/server");
var util = require("./lib/functions");
require("dotenv").config();
var requestify = require("requestify");
var admin = require("firebase-admin");
var moment = require("moment");

var serviceAccount = require("./firebase/serviceAccount.json");

var Location = require("./api/models/location");
var Fence = require("./api/models/fence");
var FenceAlert = require("./api/models/fencealert");

//var mongoose = require("mongoose");

var config = require("./config");

// var url_2 = "http://vtsapi.cpsdbd.com/gps/addVtsTempData";

const myLogger = require("./utils/logger");
const errorLogger = myLogger.getLogger("error");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: config.FIRE_URL,
});

var deviceRef = admin.database().ref().child("Devices");

var headers = {
  "Content-Type": "application/json",
  "api-token": config.API_TOKEN,
};

var options = {
  debug: false,
  port: config.PORT,
  device_adapter: "S5E",
};
/*
mongoose
  .connect(config.MONGO_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
  })
  .then((db) => {
    console.log("connected");
  })
  .catch((error) => {
    console.log("error", error);
  });
*/
var server = gps.server(options, function (device, connection) {
  var dev_stat = 0;
  console.log("start in index.js");
  device.on("login_request", function (device_id, msg_parts) {
    console.log("Called Login");
    // deviceRef.child(device_id).once("value", function (snapshot) {
    //   var status = snapshot.child("Data").child("status").val();

    //   if (status) {
    //     dev_stat = status;
    //   } else {
    //     //console.log("First Login")
    //     deviceRef.child(device_id).child("id").set(device_id);
    //   }
    // });

    // Some devices sends a login request before transmitting their position
    // Do some stuff before authenticate the device...

    // Accept the login request. You can set false to reject the device.
    this.login_authorized(true);
  });

  //PING -> When the gps sends their position
  device.on("ping", function (str) {
    // console.log(device.uid, "device id str");
    console.log(str, "device data in index.js");

    let date_time_raw = str.substr(0, 12);
    let device_date_time = get_deviceTime(date_time_raw);
    var bd_date_time = convert_device_time_zone(device_date_time);

    let lat_raw = str.substr(14, 8);
    let lng_raw = str.substr(22, 8);
    let speed_raw = str.substr(30, 2);
    let course_status_raw = str.substr(32, 4);
    let temperature_raw = str.substr(66, 2);

    /**
     * For further development
     * if nessary
     *
     * let power_voltage_raw = str.substr(54, 4);
     * let gsm_signal_raw = str.substr(58, 2);
     * let oil_data_raw = str.substr(62, 4);
     *
     */

    // console.log(
    //   "lat=",
    //   dex_to_degrees(lat_raw),
    //   "lng_raw=",
    //   dex_to_degrees(lng_raw),
    //   "speed_raw=",
    //   dex_to_degrees(speed_raw) * 1800000,
    //   "course_raw=",
    //   course_convert(course_status_raw),
    //   "status=",
    //   dev_stat,
    //   "date=",
    //   bd_date_time,
    //   "temperature_raw=",
    //   getTempareture(temperature_raw)
    // );

    let device_data = {
      imei: device.uid,
      lat: dex_to_degrees(lat_raw),
      lng: dex_to_degrees(lng_raw),
      speed: dex_to_degrees(speed_raw) * 1800000,
      course: course_convert(course_status_raw),
      status: dev_stat.toString(),
      device_time: bd_date_time,
      temperature: getTempareture(temperature_raw),
    };

    fire_data = {
      status: dev_stat.toString(),
      lat: lat_raw,
      lng: lng_raw,
      speed: (dex_to_degrees(speed_raw) * 1800000).toFixed(2),
    };

    if (util.in_bd(device_data)) {
      // console.log(device_data);
      sendToFireBase(fire_data);
      // sendToServer(device_data);
      // getFenceAndPushNotification(fire_data);
    }

    return str;
  });

  device.on("alarm", function (alarm_code, alarm_data, msg_data) {
    console.log(
      "Help! Something happend: " + alarm_code + " (" + alarm_data.msg + ")"
    );
    //call_me();
  });

  device.on("other", function (msg_data) {
    //console.log("from Other",msg_data);
  });

  device.on("status", function (status, msg_data) {
    console.log("Status", status);
    var st = hex2bin(status).substr(6, 1);
    console.log(st);
    dev_stat = st;
  });

  function sendToFireBase(fire_data) {
    console.log("send to firebase", fire_data);
    deviceRef.child(device.uid).child("Data").update(fire_data);
  }

  function sendToServer(device_data) {
    console.log(device_data, "for post");
    const location = new Location(device_data);
    location.save().catch((err) => {
      errorLogger.error("Location Failed to Save", err.message);
    });

    requestify
      .request(url_2, {
        method: "POST",
        body: device_data,
        headers: headers,
      })
      // .catch((err) => {
      //   errorLogger.error("Request to Other Server ", err.message);
      // });
      .then(function (response) {
        console.log("Reply", response.getBody());
        console.log("Location Saved To Database");
      })
      .catch(function (err) {
        console.log(err);
      });
  }
});

function get_deviceTime(date) {
  var device_time =
    "20" +
    parseInt(date.substr(0, 2), 16).toString().lpad("0", 2) +
    "-" +
    parseInt(date.substr(2, 2), 16).toString().lpad("0", 2) +
    "-" +
    parseInt(date.substr(4, 2), 16).toString().lpad("0", 2) +
    " " +
    parseInt(date.substr(6, 2), 16).toString().lpad("0", 2) +
    ":" +
    parseInt(date.substr(8, 2), 16).toString().lpad("0", 2) +
    ":" +
    parseInt(date.substr(10, 2), 16).toString().lpad("0", 2);

  return device_time;
}

function get_date(device_time) {
  let dateTimeArr = device_time.split(" ");
  let dateStr = dateTimeArr[0];
  let timeStr = dateTimeArr[1];
  let datetime = new Date(dateStr + "T" + timeStr + "Z");

  datetime.setHours(datetime.getHours() - 6);
  console.log(
    datetime.getFullYear(),
    datetime.getMonth(),
    datetime.getDate(),
    datetime.getHours(),
    datetime.getSeconds()
  );
  let date = {
    year: datetime.getFullYear(),
    month: datetime.getMonth(),
    day: datetime.getDate(),
    hour: datetime.getHours(),
    minute: datetime.getMinutes(),
    second: datetime.getSeconds(),
  };

  return date;
}

function convert_device_time_zone(date) {
  let converted_date_time = new Date(
    (typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
    })
  );
  var date = new Date(converted_date_time),
    mnth = ("0" + (date.getMonth() + 1)).slice(-2),
    day = ("0" + date.getDate()).slice(-2);
  hours = ("0" + date.getHours()).slice(-2);
  minutes = ("0" + date.getMinutes()).slice(-2);
  seconds = ("0" + date.getSeconds()).slice(-2);

  return (
    [date.getFullYear(), mnth, day].join("-") +
    " " +
    [hours, minutes, seconds].join(":")
  );
}

function course_convert(hex) {
  let binaryCourse = ("00000000" + parseInt(hex, 16).toString(2)).substr(-10);
  return parseInt(binaryCourse, 2);
}

function getTempareture(hex) {
  return parseInt(hex, 16);
}

// Convert Hexavalue to Human Readable Format
function dex_to_degrees(dex) {
  return parseInt(dex, 16) / 1800000;
}

// Left Pading String
String.prototype.lpad = function (padString, length) {
  var str = this;
  while (str.length < length) str = padString + str;
  return str;
};

// CXonvert Hexadecimal to Binary
function hex2bin(hex) {
  return ("00000000" + parseInt(hex, 16).toString(2)).substr(-8);
}

// Calculate Distence in Meter
function getDistanceFromLatLonInMeter(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c * 1000; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

//Send Notification to Server
function sendNotification(fence) {
  var token = fence.user_token;
  var payload = {
    notification: {
      title: "Fencing Alart",
      body: fence.driver_name + " Has Been Changed its Location",
      sound: "alarm",
    },
    data: {
      alert_type: "Fencing",
      device_id: String(fence.imei),
    },
  };

  admin
    .messaging()
    .sendToDevice(token, payload)
    .then(function (response) {
      // Delete the fence
      deletefence(fence.imei);
      saveFenceToDatabase(fence);
    })
    .catch(function (err) {
      errorLogger.error("Error in send Notification", err.message);
      // Delete The Fence
      deletefence(fence.imei);
    });
}

//Delete Fence After Sending Notification to Server
function deletefence(imei) {
  Fence.findOne({ imei: imei }).then((newfence) => {
    if (newfence != null) {
      Fence.deleteOne({ _id: newfence._id })
        .then((deleted) => {
          //console.log("Fence Deleted")
        })
        .catch((err) => {
          errorLogger.error("Error in send Delete fence", err.message);
        });
    }
  });
}

// Save the Fence to Database for Showing Fence Status for App User
function saveFenceToDatabase(fence) {
  const alert = new FenceAlert(fence);
  alert
    .save()
    .then((alertfence) => {
      //console.log("Alert Save")
    })
    .catch((err) => {
      console.log(err);
      errorLogger.error("Error in Save Fence Alert", err.message);
    });
}
