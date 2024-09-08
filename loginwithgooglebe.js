// server.js
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const User = require('./models/User'); // Ensure you have the User model defined
require('dotenv').config();
const path = require('path'); // Required for handling paths

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Passport setup
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await new User({ googleId: profile.id }).save();
      }
      done(null, user);
    } catch (err) {
      console.error('Error during authentication:', err);
      done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname)); // Serve static files from the root directory

// Routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile']
}));

app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/'
}), (req, res) => {
  res.redirect('/home');
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/home', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Hello ${req.user.googleId}`);
  } else {
    res.redirect('/');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'loginwithgoogle.html')); // Correct path
});

const PORT = process.env.PORT || 3099;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
