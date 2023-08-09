class Comment {
    constructor({
        user_id,
        user_name,
        comment_id,
        post_id,
        avatar,
        content,
        time_stamp,
        format_time,
    }) {
        this.user_id = user_id;
        this.user_name = user_name;
        this.post_id = post_id;
        this.comment_id = comment_id;
        this.avatar = avatar;
        this.content = content;
        this.time_stamp = time_stamp;
        this.format_time = format_time;
        
        //点赞和点踩的数量
        this.support = 0;
        this.oppose = 0;
        // this.comments = [];//用来追加评论的字段
    }
}

module.exports = Comment;
