const path = require("path");
const mongoose = require("mongoose");
const { Entry } = require("./models/Entry");
const express = require("express");
const app = express();

const PORT = 3000;

mongoose.connect("mongodb://localhost:27017/PersonalDiary")
    .then(()=>{
        console.log("MongoDB Connection Done")
    })
    .catch((err)=>{
        console.log("MongoDB Connection Failed");
    })

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"static")));


app.listen(PORT,(req,res)=>{
    console.log("Listening to Port 3000");
})

app.get("/",async (req,res)=>{

    let EntryData;
    
    let searchQ = req.query.search;
    let { day,month,year } = req.query;

    if(searchQ!==undefined)
    {
        console.log("Inside search Q");
        EntryData = await Entry.find({
            $or: [
                {
                    title: {
                        $regex: `${searchQ}`,
                        $options: "i",
                    }
                },
                {
                    description: {
                        $regex: `${searchQ}`,
                        $options: "i",
                    }
                }
            ]        
        }).sort({date:-1});
    }
    else if(day!==undefined)
    {
        console.log("Inside Day");

        EntryData = await Entry.find({
                
            day: {
                $regex: `${day}`,
                $options: "i",
            },
            month: {
                $regex: `${month}`,
                $options: "i",
            },
            year: {
                $regex: `${year}`,
                $options: "i",
            }
                
        }).sort({date:-1})
    }
    else {
        EntryData = await Entry.find({}).sort({date:-1});
    }


    // console.log(EntryData);
    res.render("viewJournal",{EntryData});
})

app.get("/addJournal",(req,res)=>{

    res.render("addJournal");

});

app.post("/addJournal",async (req,res)=>{

    console.log(req.body);
    let daySelected = new Date(req.body.date);
    const temp = new Entry({
        title: req.body.title,
        date: daySelected,
        description: req.body.description,
        day: daySelected.getDate(),
        month: daySelected.getMonth(),
        year: daySelected.getFullYear()
    });

    temp.save()
        .then(()=>{
            console.log("Saved");
            res.send("<script>alert('Entry Inserted'); window.location.href='/'</script>");
        })
        .catch(async err=>{

            const temp1 = await Entry.find({date: new Date(req.body.date)});
            console.log(temp1);

            res.send(`<script>alert('Two Entries with same date found!'); window.location.href='/editJournal?id=${temp1[0]._id}'</script>`)
            
        })


});

app.get("/displayJournal",async (req,res)=>{

    const { id } = req.query;

    const data = await Entry.findById(id);
    console.log(data);

    res.render("displayJournal",{ data });

})

app.get("/editJournal",async (req,res)=>{

    const { id } = req.query;
    let moment = require("moment");
    const data = await Entry.findById(id);
    console.log(data);

    console.log(moment(data.date).format("YYYY-MM-DD"));

    const date1 = moment(data.date).format("YYYY-MM-DD");
    console.log(date1);

    res.render("editJournal",{ data ,date1});

})

app.post("/editJournal", async (req,res)=>{
    console.log(req.body);
    const { id } = req.query;
    const temp = await Entry.updateOne({date: new Date(req.body.date)},{$set : { title: req.body.title, description: req.body.description }},{new:true});
    
    res.send(`<script>alert('Edited!'); window.location.href='/displayJournal?id=${id}'</script>`);

});

app.get("/deleteJournal", async(req,res)=>{

    const { id } = req.query;

    const delete1 = await Entry.findByIdAndDelete(id);

    res.send("<script>alert('Journal Deleted'); window.location.href='/'</script>")

});