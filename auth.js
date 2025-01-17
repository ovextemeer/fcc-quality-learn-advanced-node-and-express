// This is not a template file
const { ObjectId } = require('mongodb');
const LocalStrategy = require('passport-local');
let passport = require('passport');
const GithubStrategy = require('passport-github').Strategy;
require('dotenv').config();

module.exports = function (app, myDataBase) {
    app.use(passport.initialize());
    app.use(passport.session());

    // Serialize user object
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser((id, done) => {
        myDataBase.findOne({ _id: new ObjectId(id) }, (err, doc) => {
            done(null, doc);
        });
        done(null, null);
    });
    // Deserialize user object

    passport.use(new LocalStrategy((username, password, done) => {
        myDataBase.findOne({ username: username }, (err, user) => {
            console.log(`User ${username} attempted to log in.`);
            if (err) return done(err, null);
            if (!user) return done(null, false);
            if (!bcrypt.compareSync(password, user.password)) return done(null, false);
            return done(null, user);
        });
    }));

    passport.use(new GithubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/github/callback"
    }, function (accessToken, refreshToken, profile, cb) {
        myDataBase.findOneAndUpdate(
            { id: profile.id },
            {
                $setOnInsert: {
                    id: profile.id,
                    username: profile.username,
                    name: profile.displayName || 'John Doe',
                    photo: profile.photos[0].value || '',
                    email: Array.isArray(profile.emails)
                        ? profile.emails[0].value
                        : 'No public email',
                    created_on: new Date(),
                    provider: profile.provider || ''
                },
                $set: {
                    last_login: new Date()
                },
                $inc: {
                    login_count: 1
                }
            },
            {
                upsert: true,
                new: true
            },
            (err, doc) => {
                return cb(null, doc.value);
            }
        );
    }));
}
// This is not a template file