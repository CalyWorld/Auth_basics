const bcrypt = require("bcryptjs");
const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
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

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username: username });
      if (!user) {
        return done(null, false, { message: "Incorrect Username" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "Incorrect Password" });
      }
      return done(null, user);
    } catch (err) {
      console.log("error logging in");
      return done(err);
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  }),
);

app.get("/", async (req, res) => {
  res.render("index", { user: req.user });
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
  bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
    if (err) {
      return next(err);
    } else {
      const user = new User({
        username: req.body.username,
        password: hashedPassword,
      });
      try {
        await user.save();
        res.redirect("/");
      } catch (err) {
        return next(err);
      }
    }
  });
});

app.get("/log-out", (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.listen(3000, () => console.log("app listening on port 3000!"));
