# 🎬 CineIntel - Bollywood Investment Intelligence Platform

A full-stack AI-powered platform for analyzing Bollywood movie investments using historical data (2001-2019).

![CineIntel Platform](https://img.shields.io/badge/Status-Production%20Ready-success)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688)
![Next.js](https://img.shields.io/badge/Next.js-14.0.4-000000)
![ML Accuracy](https://img.shields.io/badge/ML%20Accuracy-67.5%25-blue)

## 📊 Overview

CineIntel provides data-driven insights for Bollywood film investments by analyzing 196 movies from 2001-2019. The platform features:

- **Executive Dashboard**: KPI metrics, AI recommendations, budget optimization
- **Genre Intelligence**: Interactive charts showing trends and performance
- **Financial Risk Analysis**: Risk scoring and volatility metrics
- **Genre Combination Lab**: Multi-genre performance analysis
- **Investment Simulator**: ML-powered movie success prediction

## 🏗️ Architecture

### Backend (FastAPI)

- **Data Service**: Processes 3 CSV datasets (movies, genre-year stats, genre-overall stats)
- **ML Service**: Random Forest classifier with 67.5% accuracy
- **5 API Modules**: Dashboard, Genre, Risk, Combinations, Predict
- **Port**: 8000

### Frontend (Next.js 14)

- **Framework**: Next.js with App Router
- **Styling**: Tailwind CSS with dark SaaS theme
- **Charts**: Recharts for data visualization
- **Design**: Glassmorphism with smooth animations
- **Port**: 3000

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload

# Server runs on http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# App runs on http://localhost:3000
```

## 📁 Project Structure

```
CineIntel/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── services/
│   │   ├── data_service.py     # Data loading & processing
│   │   └── ml_service.py       # ML model & predictions
│   ├── routes/
│   │   ├── dashboard.py        # Dashboard endpoints
│   │   ├── genre.py            # Genre intelligence endpoints
│   │   ├── risk.py             # Risk analysis endpoints
│   │   ├── combinations.py     # Genre combo endpoints
│   │   └── predict.py          # ML prediction endpoint
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Main app component
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── tabs/
│   │       ├── ExecutiveDashboard.tsx
│   │       ├── GenreIntelligence.tsx
│   │       ├── FinancialRisk.tsx
│   │       ├── GenreCombinationLab.tsx
│   │       └── InvestmentSimulator.tsx
│   ├── lib/
│   │   └── api.ts              # API client
│   ├── tailwind.config.ts
│   └── package.json
│
└── movie-data-pipeline/
    ├── merged_bollywood_movies.csv
    ├── genre_year_statistics.csv
    └── genre_overall_statistics.csv
```

## 🎯 Features

### 1. Executive Dashboard

- **KPIs**: Total movies, success rate, highest ROI genre, latest trends
- **AI Recommendations**: Dynamic insights based on 2019 data
- **Budget Optimizer**: Genre-specific budget suggestions
- **Release Timing**: Optimal month recommendations per genre

### 2. Genre Intelligence

- **4 Interactive Charts**:
  - Genre popularity over time (line chart)
  - Highest grossing genres per year (bar chart)
  - Success rate by genre (bar chart)
  - Average ROI by genre (bar chart)
- **Filters**: Year range sliders, multi-select genres

### 3. Financial Risk Intelligence

- **Industry Risk Index**: Circular gauge showing overall market risk (20.75)
- **Risk Ranking Table**: Genre-by-genre analysis with risk categories
- **ROI Volatility Chart**: Investment risk visualization

### 4. Genre Combination Lab

- **Top 10 Best Combinations**: Highest performing multi-genre movies
- **Bottom 10 Worst Combinations**: Risky genre pairings to avoid
- **Summary Stats**: Total combinations, best/worst performers

### 5. Investment Simulator

- **ML Prediction Form**: Genre, budget, year, rating, runtime inputs
- **Results Display**: Hit/Average/Flop prediction with probabilities
- **Similar Movies**: Top 5 historical comparisons
- **Feature Importance**: Chart showing key prediction factors

## 📊 Data Summary

- **Movies Analyzed**: 196
- **Time Period**: 2001-2019
- **Overall Success Rate**: 53.06%
- **Highest ROI Genre**: Drama|Music (242.45x)
- **Industry Risk Index**: 20.75

## 🎨 Design Features

- **Dark SaaS Theme**: Modern glassmorphism design
- **Color Palette**: Indigo (#6366f1), Pink (#ec4899), Teal (#14b8a6)
- **Animations**: Fade-in, slide-up, shimmer effects
- **Responsive**: Mobile-first design
- **Custom Scrollbar**: Styled for dark theme

## 🧪 API Endpoints

### Dashboard

- `GET /api/dashboard/summary` - KPI metrics
- `GET /api/dashboard/ai-recommendation` - AI insights
- `GET /api/dashboard/budget-optimization` - Budget suggestions
- `GET /api/dashboard/release-timing` - Optimal release months

### Genre

- `GET /api/genre/popularity` - Genre popularity over time
- `GET /api/genre/highest-grossing` - Revenue by genre/year
- `GET /api/genre/success-rate` - Success rates
- `GET /api/genre/roi` - ROI analysis
- `GET /api/genre/all` - List all genres
- `GET /api/genre/year-range` - Available year range

### Risk

- `GET /api/risk/analysis` - Comprehensive risk analysis

### Combinations

- `GET /api/combinations/analysis` - Genre combination performance

### Predict

- `POST /api/predict/movie` - ML movie success prediction

## 🔮 Future Scope

- Integration with live TMDb API
- OTT streaming analytics
- Real-time market trends (2020+)
- Enhanced ML models with deep learning
- User authentication & saved predictions
- PDF report exports
- Mobile app (React Native)

## 📝 License

This project is for educational and analytical purposes. Movie data sourced from publicly available datasets.

## 🙏 Acknowledgments

- Data from Bollywood movie databases (2001-2019)
- Built with FastAPI, Next.js, Tailwind CSS, and Recharts
- ML powered by scikit-learn Random Forest

---

**Note**: This platform provides historical analysis (2001-2019) and should be used as a reference tool. Future market conditions may vary.
