import React, { useState } from 'react';
import { Database, Download, Search } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import DatePicker from '../components/DatePicker';
import Select from '../components/Select';
import { BASE_URL } from '../utils/api';
import axios from 'axios';
import ReactSelect from 'react-select';   // ✅ import react-select

const BigQueryData = () => {
  const [tickers, setTickers] = useState<string[]>([]); // ✅ store tickers as array
  const [selectedIndex, setSelectedIndex] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interval, setInterval] = useState('1d');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const intervalOptions = [
    { value: '1d', label: 'Daily' },
    { value: '1wk', label: 'Weekly' },
    { value: '1mo', label: 'Monthly' },
  ];

  const indexOptions = [
    { value: 'ND', label: 'NASDAQ 100' },
    { value: 'SP', label: 'S&P 500' },
    { value: 'DJ', label: 'Dow Jones' },
  ];

  const indexTickers: Record<string, string[]> = {
    ND: [ 'AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','PEP','PYPL','ADBE',
            'CMCSA','NFLX','INTC','CSCO','AVGO','TXN','QCOM','AMGN','COST','CHTR',
            'HON','SBUX','AMD','BKNG','ISRG','GILD','FISV','REGN','ILMN','MU',
            'MDLZ','ADI','VRTX','BIIB','ADP','ZM','EA','ATVI','MELI','SNPS',
            'KHC','LRCX','KLAC','DOCU','FAST','CTAS','CDNS','IDXX','EXC','WDAY',
            'MRVL','ASML','TEAM','BIDU','ROST','EBAY','SGEN','ORLY','PAYX','MAR',
            'CTSH','XEL','CHKP','SIRI','PCAR','SWKS','BIDU','LULU','UAL','ALGN','FTNT',
            'DXCM','NTES','WDC','VRSN','EXPE','CDW','SNOW','OKTA','KLAC','SPLK','MTCH'],
          SP: ['AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','BRK.B','JNJ','V','WMT',
          'PG','JPM','UNH','MA','HD','DIS','PYPL','BAC','VZ','ADBE','CMCSA','NFLX',
          'INTC','PEP','KO','CSCO','XOM','CVX','ABBV','T','MRK','NKE','PFE','MCD',
          'COST','CRM','ACN','TMO','AVGO','DHR','QCOM','TXN','LLY','NEE','MDT','HON',
          'UNP','LIN','AMGN','LOW','MS','CHTR','SPGI','RTX','BMY','PM','LMT','AMT',
          'CAT','GS','NOW','IBM','ELV','PLD','BLK','ADI','ISRG','INTU','ADP','AMD','MU',
          'FIS','BDX','SO','ZTS','SYK','GE','SCHW','BKNG','GILD','TJX','CI','PNC','DE',
          'CL','VRTX','ATVI','CB','MO','EMR','CSX','WM','ICE','FISV','DG','MNST','KMB',
          'LRCX','MAR','TGT','ORLY','AON','ITW','HUM','DUK','CLX','CTAS','EQIX','MCO',
          'APD','CME','EXC','NOC','PGR','REGN','ADSK','AEP','SBUX','ILMN','FDX','A','BAX',
          'BK','PAYX','BIIB','DXCM','CDW','FRC','KEYS','EBAY','FAST','ALGN','SWKS','VRSN',
          'WBA','SIRI','KLAC','CDNS','XLNX','MCHP','ORCL','SNPS','WDAY','DOCU','ZS','TEAM',
          'SNOW','OKTA','MDB','CRWD','MRVL','ASML','BIDU','ROST','EBAY','SGEN','ORLY','PAYX',
          'MAR','CTSH','XEL','CHKP','BMRN','SIRI','PCAR','SWKS','KLAC','BIDU','LULU','UAL',
          'ALGN','FTNT','DXCM','NTES','WDC','VRSN','EXPE','CDW','SNOW','OKTA','KLAC','SPLK',
          'MTCH','ANSS','ANET','MTD','VFC','VAR','FANG','CNC','VLO','CE','CTRA','CFG','CINF',
          'CMS','CMA','COF','CBOE','CBRE','CDAY','CHD','CNP','CFG','CF','CAG','CAH','CARR',
          'CDW','CE','CERN','CF','CFG','CHRW','CHTR','CHD','CI','CINF','CL','CLX','CMA','CMI',
          'CMS','CNP','COF','COG','COO','COP','COST','COTY','CPB','CPRT','CPT','CRL','CRM',
          'CSCO','CSX','CTAS','CTL','CTSH','CTVA','CTXS','CVS','CVX','CW','CWH','CXO','D','DAL',
          'DD','DE','DFS','DG','DGX','DHI','DHR','DIS','DISCA','DISCK','DISH','DLR','DLTR','DOV',
          'DOW','DPZ','DRE','DRI','DTE','DUK','DVA','DVN','DXC','DXCM','EA','EBAY','ECL','ED',
          'EFX','EIX','EL','ELAN','EMN','EMR','EOG','EQIX','EQR','ES','ETN','ETR','EVRG','EW','EXC',
          'EXPD','EXPE','EXR','F','FANG','FAST','FBHS','FCX','FDX','FE','FFIV','FIS','FISV','FITB','FLT',
          'FMC','FOX','FOXA','FRC','FRT','FTI','FTNT','FTV','GD','GE','GILD','GIS','GL','GLW','GM','GOOG',
          'GOOGL','GPC','GPN','GPS','GRMN','GS','GWW','HAL','HAS','HBAN','HBI','HCA','HCN','HCP','HD','HES',
          'HFC','HIG','HII','HLT','HOLX','HON','HPE','HPQ','HRB','HRL','HSIC','HST','HSY','HUM','IBM','ICE',
          'IDXX','IFF','ILMN','INCY','INFO','INTC','INTU','IP','IPG','IPGP','IQV','IR','IRM','ISRG','IT','ITW',
          'IVZ','J','JBHT','JCI','JD','JNJ','JNPR','JPM','JWN','K','KEY','KEYS','KHC','KIM','KLAC','KMB','KMI',
          'KMX','KO','KR','KSU','L','LB','LDOS','LEG','LEN','LH','LHX','LIN','LKQ','LLY','LMT','LNC','LNT','LOW',
          'LRCX','LUV','LW','LYB','LYV','M','MA','MAA','MAC','MAR','MAS','MCD','MCHP','MCK','MCO','MDLZ','MDT','MET',
          'MGM','MHK','MKC','MKTX','MLM','MMC','MMM','MNST','MO','MOS','MPC','MRK','MRO','MS','MSCI','MSFT','MSI','MTB',
          'MTCH','MTD','MU','MXIM','NDAQ','NDSN','NEE','NEM','NFLX','NI','NKE','NKTR','NLOK','NOC','NOV','NOW','NRG',
          'NSC','NTAP','NTES','NTRS','NUE','NVDA','NVR','NWL','NWS','NWSA','NXPI','O','ODFL','OXY','PAYC','PAYX','PBCT',
          'PCAR','PCG','PCH','PDCO','PEG','PEP','PFE','PFG','PG','PGR','PH','PHM','PKG','PKI','PLD','PM','PNC','PNR',
          'PNW','PPG','PPL','PRGO','PRU','PSA','PSX','PTC','PWR','PXD','PYPL','QCOM','QRVO','RCL','RE','REG','REGN',
          'RF','RHI','RJF','RL','RMD','ROK','ROL','ROP','ROST','RSG','RTX','SBAC','SBUX','SCHW','SEE','SHW','SIVB',
          'SJM','SLB','SNA','SNPS','SO','SPG','SPGI','SRE','STE','STT','STX','STZ','SWK','SWKS','SYF','SYK','SYY',
          'T','TAP','TDG','TEL','TER','TFC','TFX','TGT','TIF','TJX','TMO','TMUS','TROW','TRV','TSCO','TSLA','TSN',
          'TT','TTWO','TWTR','TXN','TXT','TFC','TYL','UA','UAA','UAL','UDR','UHS','ULTA','UNH','UNM','UNP','UPS',
          'URI','USB','UTX','V','VFC','VLO','VMC','VRSK','VRTX','VTR','VZ','WAB','WAT','WBA','WEC','WELL','WFC',
          'WHR','WLTW','WM','WMB','WMT','WRB','WST','WTW','WY','WYNN','XEL','XOM','XRAY','XRX','XYL','YUM','ZBH',
          'ZBRA','ZION','ZTS'],
          DJ: ['MMM','AXP','AMGN','AAPL','BA','CAT','CVX','CSCO','KO','DIS','DOW','GS',
          'HD','HON','IBM','INTC','JNJ','JPM','MCD','MRK','MSFT','NKE','PG','TRV',
          'UNH','VZ','V','WBA','WMT'],
  };

  // ✅ When index changes, select all tickers by default
  const handleIndexChange = (value: string) => {
    setSelectedIndex(value);
    if (indexTickers[value]) {
      setTickers(indexTickers[value]);
    } else {
      setTickers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (tickers.length === 0) {
        setErrorMsg('Please select at least one ticker.');
        setIsLoading(false);
        return;
      }

      const response = await axios.post(
        `${BASE_URL}/download_bigquery_data`,
        {
          bigquery_ticker: tickers,
          bigquery_start_date: startDate,
          bigquery_end_date: endDate,
          bigquery_interval: interval,
        },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bigquery_data_${interval}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download failed:', error);
      setErrorMsg('Failed to download BigQuery data.');
    }

    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Database className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BigQuery Data</h1>
          <p className="text-gray-600">
            Query large datasets with custom parameters
          </p>
        </div>
      </div>

      <Card title="BigQuery Data Export">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Select
                label="Select Index"
                value={selectedIndex}
                onChange={handleIndexChange}
                options={indexOptions}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Ticker(s)
                </label>
                <ReactSelect
                  isMulti
                  isSearchable
                  options={(indexTickers[selectedIndex] || [])
                    .sort()
                    .map((t) => ({ value: t, label: t }))}
                  value={tickers.map((t) => ({ value: t, label: t }))}
                  onChange={(selected) =>
                    setTickers(selected.map((s) => s.value))
                  }
                  placeholder="Select or search tickers..."
                />
              </div>

              <Select
                label="Data Interval"
                value={interval}
                onChange={setInterval}
                options={intervalOptions}
                required
              />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />

              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                min={startDate}
              />
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || !tickers.length || !startDate || !endDate}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>
                {isLoading ? 'Querying BigQuery...' : 'Download BigQuery Data'}
              </span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default BigQueryData;















// import React, { useState } from 'react';
// import { Database, Download, Search } from 'lucide-react';
// import Card from '../components/Card';
// import Button from '../components/Button';
// import Input from '../components/Input';
// import DatePicker from '../components/DatePicker';
// import Select from '../components/Select';
// import { BASE_URL } from '../utils/api';
// import axios from 'axios';

// const BigQueryData = () => {
//   const [tickers, setTickers] = useState('');
//   const [selectedIndex, setSelectedIndex] = useState(''); // ✅ track dropdown selection
//   const [startDate, setStartDate] = useState('');
//   const [endDate, setEndDate] = useState('');
//   const [interval, setInterval] = useState('1d');
//   const [isLoading, setIsLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState('');

//   const intervalOptions = [
//     { value: '1d', label: 'Daily' },
//     { value: '1wk', label: 'Weekly' },
//     { value: '1mo', label: 'Monthly' },
//   ];

//   const indexOptions = [
//     { value: 'ND', label: 'NASDAQ 100' },
//     { value: 'SP', label: 'S&P 500' },
//     { value: 'DJ', label: 'Dow Jones' },
//   ];

//   const indexTickers: Record<string, string[]> = {
//     ND: [ 'AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','PEP','PYPL','ADBE',
//       'CMCSA','NFLX','INTC','CSCO','AVGO','TXN','QCOM','AMGN','COST','CHTR',
//       'HON','SBUX','AMD','BKNG','ISRG','GILD','FISV','REGN','ILMN','MU',
//       'MDLZ','ADI','VRTX','BIIB','ADP','ZM','EA','ATVI','MELI','SNPS',
//       'KHC','LRCX','KLAC','DOCU','FAST','CTAS','CDNS','IDXX','EXC','WDAY',
//       'MRVL','ASML','TEAM','BIDU','ROST','EBAY','SGEN','ORLY','PAYX','MAR',
//       'CTSH','XEL','CHKP','SIRI','PCAR','SWKS','BIDU','LULU','UAL','ALGN','FTNT',
//       'DXCM','NTES','WDC','VRSN','EXPE','CDW','SNOW','OKTA','KLAC','SPLK','MTCH'],
//     SP: ['AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','BRK.B','JNJ','V','WMT',
//     'PG','JPM','UNH','MA','HD','DIS','PYPL','BAC','VZ','ADBE','CMCSA','NFLX',
//     'INTC','PEP','KO','CSCO','XOM','CVX','ABBV','T','MRK','NKE','PFE','MCD',
//     'COST','CRM','ACN','TMO','AVGO','DHR','QCOM','TXN','LLY','NEE','MDT','HON',
//     'UNP','LIN','AMGN','LOW','MS','CHTR','SPGI','RTX','BMY','PM','LMT','AMT',
//     'CAT','GS','NOW','IBM','ELV','PLD','BLK','ADI','ISRG','INTU','ADP','AMD','MU',
//     'FIS','BDX','SO','ZTS','SYK','GE','SCHW','BKNG','GILD','TJX','CI','PNC','DE',
//     'CL','VRTX','ATVI','CB','MO','EMR','CSX','WM','ICE','FISV','DG','MNST','KMB',
//     'LRCX','MAR','TGT','ORLY','AON','ITW','HUM','DUK','CLX','CTAS','EQIX','MCO',
//     'APD','CME','EXC','NOC','PGR','REGN','ADSK','AEP','SBUX','ILMN','FDX','A','BAX',
//     'BK','PAYX','BIIB','DXCM','CDW','FRC','KEYS','EBAY','FAST','ALGN','SWKS','VRSN',
//     'WBA','SIRI','KLAC','CDNS','XLNX','MCHP','ORCL','SNPS','WDAY','DOCU','ZS','TEAM',
//     'SNOW','OKTA','MDB','CRWD','MRVL','ASML','BIDU','ROST','EBAY','SGEN','ORLY','PAYX',
//     'MAR','CTSH','XEL','CHKP','BMRN','SIRI','PCAR','SWKS','KLAC','BIDU','LULU','UAL',
//     'ALGN','FTNT','DXCM','NTES','WDC','VRSN','EXPE','CDW','SNOW','OKTA','KLAC','SPLK',
//     'MTCH','ANSS','ANET','MTD','VFC','VAR','FANG','CNC','VLO','CE','CTRA','CFG','CINF',
//     'CMS','CMA','COF','CBOE','CBRE','CDAY','CHD','CNP','CFG','CF','CAG','CAH','CARR',
//     'CDW','CE','CERN','CF','CFG','CHRW','CHTR','CHD','CI','CINF','CL','CLX','CMA','CMI',
//     'CMS','CNP','COF','COG','COO','COP','COST','COTY','CPB','CPRT','CPT','CRL','CRM',
//     'CSCO','CSX','CTAS','CTL','CTSH','CTVA','CTXS','CVS','CVX','CW','CWH','CXO','D','DAL',
//     'DD','DE','DFS','DG','DGX','DHI','DHR','DIS','DISCA','DISCK','DISH','DLR','DLTR','DOV',
//     'DOW','DPZ','DRE','DRI','DTE','DUK','DVA','DVN','DXC','DXCM','EA','EBAY','ECL','ED',
//     'EFX','EIX','EL','ELAN','EMN','EMR','EOG','EQIX','EQR','ES','ETN','ETR','EVRG','EW','EXC',
//     'EXPD','EXPE','EXR','F','FANG','FAST','FBHS','FCX','FDX','FE','FFIV','FIS','FISV','FITB','FLT',
//     'FMC','FOX','FOXA','FRC','FRT','FTI','FTNT','FTV','GD','GE','GILD','GIS','GL','GLW','GM','GOOG',
//     'GOOGL','GPC','GPN','GPS','GRMN','GS','GWW','HAL','HAS','HBAN','HBI','HCA','HCN','HCP','HD','HES',
//     'HFC','HIG','HII','HLT','HOLX','HON','HPE','HPQ','HRB','HRL','HSIC','HST','HSY','HUM','IBM','ICE',
//     'IDXX','IFF','ILMN','INCY','INFO','INTC','INTU','IP','IPG','IPGP','IQV','IR','IRM','ISRG','IT','ITW',
//     'IVZ','J','JBHT','JCI','JD','JNJ','JNPR','JPM','JWN','K','KEY','KEYS','KHC','KIM','KLAC','KMB','KMI',
//     'KMX','KO','KR','KSU','L','LB','LDOS','LEG','LEN','LH','LHX','LIN','LKQ','LLY','LMT','LNC','LNT','LOW',
//     'LRCX','LUV','LW','LYB','LYV','M','MA','MAA','MAC','MAR','MAS','MCD','MCHP','MCK','MCO','MDLZ','MDT','MET',
//     'MGM','MHK','MKC','MKTX','MLM','MMC','MMM','MNST','MO','MOS','MPC','MRK','MRO','MS','MSCI','MSFT','MSI','MTB',
//     'MTCH','MTD','MU','MXIM','NDAQ','NDSN','NEE','NEM','NFLX','NI','NKE','NKTR','NLOK','NOC','NOV','NOW','NRG',
//     'NSC','NTAP','NTES','NTRS','NUE','NVDA','NVR','NWL','NWS','NWSA','NXPI','O','ODFL','OXY','PAYC','PAYX','PBCT',
//     'PCAR','PCG','PCH','PDCO','PEG','PEP','PFE','PFG','PG','PGR','PH','PHM','PKG','PKI','PLD','PM','PNC','PNR',
//     'PNW','PPG','PPL','PRGO','PRU','PSA','PSX','PTC','PWR','PXD','PYPL','QCOM','QRVO','RCL','RE','REG','REGN',
//     'RF','RHI','RJF','RL','RMD','ROK','ROL','ROP','ROST','RSG','RTX','SBAC','SBUX','SCHW','SEE','SHW','SIVB',
//     'SJM','SLB','SNA','SNPS','SO','SPG','SPGI','SRE','STE','STT','STX','STZ','SWK','SWKS','SYF','SYK','SYY',
//     'T','TAP','TDG','TEL','TER','TFC','TFX','TGT','TIF','TJX','TMO','TMUS','TROW','TRV','TSCO','TSLA','TSN',
//     'TT','TTWO','TWTR','TXN','TXT','TFC','TYL','UA','UAA','UAL','UDR','UHS','ULTA','UNH','UNM','UNP','UPS',
//     'URI','USB','UTX','V','VFC','VLO','VMC','VRSK','VRTX','VTR','VZ','WAB','WAT','WBA','WEC','WELL','WFC',
//     'WHR','WLTW','WM','WMB','WMT','WRB','WST','WTW','WY','WYNN','XEL','XOM','XRAY','XRX','XYL','YUM','ZBH',
//     'ZBRA','ZION','ZTS'],
//     DJ: ['MMM','AXP','AMGN','AAPL','BA','CAT','CVX','CSCO','KO','DIS','DOW','GS',
//     'HD','HON','IBM','INTC','JNJ','JPM','MCD','MRK','MSFT','NKE','PG','TRV',
//     'UNH','VZ','V','WBA','WMT'],
//   };


//   const handleIndexChange = (value: string) => {
//     setSelectedIndex(value);
//     if (indexTickers[value]) {
//       setTickers(indexTickers[value].join(','));
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setErrorMsg('');

//     try {
//       const tickerArray = tickers
//         .split(',')
//         .map((t) => t.trim().toUpperCase())
//         .filter(Boolean);

//       if (tickerArray.length === 0) {
//         setErrorMsg('Please enter at least one ticker.');
//         setIsLoading(false);
//         return;
//       }

//       const response = await axios.post(
//         `${BASE_URL}/download_bigquery_data`,
//         {
//           bigquery_ticker: tickerArray,
//           bigquery_start_date: startDate,
//           bigquery_end_date: endDate,
//           bigquery_interval: interval,
//         },
//         { responseType: 'blob' }
//       );

//       // Download as file
//       const url = window.URL.createObjectURL(new Blob([response.data]));
//       const link = document.createElement('a');
//       link.href = url;
//       link.setAttribute('download', `bigquery_data_${interval}.xlsx`);
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//       window.URL.revokeObjectURL(url);
//     } catch (error: any) {
//       console.error('Download failed:', error);

//       if (error.response?.data) {
//         const reader = new FileReader();
//         reader.onload = () => {
//           try {
//             const json = JSON.parse(reader.result as string);
//             setErrorMsg(json.error || 'Failed to download BigQuery data.');
//           } catch {
//             setErrorMsg('Failed to download BigQuery data.');
//           }
//         };
//         reader.readAsText(error.response.data);
//       } else {
//         setErrorMsg('Network error. Please try again.');
//       }
//     }

//     setIsLoading(false);
//   };

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex items-center space-x-3">
//         <Database className="h-8 w-8 text-blue-600" />
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900">BigQuery Data</h1>
//           <p className="text-gray-600">
//             Query large datasets with custom parameters
//           </p>
//         </div>
//       </div>

//       <Card title="BigQuery Data Export">
//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {/* Left column */}
//             <div className="space-y-4">
//               {/* ✅ Index Dropdown */}
//               <Select
//                 label="Select Index"
//                 value={selectedIndex}
//                 onChange={handleIndexChange}
//                 options={indexOptions}
//               />

//               {/* Tickers Input */}
//               <Input
//                 label="Select Ticker(s)"
//                 placeholder="e.g., AAPL,MSFT,GOOGL"
//                 value={tickers}
//                 onChange={(e) => setTickers(e.target.value)}
//                 required
//               />

//               <div className="bg-gray-50 rounded-lg p-3">
//                 <p className="text-sm text-gray-600">
//                   <strong>Tip:</strong> Separate multiple tickers with commas.
//                   They will be sent as an array.
//                 </p>
//               </div>

//               {/* Interval Dropdown */}
//               <Select
//                 label="Data Interval"
//                 value={interval}
//                 onChange={setInterval}
//                 options={intervalOptions}
//                 required
//               />
//             </div>

//             {/* Right column */}
//             <div className="space-y-4">
//               <DatePicker
//                 label="Start Date"
//                 value={startDate}
//                 onChange={(e) => setStartDate(e.target.value)}
//                 required
//               />

//               <DatePicker
//                 label="End Date"
//                 value={endDate}
//                 onChange={(e) => setEndDate(e.target.value)}
//                 required
//                 min={startDate}
//               />

//               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                 <div className="flex items-start space-x-3">
//                   <Search className="h-5 w-5 text-blue-600 mt-0.5" />
//                   <div>
//                     <h4 className="font-medium text-blue-900">
//                       Query Optimization
//                     </h4>
//                     <p className="text-sm text-blue-800 mt-1">
//                       Larger date ranges may take longer to process. Consider
//                       using weekly or monthly intervals for extended periods.
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Error */}
//           {errorMsg && (
//             <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
//               {errorMsg}
//             </div>
//           )}

