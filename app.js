const express = require('express');
const mongoose = require('mongoose');
const argon2 = require('argon2'); // Use argon2 for password hashing
const cookieSession = require('cookie-session'); // Use cookie-session for session management
const dotenv = require('dotenv');
const path = require('path');

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure MONGO_URI is defined
if (!process.env.MONGO_URI) {
  console.error("MongoDB URI is not defined. Please check your .env file.");
  process.exit(1); // Stop the application if the URI is not set
}

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB Connected');
}).catch((err) => {
  console.error('MongoDB Connection Error:', err);
});

// User schema & model
const userSchema = new mongoose.Schema({
  email   :{type:String, require:true , unique:true},
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieSession({
  name: 'session',
  secret: process.env.SESSION_SECRET || 'secretkey',
  maxAge: 1000 * 60 * 60
}));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    const hashedPassword = await argon2.hash(password);  // Hash password using argon2
    const newUser = new User({ email, username, password: hashedPassword });
    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    res.status(400).send('Error registering user');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && await argon2.verify(user.password, password)) {  // Verify password using argon2
    req.session.userId = user._id;
    res.redirect('/dashboard');
  } else {
    res.status(400).send('Invalid username or password');
  }
});

app.post('/logout', (req, res) => {
  req.session = null; // Clears the session
  res.redirect('/');
});

app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  const user = await User.findById(req.session.userId);
  if (user) {
    res.render('dashboard', { username: user.username });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
