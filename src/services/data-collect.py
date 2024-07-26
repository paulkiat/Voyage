import requests
import time
import threading
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from pymongo import MongoClient
from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, LSTM
import jwt
from functools import wraps

# Constants
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "travel_data"
SCRAPE_INTERVAL = 3600  # 1 hour
SECRET_KEY = "your_secret_key_here"

class ProxyManager:
    def __init__(self):
        self.proxies = [
            "http://proxy1.example.com",
            "http://proxy2.example.com",
            # Add more proxies
        ]
        self.current_index = 0

    def get_proxy(self):
        proxy = self.proxies[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.proxies)
        return {"http": proxy, "https": proxy}

class BaseScraper:
    def __init__(self):
        self.session = requests.Session()
        self.proxy_manager = ProxyManager()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    def get(self, url):
        while True:
            try:
                response = self.session.get(url, headers=self.headers, proxies=self.proxy_manager.get_proxy(), timeout=10)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                print(f"Request failed: {e}")
                time.sleep(5)

    def scrape(self):
        raise NotImplementedError

class ExpediaScraper(BaseScraper):
    def scrape(self):
        url = "https://www.expedia.com/Hotels"
        response = self.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        hotels = []
        for hotel in soup.find_all('div', class_='hotel-info'):
            name = hotel.find('h3', class_='hotel-name').text.strip()
            price = hotel.find('span', class_='price').text.strip()
            rating = hotel.find('span', class_='rating').text.strip()
            amenities = [a.text.strip() for a in hotel.find_all('li', class_='amenity')]
            hotels.append({
                "name": name,
                "price": price,
                "rating": rating,
                "amenities": amenities,
                "source": "Expedia"
            })
        return hotels

class BookingScraper(BaseScraper):
    def scrape(self):
        url = "https://www.booking.com/"
        # Implement Booking.com scraping logic
        pass

class AirbnbScraper(BaseScraper):
    def scrape(self):
        url = "https://www.airbnb.com/"
        # Implement Airbnb scraping logic
        pass

class DataProcessor:
    def __init__(self):
        self.scaler = StandardScaler()

    def process(self, raw_data):
        df = pd.DataFrame(raw_data)
        df = self.clean(df)
        df = self.transform(df)
        return self.validate(df)

    def clean(self, df):
        df.dropna(inplace=True)
        df.drop_duplicates(inplace=True)
        return df

    def transform(self, df):
        df['price'] = df['price'].str.replace('$', '').astype(float)
        df['rating'] = df['rating'].astype(float)
        df['amenities_count'] = df['amenities'].apply(len)
        df = pd.get_dummies(df, columns=['source'])
        
        numeric_columns = ['price', 'rating', 'amenities_count']
        df[numeric_columns] = self.scaler.fit_transform(df[numeric_columns])
        
        return df

    def validate(self, df):
        assert df['price'].min() >= 0, "Negative prices found"
        assert df['rating'].between(0, 5).all(), "Invalid ratings found"
        assert df['name'].nunique() == len(df), "Duplicate hotel names found"
        return df

class DeepLearningModel:
    def __init__(self):
        self.model = Sequential([
            LSTM(64, input_shape=(None, 1), return_sequences=True),
            LSTM(32),
            Dense(16, activation='relu'),
            Dense(1)
        ])
        self.model.compile(optimizer='adam', loss='mse')

    def train(self, data):
        X = data.drop('price', axis=1).values
        y = data['price'].values
        X = X.reshape((X.shape[0], X.shape[1], 1))
        self.model.fit(X, y, epochs=100, batch_size=32, validation_split=0.2)

    def predict(self, features):
        features = features.reshape((features.shape[0], features.shape[1], 1))
        return self.model.predict(features)

class EnsembleModel:
    def __init__(self):
        self.rf_model = RandomForestRegressor()
        self.gb_model = GradientBoostingRegressor()
        self.dl_model = DeepLearningModel()

    def train(self, data):
        X = data.drop('price', axis=1)
        y = data['price']
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
        
        self.rf_model.fit(X_train, y_train)
        self.gb_model.fit(X_train, y_train)
        self.dl_model.train(data)
        
        rf_pred = self.rf_model.predict(X_test)
        gb_pred = self.gb_model.predict(X_test)
        dl_pred = self.dl_model.predict(X_test.values)
        
        ensemble_pred = (rf_pred + gb_pred + dl_pred.flatten()) / 3
        mse = mean_squared_error(y_test, ensemble_pred)
        print(f"Ensemble Model MSE: {mse}")

    def predict(self, features):
        rf_pred = self.rf_model.predict(features)
        gb_pred = self.gb_model.predict(features)
        dl_pred = self.dl_model.predict(features.values)
        return (rf_pred + gb_pred + dl_pred.flatten()) / 3

class RecommendationModel:
    def train(self, data):
        # Implement recommendation model training
        pass

    def recommend(self, user_preferences):
        # Implement recommendation logic
        pass

class MachineLearningPipeline:
    def __init__(self):
        self.models = {
            'price_predictor': EnsembleModel(),
            'recommendation_engine': RecommendationModel(),
        }

    def train(self, data):
        for model in self.models.values():
            model.train(data)

    def get_models(self):
        return self.models

class Database:
    def __init__(self):
        self.client = MongoClient(MONGO_URI)
        self.db = self.client[DB_NAME]

    def store(self, data):
        collection = self.db['hotels']
        collection.insert_many(data.to_dict('records'))

    def retrieve(self, query):
        collection = self.db['hotels']
        return pd.DataFrame(list(collection.find(query)))

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.args.get('token')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 403
        try:
            jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except:
            return jsonify({'message': 'Token is invalid!'}), 403
        return f(*args, **kwargs)
    return decorated

class APIManager:
    def __init__(self):
        self.app = Flask(__name__)
        self.models = None

    def setup_routes(self):
        @self.app.route('/predict', methods=['POST'])
        @token_required
        def predict():
            data = request.json
            predictions = self.models['price_predictor'].predict(pd.DataFrame([data]))
            return jsonify({"predicted_price": predictions[0]})

        @self.app.route('/recommend', methods=['POST'])
        @token_required
        def recommend():
            user_preferences = request.json
            recommendations = self.models['recommendation_engine'].recommend(user_preferences)
            return jsonify({"recommendations": recommendations})

    def update_models(self, models):
        self.models = models

    def run(self):
        self.setup_routes()
        self.app.run(host='0.0.0.0', port=5000)

class TravelDataOrchestrator:
    def __init__(self):
        self.scrapers = {
            'expedia': ExpediaScraper(),
            'booking': BookingScraper(),
            'airbnb': AirbnbScraper(),
        }
        self.data_processor = DataProcessor()
        self.ml_pipeline = MachineLearningPipeline()
        self.database = Database()
        self.api_manager = APIManager()

    def run(self):
        while True:
            raw_data = self.collect_data()
            processed_data = self.data_processor.process(raw_data)
            self.database.store(processed_data)
            self.ml_pipeline.train(processed_data)
            self.api_manager.update_models(self.ml_pipeline.get_models())
            time.sleep(SCRAPE_INTERVAL)

    def collect_data(self):
        all_data = []
        for name, scraper in self.scrapers.items():
            try:
                data = scraper.scrape()
                all_data.extend(data)
            except Exception as e:
                print(f"Error scraping {name}: {str(e)}")
        return all_data

if __name__ == "__main__":
    orchestrator = TravelDataOrchestrator()
    api_thread = threading.Thread(target=orchestrator.api_manager.run)
    api_thread.start()
    orchestrator.run()