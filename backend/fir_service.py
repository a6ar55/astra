import os
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import logging
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger(__name__)

class FIRService:
    def __init__(self):
        self.db = None
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _get_db(self):
        """Lazy initialization of Firestore client"""
        if self.db is None:
            try:
                self.db = firestore.client()
            except ValueError:
                logger.error("Firebase not initialized. FIR service will not work properly.")
                raise
        return self.db
    
    def _setup_custom_styles(self):
        """Setup custom styles for NYPD FIR format"""
        # NYPD Header Style
        self.styles.add(ParagraphStyle(
            name='NYPDHeader',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue,
            fontName='Helvetica-Bold'
        ))
        
        # Section Header Style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.darkblue,
            fontName='Helvetica-Bold'
        ))
        
        # Field Label Style
        self.styles.add(ParagraphStyle(
            name='FieldLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            textColor=colors.darkblue,
            fontName='Helvetica-Bold'
        ))
        
        # Field Value Style
        self.styles.add(ParagraphStyle(
            name='FieldValue',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            fontName='Helvetica'
        ))
        
        # Narrative Style
        self.styles.add(ParagraphStyle(
            name='Narrative',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            alignment=TA_JUSTIFY,
            fontName='Helvetica'
        ))

    def generate_fir_id(self) -> str:
        """Generate unique FIR ID in NYPD format"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:8].upper()
        return f"FIR-{timestamp}-{random_suffix}"

    def determine_threat_severity(self, threat_class: str, confidence: float) -> str:
        """Determine threat severity based on class and confidence"""
        high_severity_classes = [
            "direct violence threats", "violence", "hate speech/extremism", 
            "hate speech", "child safety threats"
        ]
        
        if threat_class.lower() in high_severity_classes and confidence > 0.7:
            return "CRITICAL"
        elif threat_class.lower() in high_severity_classes or confidence > 0.8:
            return "HIGH"
        elif confidence > 0.6:
            return "MEDIUM"
        else:
            return "LOW"

    def extract_location_info(self, threat_data: Dict[str, Any]) -> Dict[str, str]:
        """Extract location information from threat data"""
        location_info = {
            "city": "Unknown",
            "state": "Unknown", 
            "country": "Unknown",
            "coordinates": "Unknown"
        }
        
        # Try to get location from user metadata
        user_metadata = threat_data.get('user_metadata', {})
        twitter_metadata = threat_data.get('twitter_metadata', {})
        
        location = (user_metadata.get('location') or 
                   twitter_metadata.get('location') or 
                   threat_data.get('location'))
        
        if location:
            # Simple location parsing (can be enhanced with geocoding)
            location_parts = location.split(',')
            if len(location_parts) >= 2:
                location_info["city"] = location_parts[0].strip()
                location_info["state"] = location_parts[1].strip()
            elif len(location_parts) == 1:
                location_info["city"] = location_parts[0].strip()
        
        return location_info

    def generate_fir_content(self, threat_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Generate FIR content from threat data"""
        fir_id = self.generate_fir_id()
        timestamp = datetime.now(timezone.utc)
        
        # Extract threat information
        threat_class = threat_data.get('predicted_class') or threat_data.get('threat_class', 'Unknown')
        confidence = threat_data.get('confidence') or threat_data.get('threat_confidence', 0)
        threat_text = threat_data.get('text') or threat_data.get('threat_content', 'No content available')
        
        # Get user information
        user_metadata = threat_data.get('user_metadata', {})
        twitter_metadata = threat_data.get('twitter_metadata', {})
        
        username = (user_metadata.get('twitter_handle') or 
                   twitter_metadata.get('username') or 
                   'Unknown')
        
        display_name = (user_metadata.get('display_name') or 
                       twitter_metadata.get('display_name') or 
                       username)
        
        # Determine severity
        severity = self.determine_threat_severity(threat_class, confidence)
        
        # Extract location
        location_info = self.extract_location_info(threat_data)
        
        # Create FIR content
        fir_content = {
            "fir_id": fir_id,
            "user_id": user_id,
            "timestamp": timestamp,
            "threat_data": threat_data,
            "severity": severity,
            "status": "ACTIVE",
            "content": {
                "incident_type": "SOCIAL_MEDIA_THREAT",
                "platform": "Twitter",
                "threat_classification": threat_class,
                "confidence_score": confidence,
                "suspect_info": {
                    "username": username,
                    "display_name": display_name,
                    "profile_image": user_metadata.get('profile_image') or twitter_metadata.get('profile_image'),
                    "location": location_info,
                    "followers_count": user_metadata.get('followers_count') or twitter_metadata.get('followers_count'),
                    "account_created": user_metadata.get('account_created') or twitter_metadata.get('account_created')
                },
                "threat_details": {
                    "content": threat_text,
                    "timestamp": threat_data.get('timestamp'),
                    "tweet_id": threat_data.get('tweet_id') or threat_data.get('id'),
                    "url": threat_data.get('url')
                },
                "location": location_info,
                "narrative": self._generate_narrative(threat_data, severity, location_info)
            }
        }
        
        return fir_content

    def _generate_narrative(self, threat_data: Dict[str, Any], severity: str, location_info: Dict[str, str]) -> str:
        """Generate narrative section for FIR"""
        threat_class = threat_data.get('predicted_class') or threat_data.get('threat_class', 'Unknown')
        threat_text = threat_data.get('text') or threat_data.get('threat_content', 'No content available')
        username = (threat_data.get('user_metadata', {}).get('twitter_handle') or 
                   threat_data.get('twitter_metadata', {}).get('username') or 
                   'Unknown')
        
        narrative = f"""
On {datetime.now().strftime('%B %d, %Y')} at approximately {datetime.now().strftime('%I:%M %p')}, 
a {severity.lower()} level threat was detected on the social media platform Twitter. 
The threat was classified as "{threat_class}" with a confidence score of 
{round((threat_data.get('confidence') or threat_data.get('threat_confidence') or 0) * 100)}%.

The suspect, identified as Twitter user @{username}, posted threatening content that reads: 
"{threat_text[:200]}{'...' if len(threat_text) > 200 else ''}"

The threat was automatically detected by the Astra Threat Detection System and flagged for immediate 
review by law enforcement personnel. The suspect's account information and associated metadata have 
been preserved for investigative purposes.

Location information indicates the threat originated from {location_info['city']}, {location_info['state']}, 
{location_info['country']}. This incident has been assigned severity level {severity} and requires 
appropriate law enforcement response based on the nature and severity of the threat.
        """
        
        return narrative.strip()

    async def create_fir(self, threat_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Create a new FIR and store in Firebase"""
        try:
            fir_content = self.generate_fir_content(threat_data, user_id)
            
            # Store in Firebase
            db = self._get_db()
            fir_ref = db.collection('firs').document(fir_content['fir_id'])
            fir_ref.set(fir_content)
            
            logger.info(f"FIR created successfully: {fir_content['fir_id']}")
            return fir_content
            
        except Exception as e:
            logger.error(f"Error creating FIR: {e}")
            raise

    async def get_user_firs(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all FIRs for a user"""
        try:
            db = self._get_db()
            firs_ref = db.collection('firs')
            # Simplified query to avoid index requirements
            query = firs_ref.where('user_id', '==', user_id).limit(limit)
            
            docs = query.stream()
            firs = []
            
            for doc in docs:
                fir_data = doc.to_dict()
                fir_data['id'] = doc.id
                firs.append(fir_data)
            
            # Sort in memory to avoid index requirements
            firs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return firs
            
        except Exception as e:
            logger.error(f"Error fetching FIRs: {e}")
            raise

    async def get_fir_by_id(self, fir_id: str) -> Optional[Dict[str, Any]]:
        """Get specific FIR by ID"""
        try:
            db = self._get_db()
            fir_ref = db.collection('firs').document(fir_id)
            doc = fir_ref.get()
            
            if doc.exists:
                fir_data = doc.to_dict()
                fir_data['id'] = doc.id
                return fir_data
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error fetching FIR {fir_id}: {e}")
            raise

    async def update_fir_status(self, fir_id: str, status: str) -> bool:
        """Update FIR status"""
        try:
            db = self._get_db()
            fir_ref = db.collection('firs').document(fir_id)
            fir_ref.update({
                'status': status,
                'updated_at': datetime.now(timezone.utc)
            })
            
            logger.info(f"FIR {fir_id} status updated to {status}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating FIR status: {e}")
            raise

    def generate_pdf(self, fir_data: Dict[str, Any]) -> str:
        """Generate PDF file for FIR"""
        try:
            # Create temporary file path
            fir_id = fir_data['fir_id']
            filename = f"FIR_{fir_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            filepath = os.path.join('/tmp', filename)
            
            # Create PDF document
            doc = SimpleDocTemplate(filepath, pagesize=letter)
            story = []
            
            # Add NYPD Header
            story.append(Paragraph("NEW YORK CITY POLICE DEPARTMENT", self.styles['NYPDHeader']))
            story.append(Paragraph("FIRST INFORMATION REPORT", self.styles['NYPDHeader']))
            story.append(Spacer(1, 20))
            
            # FIR ID and Date
            story.append(Paragraph(f"FIR ID: {fir_data['fir_id']}", self.styles['FieldLabel']))
            story.append(Paragraph(f"Date: {fir_data['timestamp'].strftime('%B %d, %Y')}", self.styles['FieldValue']))
            story.append(Paragraph(f"Time: {fir_data['timestamp'].strftime('%I:%M %p')}", self.styles['FieldValue']))
            story.append(Spacer(1, 20))
            
            # Incident Information
            story.append(Paragraph("INCIDENT INFORMATION", self.styles['SectionHeader']))
            
            incident_data = [
                ['Incident Type:', 'Social Media Threat'],
                ['Platform:', 'Twitter'],
                ['Threat Classification:', fir_data['content']['threat_classification']],
                ['Severity Level:', fir_data['severity']],
                ['Confidence Score:', f"{round(fir_data['content']['confidence_score'] * 100)}%"],
                ['Status:', fir_data['status']]
            ]
            
            incident_table = Table(incident_data, colWidths=[2*inch, 4*inch])
            incident_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(incident_table)
            story.append(Spacer(1, 20))
            
            # Suspect Information
            story.append(Paragraph("SUSPECT INFORMATION", self.styles['SectionHeader']))
            
            suspect_info = fir_data['content']['suspect_info']
            suspect_data = [
                ['Username:', f"@{suspect_info['username']}"],
                ['Display Name:', suspect_info['display_name']],
                ['Location:', f"{suspect_info['location']['city']}, {suspect_info['location']['state']}"],
                ['Followers:', str(suspect_info.get('followers_count', 'Unknown'))],
                ['Account Created:', suspect_info.get('account_created', 'Unknown')]
            ]
            
            suspect_table = Table(suspect_data, colWidths=[2*inch, 4*inch])
            suspect_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(suspect_table)
            story.append(Spacer(1, 20))
            
            # Threat Details
            story.append(Paragraph("THREAT DETAILS", self.styles['SectionHeader']))
            story.append(Paragraph("Threatening Content:", self.styles['FieldLabel']))
            story.append(Paragraph(fir_data['content']['threat_details']['content'], self.styles['FieldValue']))
            
            if fir_data['content']['threat_details'].get('tweet_id'):
                story.append(Paragraph(f"Tweet ID: {fir_data['content']['threat_details']['tweet_id']}", self.styles['FieldValue']))
            
            story.append(Spacer(1, 20))
            
            # Narrative
            story.append(Paragraph("NARRATIVE", self.styles['SectionHeader']))
            story.append(Paragraph(fir_data['content']['narrative'], self.styles['Narrative']))
            story.append(Spacer(1, 30))
            
            # Footer
            story.append(Paragraph("Generated by Astra Threat Detection System", self.styles['FieldValue']))
            story.append(Paragraph(f"Report ID: {fir_data['fir_id']}", self.styles['FieldValue']))
            
            # Build PDF
            doc.build(story)
            
            logger.info(f"PDF generated successfully: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            raise

# Global FIR service instance
fir_service = FIRService() 