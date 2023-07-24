var moment = require("moment");
module.exports = {
    getCurrentTime: (format = "YYYY-MM-DD HH:mm") =>
        moment(Date.now()).format(format),
};
