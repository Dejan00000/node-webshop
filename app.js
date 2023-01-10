const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');


const errorControler = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI = 'mongodb+srv://dejan:dejansapic123@cluster0.trlcs.mongodb.net/shop?retryWrites=true&w=majority'

const app = express();

// storing sessions
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions',

});

// initialize csrf protection
const csrfProtection = csrf();

app.set('view engine', 'ejs');
app.set('views', 'views') //not necessary

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth')

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'my secret code that sholud be long',
    resave: false,
    saveUninitialized: false,
    store: store
    // cookie: {}
}));

app.use(csrfProtection);  // cross-site request forgery
app.use(flash()); // flash messages

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
    .then(user => {
        req.user = user;
        next();
    })
    .catch(err => console.log(err))
});

app.use((req,res,next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
})


// Routes
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.use(errorControler.get404);



mongoose
    .connect(MONGODB_URI)
    .then(result => {
        app.listen(3000);
        console.log('Connected');
    })
    .catch(err => {
        console.log(err);
    })