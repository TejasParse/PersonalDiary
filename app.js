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

const PORT = process.env.PORT || 3000;

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

    const user = await User.findOne({
        username: req.body.username
    }); 

    if(user==undefined) {
        req.flash("fail","Please create a user")
        return res.redirect("/");
    }

    let result = await bcrypt.compare(req.body.password, user.password);

    if(result) {
        return next();
    }

    req.flash("fail","Please enter correct email or password");
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

const journalAccess = async (req,res,next)=>{

    const { id } = req.params;

    const userProfile = await User.findOne({ username: req.session.username });

    const journal = await Entry.findOne({ _id: id, author: userProfile._id });

    console.log(journal);

    if(journal==null) {
        req.flash("fail","Cannot access that journal");
        return res.redirect("/allJournals");
    }

    
    next();

};

app.get("/" ,async (req,res)=>{
    
    console.log(req.session.loggedIn);

    loginStatus = req.session.loggedIn || "0";

    res.render("home", { loginStatus });
    
});

app.get("/addJournal" ,requireLogin,(req,res)=>{



    res.render("addJournal");
    
});

app.post("/addJournal", requireLogin ,async (req,res)=>{

    let daySelected = new Date(req.body.date);

    const userProfile = await User.findOne({
        username: req.session.username
    });

    const temp1 = await Entry.findOne({date: new Date(req.body.date), author: userProfile._id});


    if(temp1 !== null) {
        req.flash("fail","Two Entries with same data found!");
        return res.redirect(`/editJournal/${temp1._id}`);
    }


    console.log(userProfile);

    const temp = new Entry({
        title: req.body.title,
        date: daySelected,
        description: req.body.description,
        day: daySelected.getDate(),
        month: daySelected.getMonth(),
        year: daySelected.getFullYear(),
        author: userProfile._id
    });


    
    temp.save()
    .then(()=>{
        console.log("Saved");
        req.flash("success","Entry Inserted");
        res.redirect("/allJournals");
    })
    .catch(async err=>{

        console.log(err);
        
    })
    
    
});

app.get("/displayJournal/:id",requireLogin, journalAccess,async (req,res)=>{
    
    const { id } = req.params;
    
    const data = await Entry.findById(id);
    console.log(data);
    
    res.render("displayJournal",{ data });
    
})

app.get("/editJournal/:id",requireLogin, async (req,res)=>{
    
    const { id } = req.params;
    let moment = require("moment");
    const data = await Entry.findById(id);
    console.log(data);
    
    console.log(moment(data.date).format("YYYY-MM-DD"));
    
    const date1 = moment(data.date).format("YYYY-MM-DD");
    console.log(date1);
    
    res.render("editJournal",{ data ,date1});
    
})

app.post("/editJournal/:id", requireLogin, async (req,res)=>{
    console.log(req.body);
    const { id } = req.params;
    const temp = await Entry.updateOne({date: new Date(req.body.date)},{$set : { title: req.body.title, description: req.body.description }},{new:true});
    
    req.flash("success","Edited!");
    res.redirect(`/displayJournal/${id}`)
    
});

app.get("/deleteJournal/:id",requireLogin, async(req,res)=>{
    
    const { id } = req.params;
    
    const delete1 = await Entry.findByIdAndDelete(id);

    req.flash("success","Journal Deleted!");
    res.redirect("/allJournals");
    
});

app.post("/login", verfyLogin, async (req,res)=>{

    const userProfile = await User.findOne({
        username: req.body.username
    });

    req.session.user_id = userProfile._id;
    req.session.loggedIn=1;
    req.session.username = userProfile.username;

    console.log("Idhar hu bhai");
    req.flash("success",`Logged In! Welcome Back ${userProfile.name}`);
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

    try {
        
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

    } catch (err) {
        console.log(err);
        console.log(err.code);

        if(err.code===11000) {
            req.flash("fail","username already exists. Please enter a new username");
            res.redirect("/");
        }

    }
    

}); 

app.get("/allJournals",requireLogin, async (req,res)=>{

    let EntryData;
    
    let searchQ = req.query.search;
    let { day,month,year } = req.query;

    let userProfile = await User.findOne({ username: req.session.username });

    if(searchQ!==undefined)
    {
        console.log("Inside search Q");
        EntryData = await Entry.find({
            $or: [
                {
                    title: {
                        $regex: `${searchQ}`,
                        $options: "i",
                    },
                    author: userProfile._id
                },
                {
                    description: {
                        $regex: `${searchQ}`,
                        $options: "i",
                    },
                    author: userProfile._id
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
            },
            author: userProfile._id
                
        }).sort({date:-1})
    }
    else {
        EntryData = await Entry.find({ author: userProfile._id }).sort({date:-1});
    }


    // console.log(EntryData);
    res.render("viewJournal",{EntryData});
});