from flask import Flask, request, jsonify, send_file, render_template, Response, send_from_directory, after_this_request
import os
import tempfile
import shutil
from werkzeug.utils import secure_filename
import logging
import time
import json
from convert import FileConverter
from flask_cors import CORS
import threading
import csv
import requests

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for all routes

# Configure upload settings
UPLOAD_FOLDER = tempfile.mkdtemp()
ALLOWED_EXTENSIONS = {
    'pdf', 'docx', 'doc', 'rtf', 'txt',  # Documents
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif',  # Images
    'mp3', 'wav', 'aac', 'flac', 'ogg',  # Audio
    'mp4', 'avi', 'mov', 'mkv', 'wmv'  # Video
}
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Create a single instance of FileConverter
file_converter = FileConverter()

# Path to persist total conversions in the system temp directory
COUNTER_FILE = os.path.join(tempfile.gettempdir(), 'free2format_total_conversions.txt')
counter_lock = threading.Lock()

def load_total_conversions():
    try:
        with open(COUNTER_FILE, 'r') as f:
            return int(f.read().strip())
    except Exception:
        return 0

def save_total_conversions(count):
    try:
        with open(COUNTER_FILE, 'w') as f:
            f.write(str(count))
    except Exception as e:
        logger.warning(f"Failed to save total conversions: {e}")

# Global total conversions counter (persistent)
total_conversions = load_total_conversions()

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

DATA_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_FOLDER, exist_ok=True)
CONTACT_CSV = os.path.join(DATA_FOLDER, "contact_submissions.csv")

@app.route('/')
def index():
    """Serve the main page"""
    return app.send_static_file('index.html')

@app.route('/ping', methods=['GET'])
def ping():
    """
    Lightweight health check endpoint for keep-alive pings.
    Used by GitHub Actions / uptime monitors.
    """
    return jsonify({
        "status": "ok",
        "message": "free2formate is alive",
        "time": time.time()
    }), 200


@app.route('/api/formats', methods=['GET'])
def get_formats():
    """Return supported formats for each category"""
    formats = {
        'document': ['pdf', 'docx', 'doc', 'rtf', 'txt'],
        'image': ['jpg', 'png', 'gif', 'bmp', 'tiff'],
        'audio': ['mp3', 'wav', 'aac', 'flac', 'ogg'],
        'video': ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'mp3']  # <-- Add 'mp3' here
    }
    return jsonify(formats)

