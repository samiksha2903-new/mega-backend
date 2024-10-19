import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"


const connectDB = async () => {
    try {
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`) 
       console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

// once this async gets executed so its return a promise which needs to be handled

export default connectDB;