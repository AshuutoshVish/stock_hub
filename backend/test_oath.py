# # from google.oauth2.credentials import Credentials
# # from google_auth_oauthlib.flow import InstalledAppFlow
# # from googleapiclient.discovery import build
# # from googleapiclient.http import MediaFileUpload

# # # Scope to allow read/write access to Drive
# # SCOPES = ['https://www.googleapis.com/auth/drive.file']

# # # Authenticate via OAuth
# # flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
# # creds = flow.run_local_server(port=0)

# # service = build('drive', 'v3', credentials=creds)

# # # Upload file
# # file_metadata = {'name': 'example.csv', 'parents': ['1Rmsjk1BvfK25IUAD4ZjK058o_w45V0dp']}
# # media = MediaFileUpload('example.csv', mimetype='text/csv')
# # file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()

# # print(f"Uploaded file with ID: {file.get('id')}")


# # import pandas as pd
# # from google.oauth2.credentials import Credentials
# # from google_auth_oauthlib.flow import InstalledAppFlow
# # from googleapiclient.discovery import build
# # from googleapiclient.http import MediaFileUpload

# # # Step 1: Create a test CSV
# # df = pd.DataFrame({
# #     'Name': ['Alice', 'Bob', 'Charlie'],
# #     'Age': [25, 30, 35]
# # })
# # csv_file = 'example.csv'
# # df.to_csv(csv_file, index=False)

# # # Step 2: Google Drive OAuth & API setup
# # SCOPES = ['https://www.googleapis.com/auth/drive.file']
# # flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
# # creds = flow.run_local_server(port=0)
# # service = build('drive', 'v3', credentials=creds)

# # # Step 3: Upload file
# # folder_id = '1Rmsjk1BvfK25IUAD4ZjK058o_w45V0dp'
# # file_metadata = {'name': csv_file, 'parents': [folder_id]}
# # media = MediaFileUpload(csv_file, mimetype='text/csv')
# # uploaded_file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()

# # print(f"Uploaded file successfully! File ID: {uploaded_file.get('id')}")


# import os
# import pandas as pd
# from google.oauth2.credentials import Credentials
# from google_auth_oauthlib.flow import InstalledAppFlow
# from google.auth.transport.requests import Request
# from googleapiclient.discovery import build
# from googleapiclient.http import MediaFileUpload

# # Step 1: Create a test CSV
# df = pd.DataFrame({
#     'Name': ['Alice', 'Bob', 'Charlie'],
#     'Age': [25, 30, 35]
# })
# csv_file = 'example.csv'
# df.to_csv(csv_file, index=False)

# # Step 2: Google Drive OAuth & API setup
# SCOPES = ['https://www.googleapis.com/auth/drive.file']
# creds = None

# # Load saved token if exists
# if os.path.exists('token.json'):
#     creds = Credentials.from_authorized_user_file('token.json', SCOPES)

# # If no valid creds, go through login flow once
# if not creds or not creds.valid:
#     if creds and creds.expired and creds.refresh_token:
#         creds.refresh(Request())
#     else:
#         flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
#         creds = flow.run_local_server(port=0)
#     # Save credentials for next time
#     with open('token.json', 'w') as token:
#         token.write(creds.to_json())

# service = build('drive', 'v3', credentials=creds)

# # Step 3: Upload file
# folder_id = '1Rmsjk1BvfK25IUAD4ZjK058o_w45V0dp'
# file_metadata = {'name': csv_file, 'parents': [folder_id]}
# media = MediaFileUpload(csv_file, mimetype='text/csv')
# uploaded_file = service.files().create(
#     body=file_metadata, media_body=media, fields='id'
# ).execute()

# print(f"✅ Uploaded file successfully! File ID: {uploaded_file.get('id')}")