@app.route('/api/convert', methods=['POST'])
def convert_file_api():
    """Handle file conversion requests"""
    if 'file' not in request.files or 'to_format' not in request.form:
        logger.warning("Missing file or target format in request")
        return jsonify({'error': 'Missing file or target format'}), 400

    file = request.files['file']
    to_format = request.form['to_format'].lower().strip()

    if file.filename == '':
        logger.warning("No file selected for upload")
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        logger.warning(f"File type not allowed: {file.filename}")
        return jsonify({'error': 'File type not supported'}), 400

    filename = secure_filename(file.filename)
    temp_in_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(temp_in_path)
    logger.info(f"Received file: {filename}, converting to: {to_format}")

    output_path = None
    try:
        output_path = file_converter.convert(temp_in_path, to_format)
        if not output_path or not os.path.exists(output_path):
            logger.error("Conversion failed: Output file not created")
            return jsonify({'error': 'Conversion failed'}), 500
        logger.info(f"Conversion successful: {output_path}")

        response = send_file(output_path, as_attachment=True, max_age=0, conditional=False)

        def cleanup():
            try:
                if os.path.exists(temp_in_path):
                    os.remove(temp_in_path)
                if output_path and os.path.exists(output_path):
                    os.remove(output_path)
            except Exception as cleanup_err:
                logger.warning(f"Cleanup error: {cleanup_err}")

        response.call_on_close(cleanup)

        # Increment the total conversions counter
        global total_conversions
        with counter_lock:
            total_conversions += 1
            save_total_conversions(total_conversions)

        return response

    except Exception as e:
        logger.error(f"Conversion error: {str(e)}")
        # Cleanup input file if conversion fails
        try:
            if os.path.exists(temp_in_path):
                os.remove(temp_in_path)
        except Exception as cleanup_err:
            logger.warning(f"Cleanup error: {cleanup_err}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/total-conversions', methods=['GET'])
def total_conversions_api():
    global total_conversions
    with counter_lock:
        count = total_conversions
    return jsonify({'total': count})

@app.route('/api/increment-conversions', methods=['POST'])
def increment_conversions_api():
    global total_conversions
    with counter_lock:
        total_conversions += 1
        save_total_conversions(total_conversions)
        count = total_conversions
    return jsonify({'total': count})

@app.route('/api/check-status', methods=['GET'])
def check_status():
    """Check if required dependencies are installed"""
    import shutil
    status = {
        'ffmpeg': shutil.which('ffmpeg') is not None,
        'libreoffice': shutil.which('libreoffice') is not None  # You can keep or remove this line if not using LibreOffice
    }
    return jsonify(status)

# Google Apps Script Web App URL - Replace with your actual deployed URL
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJ7rBFcaRiKj591OUoSBUd174xRkK6Oy7i_l_z3eLdBB17ZBmCaIOZRhtCLHOHgmjZ/exec"

@app.route('/api/contact', methods=['POST'])
def save_contact_form():
    """
    Forward contact form submissions to Google Sheets via Google Apps Script.
    """
    try:
        # Get JSON data from the frontend
        data = request.get_json(force=True)
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        message = data.get('message', '').strip()

        if not name or not email or not message:
            return jsonify({'error': 'All fields are required.'}), 400

        # Send data as form-encoded to Google Apps Script
        # The field names must match your spreadsheet headers
        response = requests.post(
            GOOGLE_SCRIPT_URL,
            data={
                'Name': name,
                'Email': email,
                'Message': message
                # Add any other fields your spreadsheet has
                # 'Date' will be handled by the script automatically
            }
        )

        if response.status_code == 200:
            try:
                gas_response_data = response.json()
                if gas_response_data.get('result') == 'success':
                    return jsonify({'success': True}), 200
                else:
                    logger.error(f"Google Apps Script returned an error: {gas_response_data.get('error', 'Unknown error')}")
                    return jsonify({'error': 'Failed to send to Google Sheets.'}), 500
            except json.JSONDecodeError:
                logger.error("Failed to decode JSON response from Google Apps Script.")
                return jsonify({'error': 'Failed to send to Google Sheets (invalid response).'}), 500
        else:
            logger.error(f"Request to Google Apps Script failed with status code: {response.status_code}")
            return jsonify({'error': 'Failed to send to Google Sheets.'}), 500

    except Exception as e:
        logger.error(f"Failed to forward contact form: {e}")
        return jsonify({'error': 'Server error while forwarding form data.'}), 500
    

@app.route('/assets/<path:filename>')
def custom_static(filename):
    return send_from_directory('assets', filename)

# Add this route to serve the contact form HTML if needed
@app.route('/static/company/contact.html', methods=['GET'])
def contact_page():
    # Return your contact page HTML
    # This is just a placeholder - you should serve your actual HTML file
    return app.send_static_file('company/contact.html')
    

@app.errorhandler(404)
def not_found(e):
    """
    Serve a custom 404 page for browser requests,
    and JSON for API or non-HTML requests.
    """
    # If the request prefers HTML, serve the static 404.html page
    if request.accept_mimetypes.accept_html:
        return send_from_directory(app.static_folder, '404.html'), 404
    # Otherwise, return JSON
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(413)
def file_too_large(e):
    logger.warning("Uploaded file is too large")
    return jsonify({'error': 'File is too large (max 500MB)'}), 413

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {e}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Start the Flask app
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))