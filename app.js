const mysql = require('mysql')
const express = require('express');
const app = express();
const session = require('express-session');
const conn = require('./dbConfig');
const path = require('path');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');



app.set('view engine', 'ejs');
app.use(session({
    secret: 'yoursecret',
    resave: false,
    saveUninitialized: true
}));
app.use('/public', express.static('public'));

app.use(session({
    secret: '1234',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 } // Use 'secure: true' in production with HTTPS
}));

//Below is admin page

// Admin page route

app.get('/admin', function (req, res) {
    res.render("admin");
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Hardcoded admin credentials (for demo purposes)

const adminUsername = 'admin';
const adminPassword = '1234'; // You could hash the password in a real app



// Login route
app.post('/auth', function (req, res) {
    console.log('Login request body:', req.body); // Check incoming form data
    let username = req.body.username;
    let password = req.body.password;


    if (username && password) {
        // Check for admin credentials
        if (username === adminUsername && password === adminPassword) {
            req.session.loggedin = true;
            req.session.username = username;
            req.session.isAdmin = true;  // Set a flag for admin
            res.redirect('/admin');
        } else {
            // Check database for regular users
            conn.query('SELECT * FROM users WHERE username = ?', [username], function (error, results, fields) {
                if (error) {
                    console.log('Error occurred: ', error);
                    throw error;
                }
                if (results.length > 0) {
                    let storedHashedPassword = results[0].password;
                    bcrypt.compare(password, storedHashedPassword, function (err, isMatch) {
                        if (err) {
                            console.log('Error comparing passwords: ', err);
                            return res.send('Error during login');
                        }

                        if (isMatch) {
                            req.session.loggedin = true;
                            req.session.username = username;
                            req.session.isAdmin = false;  // Regular user, not an admin
                            res.redirect('/membersOnly'); // Or any other page
                        } else {
                            res.send('Incorrect Username and/or Password!');
                        }
                    });
                } else {
                    res.send('Incorrect Username and/or Password!');
                }
            });
        }
    } else {
        res.send('Please enter Username and Password!');
    }
});



// Admin route


app.get('/admin', function (req, res) {
    // Check if the user is logged in and is an admin
    if (req.session.loggedin && req.session.isAdmin) {
        // Query multiple tables in the database (you can add more queries for other tables)
        const usersQuery = 'SELECT * FROM users';
        const ordersQuery = 'SELECT * FROM orders';  // Example: Orders table
        const productsQuery = 'SELECT * FROM products';  // Example: Products table

        // Run queries for all the required tables
        conn.query(usersQuery, function (error, usersResults) {
            if (error) {
                console.log('Error fetching users: ', error);
                return res.send('Error fetching users');
            }

            conn.query(ordersQuery, function (error, ordersResults) {
                if (error) {
                    console.log('Error fetching orders: ', error);
                    return res.send('Error fetching orders');
                }

                conn.query(productsQuery, function (error, productsResults) {
                    if (error) {
                        console.log('Error fetching products: ', error);
                        return res.send('Error fetching products');
                    }

                    // Once data is fetched, render the admin page with the data
                    res.render('admin', {
                        username: req.session.username, 
                        users: usersResults, 
                        orders: ordersResults, 
                        products: productsResults
                    });
                });
            });
        });
    } else {
        res.send('You must be logged in as an admin to view this page.');
    }
});











app.get('/login', function (req, res) {
    res.render("login.ejs");
});


//Users can access this if they are logged in
app.get('/membersOnly', function (req, res, next) {
    if (req.session.loggedin) {
        res.render('membersOnly')
    }
    else {
        res.send('Please login to view this page!');
    }
});

app.get('/home', function (req, res) {
    res.render("home");
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/register', function (req, res) {
    res.render("register");
});

app.post('/register', function (req, res) {
    res.redirect("success");
});

app.get('/success', function (req, res) {
    res.render("success");
});

app.get('/cart', function (req, res) {
    res.render("cart");
});

app.get('/accessory', function (req, res) {
    res.render("accessory");
});

app.get('/about', function (req, res) {
    res.render("about");
});

app.get('/search', function (req, res) {
    res.render("search");
});

app.get('/test', function (req, res) {
    res.render("test");
});

app.get('/testimonials', function (req, res) {
    res.render("testimonials");
});

app.get('/terms', function (req, res) {
    res.render("terms");
});

app.get('/privacy', function (req, res) {
    res.render("privay");
});

app.get('/service', function (req, res) {
    res.render("service");
});

app.get('/team', function (req, res) {
    res.render("team");
});


app.listen(3000);
console.log('Node app is running on port 3000');




// Below is register page 

app.post('/reg', function (request, response) {
    console.log('Register Request', request.body);

    // Extract the username, password, and confirmPassword from the request body
    const { username, password, confirm_password } = request.body;

    // Check if the password and confirmPassword match
    if (password !== confirm_password) {
        return response.status(400).send('Passwords do not match!');
    }

    // ADD TO DATABASE

    var hashedPassword = bcrypt.hashSync(request.body.password, 10);
    console.log('Hashed Password', hashedPassword);

    conn.query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [request.body.username, hashedPassword],
        function (error, results, fields) {
            if (error) {
                // Handle duplicate username error (ER_DUP_ENTRY is a typical MySQL error code)
                if (error.code === 'ER_DUP_ENTRY') {
                    console.log('Duplicate username:', error.message);
                    return response.status(400).send('Username already exists');
                }

                // Log other types of errors
                console.log('Error:', error, 'Fields:', fields);
                return response.status(500).send('An error occurred, please try again');
            } else {
                console.log('User added to database');
                return response.redirect('/success');
            }
        }
    );
});


// Below is Cart Page

// Route to add an item to the cart
app.post('/cart/add', (req, res) => {
    const { itemId, itemName, number, itemPrice } = req.body;
    console.log('item log', itemId, itemName, itemPrice);

    // Initialize the cart in session if it doesn't exist
    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Add the item to the cart
    req.session.cart.push({
        itemId,
        itemName,
        number,
        itemPrice,
    });

    res.redirect('/cart'); // Redirect to cart page to view updated cart
});

app.get('/cart', (req, res) => {
    // Pass the cart (from session or any other source) to the EJS template
    const cart = req.session.cart || [];  // Or wherever you store the cart data
    res.render('cart', { cart });
});

// Route to remove an item from the cart
app.post('/cart/remove', (req, res) => {
    const { itemId } = req.body;

    // Filter out the item from the cart based on itemId
    req.session.cart = req.session.cart.filter(item => item.itemId !== itemId);

    res.redirect('/cart'); // Redirect to cart page after removing item
});

// Route for the home page or product listing
app.get('/', (req, res) => {
    res.render('home'); // Render homepage or products page (You need to create the 'home' template)
});



// Below is contact page

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded (HTML form submissions)


app.get('/contact', function (req, res) {
    res.render("contact");
});

app.post('/contact', (req, res) => {
    console.log('Contact form processing started');
    console.log(req.body);  // Log the entire request body
    // Capture the form data inside the request handler
    const { fname, lname, email, enquiry, subject } = req.body; // Destructure the form data
    // Validate the data (optional)
    if (!fname || !lname || !email || !enquiry || !subject) {
        return res.status(400).send('All fields are required!');
    }

    conn.query(
        'INSERT INTO contact (fname, lname, email, enquiry, subject) VALUES (?,?,?,?,?)',
        [fname, lname, email, enquiry, subject],
        function (error, results, fields) {
            if (error) {
                // Log other types of errors
                console.log('Error:', error, 'Fields:', fields);
                return res.status(500).send('An error occurred, please try again');
            } else {
                console.log('User added to database');
                return res.send('Thank you for your message! We will get back to you shortly.');
            }
        }
    );
});