//           {/* Submit */}
//           <div className="flex justify-end">
//             <Button
//               type="submit"
//               disabled={isLoading || !tickers || !startDate || !endDate}
//               className="flex items-center space-x-2"
//             >
//               <Download className="h-4 w-4" />
//               <span>
//                 {isLoading ? 'Querying BigQuery...' : 'Download BigQuery Data'}
//               </span>
//             </Button>
//           </div>
//         </form>
//       </Card>
//     </div>
//   );
// };

// export default BigQueryData;















// // import React, { useState } from 'react';
// // import { Database, Download, Search } from 'lucide-react';
// // import Card from '../components/Card';
// // import Button from '../components/Button';
// // import Input from '../components/Input';
// // import DatePicker from '../components/DatePicker';
// // import Select from '../components/Select';
// // import { BASE_URL } from '../utils/api';
// // import axios from 'axios';

// // const BigQueryData = () => {
// //   const [tickers, setTickers] = useState('');
// //   const [startDate, setStartDate] = useState('');
// //   const [endDate, setEndDate] = useState('');
// //   const [interval, setInterval] = useState('1d');
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [errorMsg, setErrorMsg] = useState('');

// //   const intervalOptions = [
// //     { value: '1d', label: 'Daily' },
// //     { value: '1wk', label: 'Weekly' },
// //     { value: '1mo', label: 'Monthly' },
// //   ];

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     setIsLoading(true);
// //     setErrorMsg('');

