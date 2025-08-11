const dotenv = require("dotenv")
const mongoose = require("mongoose");
dotenv.config({path: "./config.env"})  // , override: true
const fs = require("fs");
const PlayGround = require("./models/playGround.models");
const playgroundsData = require("./devData.json")
// connecting to mongoDB atlas
const DB = process.env.DATABASE_URL.replace("<db_password>", process.env.DATABASE_PASSWORD)
mongoose.connect(DB)
.then( con => {
    // console.log(con)
    console.log("Connection is successful")
}).catch(err => {
    console.log(err.message)
})

const deleteData = async () => {
    try{
       await PlayGround.deleteMany();
      


        console.log("Data successfully deleted")
    }catch(err){
        console.log(err.message);
    }
    process.exit()
}


const importData = async () =>{
    try{
        await PlayGround.create(playgroundsData, { validateBeforeSave: false })
        console.log("Data successfully updated")

    }catch(err){
        console.log(err.message);
    }
    process.exit()
}


if(process.argv[2]==="--import"){
    importData()
}else if(process.argv[2]==="--delete"){
    deleteData()
}