import { Types } from "mongoose";

export interface I_User {
    _id: Types.ObjectId;
    user_name: String;
    account: String;
    password: String;
    avatar: String;
    favorites: Array<Types.ObjectId>; //引用post
    published: Array<Types.ObjectId>; //引用post
    follows: Array<Types.ObjectId>; //引用user
    fans: Array<Types.ObjectId>;//引用user
    register_time: String;
    time_stamp: Number;
}