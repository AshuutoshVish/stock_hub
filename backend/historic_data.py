import yfinance as yf
import pandas as pd
import datetime
from io import BytesIO
from scrape_tickers import get_index_components
import re

def _normalize_yahoo_symbol(symbol: str) -> str:
    """Normalize a single symbol to Yahoo Finance format.

    - Convert class shares like BRK.B, BF.B to BRK-B, BF-B
    - Map common index aliases to Yahoo caret symbols
    """
    index_alias_map = {
        'SPX': '^GSPC',
        'DJI': '^DJI',
        'IXIC': '^IXIC',
        'FTSE': '^FTSE',
        'N225': '^N225',
        'FCHI': '^FCHI',
    }

    if symbol in index_alias_map:
        return index_alias_map[symbol]

    # Convert single-letter share classes from dot to dash (e.g., BRK.B -> BRK-B)
    # Avoid touching exchange suffixes like .TA, .SA, .TO etc.
    m = re.match(r'^([A-Z]+)\.([A-Z])$', symbol)
    if m:
        return f"{m.group(1)}-{m.group(2)}"

    return symbol


def _normalize_symbols(tickers):
    if isinstance(tickers, (list, tuple, set)):
        return [ _normalize_yahoo_symbol(str(t)) for t in tickers ]
    return _normalize_yahoo_symbol(str(tickers))


def get_current_details(ticker, start_date=None, end_date=None, period_type='date_range', weeks=None, days=None):
    """Fetch stock data for a given ticker and period type"""
    try:
        if period_type == 'date_range':
            if not start_date or not end_date:
                raise ValueError("Start date and end date must be provided for date range.")
            print(f"Fetching data from {start_date} to {end_date}...")
            end_date_adjusted = pd.to_datetime(end_date) + pd.DateOffset(days=1)
        elif period_type == 'weekly':
            if not weeks:
                raise ValueError("Number of weeks must be provided for weekly period type.")
            end_date_adjusted = pd.Timestamp.today()
            start_date = end_date_adjusted - pd.DateOffset(weeks=weeks)
            print(f"Fetching data for the last {weeks} weeks...")
        elif period_type == 'number_of_days':
            if not days:
                raise ValueError("Number of days must be provided for number_of_days period type.")
            end_date_adjusted = pd.Timestamp.today()
            start_date = end_date_adjusted - pd.DateOffset(days=days)
            print(f"Fetching data for the last {days} days...")
        else:
            raise ValueError("Invalid period type. Choose 'date_range', 'weekly', or 'number_of_days'.")

        # Normalize symbols to Yahoo-compatible ones
        normalized = _normalize_symbols(ticker)

        # Fetch data within the given date range
        df = yf.download(normalized, group_by='ticker', auto_adjust=False, start=start_date, end=end_date_adjusted, interval='1d', threads=True, rounding=True)

        if df is None or (hasattr(df, 'empty') and df.empty):
            return pd.DataFrame()

        # Convert index (Datetime) to US/Eastern time and make it naive
        df.index = df.index.tz_localize(None)

        # Handle multi-index if necessary
        if isinstance(df.columns, pd.MultiIndex):
            df = df.stack(level=0, future_stack=True).rename_axis(['Date', 'Ticker']).reset_index()
        else:
            df = df.reset_index()
            df['Ticker'] = ticker

        # Drop the Volume column
        df = df.drop(columns=['Volume'])

        # Drop rows with missing OHLC values
        df = df.dropna(subset=['Open', 'High', 'Low', 'Close'])

        # Filter for specific date and time
        df['Time'] = df['Date'].dt.time
        df['Date'] = df['Date'].dt.date

        return df

    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return pd.DataFrame()
    
def generate_historic_data(start_date, end_date, tickers=None, multisheet=None, as_csv=False):
    """Generate Excel file with specific date data in a single sheet"""
    try:
        output = BytesIO()
        all_data = pd.DataFrame()
        
        if tickers:
            # Use provided tickers
            for index, symbols in tickers.items():
                print(f"Processing {index} for {start_date} to {end_date}...")
                df = get_current_details(symbols, start_date, end_date)
                if not df.empty:
                    df['Index'] = index
                    all_data = pd.concat([all_data, df], ignore_index=True)
        else:
            # Use default index components
            components, _ = get_index_components()
            for index, symbols in components.items():
                print(f"Processing {index} for {start_date} to {end_date}...")
                df = get_current_details(symbols, start_date, end_date)
                if not df.empty:
                    df['Index'] = index
                    all_data = pd.concat([all_data, df], ignore_index=True)

        if not all_data.empty:
            cols = ['Ticker', 'Date', 'Time', 'Open', 'High', 'Low', 'Close', 'Adj Close']
            all_data = all_data[cols]
            all_data = all_data.sort_values(['Ticker', 'Date', 'Time'])

            if as_csv:
                all_data.to_csv(output, index=False)
            else:
                with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                    if multisheet:
                        for ticker, group in all_data.groupby('Ticker'):
                            sheet_data = group.drop('Ticker', axis=1)
                            sheet_name = str(ticker)[:31]
                            sheet_data.to_excel(writer, sheet_name=sheet_name, index=False)
                    else:
                        all_data.to_excel(writer, sheet_name='Historic Data', index=False)

        output.seek(0)
        return output
    
    except Exception as e:
        print(f"Error generating specific date data: {str(e)}")
        return None