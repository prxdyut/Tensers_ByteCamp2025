from flask import Flask, request, jsonify
import numpy as np
import joblib
import os
from flask_cors import CORS
import torch
import transformers
from transformers import BitsAndBytesConfig, AutoModelForCausalLM, AutoTokenizer
import pickle
import threading
from pyngrok import ngrok
import tempfile
import soundfile as sf
from pydub import AudioSegment
import io
# Add these imports at the top of your file
import feedparser
import requests
from bs4 import BeautifulSoup
from groq import Groq
import os
from datetime import datetime, timedelta
import threading

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Set up ngrok
ngrok.set_auth_token("2uMzelHqHJxXHvvIH8ZNdiSfLVy_31d7tkS1kwZiWLCX6CDnj")
public_url = ngrok.connect(5004).public_url
print(f" * ngrok tunnel \"{public_url}\" -> \"http://127.0.0.1:5003\"")

# Install required audio processing libraries
try:
    import IPython
    print("Installing audio processing libraries...")
    !pip install pydub soundfile librosa
except:
    pass

# Load the voice model
print("Loading voice model...")
voice_model = None
label_encoder = None

try:
    with open('/kaggle/input/asdfghjk/voice_model.pkl', 'rb') as f:
        voice_model = pickle.load(f)
        print("Voice model loaded successfully")
    
    # Load label encoder
    with open('/kaggle/input/asdfghjk/label_encoder.pkl', 'rb') as f:
        label_encoder = pickle.load(f)
    print("Label encoder loaded successfully")
    
except Exception as e:
    print(f"Error loading voice model: {str(e)}")
    voice_model = None
    label_encoder = None

# Configure 4-bit quantization for Med42 model
print("Loading Med42 model...")
med42_model = None
tokenizer = None
pipeline = None

try:
    # Configure quantization
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )

    # Load model and tokenizer separately
    model_name_or_path = "m42-health/Llama3-Med42-8B"
    tokenizer = AutoTokenizer.from_pretrained(model_name_or_path)
    
    # Load the model with quantization config
    med42_model = AutoModelForCausalLM.from_pretrained(
        model_name_or_path,
        torch_dtype=torch.bfloat16,
        device_map="auto",
        quantization_config=bnb_config
    )
    
    # Create pipeline after loading model and tokenizer
    pipeline = transformers.pipeline(
        "text-generation",
        model=med42_model,
        tokenizer=tokenizer,
        torch_dtype=torch.bfloat16,
    )
    
    print("Med42 model loaded in 4-bit quantization mode")
except Exception as e:
    print(f"Error loading Med42 model: {str(e)}")
    med42_model = None
    tokenizer = None
    pipeline = None

def get_condition_explanation(condition):
    """Get detailed explanation of the condition using Med42 model"""
    if pipeline is None:
        return VOICE_CONDITIONS.get(condition.lower(), "Description not available")
        
    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a helpful, respectful and honest medical assistant specialized in voice disorders. "
                    "Always answer as helpfully as possible, while being safe. "
                    "Keep your answers concise and focused on the medical condition. "
                    "Include brief information about the condition, its main symptoms, and common treatments."
                ),
            },
            {
                "role": "user", 
                "content": f"Explain the voice condition '{condition}' in about 100 words, including what it is, main symptoms, and common treatments."
            },
        ]

        # Apply chat template
        prompt = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )

        # Generate text
        outputs = pipeline(
            prompt,
            max_new_tokens=200,
            do_sample=True,
            temperature=0.4,
            top_k=150,
            top_p=0.75,
        )

        # Extract the generated text
        explanation = outputs[0]["generated_text"][len(prompt):].strip()
        return explanation if explanation else VOICE_CONDITIONS.get(condition.lower(), "Description not available")
            
    except Exception as e:
        print(f"Error getting explanation: {str(e)}")
        return VOICE_CONDITIONS.get(condition.lower(), "Description not available")

# Define voice conditions and their descriptions
VOICE_CONDITIONS = {
    "healthy": "Normal voice condition with no pathological findings, indicating proper function of vocal cords and larynx.",
    "hyperkinetic dysphonia": "A voice disorder characterized by excessive muscle tension in and around the voice box (larynx), leading to strained, effortful voice production.",
    "hypokinetic dysphonia": "A voice disorder commonly associated with Parkinson's disease, characterized by reduced vocal fold closure and decreased vocal intensity.",
    "reflux laryngitis": "Inflammation of the voice box (larynx) caused by stomach acid reflux, leading to hoarseness, chronic cough, and throat irritation."
}

# Store label mapping
LABEL_MAPPING = {
    0: 'healthy',
    1: 'hyperkinetic dysphonia',
    2: 'hypokinetic dysphonia',
    3: 'reflux laryngitis'
}

