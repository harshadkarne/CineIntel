import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from typing import Dict, List
from services.data_service import DataService


class MLService:
    """Machine Learning service for movie success prediction"""
    
    def __init__(self, data_service: DataService):
        self.data_service = data_service
        self.model = None
        self.label_encoder = LabelEncoder()
        self.genre_columns = []
        self.feature_names = []
        self.model_accuracy = 0.0
        self.train_model()
    
    def prepare_features(self, df: pd.DataFrame, is_training: bool = False) -> pd.DataFrame:
        """Prepare features for ML model"""
        # Create a copy
        data = df.copy()
        
        # One-hot encode genres
        # Split multi-genre entries and create binary columns for each genre
        input_genres = set()
        for genre_str in data['genre'].dropna():
            genres = genre_str.split('|')
            input_genres.update(genres)
        
        # If training, set the global genre columns and feature names
        if is_training:
            self.genre_columns = [f'genre_{g}' for g in sorted(input_genres)]
            self.feature_names = self.genre_columns + ['budget', 'year', 'imdb_rating', 'runtime']
        
        # Create binary columns for genres found in input
        for genre in sorted(input_genres):
            data[f'genre_{genre}'] = data['genre'].apply(
                lambda x: 1 if isinstance(x, str) and genre in x.split('|') else 0
            )
        
        # Fill missing values for numerical cols
        numerical_cols = ['budget', 'year', 'imdb_rating', 'runtime']
        for col in numerical_cols:
            if col in data.columns:
                data[col] = data[col].fillna(data[col].median())
        
        return data
    
    def train_model(self):
        """Train Random Forest model"""
        try:
            movies = self.data_service.movies.copy()
            
            # Remove rows with missing critical data
            movies = movies.dropna(subset=['success_label', 'budget', 'imdb_rating', 'runtime'])
            
            # Prepare features
            movies_processed = self.prepare_features(movies, is_training=True)
            X = movies_processed[self.feature_names]
            
            # Encode target labels
            y = self.label_encoder.fit_transform(movies['success_label'])
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Train Random Forest
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                random_state=42,
                class_weight='balanced'
            )
            
            self.model.fit(X_train, y_train)
            
            # Calculate accuracy
            self.model_accuracy = self.model.score(X_test, y_test)
            
            print(f"✅ ML Model trained with accuracy: {self.model_accuracy:.2%}")
            print(f"✅ Classes: {self.label_encoder.classes_}")
            
        except Exception as e:
            print(f"❌ Error training model: {e}")
            raise
    
    def predict(self, genre: str, budget: float, year: int, 
                imdb_rating: float, runtime: int) -> Dict:
        """Make prediction for a movie"""
        try:
            # Create input dataframe
            input_data = pd.DataFrame([{
                'genre': genre,
                'budget': budget,
                'year': year,
                'imdb_rating': imdb_rating,
                'runtime': runtime
            }])
            
            # Prepare features (this will create genre columns)
            input_processed = self.prepare_features(input_data, is_training=False)
            
            # Ensure all training features are present
            for col in self.feature_names:
                if col not in input_processed.columns:
                    input_processed[col] = 0
            
            # Reorder columns to match training
            X = input_processed[self.feature_names]
            
            # Get prediction probabilities
            probabilities = self.model.predict_proba(X)[0]
            prediction = self.model.predict(X)[0]
            
            # Get class names
            classes = self.label_encoder.classes_
            
            # Create probability dict
            prob_dict = {
                classes[i]: round(float(probabilities[i]) * 100, 2)
                for i in range(len(classes))
            }
            
            predicted_label = self.label_encoder.inverse_transform([prediction])[0]
            
            # Calculate expected ROI based on similar movies
            similar_movies = self.find_similar_movies(genre, budget, year, imdb_rating, runtime)
            expected_roi = np.mean([m['roi'] for m in similar_movies]) if similar_movies else 0
            
            # Determine risk level
            hit_prob = prob_dict.get('Hit', 0)
            if hit_prob > 60:
                risk_level = 'Low'
            elif hit_prob > 35:
                risk_level = 'Moderate'
            else:
                risk_level = 'High'
            
            # Get feature importance
            feature_importance = self.get_feature_importance()
            
            return {
                'prediction': predicted_label,
                'probabilities': prob_dict,
                'hit_probability': prob_dict.get('Hit', 0),
                'expected_roi': round(expected_roi, 2),
                'risk_level': risk_level,
                'similar_movies': similar_movies[:5],
                'feature_importance': feature_importance[:10]
            }
            
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {
                'error': str(e),
                'prediction': 'Unknown',
                'probabilities': {},
                'hit_probability': 0,
                'expected_roi': 0,
                'risk_level': 'Unknown',
                'similar_movies': [],
                'feature_importance': []
            }
    
    def find_similar_movies(self, genre: str, budget: float, year: int,
                           imdb_rating: float, runtime: int, top_n: int = 5) -> List[Dict]:
        """Find similar historical movies"""
        movies = self.data_service.movies.copy()
        
        # Calculate similarity score
        movies['similarity'] = 0
        
        # Genre similarity (check if any genre matches)
        input_genres = set(genre.split('|'))
        movies['genre_match'] = movies['genre'].apply(
            lambda x: len(input_genres.intersection(set(str(x).split('|')))) if pd.notna(x) else 0
        )
        movies['similarity'] += movies['genre_match'] * 30
        
        # Budget similarity (within 50% range gets points)
        movies['budget_diff'] = abs(movies['budget'] - budget) / budget
        movies['similarity'] += (1 - movies['budget_diff'].clip(0, 1)) * 25
        
        # Year proximity (within 3 years gets points)
        movies['year_diff'] = abs(movies['year'] - year)
        movies['similarity'] += (1 - (movies['year_diff'] / 10).clip(0, 1)) * 15
        
        # Rating similarity
        movies['rating_diff'] = abs(movies['imdb_rating'] - imdb_rating)
        movies['similarity'] += (1 - (movies['rating_diff'] / 5).clip(0, 1)) * 20
        
        # Runtime similarity
        movies['runtime_diff'] = abs(movies['runtime'] - runtime)
        movies['similarity'] += (1 - (movies['runtime_diff'] / 100).clip(0, 1)) * 10
        
        # Get top N similar movies
        similar = movies.nlargest(top_n, 'similarity')
        
        return [
            {
                'title': row['title'],
                'year': int(row['year']),
                'genre': row['genre'],
                'budget': int(row['budget']),
                'box_office': int(row['box_office']),
                'roi': round(row['roi'], 2),
                'success_label': row['success_label'],
                'similarity_score': round(row['similarity'], 2)
            }
            for _, row in similar.iterrows()
        ]
    
    def get_feature_importance(self) -> List[Dict]:
        """Get feature importance from trained model"""
        if self.model is None:
            return []
        
        importances = self.model.feature_importances_
        
        # Create list of feature importance
        feature_imp = [
            {
                'feature': self.feature_names[i].replace('genre_', ''),
                'importance': round(float(importances[i]) * 100, 2)
            }
            for i in range(len(self.feature_names))
        ]
        
        # Sort by importance
        feature_imp.sort(key=lambda x: x['importance'], reverse=True)
        
        return feature_imp
