import os
import pandas as pd
from io import BytesIO
from dotenv import load_dotenv
from google.cloud import bigquery
from google.api_core.exceptions import BadRequest
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

load_dotenv()

# ---------- Google Drive Setup ----------
SCOPES = ['https://www.googleapis.com/auth/drive.file']
FOLDER_MANUAL = "11Nw0xyQD3fXa1DUYpuaTac7px1mrZk0I"

def get_drive_service():
    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
        creds = flow.run_local_server(port=0)
        with open("token.json", "w") as token:
            token.write(creds.to_json())
    return build("drive", "v3", credentials=creds)

def upload_to_drive(file_obj, folder_id, file_name):
    """Upload a BytesIO object to Google Drive."""
    try:
        service = get_drive_service()
        file_obj.seek(0)
        media = MediaIoBaseUpload(file_obj, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        file_metadata = {"name": file_name, "parents": [folder_id]}
        uploaded = service.files().create(body=file_metadata, media_body=media, fields="id").execute()
        print(f"Uploaded to Drive: {uploaded.get('id')}")
        return uploaded.get("id")
    except Exception as e:
        print(f"Drive upload failed: {e}")
        return None

def get_bigquery_client():
    try:
        client = bigquery.Client()
        print("BigQuery client initialized successfully.")
        return client
    except Exception as e:
        print(f"Error initializing BigQuery client: {e}")
        return None

def fetch_bigquery_data(tickers, start_date, end_date, interval='1d'):
    client = get_bigquery_client()
    if not client:
        return None

    project_id = os.getenv('PROJECT_ID')
    dataset_id = os.getenv('BIGQUERY_DATASET')
    table_id = os.getenv('BIGQUERY_TABLE')

    if interval == '1d':
        select_date = "Date"
    elif interval == '1wk':
        select_date = "DATE_TRUNC(Date, WEEK(MONDAY)) AS Date"
    elif interval == '1mo':
        select_date = "DATE_TRUNC(Date, MONTH) AS Date"
    else:
        select_date = "Date"

    query = f"""
        SELECT
            {select_date},
            Ticker,
            AVG(Open) AS Open,
            MAX(High) AS High,
            MIN(Low) AS Low,
            AVG(Close) AS Close,
            AVG(`Adj Close`) AS Adj_Close
        FROM `{project_id}.{dataset_id}.{table_id}`
        WHERE Ticker IN UNNEST(@tickers)
          AND Date BETWEEN @start_date AND @end_date
        GROUP BY Date, Ticker
        ORDER BY Ticker, Date
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ArrayQueryParameter("tickers", "STRING", tickers),
            bigquery.ScalarQueryParameter("start_date", "DATE", start_date),
            bigquery.ScalarQueryParameter("end_date", "DATE", end_date),
        ]
    )

    try:
        df = client.query(query, job_config=job_config).to_dataframe()
        if df.empty:
            print("No data found for the given tickers.")
            return None
        df['Date'] = pd.to_datetime(df['Date'])
        df['Time'] = df['Date'].dt.time
        return df
    except BadRequest as e:
        print(f"Bad SQL Query: {e}")
        return None
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

# ---------- Generate & Upload ----------
def generate_big_query_data(start_date, end_date, tickers=None, multisheet=False, as_csv=False, interval='1d'):
    """
    Generate BigQuery data for multiple tickers, return as BytesIO, and optionally upload to Google Drive.
    """
    try:
        if not tickers:
            print("No tickers provided.")
            return None

        # Flatten tickers
        ticker_array = []
        for t in tickers.values() if isinstance(tickers, dict) else [tickers]:
            if isinstance(t, (list, tuple)):
                ticker_array.extend(t)
            else:
                ticker_array.append(t)
        ticker_array = [t.upper() for t in ticker_array]

        df = fetch_bigquery_data(ticker_array, start_date, end_date, interval)
        if df is None or df.empty:
            print("No data retrieved.")
            return None

        cols = [col for col in ['Ticker', 'Date', 'Time', 'Open', 'High', 'Low', 'Close', 'Adj_Close'] if col in df.columns]
        df = df[cols].sort_values(['Ticker', 'Date'])

        output = BytesIO()
        file_name = f"BigQuery_{start_date}_{end_date}.{'csv' if as_csv else 'xlsx'}"

        if as_csv:
            df.to_csv(output, index=False)
        else:
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                if multisheet:
                    for ticker, group in df.groupby('Ticker'):
                        sheet_data = group.drop('Ticker', axis=1)
                        sheet_name = str(ticker)[:31]  # Excel sheet name limit
                        sheet_data.to_excel(writer, sheet_name=sheet_name, index=False)
                else:
                    df.to_excel(writer, sheet_name='Historic Data', index=False)
        upload_to_drive(output, FOLDER_MANUAL, file_name)
        output.seek(0)
        return output

    except Exception as e:
        print(f"Error generating BigQuery data: {e}")
        return None