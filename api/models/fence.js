const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const fenceData = new Schema({
    user_token: {
        type:String,
        trim:true
    },
    lat: {
        type:Number,
        trim:true
    },
    lng: {
        type:Number,
        trim:true
    },
    driver_name: {
        type:String,
        trim:true
    },
    driver_photo: {
        type:String,
        trim:true
    },
    model:{
        type:String,
        trim:true
    },
    imei: {
        type:Number,
        trim:true
    },
    uid: {
        type:String
    },
    fence_time: {
        type:String,
        trim:true
    },
    time:{
        type:Date,
        default:Date.now()
    }
})
module.exports = mongoose.model('Fence',fenceData);