def convert_audio_to_wav(file_data, file_format):
    """Convert audio file to WAV format"""
    try:
        # Create a temporary file
        with tempfile.NamedTemporaryFile(suffix=f'.{file_format}', delete=False) as temp_in:
            temp_in.write(file_data)
            temp_in_path = temp_in.name
        
        # Convert to WAV using pydub
        if file_format.lower() == 'dat':
            # For .dat files, use the existing function
            return file_data
        else:
            try:
                # Try to load with pydub
                audio = AudioSegment.from_file(temp_in_path, format=file_format)
                
                # Export as WAV to a temporary file
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_out:
                    temp_out_path = temp_out.name
                
                audio.export(temp_out_path, format="wav")
                
                # Read the WAV file
                with open(temp_out_path, 'rb') as f:
                    wav_data = f.read()
                
                # Clean up temporary files
                os.remove(temp_in_path)
                os.remove(temp_out_path)
                
                return wav_data
            
            except Exception as e:
                print(f"Error converting with pydub: {str(e)}")
                # Clean up temporary file
                os.remove(temp_in_path)
                raise e
    
    except Exception as e:
        print(f"Error in audio conversion: {str(e)}")
        raise e

def read_audio_file(file_data, file_format=None):
    """Read audio file and extract features for prediction"""
    try:
        # If it's a .dat file, use the existing function
        if file_format and file_format.lower() == 'dat':
            # Convert binary data to numpy array of int16
            audio_data = np.frombuffer(file_data, dtype=np.int16)
        else:
            # For other formats, convert to WAV first if needed
            if file_format and file_format.lower() != 'wav':
                file_data = convert_audio_to_wav(file_data, file_format)
            
            # Load audio data using soundfile
            audio_data, _ = sf.read(io.BytesIO(file_data))
            
            # If stereo, convert to mono by averaging channels
            if len(audio_data.shape) > 1 and audio_data.shape[1] > 1:
                audio_data = np.mean(audio_data, axis=1)
        
        # Convert to float32 and normalize if not already
        if audio_data.dtype != np.float32:
            max_val = np.iinfo(audio_data.dtype).max if np.issubdtype(audio_data.dtype, np.integer) else 1.0
            audio_data = audio_data.astype(np.float32) / max_val
        
        # Extract simple statistical features
        features = [
            np.mean(audio_data),
            np.std(audio_data),
            np.max(audio_data),
            np.min(audio_data),
            np.median(audio_data),
            np.percentile(audio_data, 25),
            np.percentile(audio_data, 75),
            np.sum(np.absolute(audio_data)),
            np.mean(np.absolute(audio_data)),
            len(audio_data)
        ]
        
        return features
    
    except Exception as e:
        print(f"Error processing audio file: {str(e)}")
        raise e

