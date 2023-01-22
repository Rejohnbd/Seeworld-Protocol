const log4js = require("log4js");

log4js.configure({
  appenders: {
    multi: {
      type: "multiFile",
      base: "logs/",
      property: "categoryName",
      extension: ".log"
    }
  },
  categories: {
    default: { appenders: ["multi"], level: "debug" }
  }
});

module.exports = log4js;
