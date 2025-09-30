from __future__ import annotations
import pandas as pd
from io import BytesIO
from uuid import uuid4
import os, logging, pytz
from pathlib import Path
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from flask import Flask, request, jsonify, send_file
from apscheduler.schedulers.background import BackgroundScheduler

# Import generator functions
from all_components import generate_all_data
from realtime_data import generate_realtime_data
from specific_date import generate_specific_date_data
from bigquery_data import generate_big_query_data
from historic_data import generate_historic_data
from scrape_tickers import generate_index_name
from google_drive_service import upload_to_google_drive

#Load configuration
load_dotenv()
BASE_DIR = Path(os.getenv('STOCK_BASE_DIR', Path(__file__).resolve().parent / 'stock'))
SAVE_FILES = os.getenv('SAVE_FILES', 'true').lower() in ('1', 'true', 'yes')
GOOGLE_DRIVE_ENABLED = os.getenv('GOOGLE_DRIVE_ENABLED', 'false').lower() in ('1', 'true', 'yes')
HOSTS = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
SECRET_KEY = os.getenv('FLASK_SECRET_KEY', uuid4().hex)
TIMEZONE = os.getenv('TIMEZONE', 'America/New_York')

# --- Prepare directories ---
SCHEDULED_DATA_DIR = BASE_DIR / 'scheduled'
SCHEDULED_DAILY_DIR = SCHEDULED_DATA_DIR / 'daily'
SCHEDULED_REALTIME_DIR = SCHEDULED_DATA_DIR / 'realtime'

MANUAL_DATA_DIR = BASE_DIR / 'manual'
INDEX_COMPONENTS = BASE_DIR / 'index_components'
MANUAL_DAILY_DIR = MANUAL_DATA_DIR / 'daily'
MANUAL_REALTIME_DIR = MANUAL_DATA_DIR / 'realtime'
MANUAL_HISTORIC_DIR = MANUAL_DATA_DIR / 'historic'
MANUAL_HISTORIC_SINGLE_DIR = MANUAL_HISTORIC_DIR / 'Single-sheet'
MANUAL_HISTORIC_MULTIPLE_DIR = MANUAL_HISTORIC_DIR / 'Multiple-sheet'
MANUAL_HISTORIC_SPECIFIC_DIR = MANUAL_HISTORIC_DIR / 'Specific-sheet'
MANUAL_HISTORIC_BIGQUERY_DIR = MANUAL_HISTORIC_DIR / 'Bigquery-sheet'

for p in [SCHEDULED_DATA_DIR, SCHEDULED_DAILY_DIR, SCHEDULED_REALTIME_DIR,
          MANUAL_DATA_DIR, MANUAL_DAILY_DIR, MANUAL_REALTIME_DIR, MANUAL_HISTORIC_DIR,
          INDEX_COMPONENTS, MANUAL_HISTORIC_SINGLE_DIR, MANUAL_HISTORIC_MULTIPLE_DIR,
          MANUAL_HISTORIC_SPECIFIC_DIR, MANUAL_HISTORIC_BIGQUERY_DIR]:
    p.mkdir(parents=True, exist_ok=True)

# --- Flask app setup ---
app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
CORS(app, resources={r"/*": {"origins": HOSTS}}, supports_credentials=True)

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# timezone
eastern = pytz.timezone(TIMEZONE)

# --- Utility helpers ---

def _now_iso() -> str:
    return datetime.now(eastern).strftime('%Y%m%d_%H%M%S')


def _make_filename(prefix: str, ext: str = 'xlsx', extra: Optional[str] = None) -> str:
    parts = [prefix, _now_iso(), uuid4().hex[:6]]
    if extra:
        parts.insert(1, extra)
    return '_'.join(parts) + f'.{ext}'


