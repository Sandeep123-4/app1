const express = require('express');
const mongoose = require('mongoose');
const argon2 = require('argon2'); // Use argon2 for password hashing
const cookieSession = require('cookie-session'); // Use cookie-session for session management
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
let img; // Changed to let since it will be reassigned

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    // Fixed img assignment - cb returns undefined
    const filename = `${Date.now()}-${file.originalname}`;
    img = filename;
    cb(null, filename);
  }
});

const upload = multer({ storage });

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
  email: {type: String, required: true, unique: true}, // Fixed typo in required
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Middleware
app.set('view engine', 'ejs'); // Removed duplicate app declaration
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Added to serve uploaded files
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

app.post('/register', upload.single("image"), async (req, res) => {
  const {email, username, password } = req.body;
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).send('User already exists');
    }
    
    const hashedPassword = await argon2.hash(password);
    const newUser = new User({ email, username, password: hashedPassword });
    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).send('Error registering user');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await argon2.verify(user.password, password)) {
      req.session.userId = user._id;
      res.redirect('/dashboard');
    } else {
      res.status(400).send('Invalid email or password');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Server error');
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
  try {
    const user = await User.findById(req.session.userId);
    if (user) {
      res.render('dashboard', { img: `/uploads/${img}`, username: user.username });
    } else {
      req.session = null;
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