// //     try {
// //       // Convert comma-separated input to array of uppercase tickers
// //       const tickerArray = tickers
// //         .split(',')
// //         .map((t) => t.trim().toUpperCase())
// //         .filter(Boolean);

// //       const response = await axios.post(
// //         `${BASE_URL}/download_bigquery_data`,
// //         {
// //           bigquery_ticker: tickerArray,
// //           bigquery_start_date: startDate,
// //           bigquery_end_date: endDate,
// //           bigquery_interval: interval,
// //         },
// //         { responseType: 'blob' }
// //       );

// //       // Trigger file download
// //       const url = window.URL.createObjectURL(new Blob([response.data]));
// //       const link = document.createElement('a');
// //       link.href = url;
// //       link.setAttribute('download', `bigquery_data_${interval}.xlsx`);
// //       document.body.appendChild(link);
// //       link.click();
// //       link.remove();
// //       window.URL.revokeObjectURL(url);
// //     } catch (error: any) {
// //       console.error('Download failed:', error);

// //       if (error.response?.data) {
// //         const reader = new FileReader();
// //         reader.onload = () => {
// //           try {
// //             const json = JSON.parse(reader.result as string);
// //             setErrorMsg(json.error || 'Failed to download BigQuery data.');
// //           } catch {
// //             setErrorMsg('Failed to download BigQuery data.');
// //           }
// //         };
// //         reader.readAsText(error.response.data);
// //       } else {
// //         setErrorMsg('Network error. Please try again.');
// //       }
// //     }

