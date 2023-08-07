// const db = require("./base.js");
const db = require("./db/index.js");
const time = require("./time.js");
const token = require("./token.js");

//统一各工具模块
module.exports = {
    db,
    time,
    token,
};
