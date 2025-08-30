// finlens-backend/server.js

import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio'; // Import cheerio
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Article from './models/Article.js'; // Import the new Article model

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Load environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!GEMINI_API_KEY || !MONGO_URI || !JWT_SECRET) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

// --- Authentication Middleware ---
const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded.id; 
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// --- API Endpoints ---

// User Registration
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await User.create({ username, email, password });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, username: user.username });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a user's saved articles - now protected
app.get('/api/articles', protect, async (req, res) => {
  try {
    const articles = await Article.find({ user: req.user }).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch articles' });
  }
});

// API endpoint for summarizing an article - now protected
app.post('/api/summarize', protect, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch URL with status code: ${response.status}`);
    }

    const htmlContent = response.data;
    const $ = cheerio.load(htmlContent);

    let articleText = '';
    $('p, h1, h2, h3, h4, h5, h6, ul, li').each((i, el) => {
      articleText += $(el).text() + '\n';
    });
    
    // Add sentiment analysis to the prompt
    const prompt = `Please provide a concise, factual summary and a one-word sentiment analysis (Positive, Negative, or Neutral) of the following article content.

    Article Content:
    ${articleText.substring(0, 5000)}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    const summary = aiResponse.substring(0, aiResponse.lastIndexOf('Sentiment:')).trim();
    const sentiment = aiResponse.substring(aiResponse.lastIndexOf('Sentiment:') + 10).trim();

    // Create and save the new article
    const newArticle = new Article({
      user: req.user,
      url,
      summary,
      sentiment
    });

    await newArticle.save();

    res.json({ summary, sentiment });

  } catch (error) {
    console.error('Error during summarization:', error);
    res.status(500).json({ error: 'Failed to process article. The website may be blocking requests or the content is not a valid article. Please try a different URL.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

