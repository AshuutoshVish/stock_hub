# from google.oauth2 import service_account
# from googleapiclient.discovery import build
# from googleapiclient.http import MediaFileUpload

# # Path to your downloaded JSON key
# SERVICE_ACCOUNT_FILE = 'service_account.json'

# # Scopes for Drive
# SCOPES = ['https://www.googleapis.com/auth/drive']

# # Authenticate using service account
# creds = service_account.Credentials.from_service_account_file(
#     SERVICE_ACCOUNT_FILE, scopes=SCOPES
# )

# # Build Drive API service
# service = build('drive', 'v3', credentials=creds)

# # Upload file
# file_metadata = {
#     'name': 'example.csv',
#     'parents': ['1Rmsjk1BvfK25IUAD4ZjK058o_w45V0dp']  # replace with your Drive folder ID
# }
# media = MediaFileUpload('example.csv', mimetype='text/csv')

# file = service.files().create(
#     body=file_metadata,
#     media_body=media,
#     fields='id'
# ).execute()