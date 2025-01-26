import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // one who is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // one to whom "subscriber" is subscribing
        ref: "User"
    }
}, { timestamps: true });

// when a user subscribe a channel -> a document gets created - it contains : subscriber, channel.
// when count for subscriber by the channel owner -> counts the documents that matches the channel name from the docs.
// when count for channels by the user -> counts the documents that matches the subscriber name.
// refre lec no. - 18 

export const Subscription = mongoose.model("Subscription", subscriptionSchema);