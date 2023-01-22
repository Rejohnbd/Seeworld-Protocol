const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const locationSchema = new Schema({
  imei: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  status: { type: String },
  speed: { type: Number },
  device_time: { type: String },
  devicetime: { type: Date },
  servertime: { type: Date, default: Date.now() },
  date: {
    year: { type: Number },
    month: { type: Number },
    day: { type: Number },
    hour: { type: Number },
    minute: { type: Number },
    second: { type: Number }
  }
});

locationSchema.index({ "date.year": 1, "date.month": 1, id: 1 });

module.exports = mongoose.model("Location", locationSchema);
