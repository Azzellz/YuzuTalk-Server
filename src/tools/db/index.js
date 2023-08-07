const mongoose = require("mongoose");
const Post = require("./models/post");
const User = require("./models/user");

//连接数据库
mongoose.connect("mongodb://127.0.0.1/posts");

var db = mongoose.connection;
//绑定错误事件
db.on("error", console.error.bind(console, "connection error:"));
//绑定连接事件
db.once("open", function () {
    //连接后的回调函数
    console.log("Connected to the db:posts !");
});

//!这里的字段非常重要,前后端改字段名要考虑到这里,这里只能多,不能少
//!这里的字段名要和前端的字段名一致,否则前端拿不到数据
//!Schema都用默认生成的_id字段,不用再额外添加id字段
//创建集合
const post = mongoose.model("post", Post);
const user = mongoose.model("user", User);

//根据filter统计集合中的文档数量,接收一个集合名和一个过滤器作为参数
function countCollection(name, filter) {
    return db.collection(name).countDocuments(filter);
}

module.exports = {
    user,
    post,
    //统计集合中的文档数量,接收一个集合名作为参数
    countCollection,
};
