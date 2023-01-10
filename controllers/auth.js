const bcrypt = require('bcryptjs');
const { log } = require('console');
const mailjet = require('node-mailjet')
.connect('3a8842f95a9e1ad02895af0ee2f73c72', 'f385c184c231e2ef7c5a2be21f9f5364');
const crypto = require('crypto');
const User = require('../models/user');

// TODO
// const transporter = nodemailer.createTransport(sendgridTransport({
//     auth: {
//         api_key:
//     }
// }));

exports.getLogin = (req, res, next) => {
    // extract the error message
    let message = req.flash('loginError');
    if (message.length > 0) {
        message = message[0]
    } else {
        message = null
    }
    // render the page
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message
    });
}

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    User.findOne({email: email})
        .then(user => {
            // check if user exist
            if (!user) {
                req.flash('loginError', 'Invalid email or password.');
                return res.redirect('/login')
            }
            bcrypt.compare(password, user.password)
                .then(doMatch => {
                    // check if the password is correct
                    if (doMatch === true) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save((err) => {
                            console.log(err);
                            res.redirect('/')
                        });
                    }
                    req.flash('loginError', 'Invalid email or password.');
                    res.redirect('/login')
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login')
                });
        })
        .catch(err => console.log(err))
}

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
}

exports.getSignup = (req, res, next) => {
    // extract error message
    let message = req.flash('signupError')
    if (message.length > 0) {
        message = message[0]
    } else {
        message = null
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Sign Up',
        errorMessage: message
    });
}

// exports.postSignup = (req,res,next) => {
//     const email = req.body.email;
//     const password = req.body.password;
//     const confirmPassword = req.body.confirmPassword;

//     User.findOne({email: email})
//         .then(userDoc => {
//             if (userDoc) {
//                 req.flash('signupError', 'User already exists')
//                 return res.redirect('/signup');
//             }
//             return bcrypt.hash(password, 12)
//                 .then(hashedPassword => {
//                     const user = new User({
//                         email: email,
//                         password: hashedPassword,
//                         cart: {items: []}
//                     });
//                     return user.save()
//                 })
//                 .then(result => {
//                     const request = mailjet
//                     .post("send", {'version': 'v3.1'})
//                     .request({
//                         "Messages":[
//                             {
//                             "From": {
//                                 "Email": "djnspc@gmail.com"
//                             },
//                             "To": [
//                                 {
//                                 "Email": email
//                                 }
//                             ],
//                             "Subject": "Signin succeeded",
//                             "HTMLPart": "<h2>You succesfully signed up! </h2> <br/> May devlivery force be with you"
//                             }
//                         ]
//                     })
//                     .then((result) => {
//                         console.log(result.body)
//                         res.redirect('/login');
//                       })
//                       .catch(err => {
//                         console.log(err.statusCode)
//                       })
//                 })
//         })
//         .catch(err => console.log(err));
// }

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    })
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if(err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
            .then(user => {
                if(!user) {
                    req.flash('error', 'No account with that email was found')
                    return res.redirect('/reset')
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect('/');
                const request = mailjet
                .post("send", {'version': 'v3.1'})
                .request({
                    "Messages":[
                        {
                        "From": {
                            "Email": "djnspc@gmail.com"
                        },
                        "To": [
                            {
                            "Email": req.body.email
                            }
                        ],
                        "Subject": "Password reset",
                        "HTMLPart": `
                            <p>You requested a password reset</p>
                            <p>Clock on this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password</p>
                        `
                        }
                    ]
                })
            })
            .catch(err => console.log(err))
    })
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    // check if token exist and not expired
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            let message = req.flash('error');
            if(message.length > 0) {
                message = message[0];
            } else {
                message = null
            }
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'Reset Password',
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token
            })
        })
        .catch(err => console.log(err))
};

exports.postNewPassword = (req, res, next) => {
    const newPassword =  req.body.password
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration:{$gt: Date.now()},
        _id: userId
        })
        .then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then(hashedPassword => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = undefined;
            resetUser.resetTokenExpiration = undefined;
            return resetUser.save();
        })
        .then(result => {
            res.redirect('/login')
        })
        .catch(err => console.log(err))
};