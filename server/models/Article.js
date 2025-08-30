// finlens-backend/server/models/Article.js

import mongoose from 'mongoose';

const articleSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    url: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    sentiment: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Article = mongoose.model('Article', articleSchema);

export default Article;