def _save_if_configured(buf: BytesIO, path: Path, data_type: str = 'general') -> None:
    if SAVE_FILES:
        with open(path, 'wb') as f:
            f.write(buf.getvalue())
        logger.info('Saved file to %s', path)
    
    # Upload to Google Drive if enabled
    if GOOGLE_DRIVE_ENABLED:
        try:
            buf.seek(0)
            success = upload_to_google_drive(buf, path.name, data_type)
            if success:
                logger.info('Uploaded file to Google Drive: %s', path.name)
            else:
                logger.warning('Failed to upload file to Google Drive: %s', path.name)
        except Exception as e:
            logger.error('Error uploading to Google Drive: %s', e)


def _bytesio_to_sendfile(buf: BytesIO, download_name: str, mimetype: str):
    buf.seek(0)
    return send_file(buf, as_attachment=True, download_name=download_name, mimetype=mimetype)


# --- Error handlers ---
@app.errorhandler(400)
def bad_request(e):
    return jsonify({'success': False, 'error': str(e)}), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Not Found'}), 404


@app.errorhandler(500)
def server_error(e):
    logger.exception('Unhandled exception:')
    return jsonify({'success': False, 'error': 'Internal Server Error'}), 500


# --- Routes ---
@app.route('/download_historic_data', methods=['POST'])
def download_historic_data():
    try:
        # Accept both JSON and form-data
        data: Dict[str, Any] = request.get_json(silent=True) or {}
        form = request.form or {}

        # Extract inputs from either JSON or form
        start_date = (form.get('start_date') or data.get('start_date') or '').strip()
        end_date = (form.get('end_date') or data.get('end_date') or '').strip()

        # sheet selection and format
        multisheet_raw = form.get('multisheet') if 'multisheet' in form else data.get('multisheet', False)
        as_csv_raw = form.get('as_csv') if 'as_csv' in form else data.get('as_csv', False)

        def _to_bool(v: Any) -> bool:
            if isinstance(v, bool):
                return v
            if isinstance(v, str):
                return v.lower() in ('1', 'true', 'yes', 'on')
            return bool(v)

        multisheet = _to_bool(multisheet_raw)
        as_csv = _to_bool(as_csv_raw)

        # Build tickers map either from uploaded Excel or from JSON
        index_ticker_map: Optional[Dict[str, List[str]]] = None
        if 'file' in request.files:
            uploaded_file = request.files['file']
            if uploaded_file and uploaded_file.filename:
                filename_lower = uploaded_file.filename.lower()
                # Read Excel or CSV
                if filename_lower.endswith(('.xlsx', '.xls')):
                    df_tickers = pd.read_excel(uploaded_file)
                elif filename_lower.endswith('.csv'):
                    df_tickers = pd.read_csv(uploaded_file)
                else:
                    return jsonify({'success': False, 'error': 'Invalid file format. Please upload an Excel or CSV file.'}), 400

                # Normalize column names (case/whitespace)
                df_tickers.columns = [str(c).strip() for c in df_tickers.columns]
                normalized = {c.lower().strip(): c for c in df_tickers.columns}

                # Detect columns with broader aliases
                ticker_aliases = ['ticker', 'tickers', 'symbol', 'symbols', 'ticker_symbol']
                index_aliases = ['index', 'indices', 'index_name', 'group', 'category']

                ticker_col_key = next((k for k in ticker_aliases if k in normalized), None)
                index_col_key = next((k for k in index_aliases if k in normalized), None)

                if not ticker_col_key:
                    return jsonify({'success': False, 'error': "Upload must include a ticker column (e.g., 'Ticker' or 'Symbol')."}), 400

                ticker_col = normalized[ticker_col_key]

                # If no index column, fall back to single group 'Custom'
                if not index_col_key:
                    cleaned = (
                        df_tickers[ticker_col]
                        .astype(str)
                        .str.strip()
                        .str.upper()
                        .replace({'': None})
                        .dropna()
                        .unique()
                        .tolist()
                    )
                    index_ticker_map = {'Custom': cleaned}
                else:
                    index_col = normalized[index_col_key]
                    index_ticker_map = {}
                    for index, group in df_tickers.groupby(index_col):
                        tickers_cleaned = (
                            group[ticker_col]
                            .astype(str)
                            .str.strip()
                            .str.upper()
                            .replace({'': None})
                            .dropna()
                            .unique()
                            .tolist()
                        )
                        index_ticker_map[index] = tickers_cleaned
        else:
            tickers_json = data.get('tickers')
            if tickers_json is not None and not isinstance(tickers_json, dict):
                return jsonify({'success': False, 'error': 'Tickers must be a dict mapping index names to lists.'}), 400
            index_ticker_map = tickers_json

        if not start_date or not end_date:
            return jsonify({'success': False, 'error': 'Please provide both start and end dates.'}), 400

        # Basic date validation
        try:
            _ = datetime.strptime(start_date, '%Y-%m-%d')
            _ = datetime.strptime(end_date, '%Y-%m-%d')
        except Exception:
            return jsonify({'success': False, 'error': 'Dates must be in YYYY-MM-DD format.'}), 400

        output = generate_historic_data(start_date=start_date, end_date=end_date, tickers=index_ticker_map, multisheet=multisheet, as_csv=as_csv)

        if not output:
            return jsonify({'success': False, 'error': 'No data found for the given parameters.'}), 404

        ext = 'csv' if as_csv else 'xlsx'
        filename = _make_filename('HistoricData', ext)

        # Optionally save to disk
        if SAVE_FILES:
            save_dir = MANUAL_HISTORIC_MULTIPLE_DIR if multisheet else MANUAL_HISTORIC_SINGLE_DIR
            _save_if_configured(output, save_dir / filename, 'historic')

        mimetype = 'text/csv' if as_csv else 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return _bytesio_to_sendfile(output, filename, mimetype)
    except Exception as e:
        logger.exception('download_historic_data error')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/download_all_data', methods=['GET', 'POST'])
