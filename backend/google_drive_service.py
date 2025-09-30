"""
Google Drive integration service for uploading files to Google Drive.
"""
import os
import logging
from io import BytesIO
from typing import Optional, Dict, Any
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# Google Drive API scopes
SCOPES = ['https://www.googleapis.com/auth/drive.file']

class GoogleDriveService:
    """Service class for Google Drive operations."""
    
    def __init__(self, credentials_file: str = None, token_file: str = None):
        """
        Initialize Google Drive service.
        
        Args:
            credentials_file: Path to Google OAuth2 credentials JSON file
            token_file: Path to store/load OAuth2 token
        """
        self.credentials_file = credentials_file or os.getenv('GOOGLE_CREDENTIALS_FILE', 'credentials.json')
        self.token_file = token_file or os.getenv('GOOGLE_TOKEN_FILE', 'token.json')
        self.service = None
        self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Google Drive API."""
        try:
            creds = None
            
            # Load existing token if available
            if os.path.exists(self.token_file):
                creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
            
            # If there are no (valid) credentials available, let the user log in
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    if not os.path.exists(self.credentials_file):
                        logger.warning(f"Google credentials file not found at {self.credentials_file}")
                        return
                    
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_file, SCOPES)
                    creds = flow.run_local_server(port=0)
                
                # Save the credentials for the next run
                with open(self.token_file, 'w') as token:
                    token.write(creds.to_json())
            
            self.service = build('drive', 'v3', credentials=creds)
            logger.info("Google Drive authentication successful")
            
        except Exception as e:
            logger.error(f"Google Drive authentication failed: {e}")
            self.service = None
    
    def is_authenticated(self) -> bool:
        """Check if service is authenticated."""
        return self.service is not None
    
    def create_folder(self, folder_name: str, parent_folder_id: str = None) -> Optional[str]:
        """
        Create a folder in Google Drive.
        
        Args:
            folder_name: Name of the folder to create
            parent_folder_id: ID of parent folder (None for root)
            
        Returns:
            Folder ID if successful, None otherwise
        """
        if not self.is_authenticated():
            logger.error("Google Drive service not authenticated")
            return None
        
        try:
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            
            if parent_folder_id:
                folder_metadata['parents'] = [parent_folder_id]
            
            folder = self.service.files().create(
                body=folder_metadata,
                fields='id'
            ).execute()
            
            logger.info(f"Created folder '{folder_name}' with ID: {folder.get('id')}")
            return folder.get('id')
            
        except HttpError as e:
            logger.error(f"Error creating folder '{folder_name}': {e}")
            return None
    
    def get_folder_id(self, folder_name: str, parent_folder_id: str = None) -> Optional[str]:
        """
        Get folder ID by name.
        
        Args:
            folder_name: Name of the folder to find
            parent_folder_id: ID of parent folder to search in (None for root)
            
        Returns:
            Folder ID if found, None otherwise
        """
        if not self.is_authenticated():
            logger.error("Google Drive service not authenticated")
            return None
        
        try:
            query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
            
            if parent_folder_id:
                query += f" and '{parent_folder_id}' in parents"
            else:
                query += " and 'root' in parents"
            
            results = self.service.files().list(
                q=query,
                fields="files(id, name)"
            ).execute()
            
            files = results.get('files', [])
            if files:
                return files[0]['id']
            
            return None
            
        except HttpError as e:
            logger.error(f"Error finding folder '{folder_name}': {e}")
            return None
    
    def get_or_create_folder(self, folder_name: str, parent_folder_id: str = None) -> Optional[str]:
        """
        Get existing folder or create new one.
        
        Args:
            folder_name: Name of the folder
            parent_folder_id: ID of parent folder (None for root)
            
        Returns:
            Folder ID if successful, None otherwise
        """
        # Try to find existing folder
        folder_id = self.get_folder_id(folder_name, parent_folder_id)
        if folder_id:
            return folder_id
        
        # Create new folder if not found
        return self.create_folder(folder_name, parent_folder_id)
    
    def upload_file(self, file_buffer: BytesIO, filename: str, 
                   folder_id: str = None, mime_type: str = None) -> Optional[str]:
        """
        Upload file to Google Drive.
        
        Args:
            file_buffer: BytesIO buffer containing file data
            filename: Name for the uploaded file
            folder_id: ID of folder to upload to (None for root)
            mime_type: MIME type of the file
            
        Returns:
            File ID if successful, None otherwise
        """
        if not self.is_authenticated():
            logger.error("Google Drive service not authenticated")
            return None
        
        try:
            # Set default MIME type based on file extension
            if not mime_type:
                if filename.endswith('.xlsx'):
                    mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                elif filename.endswith('.csv'):
                    mime_type = 'text/csv'
                else:
                    mime_type = 'application/octet-stream'
            
            file_metadata = {'name': filename}
            if folder_id:
                file_metadata['parents'] = [folder_id]
            
            media = MediaIoBaseUpload(
                file_buffer,
                mimetype=mime_type,
                resumable=True
            )
            
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            
            logger.info(f"Uploaded file '{filename}' with ID: {file.get('id')}")
            return file.get('id')
            
        except HttpError as e:
            logger.error(f"Error uploading file '{filename}': {e}")
            return None
    
    def upload_to_organized_folder(self, file_buffer: BytesIO, filename: str, 
                                 data_type: str = 'general') -> Optional[str]:
        """
        Upload file to organized folder structure.
        
        Args:
            file_buffer: BytesIO buffer containing file data
            filename: Name for the uploaded file
            data_type: Type of data (daily, realtime, historic, bigquery)
            
        Returns:
            File ID if successful, None otherwise
        """
        if not self.is_authenticated():
            logger.error("Google Drive service not authenticated")
            return None
        
        try:
            # Create organized folder structure
            base_folder_name = "Stock Data"
            base_folder_id = self.get_or_create_folder(base_folder_name)
            
            if not base_folder_id:
                logger.error("Failed to create base folder")
                return None
            
            # Create subfolder based on data type
            subfolder_name = data_type.title()
            subfolder_id = self.get_or_create_folder(subfolder_name, base_folder_id)
            
            if not subfolder_id:
                logger.error(f"Failed to create subfolder for {data_type}")
                return None
            
            # Upload file to the organized folder
            return self.upload_file(file_buffer, filename, subfolder_id)
            
        except Exception as e:
            logger.error(f"Error uploading to organized folder: {e}")
            return None


# Global instance
_google_drive_service = None

def get_google_drive_service() -> Optional[GoogleDriveService]:
    """Get global Google Drive service instance."""
    global _google_drive_service
    
    if _google_drive_service is None:
        # Check if Google Drive is enabled
        if os.getenv('GOOGLE_DRIVE_ENABLED', 'false').lower() in ('true', '1', 'yes'):
            _google_drive_service = GoogleDriveService()
        else:
            logger.info("Google Drive integration disabled")
    
    return _google_drive_service

def upload_to_google_drive(file_buffer: BytesIO, filename: str, 
                          data_type: str = 'general') -> bool:
    """
    Upload file to Google Drive.
    
    Args:
        file_buffer: BytesIO buffer containing file data
        filename: Name for the uploaded file
        data_type: Type of data for folder organization
        
    Returns:
        True if successful, False otherwise
    """
    service = get_google_drive_service()
    if not service:
        logger.info("Google Drive service not available")
        return False
    
    if not service.is_authenticated():
        logger.warning("Google Drive service not authenticated")
        return False
    
    file_id = service.upload_to_organized_folder(file_buffer, filename, data_type)
    return file_id is not None
