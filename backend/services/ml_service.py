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
            self.feature_names = self.genre_columns + ['budget', 'year', 'imdb_rating', 'runtime', 'release_month']
        
        # Create binary columns for genres found in input
        for genre in sorted(input_genres):
            data[f'genre_{genre}'] = data['genre'].apply(
                lambda x: 1 if isinstance(x, str) and genre in x.split('|') else 0
            )
        
        # Fill missing values for numerical cols
        numerical_cols = ['budget', 'year', 'imdb_rating', 'runtime', 'release_month']
        for col in numerical_cols:
            if col in data.columns:
                data[col] = data[col].fillna(data[col].median())
        
        return data
    
    def train_model(self):
        """Train Random Forest model"""
        try:
            movies = self.data_service.movies.copy()
            
            # Remove rows with missing critical data
            movies = movies.dropna(subset=['success_label', 'budget', 'runtime', 'release_month'])
            
            # For training, fill IMDb rating if missing
            movies['imdb_rating'] = movies['imdb_rating'].fillna(movies['imdb_rating'].median())
            
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
            
            # Calculate confusion matrix
            from sklearn.metrics import confusion_matrix
            y_pred = self.model.predict(X_test)
            self.confusion_matrix = confusion_matrix(y_test, y_pred).tolist()
            
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
                risk_color = '#10b981' # Emerald
            elif hit_prob > 35:
                risk_level = 'Moderate'
                risk_color = '#f59e0b' # Amber
            else:
                risk_level = 'High'
                risk_color = '#ef4444' # Rose
            
            # Get feature importance
            feature_importance = self.get_feature_importance()
            
            # Generate "SHAP-style" explanation (Simplified)
            explanations = []
            for feat in feature_importance[:4]:
                f_name = feat['feature']
                imp = feat['importance']
                if f_name in ['budget', 'year', 'imdb_rating', 'runtime']:
                    val = input_data.iloc[0][f_name]
                    median = self.data_service.movies[f_name].median()
                    impact = "Positive" if val >= median else "Negative"
                    # Invert for budget if it's too high? 
                    if f_name == 'budget' and val > median * 1.5: impact = "Negative"
                    
                    explanations.append({
                        "feature": f_name.capitalize(),
                        "impact": impact,
                        "description": f"{f_name.capitalize()} is {'above' if val >= median else 'below'} market median."
                    })
                else:
                    # Genre feature
                    is_active = input_processed.iloc[0][f'genre_{f_name}'] == 1
                    if is_active:
                        explanations.append({
                            "feature": f_name,
                            "impact": "Positive", # Usually selecting a high importance genre is positive
                            "description": f"Targeting high-impact {f_name} segment."
                        })

            return {
                'prediction': predicted_label,
                'probabilities': prob_dict,
                'hit_probability': prob_dict.get('Hit', 0),
                'expected_roi': round(expected_roi, 2),
                'risk_level': risk_level,
                'risk_color': risk_color,
                'explanations': explanations,
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

    def get_model_transparency(self) -> Dict:
        """Get model transparency metrics"""
        return {
            "accuracy": round(self.model_accuracy * 100, 2),
            "confusion_matrix": getattr(self, "confusion_matrix", []),
            "classes": self.label_encoder.classes_.tolist(),
            "feature_importance": self.get_feature_importance()[:10],
            "dataset_info": {
                "total_samples": len(self.data_service.movies),
                "features_count": len(self.feature_names)
            }
        }

    def compare_investment_plans(self, plan_a: Dict, plan_b: Dict) -> Dict:
        """Compare two investment plans"""
        # Predict for Plan A
        pred_a = self.predict(
            plan_a['genre'], plan_a['budget'], plan_a['year'], 
            plan_a['rating'], plan_a['runtime']
        )
        
        # Predict for Plan B
        pred_b = self.predict(
            plan_b['genre'], plan_b['budget'], plan_b['year'], 
            plan_b['rating'], plan_b['runtime']
        )
        
        # Compare
        better_plan = "Plan A" if pred_a['hit_probability'] > pred_b['hit_probability'] else "Plan B"
        if abs(pred_a['hit_probability'] - pred_b['hit_probability']) < 5:
            # If probability similar, check ROI
            better_plan = "Plan A" if pred_a['expected_roi'] > pred_b['expected_roi'] else "Plan B"
            
        return {
            "plan_a": {
                "prediction": pred_a['prediction'],
                "hit_probability": pred_a['hit_probability'],
                "expected_roi": pred_a['expected_roi'],
                "risk_level": pred_a['risk_level']
            },
            "plan_b": {
                "prediction": pred_b['prediction'],
                "hit_probability": pred_b['hit_probability'],
                "expected_roi": pred_b['expected_roi'],
                "risk_level": pred_b['risk_level']
            },
            "better_option": better_plan,
            "comparison_note": f"{better_plan} offers better risk-adjusted returns."
        }

    def predict_simulator(self, genre: str, budget: float, runtime: int, release_month: int) -> Dict:
        """Prediction logic for the Investment Simulator (Data-Driven)"""
        try:
            # Current year for prediction context
            current_year = 2024
            # Neutral IMDb rating for the model
            median_imdb = self.data_service.movies['imdb_rating'].median()
            
            # Create input dataframe
            input_data = pd.DataFrame([{
                'genre': genre,
                'budget': budget,
                'year': current_year,
                'imdb_rating': median_imdb,
                'runtime': runtime,
                'release_month': release_month
            }])
            
            input_processed = self.prepare_features(input_data, is_training=False)
            for col in self.feature_names:
                if col not in input_processed.columns:
                    input_processed[col] = 0
            
            X = input_processed[self.feature_names]
            probabilities = self.model.predict_proba(X)[0]
            classes = self.label_encoder.classes_
            prob_dict = {classes[i]: round(float(probabilities[i]) * 100, 2) for i in range(len(classes))}
            
            hit_prob = prob_dict.get('Hit', 0)
            
            # Expected ROI calculation
            similar_movies = self.find_similar_movies_for_simulator(genre, budget)
            avg_roi = np.mean([m['roi'] for m in similar_movies]) if similar_movies else 0
            
            # Risk score logic
            risk_score = 100 - hit_prob
            
            return {
                'success_probability': hit_prob,
                'expected_roi': round(avg_roi, 2),
                'risk_score': round(risk_score, 2),
                'similar_movies': similar_movies[:5]
            }
        except Exception as e:
            print(f"❌ Simulator prediction error: {e}")
            raise

    def find_similar_movies_for_simulator(self, genre: str, budget: float, top_n: int = 10) -> List[Dict]:
        """Specific similarity logic for simulator using budget clusters"""
        movies = self.data_service.movies.copy()
        
        # Genre filter
        input_genres = set(genre.split('|'))
        movies['genre_match'] = movies['genre'].apply(
            lambda x: len(input_genres.intersection(set(str(x).split('|')))) if pd.notna(x) else 0
        )
        movies = movies[movies['genre_match'] > 0]
        
        if len(movies) == 0:
            movies = self.data_service.movies.copy()
            
        # Budget similarity (log scale for better clustering)
        movies['budget_dist'] = abs(np.log1p(movies['budget']) - np.log1p(budget))
        similar = movies.nsmallest(top_n, 'budget_dist')
        
        return [
            {
                'title': row['title'],
                'year': int(row['year']),
                'roi': round(row['roi'], 2),
                'success_label': row['success_label']
            }
            for _, row in similar.iterrows()
        ]