def predict_voice_condition(file_data, file_format=None):
    """Predict voice condition from audio file"""
    if voice_model is None or label_encoder is None:
        return {
            "success": False,
            "error": "Voice model or label encoder not loaded properly"
        }
        
    try:
        # Extract features
        features = read_audio_file(file_data, file_format)
        features = np.array(features).reshape(1, -1)
        
        # Make prediction
        prediction = voice_model.predict(features)
        probabilities = voice_model.predict_proba(features)
        
        # Get predicted class and probability
        predicted_class = label_encoder.inverse_transform(prediction)[0]
        class_probability = float(max(probabilities[0]) * 100)  # Convert to float for JSON serialization
        
        # Get detailed explanation
        detailed_explanation = get_condition_explanation(predicted_class)
        
        # Create a more structured response
        return {
            "success": True,
            "prediction": {
                "condition": predicted_class,
                "confidence": class_probability,
                "severity": "High" if class_probability > 90 else "Medium" if class_probability > 70 else "Low",
            },
            "medical_info": {
                "brief_description": VOICE_CONDITIONS.get(predicted_class.lower(), "Description not available"),
                "detailed_explanation": detailed_explanation,
                "recommendation": "Please consult with a healthcare professional for a complete evaluation and treatment plan."
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

class HealthNewsManager:
    """Class to manage health news fetching, processing, and caching"""
    
    def __init__(self, groq_api_key):
        # Initialize Groq client
        self.groq_api_key = groq_api_key
        try:
            os.environ["GROQ_API_KEY"] = groq_api_key
            self.groq_client = Groq()
            print("Groq client initialized for health news summarization")
        except Exception as e:
            print(f"Error initializing Groq client: {str(e)}")
            self.groq_client = None
        
        # Health news RSS feeds
        self.rss_feeds = {
            "WHO": "https://www.who.int/feeds/entity/news/en/rss.xml",
            "CDC": "https://tools.cdc.gov/api/v2/resources/media/132608.rss",
            "NIH": "https://www.nih.gov/news-events/news-releases/feed",
            "Medical News Today": "https://www.medicalnewstoday.com/newsfeeds/rss/medical_news_today.xml",
            "Harvard Health": "https://www.health.harvard.edu/blog/feed",
        }
        
        # Cache for health news
        self.cache = {
            "timestamp": None,
            "data": None,
            "expiry_seconds": 3600  # Cache expires after 1 hour
        }
        
        # Lock for thread safety
        self.cache_lock = threading.Lock()
    
    def is_cache_valid(self):
        """Check if the cache is valid"""
        if not self.cache["timestamp"] or not self.cache["data"]:
            return False
        
        current_time = datetime.now()
        cache_age = (current_time - self.cache["timestamp"]).total_seconds()
        return cache_age < self.cache["expiry_seconds"]
    
    def get_cached_news(self):
        """Get news from cache if valid"""
        with self.cache_lock:
            if self.is_cache_valid():
                return self.cache["data"]
            return None
    
    def update_cache(self, data):
        """Update the cache with new data"""
        with self.cache_lock:
            self.cache["timestamp"] = datetime.now()
            self.cache["data"] = data
    
    def fetch_news_from_rss(self, source, rss_url, limit=2):
        """Fetch news articles from an RSS feed"""
        try:
            news = feedparser.parse(rss_url)
            articles = []
            
            for entry in news.entries[:limit]:
                article = {
                    "source": source,
                    "title": entry.title,
                    "link": entry.link,
                    "date": getattr(entry, 'published', 'No date'),
                    "description": getattr(entry, 'description', '')
                }
                articles.append(article)
            
            return articles
        except Exception as e:
            print(f"Error fetching news from {source}: {str(e)}")
            return []
    
    def extract_text_from_url(self, url):
        """Extract the main text content from a news article URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove non-content elements
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.extract()
            
            # Extract paragraphs
            paragraphs = soup.find_all('p')
            text = ' '.join([p.get_text().strip() for p in paragraphs])
            
            # If no paragraphs found, get all text
            if not text:
                text = soup.get_text(separator=' ', strip=True)
            
            return text
        except Exception as e:
            print(f"Error extracting text from URL: {e}")
            return None
    
    def summarize_text(self, text):
        """Summarize text using Groq API"""
        if self.groq_client is None:
            return "Groq API not available."
            
        try:
            if not text or len(text) < 100:
                return "Text too short to summarize."
            
            # Truncate text if it's too long
            if len(text) > 15000:
                text = text[:15000] + "..."
            
            prompt = f"""
            Please provide a concise summary of the following health news article. 
            Focus on the key medical findings, health implications, and any actionable advice.
            Keep the summary informative but brief (around 3-4 sentences).
            
            Article: {text}
            
            Summary:
            """
            
            # Call Groq API for summarization
            completion = self.groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that summarizes health news articles accurately and concisely."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=250,
                temperature=0.3
            )
            
            return completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error using Groq API: {e}")
            return "Error generating summary."
    
    def process_article(self, article):
        """Process a single article to add summary"""
        try:
            # Extract full text
            full_text = self.extract_text_from_url(article["link"])
            
            if full_text and len(full_text) > 100:
                # Generate summary
                summary = self.summarize_text(full_text)
                article["summary"] = summary
            else:
                article["summary"] = "Could not extract sufficient content to summarize."
            
            return article
        except Exception as e:
            print(f"Error processing article {article['title']}: {e}")
            article["summary"] = "Error generating summary."
            return article
    
    def get_latest_news(self, count=5):
        """Get the latest health news with summaries"""
        # Check cache first
        cached_news = self.get_cached_news()
        if cached_news:
            return cached_news
        
        # Fetch fresh news if cache is invalid
        all_articles = []
        
        # Fetch news from all sources
        for source, rss_url in self.rss_feeds.items():
            articles = self.fetch_news_from_rss(source, rss_url)
            all_articles.extend(articles)
        
        # Sort by date (if available) and take the latest ones
        # This is a simple approach - you might need a more sophisticated date parsing
        all_articles = sorted(all_articles, key=lambda x: x["date"], reverse=True)[:count]
        
        # Process each article to add summaries
        processed_articles = [self.process_article(article) for article in all_articles]
        
        # Create response
        response = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "count": len(processed_articles),
            "articles": processed_articles
        }
        
        # Update cache
        self.update_cache(response)
        
        return response

# Initialize the health news manager
health_news_manager = HealthNewsManager(groq_api_key="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")

# Add the Flask endpoint
@app.route('/latest-health-news', methods=['GET'])
def latest_health_news():
    """Get the latest 5 health news articles with summaries"""
    try:
        # Get count parameter (optional, default 5)
        count = int(request.args.get('count', 5))
        
        # Get the latest news
        news = health_news_manager.get_latest_news(count=count)
        
        return jsonify(news)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })
        
@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error": "No file uploaded"
            })

        file = request.files['file']
        
        # Check if file has a name
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected"
            })
        
        # Get file format from filename
        file_format = file.filename.split('.')[-1].lower()
        
        # Read file data
        file_data = file.read()
        
        # Make prediction
        result = predict_voice_condition(file_data, file_format)
        
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/classes', methods=['GET'])
def get_classes():
    """Return all available voice condition classes and their descriptions"""
    if label_encoder is None:
        return jsonify({
            "success": False,
            "error": "Label encoder not loaded properly"
        })
        
    # Get actual classes from the label encoder
    available_classes = label_encoder.classes_.tolist()
    
    # Create response with available classes and their descriptions
    class_info = {}
    for class_name in available_classes:
        class_info[class_name] = {
            "description": VOICE_CONDITIONS.get(class_name.lower(), "Description not available"),
            "detailed_explanation": get_condition_explanation(class_name),
            "is_active": True
        }
    
    return jsonify({
        "success": True,
        "classes": class_info,
        "total_classes": len(available_classes)
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "model_loaded": voice_model is not None,
        "label_encoder_loaded": label_encoder is not None,
        "med42_loaded": med42_model is not None,
        "ngrok_url": public_url,
        "supported_formats": ["wav", "mp3", "ogg", "flac", "m4a", "dat"]
    })

@app.route('/formats', methods=['GET'])
def supported_formats():
    """Return all supported audio formats"""
    return jsonify({
        "success": True,
        "supported_formats": ["wav", "mp3", "ogg", "flac", "m4a", "dat"],
        "message": "Upload any of these formats to the /predict endpoint"
    })

@app.route('/', methods=['GET'])
def index():
    return """
    <html>
    <head>
        <title>Voice Analysis API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #4285f4; }
            .endpoint { background: #f1f1f1; padding: 15px; margin: 15px 0; border-radius: 5px; }
            code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
            .formats { margin-top: 30px; background: #e8f0fe; padding: 15px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>Voice Analysis API</h1>
        <p>Welcome to the Voice Analysis API. Use the following endpoints:</p>
        
        <div class="endpoint">
            <h3>POST /predict</h3>
            <p>Upload an audio file to get voice condition prediction.</p>
            <p>Example: <code>curl -F "file=@sample.mp3" """ + public_url + """/predict</code></p>
        </div>
        
        <div class="endpoint">
            <h3>GET /classes</h3>
            <p>Get all available voice condition classes and their descriptions.</p>
            <p>Example: <code>curl """ + public_url + """/classes</code></p>
        </div>
        
        <div class="endpoint">
            <h3>GET /health</h3>
            <p>Check the health status of the API.</p>
            <p>Example: <code>curl """ + public_url + """/health</code></p>
        </div>
        
        <div class="endpoint">
            <h3>GET /formats</h3>
            <p>Get all supported audio file formats.</p>
            <p>Example: <code>curl """ + public_url + """/formats</code></p>
        </div>
        
        <div class="formats">
            <h3>Supported Audio Formats</h3>
            <p>The API supports the following audio formats:</p>
            <ul>
                <li>WAV (.wav)</li>
                <li>MP3 (.mp3)</li>
                <li>OGG (.ogg)</li>
                <li>FLAC (.flac)</li>
                <li>M4A (.m4a)</li>
                <li>DAT (.dat)</li>
            </ul>
        </div>
    </body>
    </html>
    """

# Function to run Flask app in a thread
def run_app():
    app.run(host='0.0.0.0', port=5004)

# For Kaggle notebook, run in a thread
if __name__ == '__main__':
    # Start Flask app in a thread
    threading.Thread(target=run_app, daemon=True).start()
    
    # Keep the notebook running
    print(f"API is now accessible at: {public_url}")
    print("To stop the server, interrupt the kernel.")
    
    # If in Jupyter/Colab, keep the kernel alive
    try:
        import IPython
        IPython.display.display(IPython.display.HTML(
            f"<h3>API is running at: <a href='{public_url}' target='_blank'>{public_url}</a></h3>"
        ))
        # Keep the kernel alive
        import time
        while True:
            time.sleep(1)
    except:
        # If not in Jupyter/Colab, run normally
        app.run(host='0.0.0.0', port=5004)