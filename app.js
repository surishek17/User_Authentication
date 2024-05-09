const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3000;

// Load secret key from environment variable
const secretKey = process.env.SECRET_KEY;

require('dotenv').config(); // Load environment variables

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Node'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

app.use(express.static('public'));


// Middleware
app.use(bodyParser.json());

// Render index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
  });
  
  // Render dashboard.html
  app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/views/dashboard.html');
  });
  

// Routes
app.post('/register', (req, res) => {
    const { username, password } = req.body;
  
    // Check if username or password is missing
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
  
    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to hash password' });
      }
  
      // Insert user into the database
      connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (error, results) => {
        if (error) {
          // Check if username is already taken
          if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username is already taken' });
          }
          return res.status(500).json({ error: 'Failed to register user' });
        }
        res.status(201).json({ message: 'User registered successfully' });
      });
    });
  });
  

  app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    // Check if username or password is missing
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
  
    // Fetch user from the database
    connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to fetch user' });
      }
      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
  
      const user = results[0];
  
      // Compare hashed password
      bcrypt.compare(password, user.password, (err, isValidPassword) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to compare passwords' });
        }
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
  
        // Generate JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, 'secret_key', { expiresIn: '1h' });
        res.json({ token });
      });
    });
  });
  

// Protected route
app.get('/dashboard', verifyToken, (req, res) => {
  jwt.verify(req.token, 'secret_key', (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      res.json({
        message: 'Welcome to the dashboard',
        authData
      });
    }
  });
});

// Logout route
app.post('/logout', (req, res) => {
    // Clear the JWT token from the client-side
    res.clearCookie('jwt');
    res.json({ message: 'User logged out successfully' });
  });
  
// Token verification middleware
function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearerToken = bearerHeader.split(' ')[1];
    req.token = bearerToken;
    next();
  } else {
    res.sendStatus(403);
  }
}

// Example usage of secretKey
console.log('Secret key:', secretKey);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
