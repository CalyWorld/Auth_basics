const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const Strategy = require("passport-local");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Schema = mongoose.Schema;
require("dotenv").config();

const mongoDb = process.env.MONGODB_URI;
mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
  }),
);

const app = express();
app.set("views", __dirname);
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.get("/", async (req, res) => {
  try {
    const users = await User.find({}, "username password").exec();
    res.render("index", { users }); // Pass the "users" data to the template
  } catch (error) {
    // Handle any errors here
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/sign-up", (req, res) =>
  res.render("sign_up", {
    user: "",
  }),
);
app.post("/sign-up", async (req, res, next) => {
  body("username", "Username must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape();
  body("password", "Password must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape();
  const userInput = {
    username: req.body.username,
    password: req.body.password,
  };
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render("sign_up", { user: userInput, errors: errors.array() });
  }
  try {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
    await user.save();
    res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

app.listen(3000, () => console.log("app listening on port 3000!"));
