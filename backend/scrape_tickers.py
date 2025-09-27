import requests
from bs4 import BeautifulSoup
import pandas as pd
from time import sleep
from io import BytesIO

def get_index_components():
    """Scrape current components of major indices from SlickCharts"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Referer": "https://www.google.com",
    }

    etf_codes = [
            'SPY', 'SSO', 'SPXL', 'RSP', 'QQQ', 'QLD', 'TQQQ', 'DIA', 'WEBL', 'IWF',
            'XLK', 'XLV', 'XLY', 'XLC', 'XLF', 'XLI', 'XLP', 'XLU', 'XLB', 'XLRE',
            'XLE', 'MDY', 'SPMD', 'SH', 'SDS', 'SPXS', 'PSQ', 'QID', 'SQQQ', 'RWM',
            'GLD', 'SLV', 'USO', 'UNG'
        ]
    
    # Use aliases that our normalizer will map to Yahoo index symbols
    other_indices = [
        'SPX',    # will normalize to ^GSPC
        'IXIC',   # will normalize to ^IXIC
        'DJI',    # will normalize to ^DJI
        'N225',   # will normalize to ^N225
        'FTSE',   # will normalize to ^FTSE
        'FCHI',   # will normalize to ^FCHI
        '^HSI',   # already Yahoo caret symbol
        'TA35.TA',
        '^IBEX'
    ]
    
    indices = {
        'SP500': 'https://www.slickcharts.com/sp500',
        'Nasdaq100': 'https://www.slickcharts.com/nasdaq100',
        'DowJones': 'https://www.slickcharts.com/dowjones',
        'ETFs': etf_codes,
        'Other': other_indices
    }

    components = {}
    components_names = {}

    for index, url in indices.items():
        try:
            if index in ['ETFs', 'Other']:
                # Just use symbol with empty name
                components[index] = url
                components_names[index] = [(symbol, '') for symbol in url]
                continue

            response = requests.get(url, headers=headers)
            soup = BeautifulSoup(response.content, 'html.parser')
            table = soup.find('table', {'class': 'table table-hover table-borderless table-sm'})

            if not table:
                continue

            rows = table.find('tbody').find_all('tr')
            tickers = []
            tickers_with_names = []

            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 3:
                    continue

                name_link = cols[1].find('a')
                symbol_link = cols[2].find('a')

                company_name = name_link.text.strip() if name_link else ''
                symbol = symbol_link.text.strip() if symbol_link else ''

                if symbol:
                    tickers.append(symbol)
                    tickers_with_names.append((symbol, company_name))

            components[index] = tickers
            components_names[index] = tickers_with_names

        except Exception as e:
            print(f"Error scraping {index}: {str(e)}")

    return components, components_names

def generate_index_name():
    components, components_names = get_index_components()

    # Build ticker-to-name mapping
    ticker_to_name = {}
    for index, symbol_name_pairs in components_names.items():
        for symbol, name in symbol_name_pairs:
            if symbol not in ticker_to_name:
                ticker_to_name[symbol] = name

    all_tickers = set(ticker_to_name.keys())
    df = pd.DataFrame({'Ticker': sorted(all_tickers)})
    df.set_index('Ticker', inplace=True)

    index_columns = {
        'Dow Jones': 'DowJones',
        'Nasdaq 100': 'Nasdaq100',
        'SP500': 'SP500',
        'ETF': 'ETFs',
        'Other': 'Other'
    }

    for col_name, key in index_columns.items():
        tickers = components.get(key, [])
        df[col_name] = df.index.isin(tickers).astype(int)

    def build_indices_row(row):
        tags = []
        if row['Dow Jones']: tags.append('DJ')
        if row['Nasdaq 100']: tags.append('ND')
        if row['SP500']: tags.append('SP')
        if row['ETF']: tags.append('ETF')
        if row['Other']: tags.append('Other')
        return ';'.join(tags)

    df['Indices'] = df.apply(build_indices_row, axis=1)
    df['Company Name'] = df.index.map(lambda ticker: ticker_to_name.get(ticker, ''))

    df.reset_index(inplace=True)
    df = df[['Ticker', 'Company Name', 'Dow Jones', 'Nasdaq 100', 'SP500', 'ETF', 'Other', 'Indices']]

    # Save to in-memory Excel file
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='IndexComponents')

    output.seek(0)
    return output