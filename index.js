const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({path: "./config.env"});
const app = require("./app.js");
const Ad = require("./models/ad.models.js");


const DB = process.env.DATABASE_URL.replace("<db_password>", process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB)
.then(async (con) => {
    console.log("Connection is successful");
    try {
        await Ad.syncIndexes();
        console.log("Ad indexes synced (including TTL on endDate if present)");
    } catch (e) {
        console.log("Failed to sync Ad indexes:", e.message);
    }
}).catch(err =>{
    console.log(err.message)
});


// listen to coming requests
const PORT = process.env.PORT || 8000;
app.listen(PORT, ()=>{
    console.log(`Server is working on port ${PORT}`);
});






