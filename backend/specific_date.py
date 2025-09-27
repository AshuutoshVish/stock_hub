import yfinance as yf
import pandas as pd
from io import BytesIO
from scrape_tickers import get_index_components

def get_specific_date_data(tickers, specific_date):
    """Fetch data for a list of tickers on a specific date"""
    try:
        if not tickers:
            return pd.DataFrame()

        # Define start and end for the date range
        start_date = pd.to_datetime(specific_date)
        end_date = start_date + pd.Timedelta(days=1)

        data = yf.download(tickers, start=start_date, end=end_date, interval="60m", group_by="ticker", auto_adjust=False)

        if data.empty:
            return pd.DataFrame()

        # Ensure datetime is not timezone-aware
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
            
        # Filter for specific date only
        specific_data = data[data['Date'].dt.date == pd.to_datetime(specific_date).date()]

        # Get the latest available data for each ticker
        specific_data = specific_data.sort_values(['Ticker', 'Date']).groupby('Ticker').tail(1).reset_index(drop=True)

        return specific_data

    except Exception as e:
        print(f"Error fetching data: {e}")
        return pd.DataFrame()

def generate_specific_date_data(specific_date, tickers=None):
    """Generate Excel file with specific date data in a single sheet"""
    try:
        output = BytesIO()
        all_data = pd.DataFrame()
        
        if tickers:
            # Use provided tickers
            for index, symbols in tickers.items():
                print(f"Processing {index} for {specific_date}...")
                df = get_specific_date_data(symbols, specific_date)
                if not df.empty:
                    df['Index'] = index
                    all_data = pd.concat([all_data, df], ignore_index=True)
        else:
            # Use default index components
            components, _ = get_index_components()
            for index, symbols in components.items():
                print(f"Processing {index} for {specific_date}...")
                df = get_specific_date_data(symbols, specific_date)
                if not df.empty:
                    df['Index'] = index
                    all_data = pd.concat([all_data, df], ignore_index=True)

        # Write all data to a single sheet
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            if not all_data.empty:
                cols = ['Ticker', 'Date', 'Open', 'High', 'Low', 'Close', 'Adj Close']
                all_data = all_data[cols]
                all_data.to_excel(writer, sheet_name=f'Data_{specific_date}', index=False)
        
        output.seek(0)
        return output
    
    except Exception as e:
        print(f"Error generating specific date data: {str(e)}")
        return None