// //     setIsLoading(false);
// //   };

// //   return (
// //     <div className="space-y-6">
// //       {/* Header */}
// //       <div className="flex items-center space-x-3">
// //         <Database className="h-8 w-8 text-blue-600" />
// //         <div>
// //           <h1 className="text-3xl font-bold text-gray-900">BigQuery Data</h1>
// //           <p className="text-gray-600">Query large datasets with custom parameters</p>
// //         </div>
// //       </div>

// //       {/* Form Card */}
// //       <Card title="BigQuery Data Export">
// //         <form onSubmit={handleSubmit} className="space-y-6">
// //           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
// //             {/* Left column */}
// //             <div className="space-y-4">
// //               <Input
// //                 label="Select Ticker(s)"
// //                 placeholder="e.g., AAPL,MSFT,GOOGL"
// //                 value={tickers}
// //                 onChange={(e) => setTickers(e.target.value)}
// //                 required
// //               />

// //               <div className="bg-gray-50 rounded-lg p-3">
// //                 <p className="text-sm text-gray-600">
// //                   <strong>Tip:</strong> Separate multiple tickers with commas. They will be sent as
// //                   an array.
// //                 </p>
// //               </div>

// //               <Select
// //                 label="Data Interval"
// //                 value={interval}
// //                 onChange={setInterval}
// //                 options={intervalOptions}
// //                 required
// //               />
// //             </div>

