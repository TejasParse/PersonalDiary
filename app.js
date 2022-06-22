const path = require("path");

const { Entry } = require("./models/Entry");
const { User } = require("./models/User");

const express = require("express");
const app = express();
require('dotenv').config();
const database = require("./db/database");
const bcrypt = require('bcrypt');
const session = require("express-session");
const flash = require('connect-flash');
const { userInfo } = require("os");

const PORT = 3000;

database.connectDatabase()
    .then(()=>{
        app.listen(PORT,(req,res)=>{
            console.log("Listening to Port 3000");
        })
    })
    .catch((err)=>{
        console.log(err);
    })

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname,"static")));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly:true }
}));
app.use(flash());

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.fail = req.flash("fail");
    next();
})

const verfyLogin = async (req,res,next)=>{

    console.log(req.body);

    const user = await User.findOne({
        username: req.body.username
    }); 

    if(user==undefined) {
        req.flash("fail","Please create a user")
        return res.redirect("/");
    }

    let result = await bcrypt.compare(req.body.password, user.password);

    console.log(result);

    if(result) {
        return next();
    }

    return res.redirect("/");

};

const requireLogin = async (req,res,next)=>{

    if(req.session.loggedIn==1) {
        res.locals.username = req.session.username;
        return next();
    }

    req.flash("fail","Please login to view this page");
    res.redirect("/");
};


app.get("/" ,async (req,res)=>{
    
    console.log(req.session.loggedIn);

    loginStatus = req.session.loggedIn || "0";

    res.render("home", { loginStatus });
    
});

app.get("/addJournal" ,requireLogin,(req,res)=>{

    console.log(req.headers);

    res.render("addJournal");
    
});

app.post("/addJournal", requireLogin ,async (req,res)=>{
    
    console.log(req.body);
    let daySelected = new Date(req.body.date);

    const userProfile = await User.findOne({
        username: req.session.username
    });

    console.log(userProfile);

    const temp = new Entry({
        title: req.body.title,
        date: daySelected,
        description: req.body.description,
        day: daySelected.getDate(),
        month: daySelected.getMonth(),
        year: daySelected.getFullYear(),
    });
    temp.author = userProfile;

    userProfile.entries.push(temp);
    userProfile.save();

    console.log("corssed");
    
    temp.save()
    .then(()=>{
        console.log("Saved");
        req.flash("success","Entry Inserted");
        res.redirect("/allJournals");
    })
    .catch(async err=>{

        console.log(err);
        
        const temp1 = await Entry.find({date: new Date(req.body.date)});
        console.log(temp1);

        req.flash("fail","Twp Entries with same data found!");
        res.redirect(`/editJournal?id=${temp1[0]._id}`)
                
    })
    
    
});

app.get("/displayJournal",requireLogin, async (req,res)=>{
    
    const { id } = req.query;
    
    const data = await Entry.findById(id);
    console.log(data);
    
    res.render("displayJournal",{ data });
    
})

app.get("/editJournal",requireLogin, async (req,res)=>{
    
    const { id } = req.query;
    let moment = require("moment");
    const data = await Entry.findById(id);
    console.log(data);
    
    console.log(moment(data.date).format("YYYY-MM-DD"));
    
    const date1 = moment(data.date).format("YYYY-MM-DD");
    console.log(date1);
    
    res.render("editJournal",{ data ,date1});
    
})

app.post("/editJournal", requireLogin, async (req,res)=>{
    console.log(req.body);
    const { id } = req.query;
    const temp = await Entry.updateOne({date: new Date(req.body.date)},{$set : { title: req.body.title, description: req.body.description }},{new:true});
    
    res.send(`<script>alert('Edited!'); window.location.href='/displayJournal?id=${id}'</script>`);
    
});

app.get("/deleteJournal",requireLogin, async(req,res)=>{
    
    const { id } = req.query;
    
    const delete1 = await Entry.findByIdAndDelete(id);
    
    res.send("<script>alert('Journal Deleted'); window.location.href='/'</script>")
    
});

app.post("/login", verfyLogin, async (req,res)=>{

    const userProfile = await User.findOne({
        username: req.body.username
    });

    req.session.user_id = userProfile._id;
    req.session.loggedIn=1;
    req.session.username = userProfile.username;

    console.log("Idhar hu bhai");
    req.flash("success","Logged In!");
    res.redirect("/");

});

app.get("/logout", async(req,res)=>{

    console.log(req.session);
    
    delete req.session.user_id;
    req.session.loggedIn=0;
    delete req.session.username;
    
    console.log(req.session);

    req.flash("success","Logged Out!");
    res.redirect("/");


});

app.post("/signup", async (req,res)=>{

    const hashedPwd = await bcrypt.hash(req.body.password, 10);

    const profile = {
        username: req.body.username,
        password: hashedPwd,
        name: req.body.name
    };

    let newProfile = new User(profile);
    await newProfile.save();

    req.flash("success","Account Created! Now please log in");
    res.redirect("/");
    

}); 

app.get("/allJournals",requireLogin, async (req,res)=>{

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
});