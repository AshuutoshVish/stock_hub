import yfinance as yf
import pandas as pd
import datetime
from io import BytesIO
from scrape_tickers import get_index_components

def get_current_details(ticker, start_date, end_date, interval):
    """Fetch and clean stock data for a given ticker and date range"""
    try:
        print(f"Fetching data for {ticker} from {start_date} to {end_date}...")
        end_date_adjusted = pd.to_datetime(end_date) + pd.DateOffset(days=1)
        df = yf.download(ticker, 
                         group_by='ticker', 
                         auto_adjust=False, 
                         start=start_date, 
                         end=end_date_adjusted.strftime('%Y-%m-%d'), 
                         interval=interval, 
                         threads=True,
                         rounding=True)
        
        if df.empty:
            print(f"No data for {ticker}.")
            return None
        
        df.index = df.index.tz_localize(None)

        if isinstance(df.columns, pd.MultiIndex):
            df = df.stack(level=0, future_stack=True).rename_axis(['Date', 'Ticker']).reset_index()
        else:
            df = df.reset_index()
            df['Ticker'] = ticker
        drop_cols = [col for col in ['Volume'] if col in df.columns]
        if drop_cols:
            df = df.drop(columns=drop_cols)
        df = df.dropna(subset=['Open', 'High', 'Low', 'Close'])
        df['Time'] = pd.to_datetime(df['Date']).dt.time if not isinstance(df['Date'], pd.Series) else df['Date'].dt.time
        df['Date'] = pd.to_datetime(df['Date']).dt.date if not isinstance(df['Date'], pd.Series) else df['Date'].dt.date
        return df
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return None
    

    
def generate_big_query_data(start_date, end_date, tickers=None, multisheet=None, as_csv=False, interval='1d'):
    """Generate bigquery-style stock data with flexible output and error handling"""
    try:
        output = BytesIO()
        all_data = pd.DataFrame()

        # Use provided tickers or default index components
        if tickers:
            for index, symbols in tickers.items():
                print(f"Processing {index} for {start_date} to {end_date}...")
                # Support both single ticker and list of tickers
                if isinstance(symbols, (list, tuple)):
                    for ticker in symbols:
                        df = get_current_details(ticker, start_date, end_date, interval)
                        if df is not None and not df.empty:
                            df['Index'] = index
                            all_data = pd.concat([all_data, df], ignore_index=True)
                else:
                    df = get_current_details(symbols, start_date, end_date, interval)
                    if df is not None and not df.empty:
                        df['Index'] = index
                        all_data = pd.concat([all_data, df], ignore_index=True)
        else:
            components, _ = get_index_components()
            for index, symbols in components.items():
                print(f"Processing {index} for {start_date} to {end_date}...")
                if isinstance(symbols, (list, tuple)):
                    for ticker in symbols:
                        df = get_current_details(ticker, start_date, end_date, interval)
                        if df is not None and not df.empty:
                            df['Index'] = index
                            all_data = pd.concat([all_data, df], ignore_index=True)
                else:
                    df = get_current_details(symbols, start_date, end_date, interval)
                    if df is not None and not df.empty:
                        df['Index'] = index
                        all_data = pd.concat([all_data, df], ignore_index=True)
        if not all_data.empty:
            # Select columns if present
            cols = [col for col in ['Ticker', 'Date', 'Time', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Index'] if col in all_data.columns]
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
        else:
            print("No data found for the given parameters.")
        output.seek(0)
        return output
    except Exception as e:
        print(f"Error generating historic data: {str(e)}")
        return None