// //             {/* Right column */}
// //             <div className="space-y-4">
// //               <DatePicker
// //                 label="Start Date"
// //                 value={startDate}
// //                 onChange={(e) => setStartDate(e.target.value)}
// //                 required
// //               />

// //               <DatePicker
// //                 label="End Date"
// //                 value={endDate}
// //                 onChange={(e) => setEndDate(e.target.value)}
// //                 required
// //                 min={startDate}
// //               />

// //               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
// //                 <div className="flex items-start space-x-3">
// //                   <Search className="h-5 w-5 text-blue-600 mt-0.5" />
// //                   <div>
// //                     <h4 className="font-medium text-blue-900">Query Optimization</h4>
// //                     <p className="text-sm text-blue-800 mt-1">
// //                       Larger date ranges may take longer to process. Consider using weekly or
// //                       monthly intervals for extended periods.
// //                     </p>
// //                   </div>
// //                 </div>
// //               </div>
// //             </div>
// //           </div>

// //           {/* Features */}
// //           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
// //             <h4 className="font-medium text-yellow-900">BigQuery Features</h4>
// //             <ul className="mt-2 text-sm text-yellow-800 list-disc list-inside space-y-1">
// //               <li>Direct access to Google Cloud BigQuery datasets</li>
// //               <li>High-performance queries on large datasets</li>
// //               <li>Custom aggregation and interval options</li>
// //               <li>Advanced filtering and sorting capabilities</li>
// //               <li>Scalable data processing with Google Cloud infrastructure</li>
// //             </ul>
// //           </div>

// //           {/* Setup Information */}
// //           <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
// //             <h4 className="font-medium text-blue-900">BigQuery Setup Required</h4>
// //             <p className="mt-2 text-sm text-blue-800">
// //               This feature requires Google Cloud BigQuery setup. Please ensure your BigQuery dataset 
// //               contains stock data with the required schema. Check the backend documentation for setup instructions.
// //             </p>
// //           </div>

// //           {/* Error message */}
// //           {errorMsg && (
// //             <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
// //               {errorMsg}
// //             </div>
// //           )}

// //           {/* Submit */}
// //           <div className="flex justify-end">
// //             <Button
// //               type="submit"
// //               disabled={isLoading || !tickers || !startDate || !endDate}
// //               className="flex items-center space-x-2"
// //             >
// //               <Download className="h-4 w-4" />
// //               <span>{isLoading ? 'Querying BigQuery...' : 'Download BigQuery Data'}</span>
// //             </Button>
// //           </div>
// //         </form>
// //       </Card>
// //     </div>
// //   );
// // };

// // export default BigQueryData;