def download_all_data():
    try:
        index_ticker_map: Dict[str, List[str]] = {}
        if request.method == 'POST' and 'file' in request.files:
            uploaded_file = request.files['file']
            if uploaded_file.filename and uploaded_file.filename.lower().endswith(('.xlsx', '.xls')):
                df_tickers = pd.read_excel(uploaded_file)
                if 'Ticker' not in df_tickers.columns or 'Index' not in df_tickers.columns:
                    return jsonify({'success': False, 'error': "Excel file must contain 'Ticker' and 'Index' columns"}), 400
                for index, ticker in df_tickers.groupby('Index'):
                    index_ticker_map[index] = ticker['Ticker'].unique().tolist()
                output = generate_all_data(tickers=index_ticker_map)
            else:
                output = generate_all_data()
        else:
            output = generate_all_data()

        if not output:
            return jsonify({'success': False, 'error': 'Failed to generate all tickers data'}), 500

        filename = _make_filename('MarketData_All', 'xlsx')
        if SAVE_FILES:
            _save_if_configured(output, MANUAL_DAILY_DIR / filename, 'daily')

        return _bytesio_to_sendfile(output, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        logger.exception('download_all_data error')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/download_realtime_data', methods=['GET', 'POST'])
def download_realtime_data():
    try:
        index_ticker_map: Dict[str, List[str]] = {}
        if request.method == 'POST' and 'file' in request.files:
            uploaded_file = request.files['file']
            if uploaded_file.filename and uploaded_file.filename.lower().endswith(('.xlsx', '.xls')):
                df_tickers = pd.read_excel(uploaded_file)
                if 'Ticker' not in df_tickers.columns or 'Index' not in df_tickers.columns:
                    return jsonify({'success': False, 'error': "Excel file must contain 'Ticker' and 'Index' columns"}), 400
                for index, ticker in df_tickers.groupby('Index'):
                    index_ticker_map[index] = ticker['Ticker'].unique().tolist()
                output = generate_realtime_data(tickers=index_ticker_map)
            else:
                output = generate_realtime_data()
        else:
            output = generate_realtime_data()

        if not output:
            return jsonify({'success': False, 'error': 'Failed to generate realtime data'}), 500

        filename = _make_filename('MarketData_Realtime', 'xlsx')
        if SAVE_FILES:
            _save_if_configured(output, MANUAL_REALTIME_DIR / filename, 'realtime')

        return _bytesio_to_sendfile(output, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        logger.exception('download_realtime_data error')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/download_specific_date', methods=['POST'])
def download_specific_date():
    try:
        form = request.form or {}
        specific_date = form.get('specific_date') or request.json and request.json.get('specific_date')
        if not specific_date:
            return jsonify({'success': False, 'error': 'Please provide specific_date in form or JSON.'}), 400

        # validate
        try:
            _ = datetime.strptime(specific_date, '%Y-%m-%d')
        except Exception:
            return jsonify({'success': False, 'error': 'specific_date must be YYYY-MM-DD'}), 400

        index_ticker_map: Dict[str, List[str]] = {}
        if 'file' in request.files:
            uploaded_file = request.files['file']
            if uploaded_file.filename:
                filename_lower = uploaded_file.filename.lower()
                if filename_lower.endswith(('.xlsx', '.xls')):
                    df_tickers = pd.read_excel(uploaded_file)
                elif filename_lower.endswith('.csv'):
                    df_tickers = pd.read_csv(uploaded_file)
                else:
                    return jsonify({'success': False, 'error': 'Invalid file format. Please upload an Excel or CSV file.'}), 400

                if 'Ticker' not in df_tickers.columns or 'Index' not in df_tickers.columns:
                    return jsonify({'success': False, 'error': "File must contain 'Ticker' and 'Index' columns"}), 400
                for index, ticker in df_tickers.groupby('Index'):
                    index_ticker_map[index] = ticker['Ticker'].unique().tolist()
                output = generate_specific_date_data(specific_date, tickers=index_ticker_map)
            else:
                output = generate_specific_date_data(specific_date)
        else:
            output = generate_specific_date_data(specific_date)

        if not output:
            return jsonify({'success': False, 'error': 'Failed to generate data for the specific date'}), 500

        filename = _make_filename('MarketData_specific_date_' + specific_date.replace('-', ''), 'xlsx')
        if SAVE_FILES:
            _save_if_configured(output, MANUAL_HISTORIC_SPECIFIC_DIR / filename, 'historic')

        return _bytesio_to_sendfile(output, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        logger.exception('download_specific_date error')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/download', methods=['POST'])
def download():
    try:
        form = request.form or {}
        index_ticker_map: Dict[str, List[str]] = {}

        period_type = form.get('period_type') or (request.json and request.json.get('period_type'))
        export_format = form.get('export_format') or (request.json and request.json.get('export_format')) or 'single'

        # file upload
        if 'file' in request.files:
            uploaded_file = request.files['file']
            if uploaded_file and uploaded_file.filename.lower().endswith(('.xlsx', '.xls')):
                df_tickers = pd.read_excel(uploaded_file)
                if 'Ticker' not in df_tickers.columns or 'Index' not in df_tickers.columns:
                    return jsonify({'success': False, 'error': "Excel file must contain 'Ticker' and 'Index' columns"}), 400
                for index, ticker in df_tickers.groupby('Index'):
                    index_ticker_map[index] = ticker['Ticker'].unique().tolist()
            elif uploaded_file.filename:
                return jsonify({'success': False, 'error': 'Invalid file format. Please upload an Excel file.'}), 400

        # date handling
        if period_type == 'date':
            start_date = form.get('start_date')
            end_date = form.get('end_date')
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
            except Exception:
                return jsonify({'success': False, 'error': 'Dates must be YYYY-MM-DD'}), 400
            if start_date_obj >= end_date_obj:
                return jsonify({'success': False, 'error': 'End date must be after start date'}), 400
        elif period_type == 'weeks':
            weeks = int(form.get('weeks', 0))
            if weeks <= 0:
                return jsonify({'success': False, 'error': 'Weeks must be a positive number'}), 400
            end_date_obj = datetime.now()
            start_date_obj = end_date_obj - timedelta(weeks=weeks)
            start_date = start_date_obj.strftime('%Y-%m-%d')
            end_date = end_date_obj.strftime('%Y-%m-%d')
        else:  # days
            days = int(form.get('days', 0))
            if days <= 0:
                return jsonify({'success': False, 'error': 'Days must be a positive number'}), 400
            end_date_obj = datetime.now()
            start_date_obj = end_date_obj - timedelta(days=days)
            start_date = start_date_obj.strftime('%Y-%m-%d')
            end_date = end_date_obj.strftime('%Y-%m-%d')

        # Generate output using BigQuery helper
        sheet_type = 'singlesheet' if export_format == 'single' else 'multisheet'
        as_csv = True  # original code used CSV for bigquery flows

        if index_ticker_map:
            output = generate_big_query_data(start_date, end_date, tickers=index_ticker_map, multisheet=(export_format!='single'), as_csv=as_csv)
        else:
            output = generate_big_query_data(start_date, end_date, as_csv=as_csv, multisheet=(export_format!='single'))

        if not output:
            return jsonify({'success': False, 'error': 'Failed to generate bigquery data'}), 500

        ext = 'csv' if as_csv else 'xlsx'
        filename = _make_filename(f'MarketData_historic_{sheet_type}', ext, extra=f'{start_date.replace("-","")}-{end_date.replace("-","")}')

        save_dir = MANUAL_HISTORIC_SINGLE_DIR if export_format == 'single' else MANUAL_HISTORIC_MULTIPLE_DIR
        if SAVE_FILES:
            _save_if_configured(output, save_dir / filename, 'bigquery')

        mimetype = 'text/csv' if as_csv else 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        return _bytesio_to_sendfile(output, filename, mimetype)

    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid input format. Please check your inputs.'}), 400
    except Exception as e:
        logger.exception('download error')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/download-index-components', methods=['GET'])
def download_index_components():
    try:
        output = generate_index_name()
        if not output:
            return jsonify({'success': False, 'error': 'No index components returned'}), 500
        filename = _make_filename('index_components', 'xlsx')
        if SAVE_FILES:
            _save_if_configured(output, INDEX_COMPONENTS / filename, 'general')
        return _bytesio_to_sendfile(output, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        logger.exception('download_index_components error')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/download_bigquery_data', methods=['POST'])
def download_bigquery_data():
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    tickers: List[str] = data.get('bigquery_ticker', [])
    if not isinstance(tickers, list) or not tickers:
        return jsonify({'success': False, 'error': 'Please provide at least one ticker as a list.'}), 400

    tickers = [t.strip().upper() for t in tickers if isinstance(t, str) and t.strip()]
    if not tickers:
        return jsonify({'success': False, 'error': 'No valid tickers provided.'}), 400

    start_date = (data.get('bigquery_start_date') or '').strip()
    end_date = (data.get('bigquery_end_date') or '').strip()
    if not start_date or not end_date:
        return jsonify({'success': False, 'error': 'Please provide both start and end dates.'}), 400

    interval = (data.get('bigquery_interval') or '1d').strip()

    tickers_dict = {'Custom': tickers}
    output: BytesIO = generate_big_query_data(start_date=start_date, end_date=end_date, tickers=tickers_dict, multisheet=False, interval=interval, as_csv=False)

    if not output:
        return jsonify({'success': False, 'error': 'No data found for the given parameters.'}), 404

    filename = _make_filename('BigQueryData', 'xlsx')
    if SAVE_FILES:
        _save_if_configured(output, MANUAL_HISTORIC_BIGQUERY_DIR / filename, 'bigquery')

    return _bytesio_to_sendfile(output, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


# --- Scheduler example (optional) ---
def _daily_fetch_all():
    try:
        logger.info('Running scheduled: generate_all_data')
        output = generate_all_data()
        if output and SAVE_FILES:
            filename = _make_filename('scheduled_all', 'xlsx')
            _save_if_configured(output, SCHEDULED_DAILY_DIR / filename, 'daily')
    except Exception:
        logger.exception('Scheduled job failed')


scheduler = BackgroundScheduler(timezone=TIMEZONE)
scheduler.add_job(_daily_fetch_all, 'cron', hour=18, minute=0)
scheduler.start()


if __name__ == '__main__':
    # Development server (not for production)
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=(os.getenv('FLASK_ENV') == 'development'))