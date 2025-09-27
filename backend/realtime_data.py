import yfinance as yf
import pandas as pd
from io import BytesIO
from scrape_tickers import get_index_components
import re

def _normalize_yahoo_symbol(symbol: str) -> str:
    """Normalize a single symbol to Yahoo Finance format (class shares, index aliases)."""
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
    m = re.match(r'^([A-Z]+)\.([A-Z])$', symbol)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    return symbol


def _normalize_symbols(tickers):
    if isinstance(tickers, (list, tuple, set)):
        return [ _normalize_yahoo_symbol(str(t)) for t in tickers ]
    return _normalize_yahoo_symbol(str(tickers))


def get_current_details(tickers):
    """Fetch current market data for a list of tickers"""
    try:
        if not tickers:
            return pd.DataFrame()
            
        normalized = _normalize_symbols(tickers)
        data = yf.download(normalized, period="1d", interval="1m", group_by="ticker", auto_adjust=False)
       
        if data.empty:
            return pd.DataFrame()

        data.index = data.index.tz_localize(None)
        
        if isinstance(data.columns, pd.MultiIndex):
            data = (data.stack(level=0, future_stack=True)
                    .rename_axis(['Date', 'Ticker'])
                    .reset_index()
                    .drop(columns=['Volume']))
        else:
            data = data.reset_index()
            data['Ticker'] = tickers[0]
            data = data.drop(columns=['Volume'])

        latest_data = data[data['Date'] == data['Date'].max()]
        
        # **Sort the DataFrame by Ticker**
        latest_data = latest_data.sort_values(by=['Ticker']).reset_index(drop=True)
        
        return latest_data

    except Exception as e:
        print(f"Error fetching data: {e}")
        return pd.DataFrame()

def generate_realtime_data(tickers=None):
    """Generate Excel file with realtime data in a single sheet"""
    try:
        output = BytesIO()
        all_data = pd.DataFrame()
        
        if tickers:
            # Use provided tickers
            for index, symbols in tickers.items():
                print(f"Processing {index}...")
                df = get_current_details(symbols)
                if not df.empty:
                    df['Index'] = index
                    all_data = pd.concat([all_data, df], ignore_index=True)
        else:
            # Use default index components
            components, _ = get_index_components()
            for index, symbols in components.items():
                print(f"Processing {index}...")
                df = get_current_details(symbols)
                if not df.empty:
                    df['Index'] = index
                    all_data = pd.concat([all_data, df], ignore_index=True)
        
        # Write all data to a single sheet
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            if not all_data.empty:
                cols = ['Ticker', 'Date', 'Open', 'High', 'Low', 'Close', 'Adj Close']
                all_data = all_data[cols]
                all_data.to_excel(writer, sheet_name='Realtime Data', index=False)
        
        output.seek(0)
        return output
    
    except Exception as e:
        print(f"Error generating realtime data: {str(e)}")
        return None
